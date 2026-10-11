#!/usr/bin/env node
'use strict';
/*
 * Baut alle Seiten aus sites.json nach public/<pfad>/ – für das Hosting unter einer Domain
 * mit Unterverzeichnissen (z. B. https://demo.example.com/petri-pirsch/).
 *
 *   node build-all.js                     -> alle Seiten + Startseite (Hub, siehe hub.js)
 *   node build-all.js petri-pirsch        -> nur diese Seite(n)
 *   BASIS_URL=https://demo.example.com node build-all.js
 *       setzt website_url je Seite auf BASIS_URL/<pfad>, falls in der JSON leer
 *       (für Canonical-Link und Open-Graph-Bilder).
 *
 * Keine npm-Abhängigkeiten. Nutzt die build.js der jeweiligen Vorlage; die Seiten werden parallel
 * gebaut (so viele gleichzeitig wie CPU-Kerne), die Ausgabe erscheint je Seite am Stück.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const BASIS_URL = (process.env.BASIS_URL || '').replace(/\/+$/, '');

const { sites, hub } = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
const { erzeugeHub } = require('./hub');
const { pruefe } = require('./lib/schema');
const nur = process.argv.slice(2);
const auswahl = nur.length ? sites.filter((s) => nur.includes(s.pfad)) : sites;
if (nur.length && auswahl.length !== nur.length) {
  console.error(`✖ Unbekannter Pfad: ${nur.filter((n) => !sites.some((s) => s.pfad === n)).join(', ')}`);
  process.exit(1);
}

// Pfade prüfen: nur Kleinbuchstaben, Ziffern und Bindestriche, keine Doppelungen
const gesehen = new Set();
for (const s of sites) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.pfad)) {
    console.error(`✖ Ungültiger pfad "${s.pfad}" – erlaubt: kleinbuchstaben-und-bindestriche`);
    process.exit(1);
  }
  if (gesehen.has(s.pfad)) { console.error(`✖ pfad "${s.pfad}" doppelt in sites.json`); process.exit(1); }
  gesehen.add(s.pfad);
}

if (!nur.length) fs.rmSync(PUBLIC, { recursive: true, force: true });
fs.mkdirSync(PUBLIC, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sites-'));
let fehler = 0;

const ERLAUBTE_BILDER = /\.(jpe?g|png|webp)$/i; // bewusst kein SVG (kann Skripte enthalten)

// Stellt die Bilder einer Seite zusammen. Ist "bilder" der Bilderordner der Vorlage selbst,
// wird er direkt genutzt. Sonst: Vorlagenbilder kopieren, eigene Fotos darüberlegen.
function bilderZusammenstellen(s, tmpOrdner) {
  const eigenerOrdner = path.join(ROOT, s.bilder);
  const vorlagenOrdner = path.join(ROOT, s.vorlage, 'images');
  if (path.resolve(eigenerOrdner) === path.resolve(vorlagenOrdner)) return { ordner: vorlagenOrdner, eigene: new Set() };
  fs.mkdirSync(tmpOrdner, { recursive: true });
  if (fs.existsSync(vorlagenOrdner)) fs.cpSync(vorlagenOrdner, tmpOrdner, { recursive: true, preserveTimestamps: true });
  const eigene = new Set();
  (function kopiere(von, rel) {
    if (!fs.existsSync(von)) return;
    for (const e of fs.readdirSync(von, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { kopiere(path.join(von, e.name), r); continue; }
      if (!ERLAUBTE_BILDER.test(e.name)) {
        if (!/\.md$/i.test(e.name)) console.warn(`⚠ ${s.pfad}: ${r} ignoriert – erlaubt sind nur JPG, PNG und WebP`);
        continue;
      }
      fs.mkdirSync(path.join(tmpOrdner, rel), { recursive: true });
      fs.copyFileSync(path.join(von, e.name), path.join(tmpOrdner, r));
      eigene.add(r);
    }
  })(eigenerOrdner, '');
  return { ordner: tmpOrdner, eigene };
}

const auftraege = [];
for (const s of auswahl) {
  const vorlage = path.join(ROOT, s.vorlage);
  const daten = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));

  // Inhalte gegen das Schema der Vorlage prüfen – fehlerhafte Seiten werden nicht gebaut
  const schema = path.join(vorlage, 'schema.json');
  const schemaFehler = fs.existsSync(schema) ? pruefe(daten, schema) : [];
  if (schemaFehler.length) {
    console.error(`\n✖ ${s.pfad}: ${s.daten} hat ${schemaFehler.length} Fehler:\n${schemaFehler.map((f) => '    - ' + f).join('\n')}`);
    fehler++;
    continue;
  }
  if (BASIS_URL && !daten.website_url) daten.website_url = `${BASIS_URL}/${s.pfad}`;

  // Bilder: Vorlagenbilder als Grundlage, eigene Fotos (gleicher Dateiname) ersetzen sie.
  const bilder = bilderZusammenstellen(s, path.join(tmp, `${s.pfad}-bilder`));
  if (bilder.eigene.size) {
    // Für ersetzte Bilder gilt der Unsplash-Nachweis der Vorlage nicht mehr
    daten.bildnachweise = (daten.bildnachweise || []).filter((n) => !bilder.eigene.has(n.datei));
  }
  const datei = path.join(tmp, `${s.pfad}.json`);
  fs.writeFileSync(datei, JSON.stringify(daten));

  const ziel = path.join(PUBLIC, s.pfad);
  fs.rmSync(ziel, { recursive: true, force: true });
  auftraege.push({ s, datei, ziel, bilder, vorlage });
}

// Eine Seite in einem eigenen Prozess bauen; Ausgabe sammeln, damit sie nicht durcheinanderläuft
function baue({ s, datei, ziel, bilder, vorlage }) {
  return new Promise((fertig) => {
    const kind = spawn(process.execPath, [path.join(vorlage, 'build.js'), datei], {
      env: {
        ...process.env,
        BILDER_DIR: bilder.ordner,
        DIST_DIR: ziel,
        // gemeinsamer Cache: Varianten sind nach Prüfsumme benannt, gleiche Fotos werden nur einmal umgewandelt
        CACHE_DIR: path.join(ROOT, '.bildcache'),
      },
    });
    let ausgabe = '';
    kind.stdout.on('data', (d) => { ausgabe += d; });
    kind.stderr.on('data', (d) => { ausgabe += d; });
    kind.on('close', (code) => {
      console.log(`\n▶ ${s.pfad}  (${s.vorlage})\n${ausgabe.trimEnd()}`);
      if (code !== 0) { fehler++; console.error(`✖ ${s.pfad} fehlgeschlagen`); }
      fertig();
    });
  });
}

async function alleBauen() {
  const warteschlange = [...auftraege];
  const gleichzeitig = Math.max(1, Math.min(os.cpus().length, warteschlange.length));
  await Promise.all(Array.from({ length: gleichzeitig }, async () => {
    while (warteschlange.length) await baue(warteschlange.shift());
  }));
}

alleBauen().then(() => {
  fs.rmSync(tmp, { recursive: true, force: true });

  // robots.txt gilt nur im Wurzelverzeichnis: Demo-Seiten sperren, Live-Seiten erlauben
  const robots = ['User-agent: *'];
  for (const s of sites) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));
    robots.push(`${d.demo_modus === true ? 'Disallow' : 'Allow'}: /${s.pfad}/`);
    fs.rmSync(path.join(PUBLIC, s.pfad, 'robots.txt'), { force: true });
  }
  robots.push(`${hub && hub.noindex === false ? 'Allow' : 'Disallow'}: /$`);
  fs.writeFileSync(path.join(PUBLIC, 'robots.txt'), robots.join('\n') + '\n');

  // Startseite (/) mit allen Seiten, die einen "hub"-Eintrag haben
  const imHub = erzeugeHub({ ROOT, PUBLIC, hub, sites });

  console.log(`\n${fehler ? '✖' : '✔'} ${auswahl.length - fehler}/${auswahl.length} Seiten gebaut → public/  (Startseite mit ${imHub} Beispielen)`);
  process.exit(fehler ? 1 : 0);
});

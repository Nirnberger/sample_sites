#!/usr/bin/env node
'use strict';
/*
 * Baut alle Seiten aus sites.json nach public/<pfad>/ – für das Hosting unter einer Domain
 * mit Unterverzeichnissen (z. B. https://demo.example.com/petri-pirsch/).
 *
 *   node build-all.js                     -> alle Seiten
 *   node build-all.js petri-pirsch        -> nur diese Seite(n)
 *   BASIS_URL=https://demo.example.com node build-all.js
 *       setzt website_url je Seite auf BASIS_URL/<pfad>, falls in der JSON leer
 *       (für Canonical-Link und Open-Graph-Bilder).
 *
 * Keine npm-Abhängigkeiten. Nutzt die build.js der jeweiligen Vorlage.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const BASIS_URL = (process.env.BASIS_URL || '').replace(/\/+$/, '');

const { sites } = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
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

for (const s of auswahl) {
  const vorlage = path.join(ROOT, s.vorlage);
  const daten = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));
  if (BASIS_URL && !daten.website_url) daten.website_url = `${BASIS_URL}/${s.pfad}`;
  const datei = path.join(tmp, `${s.pfad}.json`);
  fs.writeFileSync(datei, JSON.stringify(daten));

  const ziel = path.join(PUBLIC, s.pfad);
  fs.rmSync(ziel, { recursive: true, force: true });
  console.log(`\n▶ ${s.pfad}  (${s.vorlage})`);
  const r = spawnSync(process.execPath, [path.join(vorlage, 'build.js'), datei], {
    stdio: 'inherit',
    env: {
      ...process.env,
      BILDER_DIR: path.join(ROOT, s.bilder),
      DIST_DIR: ziel,
      CACHE_DIR: path.join(ROOT, '.bildcache', s.pfad), // eigener Cache je Seite, sonst kollidieren gleichnamige Bilder
    },
  });
  if (r.status !== 0) { fehler++; console.error(`✖ ${s.pfad} fehlgeschlagen`); }
}
fs.rmSync(tmp, { recursive: true, force: true });

// robots.txt gilt nur im Wurzelverzeichnis: Demo-Seiten sperren, Live-Seiten erlauben
const robots = ['User-agent: *'];
for (const s of sites) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));
  robots.push(`${d.demo_modus === true ? 'Disallow' : 'Allow'}: /${s.pfad}/`);
  fs.rmSync(path.join(PUBLIC, s.pfad, 'robots.txt'), { force: true });
}
robots.push('Disallow: /$');
fs.writeFileSync(path.join(PUBLIC, 'robots.txt'), robots.join('\n') + '\n');

console.log(`\n${fehler ? '✖' : '✔'} ${auswahl.length - fehler}/${auswahl.length} Seiten gebaut → public/`);
process.exit(fehler ? 1 : 0);

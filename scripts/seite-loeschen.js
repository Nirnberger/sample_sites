#!/usr/bin/env node
'use strict';
/*
 * Entfernt eine Kunden-Seite: Eintrag aus sites.json + Ordner kunden/<pfad>/.
 * Eingaben über Umgebungsvariablen: PFAD und BESTAETIGUNG (muss exakt dem Pfad entsprechen).
 * Die Beispielseiten der Vorlagen (Daten nicht unter kunden/) können hier nicht gelöscht werden.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pfad = String(process.env.PFAD || '').trim().toLowerCase();
const bestaetigung = String(process.env.BESTAETIGUNG || '').trim().toLowerCase();

const abbruch = (t) => { console.error('✖ ' + t); process.exit(1); };
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pfad)) abbruch('Ungültiger Pfad.');
if (bestaetigung !== pfad) abbruch(`Bestätigung stimmt nicht: bitte exakt "${pfad}" eintippen.`);

const sitesDatei = path.join(ROOT, 'sites.json');
const sitesJson = JSON.parse(fs.readFileSync(sitesDatei, 'utf8'));
const eintrag = sitesJson.sites.find((s) => s.pfad === pfad);
if (!eintrag) abbruch(`Keine Seite mit Pfad "${pfad}" in sites.json.`);
if (!String(eintrag.daten).startsWith(`kunden/${pfad}/`)) {
  abbruch(`"${pfad}" ist eine Beispielseite einer Vorlage und wird hier nicht gelöscht.`);
}

sitesJson.sites = sitesJson.sites.filter((s) => s.pfad !== pfad);
fs.writeFileSync(sitesDatei, JSON.stringify(sitesJson, null, 2) + '\n');

const ordner = path.join(ROOT, 'kunden', pfad);
// Sicherheitsnetz: nur einen direkten Unterordner von kunden/ löschen
if (path.dirname(ordner) !== path.join(ROOT, 'kunden')) abbruch('Unerwarteter Ordnerpfad.');
fs.rmSync(ordner, { recursive: true, force: true });

console.log(`✔ Seite "${pfad}" (${eintrag.vorlage}) aus sites.json entfernt und kunden/${pfad}/ gelöscht.`);

#!/usr/bin/env node
'use strict';
/*
 * Prüft alle Inhaltsdateien aus sites.json gegen das Schema ihrer Vorlage (vorlagen/<name>/schema.json).
 *   node tests/inhalte.js
 * Läuft in der Pipeline vor dem Docker-Build; build-all.js prüft zusätzlich vor jedem Bauen.
 */

const fs = require('fs');
const path = require('path');
const { pruefe } = require('../lib/schema');

const ROOT = path.join(__dirname, '..');
const { sites } = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
let fehlerGesamt = 0;

for (const s of sites) {
  const schema = path.join(ROOT, s.vorlage, 'schema.json');
  if (!fs.existsSync(schema)) { console.log(`– ${s.pfad}: kein Schema in ${s.vorlage}/ – übersprungen`); continue; }
  let daten;
  try {
    daten = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));
  } catch (e) {
    console.error(`✖ ${s.pfad}: ${s.daten} ist kein gültiges JSON – ${e.message}`);
    fehlerGesamt++;
    continue;
  }
  const fehler = pruefe(daten, schema);
  fehlerGesamt += fehler.length;
  console.log(fehler.length ? `✖ ${s.pfad} (${s.daten}):\n${fehler.map((f) => '    - ' + f).join('\n')}` : `✔ ${s.pfad}`);
}

process.exit(fehlerGesamt ? 1 : 0);

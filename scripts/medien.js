#!/usr/bin/env node
'use strict';
/*
 * Kundenfotos und -medien mit dem Objektspeicher abgleichen (sie liegen bewusst nicht in Git).
 *
 *   node scripts/medien.js hochladen <pfad>     kunden/<pfad>/images + /medien → Speicher
 *   node scripts/medien.js holen [<pfad> …]     Speicher → kunden/<pfad>/ (ohne Pfad: alle Kundenseiten)
 *   node scripts/medien.js liste <pfad>         zeigt, was im Speicher liegt
 *   node scripts/medien.js bucket               legt den Bucket an (einmalig)
 *
 * Zugangsdaten über Umgebungsvariablen (nie in Dateien schreiben):
 *   MEDIEN_ENDPUNKT   z. B. https://medien.seitenschwung.com
 *   MEDIEN_BUCKET     Standard: kunden-medien
 *   MEDIEN_ZUGANG / MEDIEN_GEHEIMNIS   Access Key / Secret Key
 *   MEDIEN_REGION     Standard: us-east-1 (bei MinIO/Garage egal)
 * build-all.js holt die Medien automatisch, wenn MEDIEN_ENDPUNKT gesetzt ist.
 */

const fs = require('fs');
const path = require('path');
const { s3AusUmgebung } = require('../lib/s3');
const { medienHolen, medienHochladen } = require('../lib/medien');

const ROOT = path.join(__dirname, '..');
const [befehl, ...pfade] = process.argv.slice(2);
const abbruch = (t) => { console.error('✖ ' + t); process.exit(1); };

const s3 = s3AusUmgebung();
if (!s3) abbruch('MEDIEN_ENDPUNKT ist nicht gesetzt (siehe Kopf dieser Datei).');
const { sites } = JSON.parse(fs.readFileSync(path.join(ROOT, 'sites.json'), 'utf8'));
const kundenPfade = sites.filter((s) => String(s.daten).startsWith('kunden/')).map((s) => s.pfad);
for (const p of pfade) if (!kundenPfade.includes(p)) abbruch(`"${p}" ist keine Kundenseite in sites.json.`);

(async () => {
  if (befehl === 'hochladen') {
    if (pfade.length !== 1) abbruch('Bitte genau einen Pfad angeben: node scripts/medien.js hochladen <pfad>');
    const n = await medienHochladen(s3, ROOT, pfade[0]);
    console.log(`✔ ${n} Datei(en) hochgeladen`);
  } else if (befehl === 'holen') {
    const n = await medienHolen(s3, ROOT, pfade.length ? pfade : kundenPfade);
    console.log(`✔ ${n} Datei(en) neu geholt`);
  } else if (befehl === 'liste') {
    if (pfade.length !== 1) abbruch('Bitte genau einen Pfad angeben.');
    for (const o of await s3.liste(`${pfade[0]}/`)) console.log(`${(o.groesse / 1024).toFixed(0).padStart(7)} KB  ${o.schluessel}`);
  } else if (befehl === 'bucket') {
    await s3.bucketAnlegen();
    console.log('✔ Bucket bereit');
  } else {
    abbruch('Befehl: hochladen <pfad> | holen [<pfad> …] | liste <pfad> | bucket');
  }
})().catch((e) => abbruch(e.message));

'use strict';
// Kundenfotos und -medien (Video, Audio) liegen nicht im Git-Repository, sondern im Objektspeicher:
//   <bucket>/<ordner>/images/…   →  kunden/<ordner>/images/   (Fotos, überlagern die Vorlagenbilder)
//   <bucket>/<ordner>/medien/…   →  kunden/<ordner>/medien/   (Showreels, Hörproben; landen unverändert in der Seite)
// <ordner> ist der Kundenordner aus "daten" (kunden/<ordner>/…) – mehrere Seiten (z. B. nora-solcher/v1
// und nora-solcher/v2) können sich so einen Ordner und dieselben Fotos teilen.
// Abgleich über Größe und Prüfsumme (ETag): unveränderte Dateien werden nicht erneut übertragen.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ORDNER = ['images', 'medien'];
const TYPEN = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
  '.vtt': 'text/vtt', '.pdf': 'application/pdf',
};

const md5 = (datei) => crypto.createHash('md5').update(fs.readFileSync(datei)).digest('hex');
function gleich(datei, objekt) {
  if (!fs.existsSync(datei) || fs.statSync(datei).size !== objekt.groesse) return false;
  return objekt.etag.includes('-') || md5(datei) === objekt.etag; // mehrteilige Uploads: nur Größe vergleichbar
}

/** Lädt die Medien der angegebenen Kundenseiten herunter. Rückgabe: Anzahl neu geholter Dateien. */
async function medienHolen(s3, root, pfade, log = console.log) {
  let neu = 0;
  for (const pfad of pfade) {
    const objekte = await s3.liste(`${pfad}/`);
    for (const o of objekte) {
      const rel = o.schluessel.slice(pfad.length + 1);
      if (!ORDNER.includes(rel.split('/')[0]) || rel.endsWith('/') || rel.split('/').includes('..')) continue;
      const ziel = path.join(root, 'kunden', pfad, rel);
      if (gleich(ziel, o)) continue;
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      fs.writeFileSync(ziel, await s3.holen(o.schluessel));
      neu++;
    }
    log(`  ${pfad}: ${objekte.length} Datei(en) im Speicher`);
  }
  return neu;
}

/** Lädt kunden/<pfad>/images und /medien in den Speicher hoch. Rückgabe: Anzahl hochgeladener Dateien. */
async function medienHochladen(s3, root, pfad, log = console.log) {
  const vorhanden = new Map((await s3.liste(`${pfad}/`)).map((o) => [o.schluessel, o]));
  let hoch = 0;
  for (const ordner of ORDNER) {
    const basis = path.join(root, 'kunden', pfad, ordner);
    if (!fs.existsSync(basis)) continue;
    const dateien = fs.readdirSync(basis, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
    for (const e of dateien) {
      const datei = path.join(e.parentPath || e.path, e.name);
      const rel = path.relative(basis, datei).split(path.sep).join('/');
      const typ = TYPEN[path.extname(e.name).toLowerCase()];
      if (!typ) { if (!/\.md$/i.test(e.name)) log(`  übersprungen (Dateityp nicht erlaubt): ${ordner}/${rel}`); continue; }
      const schluessel = `${pfad}/${ordner}/${rel}`;
      if (vorhanden.has(schluessel) && gleich(datei, vorhanden.get(schluessel))) continue;
      await s3.ablegen(schluessel, fs.readFileSync(datei), typ);
      log(`  hochgeladen: ${schluessel}`);
      hoch++;
    }
  }
  return hoch;
}

/** Kundenordner einer Seite aus sites.json (kunden/<ordner>/…) – oder null bei Vorlagen-Beispielseiten. */
function kundenOrdner(s) {
  const m = /^kunden\/([^/]+)\//.exec(String(s.daten));
  return m ? m[1] : null;
}

module.exports = { medienHolen, medienHochladen, kundenOrdner };

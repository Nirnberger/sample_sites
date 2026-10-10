#!/usr/bin/env node
'use strict';
/*
 * Legt eine neue Seite aus einer Vorlage an: kunden/<pfad>/<daten>.json + Eintrag in sites.json.
 * Wird vom GitHub-Workflow „Neue Seite“ aufgerufen, funktioniert aber auch lokal.
 *
 * Eingaben kommen ausschließlich über Umgebungsvariablen (nie in Shell-Befehle eingesetzt):
 *   PFAD, VORLAGE (salon|barber|cafe|angel-jagd), NAME, LAND, TELEFON, EMAIL, WHATSAPP, INHABER,
 *   IM_HUB (true/false), dazu ADRESSE ("Straße Nr, PLZ Ort") oder einzeln STRASSE/PLZ/ORT
 *   und GOOGLE ("4.8 (210)") oder einzeln GOOGLE_BEWERTUNG/GOOGLE_ANZAHL.
 *
 * Bilder: Es werden keine Fotos kopiert. Die Seite nutzt die Bilder der Vorlage, bis im Ordner
 * kunden/<pfad>/images/ gleichnamige eigene Fotos liegen (siehe build-all.js).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VORLAGEN = {
  salon: { ordner: 'salon-vorlage', datei: 'salon.json' },
  barber: { ordner: 'barber-vorlage', datei: 'barber.json' },
  cafe: { ordner: 'cafe-vorlage', datei: 'cafe.json' },
  'angel-jagd': { ordner: 'angel-jagd-vorlage', datei: 'shop.json' },
};
const LAENDER = ['Deutschland', 'Österreich', 'Schweiz'];

const e = (k) => String(process.env[k] || '').trim();
const fehler = [];
function pruefe(bedingung, text) { if (!bedingung) fehler.push(text); }
// Nur druckbare Zeichen, keine Steuerzeichen/Spitzklammern, begrenzte Länge
const textOk = (t, max = 120) => t.length <= max && !/[\u0000-\u001f<>]/.test(t);

// Zusammengefasste Formularfelder zerlegen: ADRESSE = "Straße Nr, PLZ Ort", GOOGLE = "4.8 (210)"
const adresse = e('ADRESSE').match(/^(.+?),\s*(\d{4,5})\s+(.+)$/) || [];
const google = e('GOOGLE').match(/^\s*(\d(?:[.,]\d)?)\s*(?:\(?\s*(\d{1,6})\s*\)?)?\s*$/) || [];
pruefe(!e('ADRESSE') || adresse.length, 'Adresse bitte im Format "Straße Nr, PLZ Ort", z. B. "Neubaugasse 12, 1070 Wien"');
pruefe(!e('GOOGLE') || google.length, 'Google bitte im Format "4.8 (210)" – Bewertung und Anzahl');

const ein = {
  pfad: e('PFAD').toLowerCase().replace(/^\/+|\/+$/g, ''),
  vorlage: e('VORLAGE'),
  name: e('NAME'),
  strasse: e('STRASSE') || (adresse[1] || '').trim(),
  plz: e('PLZ') || adresse[2] || '',
  ort: e('ORT') || (adresse[3] || '').trim(),
  land: e('LAND') || 'Deutschland',
  telefon: e('TELEFON'),
  email: e('EMAIL'),
  whatsapp: e('WHATSAPP'),
  inhaber: e('INHABER'),
  bewertung: (e('GOOGLE_BEWERTUNG') || google[1] || '').replace(',', '.'),
  anzahl: e('GOOGLE_ANZAHL') || google[2] || '',
  imHub: e('IM_HUB') === 'true',
};

pruefe(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ein.pfad) && ein.pfad.length <= 60, 'Pfad: nur a-z, 0-9 und Bindestriche (max. 60 Zeichen), z. B. "cafe-sonnenschein-wien"');
pruefe(VORLAGEN[ein.vorlage], `Vorlage muss eine von ${Object.keys(VORLAGEN).join(', ')} sein`);
pruefe(ein.name && textOk(ein.name, 80), 'Name fehlt oder enthält ungültige Zeichen (keine < oder >)');
if (!e('ADRESSE') || adresse.length) {
  pruefe(ein.strasse && textOk(ein.strasse), 'Straße fehlt oder ist ungültig');
  pruefe(/^\d{4,5}$/.test(ein.plz), 'PLZ: 4 oder 5 Ziffern');
  pruefe(ein.ort && textOk(ein.ort, 60), 'Ort fehlt oder ist ungültig');
}
pruefe(LAENDER.includes(ein.land), `Land muss eines von ${LAENDER.join(', ')} sein`);
pruefe(/^[+\d][\d /()-]{5,24}$/.test(ein.telefon), 'Telefon: nur Ziffern, Leerzeichen, + / ( ) -');
pruefe(!ein.email || /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(ein.email), 'E-Mail ungültig');
pruefe(!ein.whatsapp || /^[+\d][\d /()-]{5,24}$/.test(ein.whatsapp), 'WhatsApp-Nummer ungültig');
pruefe(!ein.inhaber || textOk(ein.inhaber, 80), 'Inhaber enthält ungültige Zeichen');
pruefe(!ein.bewertung || (/^\d(\.\d)?$/.test(ein.bewertung) && +ein.bewertung >= 1 && +ein.bewertung <= 5), 'Google-Bewertung: Zahl von 1 bis 5, z. B. 4.8');
pruefe(!ein.anzahl || /^\d{1,6}$/.test(ein.anzahl), 'Anzahl Bewertungen: ganze Zahl');

const sitesDatei = path.join(ROOT, 'sites.json');
const sitesJson = JSON.parse(fs.readFileSync(sitesDatei, 'utf8'));
pruefe(!sitesJson.sites.some((s) => s.pfad === ein.pfad), `Pfad "${ein.pfad}" ist bereits vergeben`);
const zielOrdner = path.join(ROOT, 'kunden', ein.pfad);
pruefe(!fs.existsSync(zielOrdner), `Ordner kunden/${ein.pfad} existiert bereits`);

if (fehler.length) {
  console.error('✖ Eingaben ungültig:\n  - ' + fehler.join('\n  - '));
  process.exit(1);
}

// --- Vorlagen-Daten laden und auf den neuen Betrieb umschreiben ---
const v = VORLAGEN[ein.vorlage];
const vorlageDaten = JSON.parse(fs.readFileSync(path.join(ROOT, v.ordner, v.datei), 'utf8'));
const alt = vorlageDaten.kontakt || {};
const altAdr = alt.adresse || {};
const altInhaber = ((vorlageDaten.impressum || '').match(/Inhaber(?:in)?:\s*([^\n,]+)/) || [])[1];

// Alle Erwähnungen des Beispielbetriebs (Name, Adresse, Kontakt, Inhaber) im ganzen Text ersetzen.
// Nur ganze Wörter, damit z. B. "Kieler" nicht zu "Wiener" wird.
const ersetze = [
  [vorlageDaten.name, ein.name],
  [altAdr.strasse, ein.strasse],
  [altAdr.plz, ein.plz],
  [altAdr.ort, ein.ort],
  [alt.telefon, ein.telefon],
  [alt.email, ein.email || '[E-Mail eintragen]'],
  [alt.whatsapp, ein.whatsapp || ein.telefon],
  [altInhaber, ein.inhaber || '[Inhaber/in eintragen]'],
].filter(([a, b]) => a && b && a !== b);
const regexEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const muster = ersetze.map(([a, b]) => [new RegExp(`(?<![\\p{L}\\p{N}])${regexEsc(a)}(?![\\p{L}\\p{N}])`, 'gu'), b]);
// In jedem Textfeld einzeln ersetzen (echte Zeilenumbrüche statt "\\n" im JSON-Text)
function ersetzeTief(wert) {
  if (typeof wert === 'string') return muster.reduce((t, [re, neu]) => t.replace(re, () => neu), wert);
  if (Array.isArray(wert)) return wert.map(ersetzeTief);
  if (wert && typeof wert === 'object') return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, ersetzeTief(v)]));
  return wert;
}
const d = ersetzeTief(vorlageDaten);

d.demo_modus = true;
d.website_url = '';
d.kontakt = {
  telefon: ein.telefon,
  email: ein.email,
  whatsapp: ein.whatsapp,
  adresse: { strasse: ein.strasse, plz: ein.plz, ort: ein.ort, land: ein.land },
};
d.buchung_url = '';
if ('bestell_url' in d) d.bestell_url = '';
d.google_link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ein.name} ${ein.ort}`)}`;
// Erfundene Bewertungen und Personen der Vorlage gehören nicht zu einem echten Betrieb
d.bewertungen = [];
d.team = [];
if (ein.bewertung) d.google_bewertung = Number(ein.bewertung); else delete d.google_bewertung;
if (ein.anzahl) d.google_anzahl = Number(ein.anzahl); else delete d.google_anzahl;
d.social = { instagram: '', facebook: '' };

fs.mkdirSync(path.join(zielOrdner, 'images'), { recursive: true });
fs.writeFileSync(path.join(zielOrdner, v.datei), JSON.stringify(d, null, 2) + '\n');
fs.writeFileSync(path.join(zielOrdner, 'images', 'LIESMICH.md'),
  `# Eigene Fotos für ${ein.name}\n\nHier hochgeladene Fotos ersetzen das gleichnamige Bild der Vorlage ` +
  `(z. B. \`${typeof vorlageDaten.hero_bild === 'object' ? vorlageDaten.hero_bild.datei : 'hero.jpg'}\` für das große Foto oben).\n` +
  'Erlaubt: JPG, PNG, WebP. Fehlende Fotos werden aus der Vorlage übernommen.\n');

const eintrag = { pfad: ein.pfad, vorlage: v.ordner, daten: `kunden/${ein.pfad}/${v.datei}`, bilder: `kunden/${ein.pfad}/images` };
if (ein.imHub) eintrag.hub = { branche: d.branche || '', stil: '', beschreibung: (d.kurzbeschreibung || '').slice(0, 160), merkmale: [] };
sitesJson.sites.push(eintrag);
fs.writeFileSync(sitesDatei, JSON.stringify(sitesJson, null, 2) + '\n');

// Zusammenfassung für den Pull Request (GitHub setzt GITHUB_OUTPUT)
const zusammenfassung = [
  `Neue Seite **${ein.name}** (${ein.ort}) aus der Vorlage \`${v.ordner}\` unter \`/${ein.pfad}/\`.`,
  '',
  '**Vor dem Zeigen beim Kunden prüfen:**',
  `- [ ] Texte in \`kunden/${ein.pfad}/${v.datei}\` anpassen (Slogan, Über uns, Leistungen/Preise, Öffnungszeiten)`,
  `- [ ] Eigene Fotos nach \`kunden/${ein.pfad}/images/\` hochladen (gleiche Dateinamen wie in der Vorlage)`,
  '- [ ] Nur **echte** Bewertungen eintragen (Feld `bewertungen`) – die Beispiel-Bewertungen wurden entfernt',
  '- [ ] Impressum und Datenschutz vervollständigen ([…]-Platzhalter)',
  ein.imHub ? '- [ ] Erscheint im Hub – `hub.stil` und `hub.merkmale` in `sites.json` ergänzen' : '- Erscheint **nicht** im Hub (nur direkt über den Pfad erreichbar)',
].join('\n');
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `zusammenfassung<<ENDE\n${zusammenfassung}\nENDE\n`);
}
console.log(`✔ kunden/${ein.pfad}/ angelegt und in sites.json eingetragen\n\n${zusammenfassung}`);

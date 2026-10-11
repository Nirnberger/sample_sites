#!/usr/bin/env node
'use strict';
/*
 * Legt eine neue Seite aus einer Vorlage an: kunden/<pfad>/<daten>.json + Eintrag in sites.json.
 * Wird vom GitHub-Workflow „Neue Seite“ aufgerufen, funktioniert aber auch lokal.
 *
 * Eingaben kommen ausschließlich über Umgebungsvariablen (nie in Shell-Befehle eingesetzt).
 * Nur NAME ist Pflicht; ungültige optionale Angaben werden ignoriert und im Pull Request gemeldet:
 *   NAME (Pflicht), PFAD (sonst aus dem Namen), VORLAGE (salon|barber|cafe|angel-jagd, sonst cafe), LAND, TELEFON, EMAIL, WHATSAPP, INHABER,
 *   IM_HUB (true/false), dazu ADRESSE ("Straße Nr, PLZ Ort") oder einzeln STRASSE/PLZ/ORT
 *   und GOOGLE ("4.8 (210)") oder einzeln GOOGLE_BEWERTUNG/GOOGLE_ANZAHL.
 *
 * Bilder: Es werden keine Fotos kopiert. Die Seite nutzt die Bilder der Vorlage, bis im Objektspeicher
 * unter <pfad>/images/ gleichnamige eigene Fotos liegen (scripts/medien.js, siehe HOSTING.md) – Kundenfotos
 * kommen nie ins Git-Repository.
 */

const fs = require('fs');
const path = require('path');
const { slug } = require('../lib/helfer');

const ROOT = path.join(__dirname, '..');
const VORLAGEN = {
  salon: { ordner: 'vorlagen/salon', datei: 'salon.json' },
  barber: { ordner: 'vorlagen/barber', datei: 'barber.json' },
  cafe: { ordner: 'vorlagen/cafe', datei: 'cafe.json' },
  'angel-jagd': { ordner: 'vorlagen/angel-jagd', datei: 'shop.json' },
};
const LAENDER = ['Deutschland', 'Österreich', 'Schweiz'];

const e = (k) => String(process.env[k] || '').trim();
const fehler = [];   // brechen ab (nur Pfad, Vorlage, Name)
const hinweise = []; // ungültige optionale Angaben werden ignoriert und im Pull Request aufgelistet
function pruefe(bedingung, text) { if (!bedingung) fehler.push(text); }
// Steuerzeichen und Spitzklammern entfernen (Schutz vor eingeschleustem HTML), Länge begrenzen
const sauber = (t, max = 120) => t.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
// Optionale Angabe: gültig → übernehmen, sonst Hinweis und leer lassen
function optional(wert, gueltig, text) {
  if (!wert) return '';
  if (gueltig(wert)) return wert;
  hinweise.push(`${text} („${sauber(wert, 60)}“) – ignoriert, bitte in der JSON-Datei nachtragen`);
  return '';
}
const nummer = (t) => /^[+\d][\d /()-]{5,24}$/.test(t);

// Zusammengefasste Formularfelder zerlegen: ADRESSE = "Straße Nr, PLZ Ort", GOOGLE = "4.8 (210)"
const adresseRoh = sauber(e('ADRESSE'));
const adresse = adresseRoh.match(/^(.+?),\s*(\d{4,5})\s+(.+)$/) || [];
if (adresseRoh && !adresse.length) hinweise.push(`Adresse „${adresseRoh}“ nicht im Format „Straße Nr, PLZ Ort“ – als Straße übernommen, PLZ/Ort bitte nachtragen`);
const google = e('GOOGLE').match(/^\s*(\d(?:[.,]\d)?)\s*(?:\(?\s*(\d{1,6})\s*\)?)?\s*$/) || [];
if (e('GOOGLE') && !google.length) hinweise.push(`Google-Bewertung „${sauber(e('GOOGLE'), 30)}“ nicht im Format „4.8 (210)“ – ignoriert`);

const ein = {
  pfad: e('PFAD').toLowerCase().replace(/^\/+|\/+$/g, ''),
  vorlage: VORLAGEN[e('VORLAGE')] ? e('VORLAGE') : 'cafe',
  name: sauber(e('NAME'), 80),
  strasse: sauber(e('STRASSE')) || (adresse.length ? adresse[1].trim() : adresseRoh) || '[Straße eintragen]',
  plz: optional(e('PLZ') || adresse[2] || '', (t) => /^\d{4,5}$/.test(t), 'PLZ ungültig') || '[PLZ]',
  ort: sauber(e('ORT'), 60) || (adresse[3] || '').trim() || '[Ort]',
  land: LAENDER.includes(e('LAND')) ? e('LAND') : 'Deutschland',
  telefon: optional(e('TELEFON'), nummer, 'Telefonnummer ungültig'),
  email: optional(e('EMAIL'), (t) => /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(t), 'E-Mail ungültig'),
  whatsapp: optional(e('WHATSAPP'), nummer, 'WhatsApp-Nummer ungültig'),
  inhaber: sauber(e('INHABER'), 80),
  bewertung: optional((e('GOOGLE_BEWERTUNG') || google[1] || '').replace(',', '.'), (t) => /^\d(\.\d)?$/.test(t) && +t >= 1 && +t <= 5, 'Google-Bewertung muss zwischen 1 und 5 liegen'),
  anzahl: optional(e('GOOGLE_ANZAHL') || google[2] || '', (t) => /^\d{1,6}$/.test(t), 'Anzahl Bewertungen ungültig'),
  imHub: e('IM_HUB') === 'true',
};
if (e('LAND') && ein.land !== e('LAND')) hinweise.push(`Land „${sauber(e('LAND'), 30)}“ unbekannt – Deutschland verwendet`);

if (e('VORLAGE') && ein.vorlage !== e('VORLAGE')) hinweise.push(`Vorlage „${sauber(e('VORLAGE'), 30)}“ unbekannt – cafe verwendet`);
pruefe(ein.name, 'Name fehlt');

// Pfad: fehlt oder ungültig → aus dem Namen bilden; schon vergeben → -2, -3 … anhängen
const sitesDatei = path.join(ROOT, 'sites.json');
const sitesJson = JSON.parse(fs.readFileSync(sitesDatei, 'utf8'));
const pfadOk = (p) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p) && p.length <= 60;
if (!pfadOk(ein.pfad)) {
  // Akzente entfernen (é → e), Umlaute macht slug() zu ae/oe/ue
  const ascii = ein.name.toLowerCase().replace(/[^\u0000-\u007fäöüß]/g, (c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const neu = slug(ascii).slice(0, 55).replace(/-+$/, '') || 'seite';
  if (ein.pfad) hinweise.push(`Pfad „${sauber(ein.pfad, 60)}“ ungültig – „${neu}“ verwendet`);
  ein.pfad = neu;
}
const vergeben = (p) => sitesJson.sites.some((s) => s.pfad === p) || fs.existsSync(path.join(ROOT, 'kunden', p));
if (vergeben(ein.pfad)) {
  const basis = ein.pfad.slice(0, 55);
  let n = 2;
  while (vergeben(`${basis}-${n}`)) n++;
  hinweise.push(`Pfad „${ein.pfad}“ schon vergeben – „${basis}-${n}“ verwendet`);
  ein.pfad = `${basis}-${n}`;
}
const zielOrdner = path.join(ROOT, 'kunden', ein.pfad);

if (fehler.length) {
  console.error('✖ Eingaben ungültig:\n  - ' + fehler.join('\n  - '));
  process.exit(1);
}
if (hinweise.length) console.warn('⚠ ' + hinweise.join('\n⚠ '));

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
  [alt.telefon, ein.telefon || '[Telefon eintragen]'],
  [alt.email, ein.email || '[E-Mail eintragen]'],
  [alt.whatsapp, ein.whatsapp || ein.telefon || '[Telefon eintragen]'],
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
  `# Eigene Fotos für ${ein.name}\n\nFotos gehören nicht ins Git-Repository, sondern in den Objektspeicher:\n` +
  `\`node scripts/medien.js hochladen ${ein.pfad}\` (Zugangsdaten siehe HOSTING.md). Beim Build landen sie hier.\n\n` +
  `Ein Foto ersetzt das gleichnamige Bild der Vorlage ` +
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
  ...(hinweise.length ? ['**⚠ Ignorierte Angaben:**', ...hinweise.map((h) => `- ${h}`), ''] : []),
  '**Vor dem Zeigen beim Kunden prüfen:**',
  `- [ ] Texte in \`kunden/${ein.pfad}/${v.datei}\` anpassen (Slogan, Über uns, Leistungen/Preise, Öffnungszeiten)`,
  `- [ ] Eigene Fotos in den Objektspeicher unter \`${ein.pfad}/images/\` laden – **nicht** ins Repository (gleiche Dateinamen wie in der Vorlage, siehe HOSTING.md → Kundenfotos)`,
  '- [ ] Nur **echte** Bewertungen eintragen (Feld `bewertungen`) – die Beispiel-Bewertungen wurden entfernt',
  '- [ ] Impressum und Datenschutz vervollständigen ([…]-Platzhalter)',
  ein.imHub ? '- [ ] Erscheint im Hub – `hub.stil` und `hub.merkmale` in `sites.json` ergänzen' : '- Erscheint **nicht** im Hub (nur direkt über den Pfad erreichbar)',
].join('\n');
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `pfad=${ein.pfad}\nname=${ein.name}\nzusammenfassung<<ENDE\n${zusammenfassung}\nENDE\n`);
}
console.log(`✔ kunden/${ein.pfad}/ angelegt und in sites.json eingetragen\n\n${zusammenfassung}`);

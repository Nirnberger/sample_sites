#!/usr/bin/env node
'use strict';
/*
 * Build-Skript für die Bühnen-Vorlage – künstlerisches Portfolio für Schauspieler:innen,
 * inszeniert wie ein Theaterabend: Ouvertüre, Prolog, Besetzungszettel, vier Akte
 * (Bühne, Kamera, Stimme, Feder, Unterricht), Kontaktbogen, Tickets, Vorhang.
 *
 *   node build.js ../kunden/<pfad>/schauspiel.json    -> schreibt dist/
 *   BILDER_DIR=... DIST_DIR=... node build.js datei   -> so ruft build-all.js die Vorlage auf
 *
 * Gleiches Datenformat wie die Schauspiel-Vorlage (plus optionale Felder hero_rollen, prolog,
 * zitat, register, vita[].akt, galerie[].markiert) – die Vorlage lässt sich in sites.json tauschen.
 * Keine npm-Abhängigkeiten; WebP-Varianten über `cwebp`, falls installiert.
 */

const fs = require('fs');
const path = require('path');
const h = require('../../lib/helfer');
const { bildVerarbeitung, bildTag } = require('../../lib/bilder');
const farbschema = require('../../lib/farbschema');

const ROOT = __dirname;
const DATEI = path.resolve(process.argv[2] || path.join(ROOT, 'schauspiel.json'));
const BILDER = path.resolve(process.env.BILDER_DIR || path.join(path.dirname(DATEI), 'images'));
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const CACHE = path.resolve(process.env.CACHE_DIR || path.join(ROOT, '.bildcache'));

const warnungen = [];
const warn = (text) => warnungen.push(text);
const esc = h.esc;

// ---------------------------------------------------------------------------
// 1. Daten laden
// ---------------------------------------------------------------------------

let s;
try {
  s = JSON.parse(fs.readFileSync(DATEI, 'utf8'));
} catch (e) {
  console.error(`✖ ${path.basename(DATEI)} konnte nicht gelesen werden: ${e.message}`);
  process.exit(1);
}
if (!s.name) { console.error('✖ Pflichtfeld "name" fehlt.'); process.exit(1); }

s.berufe = (s.berufe || []).filter(Boolean);
s.hero_rollen = (s.hero_rollen || []).filter((r) => r && r.rolle);
s.aktuell = (s.aktuell || []).filter((x) => x && x.titel);
s.vita = (s.vita || []).filter((k) => k && k.kategorie && (k.eintraege || []).length);
s.auszeichnungen = (s.auszeichnungen || []).filter((x) => x && x.titel);
s.steckbrief = (s.steckbrief || []).filter((x) => x && x.label && x.wert);
s.register = (s.register || []).filter((r) => r && r.gruppe && (r.werte || []).length);
s.medien = (s.medien || []).filter((m) => m && m.titel && /^https:\/\//i.test(m.url || ''));
s.galerie = (s.galerie || []).filter((g) => g && g.datei);
s.profile = (s.profile || []).filter((p) => p && p.name && /^https:\/\//i.test(p.url || ''));
s.kontakt = s.kontakt || {};
s.farben = s.farben || {};
const agentur = s.kontakt.agentur || {};
const demo = s.demo_modus === true;
const berufText = s.berufe.join(' · ') || 'Schauspiel';
const [vorname, ...rest] = s.name.trim().split(/\s+/);
const nachname = rest.join(' ');

// Vita-Bereiche zu Akten zusammenfassen (z. B. Synchron gehört zum Akt „Stimme“)
const akte = [];
for (const k of s.vita) {
  const akt = k.akt || {};
  const ziel = akt.gehoert_zu && akte.find((a) => a.kategorie === akt.gehoert_zu);
  if (ziel) { ziel.eintraege.push(...k.eintraege); continue; }
  akte.push({
    kategorie: k.kategorie,
    nr: akt.nr || '',
    titel: akt.titel || k.kategorie,
    stil: ['buehne', 'kamera', 'stimme', 'feder', 'unterricht'].includes(akt.stil) ? akt.stil : 'buehne',
    intro: akt.intro || '',
    angebote_titel: akt.angebote_titel || '',
    angebote: akt.angebote || [],
    hervorhebung: akt.hervorhebung || '',
    zitat: akt.zitat || null,
    eintraege: [...k.eintraege],
    id: h.slug(akt.titel || k.kategorie),
  });
}

// ---------------------------------------------------------------------------
// 2. Farben
// ---------------------------------------------------------------------------

// Standard: Bühnenschwarz, Programmheft-Papier, Vorhangrot aus farben.akzent. Mit "farbschema"
// (coolors.co, siehe lib/farbschema.js): dunkelste Farbe = Bühne, hellste = Papier, kräftigste = Vorhang,
// übrige = Filmklappen-Gelb. Alle Textfarben werden auf ausreichenden Kontrast nachgeregelt.
if (s.farben.akzent && !h.hexZuRgb(s.farben.akzent)) warn(`Akzentfarbe "${s.farben.akzent}" ist kein gültiger Hex-Wert – Standard wird verwendet.`);
const farben = farbschema.variablen('buehne', s.farbschema || '', s.farben.akzent);
if (s.farbschema && !farben.farben.length) warn('farbschema enthält keine erkennbaren Farben – Standardfarben werden verwendet.');
const NACHT = farben.variablen['--nacht'] || '#100E0D';
const PAPIER = farben.variablen['--papier'] || '#EDE5D6';
const rotHell = farben.variablen['--rot-hell'];

// ---------------------------------------------------------------------------
// 3. Ausgabeordner
// ---------------------------------------------------------------------------

fs.rmSync(DIST, { recursive: true, force: true });
for (const d of [DIST, path.join(DIST, 'img'), path.join(DIST, 'fonts'), path.join(DIST, 'js'), CACHE]) {
  fs.mkdirSync(d, { recursive: true });
}
for (const f of fs.readdirSync(path.join(ROOT, 'fonts'))) {
  if (f.endsWith('.woff2')) fs.copyFileSync(path.join(ROOT, 'fonts', f), path.join(DIST, 'fonts', f));
}
// Skripte mit Versionsnummer (?v=Prüfsumme) einbinden: nginx lässt JS 7 Tage im Browser-Cache,
// ohne neue Adresse sähen wiederkehrende Besucher Änderungen erst nach einer Woche.
const version = (text) => require('crypto').createHash('sha1').update(text).digest('hex').slice(0, 8);
const farbschemaJs = fs.readFileSync(path.join(ROOT, '../../lib/farbschema.js'), 'utf8');
fs.writeFileSync(path.join(DIST, 'js/farbschema.js'), farbschemaJs); // Farb-Labor (…#farben)
const mainJs = fs.readFileSync(path.join(ROOT, 'src/js/main.js'), 'utf8')
  .replace("'js/farbschema.js'", `'js/farbschema.js?v=${version(farbschemaJs)}'`);
fs.writeFileSync(path.join(DIST, 'js/main.js'), mainJs);
const mainJsUrl = `js/main.js?v=${version(mainJs)}`;

// ---------------------------------------------------------------------------
// 4. Bilder: responsive WebP-Varianten (mit Cache) und Fotonachweise
// ---------------------------------------------------------------------------

const { verarbeite: verarbeiteBild } = bildVerarbeitung({ bilderDir: BILDER, distDir: DIST, cacheDir: CACHE, warn, qualitaet: 78, minBreite: 1000 });
const benutzt = new Map(); // datei -> { alt, credit } aller gezeigten Bilder

// Fotonachweis zu einer Datei – aus dem Bild selbst oder aus einem anderen Eintrag mit derselben Datei
const alleBilder = [s.hero_bild, s.ueber_mich_bild, ...s.galerie, ...s.aktuell.map((a) => a.bild)].filter((b) => b && typeof b === 'object');
const creditFuer = (datei) => (alleBilder.find((b) => b.datei === datei && b.credit) || {}).credit || '';
const altFuer = (datei) => (alleBilder.find((b) => b.datei === datei && b.alt) || {}).alt || '';

function normBild(ref) {
  if (!ref) return { datei: '', alt: '' };
  if (typeof ref === 'string') return { datei: ref, alt: altFuer(ref), credit: creditFuer(ref) };
  return { datei: ref.datei || '', alt: ref.alt || altFuer(ref.datei), fokus: ref.fokus || '', credit: ref.credit || creditFuer(ref.datei) };
}

function bild(ref, { sizes = '100vw', eager = false, klasse = '', dekorativ = false } = {}) {
  const r = normBild(ref);
  const info = verarbeiteBild(r.datei);
  if (!info) return `<div class="platzhalter" aria-hidden="true"></div>`;
  if (!r.credit) warn(`Kein Fotonachweis ("credit") für images/${r.datei}.`);
  benutzt.set(r.datei, r);
  return bildTag(info, sizes, [
    klasse && `class="${klasse}"`,
    `width="${info.breite}" height="${info.hoehe}"`,
    `alt="${dekorativ ? '' : esc(r.alt)}"`,
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    r.fokus && `style="object-position:${esc(r.fokus)}"`,
  ]);
}

// ---------------------------------------------------------------------------
// 5. Bausteine
// ---------------------------------------------------------------------------

const ICONS = {
  pfeil: '<path d="M7 17 17 7M8 7h9v9"/>',
  runter: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  welle: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>',
};
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const extern = (url) => `href="${esc(url)}" target="_blank" rel="noopener"`;
const telInt = h.telefonInternational(agentur.telefon, 'DE');
const kontaktMail = s.kontakt.email_direkt || agentur.email || '';
const zwei = (n) => String(n).padStart(2, '0');

// Kreisrunder Stempel mit umlaufendem Text (SVG, kein externes Bild)
let stempelNr = 0;
function stempel(text) {
  const id = `stempel-${++stempelNr}`;
  const umlauf = `${text} ✶ ${text} ✶ `.toUpperCase();
  return `<span class="stempel" role="img" aria-label="${esc(text)}"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="${id}" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0"/></defs><text><textPath href="#${id}" textLength="286" lengthAdjust="spacingAndGlyphs">${esc(umlauf)}</textPath></text><text class="stempel-stern" x="60" y="70" text-anchor="middle">✶</text></svg></span>`;
}

const nav = [
  { id: 'prolog', text: 'Prolog' },
  s.steckbrief.length + s.register.length && { id: 'eigenschaften', text: 'Eigenschaften' },
  ...akte.map((a) => ({ id: a.id, text: a.titel, nr: a.nr })),
  s.galerie.length && { id: 'gesichter', text: 'Gesichter' },
  s.medien.length && { id: 'sehen-hoeren', text: 'Sehen & Hören' },
  { id: 'kontakt', text: 'Kontakt' },
].filter(Boolean);

// --- Ouvertüre --------------------------------------------------------------

function ouvertuere() {
  const rollen = s.hero_rollen.length ? s.hero_rollen : [{ bild: s.hero_bild }];
  const bilder = rollen
    .map((r, i) => `<div class="portal-bild${i === 0 ? ' ist-aktiv' : ''}" data-rolle-bild>${bild(r.bild || s.hero_bild, { eager: i === 0, sizes: '(min-width: 900px) 34vw, 78vw', dekorativ: i > 0 })}</div>`)
    .join('');
  const zeile = s.hero_rollen.length
    ? `<p class="rollen-zeile" aria-hidden="true" data-rollen='${esc(JSON.stringify(s.hero_rollen.map((r) => [r.verb || 'spielt', r.rolle, r.werk || ''])))}'>
        <span class="mono verb">${esc(s.hero_rollen[0].verb || 'spielt')}</span>
        <span class="rolle">${esc(s.hero_rollen[0].rolle)}</span>
        <span class="mono werk">${esc(s.hero_rollen[0].werk || '')}</span>
      </p>
      <p class="sr-only">Rollen u. a.: ${s.hero_rollen.map((r) => `${r.rolle} (${r.werk || ''})`).map(esc).join('; ')}</p>`
    : '';
  return `
<section class="ouvertuere" data-scheinwerfer aria-labelledby="name">
  <div class="scheinwerfer" aria-hidden="true"></div>
  <p class="mono berufe">${s.berufe.map(esc).join('<span aria-hidden="true"> — </span>')}</p>
  <div class="buehnenbild">
    <div class="portal">${bilder}</div>
    <h1 id="name" class="riesenname"><span>${esc(vorname)}</span>${nachname ? ` <em>${esc(nachname)}</em>` : ''}</h1>
  </div>
  ${zeile}
  <a class="mono vorhang-auf" href="#prolog">Vorhang auf ${icon('runter')}</a>
</section>`;
}

// --- Prolog -----------------------------------------------------------------

function prolog() {
  const absaetze = h.absaetze(s.ueber_mich);
  const zitat = s.zitat && s.zitat.text
    ? `<figure class="zitat" data-einblenden><blockquote>„${esc(s.zitat.text)}“</blockquote>${s.zitat.quelle ? `<figcaption class="mono">${esc(s.zitat.quelle)}</figcaption>` : ''}</figure>`
    : '';
  const applaus = s.auszeichnungen.length
    ? `<div class="applaus" data-einblenden><p class="mono kicker">Applaus</p><ol>${s.auszeichnungen
        .map((p) => `<li><span class="mono">${esc(p.jahr)}</span><span><strong>${esc(p.titel)}</strong>${p.text ? ` <em>${esc(p.text)}</em>` : ''}</span></li>`)
        .join('')}</ol></div>`
    : '';
  const aktuell = s.aktuell.length
    ? `<div class="zuletzt" data-einblenden><p class="mono kicker">Zuletzt</p><ul>${s.aktuell
        .map((a) => `<li><span class="mono">${esc(a.label || '')}</span><strong>${esc(a.titel)}</strong><span>${esc(a.text)}</span></li>`)
        .join('')}</ul></div>`
    : '';
  return `
<section id="prolog" class="szene szene--papier prolog">
  <div class="container">
    <p class="mono kicker">Prolog</p>
    ${s.prolog ? `<p class="prolog-satz" data-einblenden>${esc(s.prolog)}</p>` : ''}
    <div class="prolog-raster">
      <figure class="bogen" data-einblenden>${bild(s.ueber_mich_bild, { sizes: '(min-width: 900px) 30vw, 80vw' })}</figure>
      <div class="prolog-text">
        <div class="spalten">${absaetze.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        ${zitat}
      </div>
    </div>
    <div class="prolog-fuss">${applaus}${aktuell}</div>
  </div>
</section>`;
}

// --- Eigenschaften: Besetzungszettel + Register ---------------------------

function eigenschaften() {
  if (!s.steckbrief.length && !s.register.length) return '';
  const zettel = s.steckbrief.length
    ? `<div class="besetzungszettel" data-einblenden>
        <p class="mono zettel-kopf"><span>Besetzungszettel</span><span>Nr. ${new Date().getFullYear()}</span></p>
        <p class="zettel-name">${esc(s.name)}</p>
        <dl>${s.steckbrief.map((x) => `<div><dt class="mono">${esc(x.label)}</dt><dd>${esc(x.wert)}</dd></div>`).join('')}</dl>
        <p class="mono zettel-fuss">${berufText}</p>
      </div>`
    : '';
  const register = s.register.map((r, i) => {
    const kette = r.werte.map((w, j) => `<span${j % 2 ? ' class="kursiv"' : ''}>${esc(w)}</span><span class="trenner" aria-hidden="true">✶</span>`).join('');
    return `
      <div class="register-zeile${i % 2 ? ' register-zeile--rueck' : ''}">
        <p class="mono register-gruppe">${esc(r.gruppe)}</p>
        <p class="sr-only">${r.werte.map(esc).join(', ')}</p>
        <div class="laufband" aria-hidden="true"><div class="laufband-innen"><span class="kette">${kette}</span><span class="kette kette--kopie">${kette}</span></div></div>
      </div>`;
  }).join('');
  return `
<section id="eigenschaften" class="szene szene--nacht eigenschaften">
  <div class="container">
    <div class="eigenschaften-kopf">
      <p class="mono kicker">Eigenschaften</p>
      <h2 class="szenen-titel">Wer hier <em>spielt</em></h2>
    </div>
    ${zettel}
  </div>
  <div class="register">${register}</div>
</section>`;
}

// --- Akte ---------------------------------------------------------------------

function aktKopf(a, zusatz = '') {
  return `<header class="akt-kopf">
      <p class="mono kicker">${a.nr ? `Akt ${esc(a.nr)}` : 'Akt'}</p>
      <h2 class="akt-titel">${esc(a.titel)}</h2>
      ${a.intro ? `<p class="akt-intro">${esc(a.intro)}</p>` : ''}
      ${zusatz}
    </header>`;
}

function aktBuehne(a) {
  return `
<section id="${a.id}" class="szene szene--nacht akt akt--buehne" data-scheinwerfer>
  <div class="scheinwerfer" aria-hidden="true"></div>
  <div class="container">
    ${aktKopf(a)}
    <ol class="spielplan">${a.eintraege.map((e, i) => `
      <li data-einblenden>
        <span class="mono nr">${zwei(i + 1)}</span>
        <div class="stueck">
          <h3>${esc(e.titel)}</h3>
          <p class="mono">${[e.jahr, e.rolle, e.regie && `Regie ${e.regie}`].filter(Boolean).map(esc).join(' · ')}</p>
        </div>
        <p class="haus">${esc(e.ort || '')}</p>
        ${e.auszeichnung ? stempel(e.auszeichnung) : ''}
      </li>`).join('')}
    </ol>
  </div>
</section>`;
}

function aktKamera(a) {
  return `
<section id="${a.id}" class="szene szene--papier akt akt--kamera">
  <div class="container">
    ${aktKopf(a)}
    <ul class="klappen">${a.eintraege.map((e, i) => `
      <li class="klappe">
        <div class="klappe-balken" aria-hidden="true"></div>
        <div class="klappe-tafel">
          <p class="mono klappe-zeile"><span>Prod.</span><strong>${esc(e.titel)}</strong></p>
          <div class="klappe-raster mono">
            <p><span>Rolle</span>${esc(e.rolle || '–')}</p>
            <p><span>Regie</span>${esc(e.regie || '–')}</p>
            <p><span>Sender</span>${esc(e.ort || '–')}</p>
            <p><span>Jahr</span>${esc(e.jahr || '–')}</p>
          </div>
          <p class="mono klappe-take">Szene ${zwei(i + 1)} · Take 1</p>
        </div>
      </li>`).join('')}
    </ul>
  </div>
</section>`;
}

function aktStimme(a) {
  const generisch = /^(sprecherin|sprecher|voice-over|audioguide|rezitation|fabelwesen|diverse fabelwesen)$/i;
  const figuren = [];
  for (const e of a.eintraege) {
    for (const teil of String(e.rolle || '').replace(/\s+u\.\s*a\.$/, '').split(/,\s*/)) {
      const name = teil.trim();
      if (name && !generisch.test(name) && !figuren.some((f) => f.name === name)) figuren.push({ name, werk: e.titel });
    }
  }
  const welle = Array.from({ length: 56 }, (_, i) => {
    const hoehe = Math.round(18 + 70 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)));
    return `<span style="--h:${hoehe}%;--d:${(i % 9) * 0.11}s"></span>`;
  }).join('');
  const zusatz = figuren.length
    ? `<p class="stimm-zahl"><span>1 Stimme</span> <em>${figuren.length} Figuren</em></p>`
    : '';
  return `
<section id="${a.id}" class="szene szene--rot akt akt--stimme">
  <div class="container">
    <div class="welle" aria-hidden="true">${welle}</div>
    ${aktKopf(a, zusatz)}
    ${figuren.length ? `<p class="figuren" data-einblenden>${figuren
      .map((f, i) => `<span class="figur${i % 3 === 1 ? ' kursiv' : ''}" title="${esc(f.werk)}">${esc(f.name)}</span>`)
      .join('<span class="schraeg" aria-hidden="true"> / </span>')}</p>` : ''}
    <ol class="tracklist">${a.eintraege.map((e, i) => `
      <li><span class="mono nr">${zwei(i + 1)}</span><span class="track-titel">${esc(e.titel)}</span><span class="mono track-info">${[e.rolle, e.ort].filter(Boolean).map(esc).join(' · ')}</span><span class="mono track-jahr">${esc(e.jahr)}</span></li>`).join('')}
    </ol>
  </div>
</section>`;
}

function aktFeder(a) {
  return `
<section id="${a.id}" class="szene szene--papier akt akt--feder">
  <div class="container feder-raster">
    ${aktKopf(a)}
    <div class="manuskript" data-einblenden>
      <p class="mono manuskript-kopf">manuskript_${esc(h.slug(s.name))}.txt</p>
      <ol>${a.eintraege.map((e) => `
        <li><span class="mono">${esc(e.jahr)}</span><p><strong>${esc(e.titel)}</strong> — ${esc([e.rolle, e.ort].filter(Boolean).join(', '))}</p></li>`).join('')}
      </ol>
      <span class="cursor" aria-hidden="true"></span>
    </div>
  </div>
</section>`;
}

// Akt Unterricht: Aushang der Probebühne – Angebote als Karten, Hinweis, Zitat, Referenzen
function aktUnterricht(a) {
  return `
<section id="${a.id}" class="szene szene--papier akt akt--unterricht">
  <div class="container">
    ${aktKopf(a)}
    ${a.angebote.length ? `${a.angebote_titel ? `<p class="mono kicker">${esc(a.angebote_titel)}</p>` : ''}
    <ul class="aushang">${a.angebote.map((x, i) => `
      <li><p class="mono">Übung ${zwei(i + 1)}</p><h3>${esc(x.titel)}</h3>${x.text ? `<p>${esc(x.text)}</p>` : ''}</li>`).join('')}
    </ul>` : ''}
    ${a.hervorhebung ? `<p class="unterricht-hinweis">${esc(a.hervorhebung)}</p>` : ''}
    ${a.zitat && a.zitat.text ? `<figure class="zitat"><blockquote>„${esc(a.zitat.text)}“</blockquote>${a.zitat.quelle ? `<figcaption class="mono">${esc(a.zitat.quelle)}</figcaption>` : ''}</figure>` : ''}
    ${a.eintraege.length ? `<p class="mono kicker referenzen-kopf">Referenzen</p>
    <ol class="referenzen">${a.eintraege.map((e) => `
      <li><span class="mono">${esc(e.jahr || '')}</span><div><h3>${esc(e.titel)}</h3><p class="mono">${[e.rolle, e.ort].filter(Boolean).map(esc).join(' · ')}</p>${e.text ? `<p>${esc(e.text)}</p>` : ''}</div></li>`).join('')}
    </ol>` : ''}
  </div>
</section>`;
}

const AKT_STILE = { buehne: aktBuehne, kamera: aktKamera, stimme: aktStimme, feder: aktFeder, unterricht: aktUnterricht };

// --- Gesichter: Kontaktbogen --------------------------------------------------

function gesichter() {
  const bilder = s.galerie.map((g) => ({ ...normBild(g), markiert: g.markiert, info: verarbeiteBild(g.datei) })).filter((g) => g.info);
  if (!bilder.length) return '';
  return `
<section id="gesichter" class="szene szene--nacht gesichter">
  <div class="container">
    <p class="mono kicker">Gesichter</p>
    <h2 class="szenen-titel">Kontakt<em>bogen</em></h2>
    <ul class="kontaktbogen">${bilder.map((g, i) => `
      <li class="${g.markiert ? 'ist-markiert' : ''}" data-einblenden>
        <a href="${g.info.groesste}" data-lightbox data-credit="${esc(g.credit ? `Foto: ${g.credit}` : '')}" aria-label="${esc(g.alt || 'Foto')} – groß anzeigen">
          ${bild(g, { sizes: '(min-width: 1100px) 25vw, (min-width: 640px) 33vw, 50vw' })}
        </a>
        <p class="mono bild-nr"><span>${zwei(i + 1)}A</span><span>${esc(g.credit || '')}</span></p>
      </li>`).join('')}
    </ul>
  </div>
</section>`;
}

// --- Sehen & Hören: Tickets -------------------------------------------------

function sehenHoeren() {
  if (!s.medien.length) return '';
  return `
<section id="sehen-hoeren" class="szene szene--papier">
  <div class="container">
    <p class="mono kicker">Sehen &amp; Hören</p>
    <h2 class="szenen-titel">Einlass</h2>
    <ul class="tickets">${s.medien.map((m, i) => `
      <li data-einblenden><a class="ticket" ${extern(m.url)}>
        <span class="ticket-haupt">
          <span class="mono">${m.art === 'audio' ? 'Hörprobe' : 'Vorstellung'} · Nr. ${zwei(i + 1)}</span>
          <strong>${esc(m.titel)}</strong>
          ${m.text ? `<span class="ticket-text">${esc(m.text)}</span>` : ''}
        </span>
        <span class="ticket-abriss">${icon(m.art === 'audio' ? 'welle' : 'play')}<span class="mono">Einlass</span>${icon('pfeil')}<span class="sr-only">(öffnet externe Seite)</span></span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

// --- Kontakt + Vorhang ----------------------------------------------------------

function kontakt() {
  return `
<section id="kontakt" class="szene szene--nacht kontakt">
  <div class="container kontakt-raster">
    <div>
      <p class="mono kicker">Kontakt</p>
      <h2 class="szenen-titel">Besetzung <em>anfragen</em></h2>
      ${s.kontakt.text ? `<p class="kontakt-intro">${esc(s.kontakt.text)}</p>` : ''}
      ${kontaktMail ? `<a class="knopf" href="mailto:${esc(kontaktMail)}?subject=${encodeURIComponent(`Anfrage für ${s.name}`)}">Anfrage senden ${icon('pfeil')}</a>` : ''}
    </div>
    <div class="kontakt-karten">
      ${agentur.name ? `<div class="agentur">
        <p class="mono kicker">Agentur</p>
        <p class="agentur-name">${esc(agentur.name)}</p>
        ${agentur.person ? `<p class="mono">${esc(agentur.person)}</p>` : ''}
        <ul class="agentur-wege">
          ${telInt ? `<li><a href="tel:${telInt}">${esc(agentur.telefon)}</a></li>` : ''}
          ${agentur.email ? `<li><a href="mailto:${esc(agentur.email)}">${esc(agentur.email)}</a></li>` : ''}
          ${agentur.website ? `<li><a ${extern(agentur.website)}>${esc(agentur.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></li>` : ''}
        </ul>
      </div>` : ''}
      ${s.profile.length ? `<ul class="profile">${s.profile.map((p) => `<li><a ${extern(p.url)}>${esc(p.name)} ${icon('pfeil')}</a></li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>
<div class="vorhang" aria-hidden="true"><span class="vorhang-text">${esc(vorname)}</span></div>`;
}

const lightbox = `
<dialog class="lightbox" data-lightbox-dialog aria-label="Foto">
  <button class="lightbox-zu" type="button" data-lightbox-zu aria-label="Schließen">×</button>
  <button class="lightbox-zurueck" type="button" data-lightbox-zurueck aria-label="Vorheriges Foto">‹</button>
  <figure><img src="" alt=""><figcaption class="mono"></figcaption></figure>
  <button class="lightbox-vor" type="button" data-lightbox-vor aria-label="Nächstes Foto">›</button>
</dialog>`;

// ---------------------------------------------------------------------------
// 6. Seitengerüst
// ---------------------------------------------------------------------------

const websiteUrl = (s.website_url || '').replace(/\/+$/, '');
const absolut = (rel) => (websiteUrl ? `${websiteUrl}/${rel}` : rel);
const fotografen = () => [...new Set([...benutzt.values()].map((b) => b.credit).filter(Boolean))];

function minifyCss(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}
const css = minifyCss(
  fs.readFileSync(path.join(ROOT, 'src/css/style.css'), 'utf8') +
    farbschema.cssRoot(farben.variablen)
);

function layout({ titel, beschreibung, inhalt, startseite = false, pfad = '', zusatzHead = '', zusatzBody = '' }) {
  const seitenUrl = websiteUrl ? websiteUrl + (startseite ? '/' : pfad) : '';
  const basis = startseite ? '' : 'index.html';
  const og = [
    ['og:type', startseite ? 'profile' : 'website'],
    ['og:locale', 'de_DE'],
    ['og:site_name', s.name],
    ['og:title', titel],
    ['og:description', beschreibung],
    seitenUrl && ['og:url', seitenUrl],
    ogBild && ['og:image', ogBild],
  ].filter(Boolean).map(([p, v]) => `<meta property="${p}" content="${esc(v)}">`).join('\n');
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
${demo ? '<meta name="robots" content="noindex, nofollow">' : ''}
${seitenUrl ? `<link rel="canonical" href="${esc(seitenUrl)}">` : ''}
<meta name="theme-color" content="${NACHT}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/instrument-serif-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
${zusatzHead}
${og}
<meta name="twitter:card" content="summary_large_image">
<style>${css}</style>
<noscript><style>.programm{position:static;visibility:visible;opacity:1;padding-top:5rem}.programm-knopf{display:none}</style></noscript>
<script src="${mainJsUrl}" defer></script>
</head>
<body id="top"${startseite ? ' class="startseite"' : ''}>
<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
${demo ? `<div class="entwurf mono" role="note">Entwurf für ${esc(s.name)}${s.ersteller ? ` – erstellt von ${esc(s.ersteller)}` : ''}</div>` : ''}
<header class="kopf" data-kopf>
  <a class="marke" href="${startseite ? '#top' : 'index.html'}">${esc(vorname)} <em>${esc(nachname)}</em></a>
  <button class="programm-knopf mono" type="button" data-menue-knopf aria-expanded="false" aria-controls="programm">Programm</button>
</header>
<nav id="programm" class="programm" aria-label="Programm">
    <p class="mono kicker">Programm</p>
    <ol>${nav.map((n, i) => `<li><a href="${basis}#${n.id}"><span class="mono">${n.nr ? `Akt ${esc(n.nr)}` : zwei(i + 1)}</span>${esc(n.text)}</a></li>`).join('')}</ol>
</nav>
<main id="inhalt">
${inhalt}
</main>
<footer class="fuss">
  <p class="mono">© <span data-jahr>${new Date().getFullYear()}</span> ${esc(s.name)}${fotografen().length ? ` · Fotos: ${fotografen().map(esc).join(', ')}` : ''}</p>
  <ul class="mono"><li><a href="impressum.html">Impressum</a></li><li><a href="datenschutz.html">Datenschutz</a></li></ul>
</footer>
${zusatzBody}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// 7. Startseite
// ---------------------------------------------------------------------------

const ogQuelle = normBild(s.hero_bild).datei;
const ogInfo = verarbeiteBild(ogQuelle);
const ogBild = ogInfo ? absolut(ogInfo.src) : '';
if (ogInfo) benutzt.set(ogQuelle, normBild(s.hero_bild)); // Vorschaubild für Messenger/Netzwerke

const inhalt = [
  ouvertuere(),
  prolog(),
  eigenschaften(),
  ...akte.map((a) => AKT_STILE[a.stil](a)),
  gesichter(),
  sehenHoeren(),
  kontakt(),
].join('\n');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: s.name,
  jobTitle: s.berufe.length ? s.berufe : undefined,
  description: s.kurzbeschreibung || undefined,
  url: websiteUrl || undefined,
  image: ogInfo ? absolut(ogInfo.groesste) : undefined,
  award: s.auszeichnungen.map((p) => `${p.titel}${p.text ? ` ${p.text}` : ''} (${p.jahr})`),
  sameAs: s.profile.map((p) => p.url),
};

fs.writeFileSync(path.join(DIST, 'index.html'), layout({
  titel: `${s.name} – ${berufText}`,
  beschreibung: (s.kurzbeschreibung || `${s.name}, ${berufText}.`).slice(0, 160),
  inhalt,
  startseite: true,
  zusatzHead: `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  zusatzBody: lightbox,
}));

// ---------------------------------------------------------------------------
// 8. Impressum und Datenschutz
// ---------------------------------------------------------------------------

function rechtsSeite(datei, ueberschrift, quelle) {
  if (!quelle) warn(`${ueberschrift} ist leer – bitte ergänzen, bevor die Seite online geht.`);
  const nachweise = datei === 'impressum.html' ? [...benutzt.values()].filter((b) => b.credit) : [];
  const liste = nachweise.length
    ? `<h2>Bildnachweise</h2><ul>${nachweise.map((g) => `<li>${esc(g.alt || g.datei)}: © ${esc(g.credit)}</li>`).join('')}</ul>`
    : '';
  fs.writeFileSync(path.join(DIST, datei), layout({
    titel: `${ueberschrift} – ${s.name}`,
    beschreibung: `${ueberschrift} der Website von ${s.name}.`,
    pfad: '/' + datei,
    inhalt: `<section class="szene szene--papier rechtliches"><div class="container"><p class="mono kicker"><a href="index.html">← Zurück zum Programm</a></p><h1 class="szenen-titel">${ueberschrift}</h1><div class="rechtstext">${quelle ? h.markdown(quelle) : '<p class="hinweis">Dieser Text wird noch ergänzt.</p>'}${liste}</div></div></section>`,
  }));
}
rechtsSeite('impressum.html', 'Impressum', s.impressum);
rechtsSeite('datenschutz.html', 'Datenschutz', s.datenschutz);

// ---------------------------------------------------------------------------
// 9. Favicon, robots.txt, sitemap.xml
// ---------------------------------------------------------------------------

fs.writeFileSync(path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${NACHT}"/><path d="M14 58V30a18 18 0 0 1 36 0v28" fill="none" stroke="${rotHell}" stroke-width="4"/><text x="32" y="50" font-family="Georgia, serif" font-style="italic" font-size="22" text-anchor="middle" fill="${PAPIER}">${esc(h.initialen(s.name))}</text></svg>`);
fs.writeFileSync(path.join(DIST, 'robots.txt'),
  demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${websiteUrl ? `Sitemap: ${websiteUrl}/sitemap.xml\n` : ''}`);
if (websiteUrl && !demo) {
  const heute = new Date().toISOString().slice(0, 10);
  const urls = ['', 'impressum.html', 'datenschutz.html'].map((p) => `<url><loc>${websiteUrl}/${p}</loc><lastmod>${heute}</lastmod></url>`).join('');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`);
}
if (!demo && !websiteUrl) warn('website_url ist leer – ohne sie fehlen canonical-Link, absolute Open-Graph-Bilder und sitemap.xml.');

// ---------------------------------------------------------------------------
// 10. Zusammenfassung
// ---------------------------------------------------------------------------

const groesse = (function summe(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => {
    const p = path.join(dir, e.name);
    return n + (e.isDirectory() ? summe(p) : fs.statSync(p).size);
  }, 0);
})(DIST);
console.log(`✔ ${s.name} gebaut → ${path.relative(process.cwd(), DIST) || '.'}  (${(groesse / 1024 / 1024).toFixed(1)} MB, ${demo ? 'DEMO-Modus: noindex' : 'live: indexierbar'})`);
console.log(`  Szenen: ${nav.map((n) => n.text).join(', ')}`);
if (warnungen.length) {
  console.log(`\n⚠ ${warnungen.length} Hinweis(e):`);
  warnungen.forEach((w) => console.log('  - ' + w));
}

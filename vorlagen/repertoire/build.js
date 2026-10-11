#!/usr/bin/env node
'use strict';
/*
 * Build-Skript für die Repertoire-Vorlage – ruhiges, mehrseitiges Portfolio für Künstler:innen.
 * Startseite + je Bereich eine eigene Seite (z. B. Theater, Film, Audio, Schreiben, Unterrichten)
 * + ausführliche Kontaktseite. Menü mit allen Bereichen steht immer sichtbar oben.
 *
 *   node build.js ../../kunden/<pfad>/schauspiel.json   -> schreibt dist/
 *   BILDER_DIR=... DIST_DIR=... node build.js datei     -> so ruft build-all.js die Vorlage auf
 *
 * Keine npm-Abhängigkeiten; WebP/AVIF-Varianten über lib/bilder.js.
 */

const fs = require('fs');
const path = require('path');
const h = require('../../lib/helfer');
const { bildVerarbeitung, bildTag, vorladen } = require('../../lib/bilder');
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

const mitUrl = (x) => x && x.titel && /^https:\/\//i.test(x.url || '');
s.berufe = (s.berufe || []).filter(Boolean);
s.aktuell = (s.aktuell || []).filter((x) => x && x.titel);
s.auszeichnungen = (s.auszeichnungen || []).filter((x) => x && x.titel);
s.steckbrief = (s.steckbrief || []).filter((x) => x && x.label && x.wert);
s.galerie = (s.galerie || []).filter((g) => g && g.datei);
s.profile = (s.profile || []).filter((p) => p && p.name && /^https:\/\//i.test(p.url || ''));
s.kontakt = s.kontakt || {};
s.bereiche = (s.bereiche || []).filter((b) => b && b.id && b.titel).map((b) => ({
  ...b,
  gruppen: (b.gruppen || []).filter((g) => g && g.titel && (g.eintraege || []).some((e) => e && e.titel))
    .map((g) => ({ ...g, eintraege: g.eintraege.filter((e) => e && e.titel) })),
  angebote: (b.angebote || []).filter((a) => a && a.titel),
  fotos: (b.fotos || []).filter((f) => f && f.datei),
  medien: (b.medien || []).filter(mitUrl),
}));
const agentur = s.kontakt.agentur || {};
const demo = s.demo_modus === true;
const berufText = s.berufe.join(' · ') || 'Portfolio';
const [vorname, ...rest] = s.name.trim().split(/\s+/);
const nachname = rest.join(' ');

// ---------------------------------------------------------------------------
// Farben: Standard (Creme/Braun/Mint) oder Farbschema von coolors.co (Feld "farbschema", siehe
// lib/farbschema.js – dieselbe Datei rechnet im Browser die Vorschau des Farb-Labors, Adresse …#farben).
// ---------------------------------------------------------------------------

const farben = farbschema.variablen('repertoire', s.farbschema || '');
if (s.farbschema && !farben.farben.length) warn('farbschema enthält keine erkennbaren Farben – Standardfarben werden verwendet.');
const F = { creme: '#F6F1E9', mint: '#D5E8DD', braun: '#3A2C24' }; // für theme-color und Favicon
for (const k of Object.keys(F)) F[k] = farben.variablen[`--${k}`] || F[k];
const farbVariablen = farbschema.cssRoot(farben.variablen);

// ---------------------------------------------------------------------------
// 2. Ausgabeordner, Schriften, Skript
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
// 3. Bilder
// ---------------------------------------------------------------------------

const { verarbeite: verarbeiteBild } = bildVerarbeitung({ bilderDir: BILDER, distDir: DIST, cacheDir: CACHE, warn, qualitaet: 78, minBreite: 1000 });
const benutzt = new Map(); // datei -> { alt, credit } aller gezeigten Bilder

const alleBilder = [s.hero_bild, s.ueber_mich_bild, ...s.galerie, ...s.bereiche.flatMap((b) => [b.bild, ...b.fotos])]
  .filter((b) => b && typeof b === 'object');
const creditFuer = (datei) => (alleBilder.find((b) => b.datei === datei && b.credit) || {}).credit || '';
const altFuer = (datei) => (alleBilder.find((b) => b.datei === datei && b.alt) || {}).alt || '';

function normBild(ref) {
  if (!ref) return { datei: '', alt: '' };
  if (typeof ref === 'string') return { datei: ref, alt: altFuer(ref), credit: creditFuer(ref) };
  return { datei: ref.datei || '', alt: ref.alt || altFuer(ref.datei), fokus: ref.fokus || '', credit: ref.credit || creditFuer(ref.datei) };
}

function bild(ref, { sizes = '100vw', eager = false, klasse = '' } = {}) {
  const r = normBild(ref);
  const info = verarbeiteBild(r.datei);
  if (!info) return '<div class="platzhalter" aria-hidden="true"></div>';
  if (!r.credit) warn(`Kein Fotonachweis ("credit") für images/${r.datei}.`);
  benutzt.set(r.datei, r);
  return bildTag(info, sizes, [
    klasse && `class="${klasse}"`,
    `width="${info.breite}" height="${info.hoehe}"`,
    `alt="${esc(r.alt)}"`,
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    r.fokus && `style="object-position:${esc(r.fokus)}"`,
  ]);
}

// Bilderreihe mit Großansicht (Lightbox)
function fotoRaster(fotos, sizes) {
  const liste = fotos.map((f) => ({ ...normBild(f), info: verarbeiteBild(f.datei) })).filter((f) => f.info);
  if (!liste.length) return '';
  return `<ul class="fotos">${liste.map((f) => `
    <li><a href="${f.info.groesste}" data-lightbox data-credit="${esc(f.credit ? `Foto: ${f.credit}` : '')}" aria-label="${esc(f.alt || 'Foto')}, groß anzeigen">${bild(f, { sizes })}</a></li>`).join('')}
  </ul>`;
}

// ---------------------------------------------------------------------------
// 4. Bausteine
// ---------------------------------------------------------------------------

const ICONS = {
  pfeil: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  extern: '<path d="M7 17 17 7M8 7h9v9"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  welle: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>',
  mail: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 7 9-7"/>',
  telefon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  stern: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
};
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const extern = (url) => `href="${esc(url)}" target="_blank" rel="noopener"`;
const telInt = h.telefonInternational(agentur.telefon, 'DE');
const direktMail = s.kontakt.email_direkt || '';
if (!direktMail && (s.kontakt.anliegen || []).some((a) => a.weg === 'direkt')) {
  warn('kontakt.email_direkt ist leer – Anliegen mit weg "direkt" verweisen vorerst auf das Management.');
}
const webKurz = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const mailto = (adresse, betreff) => `mailto:${esc(adresse)}?subject=${encodeURIComponent(betreff)}`;

const seiteVon = (b) => `${b.id}.html`;
const eintragZahl = (b) => b.gruppen.reduce((n, g) => n + g.eintraege.length, 0);

function kopfzeile(titel, kicker, extraKlasse = '') {
  return `<header class="abschnitt-kopf ${extraKlasse}"><p class="kicker">${esc(kicker)}</p><h2>${esc(titel)}</h2></header>`;
}

function medienListe(medien) {
  if (!medien.length) return '';
  return `<ul class="medien">${medien.map((m) => `
    <li><a class="medium" ${extern(m.url)}>
      <span class="medium-icon">${icon(m.art === 'audio' ? 'welle' : 'play')}</span>
      <span class="medium-text"><strong>${esc(m.titel)}</strong>${m.text ? `<span>${esc(m.text)}</span>` : ''}</span>
      ${icon('extern')}<span class="sr-only">(öffnet externe Seite)</span>
    </a></li>`).join('')}
  </ul>`;
}

// Tabellarische Vita-Liste: Jahr | Titel + Rolle | Regie / Ort
function liste(eintraege) {
  return `<ol class="vita">${eintraege.map((e) => `
    <li>
      <span class="vita-jahr">${esc(e.jahr || '')}</span>
      <div class="vita-haupt">
        <h3>${esc(e.titel)}</h3>
        ${e.rolle ? `<p class="vita-rolle">${esc(e.rolle)}</p>` : ''}
        ${e.text ? `<p class="vita-text">${esc(e.text)}</p>` : ''}
        ${e.auszeichnung ? `<p class="preis">${icon('stern')}${esc(e.auszeichnung)}</p>` : ''}
      </div>
      <p class="vita-ort">${[e.regie && (/^(eigenregie|choreografie)/i.test(e.regie) ? e.regie : `Regie: ${e.regie}`), e.ort].filter(Boolean).map(esc).join('<br>')}</p>
    </li>`).join('')}
  </ol>`;
}

// Projektkarten (z. B. Film): Titel groß, alle Eckdaten auf einen Blick
function projekte(eintraege) {
  return `<ul class="projekte">${eintraege.map((e) => `
    <li class="projekt">
      <p class="projekt-kopf"><span>${esc(e.art || 'Produktion')}</span><span>${esc(e.jahr || '')}</span></p>
      <h3>${esc(e.titel)}</h3>
      <dl class="projekt-daten">
        ${e.rolle ? `<div><dt>Rolle</dt><dd>${esc(e.rolle)}${e.rollentyp ? ` <span class="marke-klein">${esc(e.rollentyp)}</span>` : ''}</dd></div>` : ''}
        ${e.regie ? `<div><dt>Regie</dt><dd>${esc(e.regie)}</dd></div>` : ''}
        ${e.ort ? `<div><dt>Sender / Produktion</dt><dd>${esc(e.ort)}</dd></div>` : ''}
        ${e.ausstrahlung ? `<div><dt>Ausstrahlung</dt><dd>${esc(e.ausstrahlung)}</dd></div>` : ''}
      </dl>
      ${e.text ? `<p class="projekt-text">${esc(e.text)}</p>` : ''}
      ${e.auszeichnung ? `<p class="preis">${icon('stern')}${esc(e.auszeichnung)}</p>` : ''}
    </li>`).join('')}
  </ul>`;
}

function zitatBlock(z) {
  if (!z || !z.text) return '';
  return `<figure class="zitat"><blockquote><p>„${esc(z.text)}“</p></blockquote>${z.quelle ? `<figcaption>${esc(z.quelle)}</figcaption>` : ''}</figure>`;
}

function kontaktBand() {
  return `
<section class="band band--mint">
  <div class="container band-innen">
    <div>
      <h2>Zusammenarbeiten?</h2>
      <p>Für Besetzung, Sprechaufnahme oder Unterricht finden Sie auf der Kontaktseite den passenden Weg.</p>
    </div>
    <a class="knopf" href="kontakt.html">Kontakt aufnehmen ${icon('pfeil')}</a>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// 5. Seiten
// ---------------------------------------------------------------------------

function startseite() {
  const showreel = s.bereiche.flatMap((b) => b.medien).find((m) => m.art === 'video');
  const absaetze = h.absaetze(s.ueber_mich);
  const aktuell = s.aktuell.length ? `
<section class="abschnitt">
  <div class="container">
    ${kopfzeile('Aktuell', 'Neuigkeiten')}
    <ul class="karten karten--drei">${s.aktuell.map((a) => {
      const ziel = s.bereiche.find((b) => b.id === a.bereich);
      const innen = `<p class="kicker">${esc(a.label || '')}</p><h3>${esc(a.titel)}</h3>${a.text ? `<p>${esc(a.text)}</p>` : ''}`;
      return `<li class="karte">${ziel ? `<a class="karte-link" href="${seiteVon(ziel)}">${innen}<span class="mehr">${esc(ziel.titel)} ${icon('pfeil')}</span></a>` : innen}</li>`;
    }).join('')}
    </ul>
  </div>
</section>` : '';

  const bereiche = `
<section class="abschnitt abschnitt--sand">
  <div class="container">
    ${kopfzeile('Arbeitsfelder', 'Repertoire')}
    <ul class="bereich-raster">${s.bereiche.map((b) => `
      <li><a class="bereich-karte" href="${seiteVon(b)}">
        <span class="bereich-bild">${bild(b.bild, { sizes: '(min-width: 1100px) 20vw, (min-width: 640px) 45vw, 92vw' })}</span>
        <span class="bereich-text">
          <strong>${esc(b.titel)}</strong>
          ${b.untertitel ? `<span class="kicker">${esc(b.untertitel)}</span>` : ''}
          ${b.teaser ? `<span>${esc(b.teaser)}</span>` : ''}
          <span class="mehr">${eintragZahl(b) ? `${eintragZahl(b)} Einträge` : 'Ansehen'} ${icon('pfeil')}</span>
        </span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;

  const ueber = absaetze.length ? `
<section class="abschnitt" id="ueber">
  <div class="container ueber">
    <figure class="ueber-bild">${bild(s.ueber_mich_bild, { sizes: '(min-width: 900px) 34vw, 92vw' })}</figure>
    <div class="ueber-text">
      ${kopfzeile(`Über ${vorname}`, 'Biografie')}
      ${absaetze.map((p) => `<p>${esc(p)}</p>`).join('')}
      ${zitatBlock(s.zitat)}
      ${s.auszeichnungen.length ? `<h3 class="klein-titel">Auszeichnungen</h3>
      <ul class="preise">${s.auszeichnungen.map((p) => `<li><span>${esc(p.jahr || '')}</span><span><strong>${esc(p.titel)}</strong>${p.text ? `<br>${esc(p.text)}` : ''}</span></li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>` : '';

  const galerie = s.galerie.length ? `
<section class="abschnitt abschnitt--sand">
  <div class="container">
    ${kopfzeile('Fotos', 'Galerie')}
    ${fotoRaster(s.galerie, '(min-width: 1100px) 25vw, (min-width: 640px) 33vw, 50vw')}
  </div>
</section>` : '';

  return `
<section class="hero">
  <div class="container hero-innen">
    <div class="hero-text">
      <p class="kicker">${s.berufe.map(esc).join(' · ')}</p>
      <h1>${esc(s.name)}</h1>
      ${s.hero_text ? `<p class="hero-intro">${esc(s.hero_text)}</p>` : ''}
      <div class="knoepfe">
        ${showreel ? `<a class="knopf" ${extern(showreel.url)}>${icon('play')} Showreel ansehen<span class="sr-only"> (öffnet externe Seite)</span></a>` : ''}
        <a class="knopf knopf--rand" href="kontakt.html">Kontakt</a>
      </div>
    </div>
    <figure class="hero-bild">${bild(s.hero_bild, { eager: true, sizes: '(min-width: 900px) 42vw, 92vw' })}</figure>
  </div>
</section>
${aktuell}
${bereiche}
${ueber}
${galerie}
${kontaktBand()}`;
}

function bereichSeite(b, i) {
  const naechster = s.bereiche[(i + 1) % s.bereiche.length];
  const angebote = b.angebote.length ? `
<section class="abschnitt">
  <div class="container">
    ${kopfzeile(b.angebote_titel || 'Angebot', 'Angebot')}
    <ul class="karten karten--drei angebote">${b.angebote.map((a) => `<li class="karte"><h3>${esc(a.titel)}</h3>${a.text ? `<p>${esc(a.text)}</p>` : ''}</li>`).join('')}</ul>
    ${b.hervorhebung ? `<p class="hervorhebung">${icon('stern')}<span>${esc(b.hervorhebung)}</span></p>` : ''}
    <p class="angebot-aktion"><a class="knopf" href="kontakt.html#anliegen">${esc(b.titel === 'Unterrichten' ? 'Unterricht anfragen' : 'Anfragen')} ${icon('pfeil')}</a></p>
  </div>
</section>` : '';

  const gruppen = b.gruppen.map((g, j) => `
<section class="abschnitt${(j + (b.angebote.length ? 1 : 0)) % 2 ? ' abschnitt--sand' : ''}" id="${h.slug(g.titel)}">
  <div class="container">
    <header class="abschnitt-kopf abschnitt-kopf--zeile"><h2>${esc(g.titel)}</h2><span class="zahl">${g.eintraege.length}</span></header>
    ${g.darstellung === 'projekte' ? projekte(g.eintraege) : liste(g.eintraege)}
    ${j === b.gruppen.length - 1 && b.hinweis ? `<p class="hinweis">${esc(b.hinweis)}</p>` : ''}
  </div>
</section>`).join('');

  const extras = (b.zitat && b.zitat.text) || b.fotos.length || b.medien.length ? `
<section class="abschnitt">
  <div class="container extras">
    ${zitatBlock(b.zitat)}
    ${b.medien.length ? `<div>${kopfzeile(b.medien.some((m) => m.art === 'video') ? 'Sehen & Hören' : 'Hören', 'Medien')}${medienListe(b.medien)}</div>` : ''}
    ${b.fotos.length ? `<div class="extras-fotos">${kopfzeile('Szenenfotos', 'Fotos')}${fotoRaster(b.fotos, '(min-width: 900px) 33vw, 92vw')}</div>` : ''}
  </div>
</section>` : '';

  return `
<section class="seiten-kopf">
  <div class="container seiten-kopf-innen">
    <div>
      <p class="kicker">${esc(b.untertitel || b.titel)}</p>
      <h1>${esc(b.titel)}</h1>
      ${b.intro ? `<p class="seiten-intro">${esc(b.intro)}</p>` : ''}
      ${b.gruppen.length > 1 ? `<ul class="sprungmarken">${b.gruppen.map((g) => `<li><a href="#${h.slug(g.titel)}">${esc(g.titel)}</a></li>`).join('')}</ul>` : ''}
    </div>
    <figure class="seiten-bild">${bild(b.bild, { eager: true, sizes: '(min-width: 900px) 36vw, 92vw' })}</figure>
  </div>
</section>
${angebote}
${gruppen}
${extras}
<nav class="weiter" aria-label="Nächster Bereich">
  <div class="container"><a href="${seiteVon(naechster)}"><span class="kicker">Weiter</span><strong>${esc(naechster.titel)}</strong>${icon('pfeil')}</a></div>
</nav>
${kontaktBand()}`;
}

function kontaktSeite() {
  const anliegen = (s.kontakt.anliegen || []).filter((a) => a && a.titel);
  const agenturBlock = agentur.name ? `
    <div class="kontakt-karte kontakt-karte--agentur">
      <p class="kicker">Management</p>
      <h2>${esc(agentur.name)}</h2>
      ${agentur.person ? `<p>Ansprechpartner: ${esc(agentur.person)}</p>` : ''}
      <ul class="wege">
        ${telInt ? `<li><a href="tel:${telInt}">${icon('telefon')}${esc(agentur.telefon)}</a></li>` : ''}
        ${agentur.email ? `<li><a href="${mailto(agentur.email, `Anfrage für ${s.name}`)}">${icon('mail')}${esc(agentur.email)}</a></li>` : ''}
        ${agentur.website ? `<li><a ${extern(agentur.website)}>${icon('extern')}${esc(webKurz(agentur.website))}</a></li>` : ''}
      </ul>
    </div>` : '';
  const direktBlock = direktMail ? `
    <div class="kontakt-karte">
      <p class="kicker">Direkt</p>
      <h2>${esc(s.name)}</h2>
      <p>Für Unterricht, Workshops, Texte und Kooperationen.</p>
      <ul class="wege"><li><a href="${mailto(direktMail, `Anfrage an ${s.name}`)}">${icon('mail')}${esc(direktMail)}</a></li></ul>
    </div>` : '';

  const anliegenListe = anliegen.length ? `
<section class="abschnitt" id="anliegen">
  <div class="container">
    ${kopfzeile('Worum geht es?', 'Ihr Anliegen')}
    <ul class="karten karten--zwei">${anliegen.map((a) => {
      const adresse = a.weg === 'direkt' && direktMail ? direktMail : agentur.email || direktMail;
      const ueber = a.weg === 'direkt' && direktMail ? `direkt an ${vorname}` : 'über das Management';
      return `<li class="karte anliegen">
        <h3>${esc(a.titel)}</h3>
        ${a.text ? `<p>${esc(a.text)}</p>` : ''}
        ${a.hilfreich ? `<p class="hilfreich"><span class="kicker">Hilfreich für Ihre Anfrage</span>${esc(a.hilfreich)}</p>` : ''}
        ${adresse ? `<a class="knopf knopf--rand" href="${mailto(adresse, `Anfrage für ${s.name} (${a.titel})`)}">${icon('mail')} E-Mail ${esc(ueber)}</a>` : ''}
      </li>`;
    }).join('')}
    </ul>
  </div>
</section>` : '';

  const steckbrief = s.steckbrief.length ? `
<section class="abschnitt abschnitt--sand" id="steckbrief">
  <div class="container steckbrief-raster">
    <div>
      ${kopfzeile('Auf einen Blick', 'Für Castings')}
      <p>Die wichtigsten Angaben für Besetzungen. Ausführliche Vita, Showreels und Fotos finden Sie auch in den Casting-Profilen.</p>
      ${s.profile.length ? `<ul class="profile">${s.profile.map((p) => `<li><a ${extern(p.url)}>${esc(p.name)} ${icon('extern')}</a></li>`).join('')}</ul>` : ''}
    </div>
    <dl class="steckbrief">${s.steckbrief.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.wert)}</dd></div>`).join('')}</dl>
  </div>
</section>` : '';

  return `
<section class="seiten-kopf seiten-kopf--kontakt">
  <div class="container kontakt-kopf">
    <div>
      <p class="kicker">Kontakt</p>
      <h1>Kontakt</h1>
      ${s.kontakt.text ? `<p class="seiten-intro">${esc(s.kontakt.text)}</p>` : ''}
    </div>
    <div class="kontakt-karten">${agenturBlock}${direktBlock}</div>
  </div>
</section>
${anliegenListe}
${steckbrief}`;
}

// ---------------------------------------------------------------------------
// 6. Seitengerüst
// ---------------------------------------------------------------------------

const websiteUrl = (s.website_url || '').replace(/\/+$/, '');
const absolut = (rel) => (websiteUrl ? `${websiteUrl}/${rel}` : rel);
const fotografen = () => [...new Set([...benutzt.values()].map((b) => b.credit).filter(Boolean))];

function minifyCss(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}
const css = minifyCss(fs.readFileSync(path.join(ROOT, 'src/css/style.css'), 'utf8') + farbVariablen);

const ogInfo = verarbeiteBild(normBild(s.hero_bild).datei);
const ogBild = ogInfo ? absolut(ogInfo.src) : '';

const lightbox = `
<dialog class="lightbox" data-lightbox-dialog aria-label="Foto">
  <button class="lightbox-zu" type="button" data-lightbox-zu aria-label="Schließen">×</button>
  <button class="lightbox-zurueck" type="button" data-lightbox-zurueck aria-label="Vorheriges Foto">‹</button>
  <figure><img src="" alt=""><figcaption></figcaption></figure>
  <button class="lightbox-vor" type="button" data-lightbox-vor aria-label="Nächstes Foto">›</button>
</dialog>`;

function layout({ datei, titel, beschreibung, inhalt, aktiv = '', zusatzHead = '' }) {
  const seitenUrl = websiteUrl ? `${websiteUrl}/${datei === 'index.html' ? '' : datei}` : '';
  const og = [
    ['og:type', datei === 'index.html' ? 'profile' : 'website'],
    ['og:locale', 'de_DE'],
    ['og:site_name', s.name],
    ['og:title', titel],
    ['og:description', beschreibung],
    seitenUrl && ['og:url', seitenUrl],
    ogBild && ['og:image', ogBild],
  ].filter(Boolean).map(([p, v]) => `<meta property="${p}" content="${esc(v)}">`).join('\n');
  const navLink = (href, text, id) => `<li><a href="${href}"${aktiv === id ? ' aria-current="page"' : ''}>${esc(text)}</a></li>`;
  return `<!doctype html>
<html lang="de" data-farben-start="${esc(farbschema.laborStart('repertoire', s.farbschema))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
${demo ? '<meta name="robots" content="noindex, nofollow">' : ''}
${seitenUrl ? `<link rel="canonical" href="${esc(seitenUrl)}">` : ''}
<meta name="theme-color" content="${F.creme}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/fraunces-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${zusatzHead}
${og}
<meta name="twitter:card" content="summary_large_image">
<style>${css}</style>
<script src="${mainJsUrl}" defer></script>
</head>
<body>
<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
${demo ? `<div class="entwurf" role="note">Entwurf für ${esc(s.name)}${s.ersteller ? `, erstellt von ${esc(s.ersteller)}` : ''}</div>` : ''}
<header class="kopf">
  <div class="container kopf-innen">
    <a class="marke" href="./"${aktiv === 'start' ? ' aria-current="page"' : ''}>${esc(vorname)} <span>${esc(nachname)}</span></a>
    <nav class="hauptnav" aria-label="Bereiche">
      <ul>${s.bereiche.map((b) => navLink(seiteVon(b), b.titel, b.id)).join('')}</ul>
    </nav>
    <a class="kontakt-link" href="kontakt.html"${aktiv === 'kontakt' ? ' aria-current="page"' : ''}>Kontakt</a>
  </div>
</header>
<main id="inhalt">
${inhalt}
</main>
<footer class="fuss">
  <div class="container fuss-innen">
    <div>
      <p class="fuss-name">${esc(s.name)}</p>
      <p>${esc(berufText)}</p>
    </div>
    <ul class="fuss-nav">${s.bereiche.map((b) => `<li><a href="${seiteVon(b)}">${esc(b.titel)}</a></li>`).join('')}<li><a href="kontakt.html">Kontakt</a></li></ul>
    <ul class="fuss-nav">${s.profile.map((p) => `<li><a ${extern(p.url)}>${esc(p.name)}</a></li>`).join('')}</ul>
  </div>
  <div class="container fuss-unten">
    <p>© <span data-jahr>${new Date().getFullYear()}</span> ${esc(s.name)}${fotografen().length ? ` · Fotos: ${fotografen().map(esc).join(', ')}` : ''}</p>
    <ul><li><a href="impressum.html">Impressum</a></li><li><a href="datenschutz.html">Datenschutz</a></li></ul>
  </div>
</footer>
${lightbox}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// 7. Seiten schreiben
// ---------------------------------------------------------------------------

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

// Inhalte zuerst erzeugen (dabei werden die benutzten Bilder gesammelt), dann mit Gerüst schreiben –
// so stehen alle Fotograf:innen im Fuß jeder Seite.
const seiten = [
  {
    datei: 'index.html', aktiv: 'start', inhalt: startseite(),
    titel: `${s.name} – ${berufText}`,
    beschreibung: (s.kurzbeschreibung || `${s.name}, ${berufText}.`).slice(0, 160),
    zusatzHead: `${vorladen(ogInfo, '(min-width: 900px) 42vw, 92vw')}<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  },
  ...s.bereiche.map((b, i) => ({
    datei: seiteVon(b), aktiv: b.id, inhalt: bereichSeite(b, i),
    titel: `${b.titel} – ${s.name}`,
    beschreibung: (b.intro || b.teaser || `${b.titel}: ${s.name}`).slice(0, 160),
    zusatzHead: vorladen(verarbeiteBild(normBild(b.bild).datei), '(min-width: 900px) 36vw, 92vw'),
  })),
  {
    datei: 'kontakt.html', aktiv: 'kontakt', inhalt: kontaktSeite(),
    titel: `Kontakt – ${s.name}`,
    beschreibung: `Kontakt zu ${s.name}: Management, Sprechaufnahmen, Unterricht und Casting-Angaben.`,
  },
];
for (const datei of ['index.html', 'kontakt.html', 'impressum.html', 'datenschutz.html']) {
  if (s.bereiche.some((b) => seiteVon(b) === datei)) { console.error(`✖ Bereichs-id "${datei.replace('.html', '')}" ist reserviert.`); process.exit(1); }
}

function rechtsSeite(datei, ueberschrift, quelle) {
  if (!quelle) warn(`${ueberschrift} ist leer – bitte ergänzen, bevor die Seite online geht.`);
  const nachweise = datei === 'impressum.html' ? [...benutzt.values()].filter((b) => b.credit) : [];
  const liste = nachweise.length
    ? `<h2>Bildnachweise</h2><ul>${nachweise.map((g) => `<li>${esc(g.alt || g.datei)}: © ${esc(g.credit)}</li>`).join('')}</ul>`
    : '';
  return {
    datei, titel: `${ueberschrift} – ${s.name}`, beschreibung: `${ueberschrift} der Website von ${s.name}.`,
    inhalt: `<section class="abschnitt rechtliches"><div class="container"><h1>${ueberschrift}</h1><div class="rechtstext">${quelle ? h.markdown(quelle) : '<p class="hinweis">Dieser Text wird noch ergänzt.</p>'}${liste}</div></div></section>`,
  };
}
seiten.push(rechtsSeite('impressum.html', 'Impressum', s.impressum), rechtsSeite('datenschutz.html', 'Datenschutz', s.datenschutz));

for (const seite of seiten) fs.writeFileSync(path.join(DIST, seite.datei), layout(seite));

// ---------------------------------------------------------------------------
// 8. Favicon, robots.txt, sitemap.xml
// ---------------------------------------------------------------------------

fs.writeFileSync(path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${F.mint}"/><text x="32" y="42" font-family="Georgia, serif" font-size="26" text-anchor="middle" fill="${F.braun}">${esc(h.initialen(s.name))}</text></svg>`);
fs.writeFileSync(path.join(DIST, 'robots.txt'),
  demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${websiteUrl ? `Sitemap: ${websiteUrl}/sitemap.xml\n` : ''}`);
if (websiteUrl && !demo) {
  const heute = new Date().toISOString().slice(0, 10);
  const urls = seiten.map((p) => `<url><loc>${websiteUrl}/${p.datei === 'index.html' ? '' : p.datei}</loc><lastmod>${heute}</lastmod></url>`).join('');
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`);
}
if (!demo && !websiteUrl) warn('website_url ist leer – ohne sie fehlen canonical-Link, absolute Open-Graph-Bilder und sitemap.xml.');

// ---------------------------------------------------------------------------
// 9. Zusammenfassung
// ---------------------------------------------------------------------------

const groesse = (function summe(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => {
    const p = path.join(dir, e.name);
    return n + (e.isDirectory() ? summe(p) : fs.statSync(p).size);
  }, 0);
})(DIST);
console.log(`✔ ${s.name} gebaut → ${path.relative(process.cwd(), DIST) || '.'}  (${(groesse / 1024 / 1024).toFixed(1)} MB, ${demo ? 'DEMO-Modus: noindex' : 'live: indexierbar'})`);
console.log(`  Seiten: ${seiten.map((p) => p.datei).join(', ')}`);
if (warnungen.length) {
  console.log(`\n⚠ ${warnungen.length} Hinweis(e):`);
  warnungen.forEach((w) => console.log('  - ' + w));
}

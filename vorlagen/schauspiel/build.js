#!/usr/bin/env node
'use strict';
/*
 * Build-Skript für die Schauspiel-Vorlage (Portfolio für Schauspieler:innen und Sprecher:innen).
 *
 *   node build.js ../kunden/<pfad>/schauspiel.json    -> schreibt dist/
 *   BILDER_DIR=... DIST_DIR=... node build.js datei   -> so ruft build-all.js die Vorlage auf
 *
 * Keine npm-Abhängigkeiten. Für responsive WebP-Bilder wird `cwebp` genutzt, falls installiert.
 * Videos und Hörproben werden bewusst verlinkt statt eingebettet: keine Daten an Dritte,
 * keine Cookie-Abfrage, und die Content-Security-Policy (nur eigene Domain) bleibt unverändert.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const h = require('./src/lib/helfer');

const ROOT = __dirname;
const DATEI = path.resolve(process.argv[2] || path.join(ROOT, 'schauspiel.json'));
const BILDER = path.resolve(process.env.BILDER_DIR || path.join(path.dirname(DATEI), 'images'));
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const CACHE = path.resolve(process.env.CACHE_DIR || path.join(ROOT, '.bildcache'));
const BREITEN = [480, 800, 1200, 1600, 2000];

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
s.aktuell = (s.aktuell || []).filter((x) => x && x.titel);
s.vita = (s.vita || []).filter((k) => k && k.kategorie && (k.eintraege || []).length);
s.auszeichnungen = (s.auszeichnungen || []).filter((x) => x && x.titel);
s.steckbrief = (s.steckbrief || []).filter((x) => x && x.label && x.wert);
s.medien = (s.medien || []).filter((m) => m && m.titel && /^https:\/\//i.test(m.url || ''));
s.galerie = (s.galerie || []).filter((g) => g && g.datei);
s.profile = (s.profile || []).filter((p) => p && p.name && /^https:\/\//i.test(p.url || ''));
s.kontakt = s.kontakt || {};
s.farben = s.farben || {};
const agentur = s.kontakt.agentur || {};

const demo = s.demo_modus === true;
const berufText = s.berufe.join(' & ') || 'Schauspiel';

// ---------------------------------------------------------------------------
// 2. Farben
// ---------------------------------------------------------------------------

const HINTERGRUND = '#F5F1EB';
const FLAECHE = '#ECE5DA';
const DUNKEL = '#171412';

let akzent = s.farben.akzent;
if (!h.hexZuRgb(akzent)) {
  if (akzent) warn(`Akzentfarbe "${akzent}" ist kein gültiger Hex-Wert – Standard wird verwendet.`);
  akzent = '#A84B2A';
}
const akzentDunkel = h.abdunkelnBisKontrast(akzent, ['#FFFFFF', HINTERGRUND, FLAECHE]);
let akzentHell = akzent;
for (let i = 0; i < 30 && h.kontrast(akzentHell, DUNKEL) < 4.6; i++) akzentHell = h.mischen(akzentHell, '#FFFFFF', 0.06);

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
fs.copyFileSync(path.join(ROOT, 'src/js/main.js'), path.join(DIST, 'js/main.js'));

// ---------------------------------------------------------------------------
// 4. Bilder: responsive WebP-Varianten (mit Cache)
// ---------------------------------------------------------------------------

const hatCwebp = spawnSync('cwebp', ['-version']).status === 0;
if (!hatCwebp) warn('cwebp nicht gefunden – Bilder werden ohne Größenvarianten kopiert.');

const bildCache = new Map();

function normBild(ref) {
  if (!ref) return { datei: '', alt: '' };
  if (typeof ref === 'string') return { datei: ref, alt: '' };
  return { datei: ref.datei || '', alt: ref.alt || '', fokus: ref.fokus || '', credit: ref.credit || '' };
}

// Alle tatsächlich gezeigten Bilder mit Fotograf:in – für Fußzeile und Bildnachweise im Impressum
const benutzt = new Map();

function verarbeiteBild(datei) {
  if (!datei) return null;
  if (bildCache.has(datei)) return bildCache.get(datei);
  const quelle = path.join(BILDER, datei);
  let info = null;
  const groesse = fs.existsSync(quelle) ? h.bildGroesse(quelle) : null;
  if (!fs.existsSync(quelle)) {
    warn(`Bild fehlt: images/${datei}`);
  } else if (!groesse) {
    warn(`Bildformat von images/${datei} nicht erkannt (erlaubt: JPG, PNG, WebP).`);
  } else {
    const ext = path.extname(datei).toLowerCase();
    const basis = h.slug(path.basename(datei, ext));
    if (!hatCwebp) {
      fs.copyFileSync(quelle, path.join(DIST, 'img', basis + ext));
      const src = `img/${basis}${ext}`;
      info = { breite: groesse.breite, hoehe: groesse.hoehe, src, srcset: '', groesste: src };
    } else {
      const maxBreite = Math.min(groesse.breite, BREITEN[BREITEN.length - 1]);
      const breiten = [...new Set([...BREITEN.filter((b) => b < maxBreite), maxBreite])];
      const varianten = breiten.map((b) => {
        const name = `${basis}-${b}.webp`;
        const ziel = path.join(CACHE, name);
        if (!fs.existsSync(ziel) || fs.statSync(ziel).mtimeMs < fs.statSync(quelle).mtimeMs) {
          const args = ['-quiet', '-q', '78', '-metadata', 'none'];
          if (b < groesse.breite) args.push('-resize', String(b), '0');
          const r = spawnSync('cwebp', [...args, quelle, '-o', ziel]);
          if (r.status !== 0) throw new Error(`cwebp-Fehler bei ${datei}: ${r.stderr}`);
        }
        fs.copyFileSync(ziel, path.join(DIST, 'img', name));
        return { b, url: `img/${name}` };
      });
      const mittel = varianten.find((v) => v.b >= 1200) || varianten[varianten.length - 1];
      info = {
        breite: maxBreite,
        hoehe: Math.round((groesse.hoehe * maxBreite) / groesse.breite),
        src: mittel.url,
        srcset: varianten.map((v) => `${v.url} ${v.b}w`).join(', '),
        groesste: varianten[varianten.length - 1].url,
      };
    }
    if (groesse.breite < 1000) warn(`images/${datei} ist nur ${groesse.breite} px breit – für große Darstellung ggf. bessere Datei anfragen.`);
  }
  bildCache.set(datei, info);
  return info;
}

function bild(ref, { sizes = '100vw', eager = false, klasse = '' } = {}) {
  const r = normBild(ref);
  const info = verarbeiteBild(r.datei);
  if (!info) return `<div class="platzhalter" aria-hidden="true"></div>`;
  if (!r.credit) warn(`Kein Fotonachweis ("credit") für images/${r.datei}.`);
  benutzt.set(r.datei, r);
  const attr = [
    klasse && `class="${klasse}"`,
    `src="${info.src}"`,
    info.srcset && `srcset="${info.srcset}"`,
    info.srcset && `sizes="${sizes}"`,
    `width="${info.breite}" height="${info.hoehe}"`,
    `alt="${esc(r.alt)}"`,
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    r.fokus && `style="object-position:${esc(r.fokus)}"`,
  ].filter(Boolean);
  return `<img ${attr.join(' ')}>`;
}

// ---------------------------------------------------------------------------
// 5. Bausteine
// ---------------------------------------------------------------------------

const ICONS = {
  pfeil: '<path d="M7 17 17 7M8 7h9v9"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  welle: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>',
  telefon: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
};
const icon = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
const extern = (url) => `href="${esc(url)}" target="_blank" rel="noopener"`;

const telInt = h.telefonInternational(agentur.telefon, 'DE');
const kontaktMail = s.kontakt.email_direkt || agentur.email || '';
const showreel = s.medien.find((m) => m.art === 'video');

const nav = [
  s.aktuell.length && { id: 'aktuell', text: 'Aktuell' },
  h.absaetze(s.ueber_mich).length && { id: 'ueber-mich', text: 'Über mich' },
  s.vita.length && { id: 'vita', text: 'Vita' },
  s.galerie.length && { id: 'fotos', text: 'Fotos' },
  s.medien.length && { id: 'medien', text: 'Showreel & Stimme' },
  s.steckbrief.length && { id: 'profil', text: 'Profil' },
  { id: 'kontakt', text: 'Kontakt' },
].filter(Boolean);

function abschnittKopf(nr, titel, eyebrow) {
  return `<div class="abschnitt-kopf"><p class="eyebrow"><span>${String(nr).padStart(2, '0')}</span>${esc(eyebrow)}</p><h2>${esc(titel)}</h2></div>`;
}
let zaehler = 0;

function hero() {
  const ref = normBild(s.hero_bild);
  return `
<section class="hero" aria-labelledby="hero-titel">
  <div class="hero-bild">${bild(ref, { eager: true, sizes: '100vw' })}</div>
  <div class="container hero-text">
    <p class="hero-berufe">${s.berufe.map(esc).join('<span aria-hidden="true"> · </span>')}</p>
    <h1 id="hero-titel">${esc(s.name)}</h1>
    ${s.hero_zeile ? `<p class="hero-zeile">${esc(s.hero_zeile)}</p>` : ''}
    <div class="hero-knoepfe">
      ${showreel ? `<a class="knopf knopf--hell" ${extern(showreel.url)}>${icon('play')}Showreel ansehen</a>` : ''}
      <a class="knopf knopf--rahmen" href="#kontakt">Kontakt</a>
    </div>
  </div>
</section>`;
}

function aktuell() {
  if (!s.aktuell.length) return '';
  const karten = s.aktuell.map((a, i) => {
    const b = a.bild && verarbeiteBild(normBild(a.bild).datei);
    return `
    <article class="karte${b ? ' karte--bild' : ''}${i === 0 ? ' karte--gross' : ''}" data-einblenden>
      ${b ? `<div class="karte-bild">${bild(a.bild, { sizes: '(min-width: 960px) 50vw, 100vw' })}</div>` : ''}
      <div class="karte-text">
        ${a.label ? `<p class="label">${esc(a.label)}</p>` : ''}
        <h3>${esc(a.titel)}</h3>
        <p>${esc(a.text)}</p>
      </div>
    </article>`;
  }).join('');
  return `
<section id="aktuell" class="abschnitt">
  <div class="container">
    ${abschnittKopf(++zaehler, 'Aktuell', 'Neues')}
    <div class="aktuell-raster">${karten}</div>
  </div>
</section>`;
}

function ueberMich() {
  const absaetze = h.absaetze(s.ueber_mich);
  if (!absaetze.length) return '';
  const fakten = (s.ueber_mich_fakten || []).filter((f) => f && f.wert);
  const preise = s.auszeichnungen.length
    ? `<div class="preise" data-einblenden><h3>Auszeichnungen</h3><ul>${s.auszeichnungen
        .map((p) => `<li><span class="jahr">${esc(p.jahr)}</span><span><strong>${esc(p.titel)}</strong>${p.text ? ` ${esc(p.text)}` : ''}</span></li>`)
        .join('')}</ul></div>`
    : '';
  return `
<section id="ueber-mich" class="abschnitt abschnitt--flaeche">
  <div class="container ueber-raster">
    <figure class="ueber-bild" data-einblenden>${bild(s.ueber_mich_bild, { sizes: '(min-width: 960px) 40vw, 100vw' })}</figure>
    <div class="ueber-text">
      ${abschnittKopf(++zaehler, 'Über mich', berufText)}
      <div class="fliesstext">${absaetze.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(p)}</p>`).join('')}</div>
      ${fakten.length ? `<dl class="fakten">${fakten.map((f) => `<div><dt>${esc(f.wert)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl>` : ''}
      ${preise}
    </div>
  </div>
</section>`;
}

function vita() {
  if (!s.vita.length) return '';
  const id = (i) => `vita-${i}`;
  const tabs = s.vita
    .map((k, i) => `<button type="button" role="tab" id="${id(i)}-tab" aria-controls="${id(i)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(k.kategorie)}<span class="anzahl">${k.eintraege.length}</span></button>`)
    .join('');
  const panels = s.vita.map((k, i) => `
    <div class="vita-panel" role="tabpanel" id="${id(i)}" aria-labelledby="${id(i)}-tab">
      <h3 class="vita-panel-titel">${esc(k.kategorie)}</h3>
      <ol class="vita-liste">${k.eintraege.map((e) => {
        const details = [e.rolle && `<span>${esc(e.rolle)}</span>`, e.regie && `<span>Regie: ${esc(e.regie)}</span>`].filter(Boolean).join('');
        return `<li><span class="jahr">${esc(e.jahr)}</span><div class="vita-werk"><strong>${esc(e.titel)}</strong>${details ? `<div class="vita-details">${details}</div>` : ''}</div><span class="vita-ort">${esc(e.ort || '')}</span></li>`;
      }).join('')}</ol>
    </div>`).join('');
  return `
<section id="vita" class="abschnitt">
  <div class="container">
    ${abschnittKopf(++zaehler, 'Vita', 'Arbeiten')}
    <div class="vita" data-tabs>
      <div class="vita-tabs" role="tablist" aria-label="Vita nach Bereichen">${tabs}</div>
      ${panels}
    </div>
  </div>
</section>`;
}

function galerie() {
  const bilder = s.galerie.map((g) => ({ ...g, info: verarbeiteBild(g.datei) })).filter((g) => g.info);
  if (!bilder.length) return '';
  return `
<section id="fotos" class="abschnitt abschnitt--dunkel">
  <div class="container">
    ${abschnittKopf(++zaehler, 'Fotos', 'Porträts & Szenen')}
    <ul class="galerie">${bilder.map((g) => `
      <li data-einblenden><a href="${g.info.groesste}" data-lightbox data-credit="${esc(g.credit ? `Foto: ${g.credit}` : '')}" aria-label="${esc(g.alt || 'Foto')} – groß anzeigen">
        ${bild(g, { sizes: '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw' })}
        ${g.credit ? `<span class="credit">Foto: ${esc(g.credit)}</span>` : ''}
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

function medien() {
  if (!s.medien.length) return '';
  return `
<section id="medien" class="abschnitt">
  <div class="container">
    ${abschnittKopf(++zaehler, 'Showreel & Stimme', 'Sehen & Hören')}
    <ul class="medien">${s.medien.map((m) => `
      <li data-einblenden><a class="medium" ${extern(m.url)}>
        <span class="medium-icon">${icon(m.art === 'audio' ? 'welle' : 'play')}</span>
        <span class="medium-text"><strong>${esc(m.titel)}</strong>${m.text ? `<span>${esc(m.text)}</span>` : ''}</span>
        <span class="medium-pfeil">${icon('pfeil')}<span class="sr-only">(öffnet externe Seite)</span></span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

function profil() {
  if (!s.steckbrief.length) return '';
  return `
<section id="profil" class="abschnitt abschnitt--flaeche">
  <div class="container">
    ${abschnittKopf(++zaehler, 'Profil', 'Steckbrief')}
    <dl class="steckbrief">${s.steckbrief.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.wert)}</dd></div>`).join('')}</dl>
  </div>
</section>`;
}

function kontakt() {
  const zeilen = [
    agentur.person && `<p class="agentur-person">${esc(agentur.person)}</p>`,
    telInt && `<a class="kontakt-link" href="tel:${telInt}">${icon('telefon')}${esc(agentur.telefon)}</a>`,
    agentur.email && `<a class="kontakt-link" href="mailto:${esc(agentur.email)}">${icon('mail')}${esc(agentur.email)}</a>`,
    agentur.website && `<a class="kontakt-link" ${extern(agentur.website)}>${icon('pfeil')}${esc(agentur.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>`,
  ].filter(Boolean).join('');
  return `
<section id="kontakt" class="abschnitt abschnitt--dunkel kontakt">
  <div class="container kontakt-raster">
    <div>
      ${abschnittKopf(++zaehler, 'Kontakt', 'Anfragen')}
      ${s.kontakt.text ? `<p class="kontakt-intro">${esc(s.kontakt.text)}</p>` : ''}
      ${kontaktMail ? `<a class="knopf knopf--akzent" href="mailto:${esc(kontaktMail)}?subject=${encodeURIComponent(`Anfrage für ${s.name}`)}">${icon('mail')}Anfrage senden</a>` : ''}
    </div>
    <div class="kontakt-karten">
      ${agentur.name ? `<div class="agentur"><p class="label">Agentur</p><h3>${esc(agentur.name)}</h3>${zeilen}</div>` : ''}
      ${s.profile.length ? `<div class="profile"><p class="label">Profile</p><ul>${s.profile.map((p) => `<li><a ${extern(p.url)}>${esc(p.name)}${icon('pfeil')}</a></li>`).join('')}</ul></div>` : ''}
    </div>
  </div>
</section>`;
}

const lightbox = `
<dialog class="lightbox" data-lightbox-dialog aria-label="Foto">
  <button class="lightbox-zu" type="button" data-lightbox-zu aria-label="Schließen">×</button>
  <button class="lightbox-nav lightbox-zurueck" type="button" data-lightbox-zurueck aria-label="Vorheriges Foto">‹</button>
  <figure><img src="" alt=""><figcaption></figcaption></figure>
  <button class="lightbox-nav lightbox-vor" type="button" data-lightbox-vor aria-label="Nächstes Foto">›</button>
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
    `:root{--akzent:${akzent};--akzent-dunkel:${akzentDunkel};--akzent-hell:${akzentHell}}`
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
<meta name="theme-color" content="${DUNKEL}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/fraunces-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${zusatzHead}
${og}
<meta name="twitter:card" content="summary_large_image">
<style>${css}</style>
<script src="js/main.js" defer></script>
</head>
<body id="top"${startseite ? ' class="startseite"' : ''}>
<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
${demo ? `<div class="demo-streifen" role="note">Entwurf für ${esc(s.name)}${s.ersteller ? ` – erstellt von ${esc(s.ersteller)}` : ''}</div>` : ''}
<header class="kopfzeile" data-kopf>
  <div class="container kopf-innen">
    <a class="marke" href="${startseite ? '#top' : 'index.html'}">${esc(s.name)}</a>
    <nav id="hauptnav" class="hauptnav" aria-label="Hauptnavigation">
      <ul>${nav.map((n) => `<li><a href="${basis}#${n.id}">${esc(n.text)}</a></li>`).join('')}</ul>
    </nav>
    <button class="menue-knopf" type="button" data-menue-knopf aria-expanded="false" aria-controls="hauptnav" aria-label="Menü öffnen"><span></span><span></span></button>
  </div>
</header>
<main id="inhalt">
${inhalt}
</main>
<footer class="fusszeile">
  <div class="container fuss-innen">
    <p class="fuss-marke">${esc(s.name)}</p>
    <ul class="fuss-links"><li><a href="impressum.html">Impressum</a></li><li><a href="datenschutz.html">Datenschutz</a></li></ul>
    <p class="copyright">© <span data-jahr>${new Date().getFullYear()}</span> ${esc(s.name)}${fotografen().length ? ` · Fotos: ${fotografen().map(esc).join(', ')}` : ''}</p>
  </div>
</footer>
${zusatzBody}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// 7. Startseite
// ---------------------------------------------------------------------------

const heroInfo = verarbeiteBild(normBild(s.hero_bild).datei);
const ogBild = heroInfo ? absolut(heroInfo.src) : '';
const inhalt = [hero(), aktuell(), ueberMich(), vita(), galerie(), medien(), profil(), kontakt()].join('\n');

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: s.name,
  jobTitle: s.berufe.length ? s.berufe : undefined,
  description: s.kurzbeschreibung || undefined,
  url: websiteUrl || undefined,
  image: heroInfo ? absolut(heroInfo.groesste) : undefined,
  award: s.auszeichnungen.map((p) => `${p.titel}${p.text ? ` ${p.text}` : ''} (${p.jahr})`),
  sameAs: s.profile.map((p) => p.url),
};
const heroPreload = heroInfo
  ? `<link rel="preload" as="image" href="${heroInfo.src}"${heroInfo.srcset ? ` imagesrcset="${heroInfo.srcset}" imagesizes="100vw"` : ''} fetchpriority="high">`
  : '';

fs.writeFileSync(path.join(DIST, 'index.html'), layout({
  titel: `${s.name} – ${berufText}${s.slogan ? ` | ${s.slogan}` : ''}`,
  beschreibung: (s.kurzbeschreibung || `${s.name}, ${berufText}.`).slice(0, 160),
  inhalt,
  startseite: true,
  zusatzHead: heroPreload + `\n<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
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
    inhalt: `<section class="rechtliches"><div class="container"><p class="eyebrow"><a href="index.html">← Zurück zur Startseite</a></p><h1>${ueberschrift}</h1><div class="rechtstext">${quelle ? h.markdown(quelle) : '<p class="hinweis">Dieser Text wird noch ergänzt.</p>'}${liste}</div></div></section>`,
  }));
}
rechtsSeite('impressum.html', 'Impressum', s.impressum);
rechtsSeite('datenschutz.html', 'Datenschutz', s.datenschutz);

// ---------------------------------------------------------------------------
// 9. Favicon, robots.txt, sitemap.xml
// ---------------------------------------------------------------------------

const initialen = h.initialen(s.name);
fs.writeFileSync(path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${DUNKEL}"/><text x="32" y="42" font-family="Georgia, serif" font-size="26" text-anchor="middle" fill="${akzentHell}">${esc(initialen)}</text></svg>`);
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
console.log(`  Sektionen: ${nav.map((n) => n.text).join(', ')}`);
if (warnungen.length) {
  console.log(`\n⚠ ${warnungen.length} Hinweis(e):`);
  warnungen.forEach((w) => console.log('  - ' + w));
}

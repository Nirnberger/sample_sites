#!/usr/bin/env node
'use strict';
/*
 * Build-Skript für die Café-Vorlage („hell & herzlich“) – Cafés, Bistros, Imbisse.
 *
 *   node build.js                  -> liest cafe.json, schreibt dist/
 *   node build.js andere.json      -> liest eine andere Datei
 *
 * Keine npm-Abhängigkeiten. Für responsive WebP-Bilder wird das Kommandozeilen-
 * werkzeug `cwebp` genutzt, falls installiert (siehe README). Ohne cwebp werden
 * die Originalbilder unverändert kopiert.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const h = require('./src/lib/helfer');
const { layout } = require('./src/templates/seite');
const A = require('./src/templates/abschnitte');

const ROOT = __dirname;
const DATEI = path.resolve(process.argv[2] || path.join(ROOT, 'cafe.json'));
// Optional von außen setzbar (z. B. von build-all.js für mehrere Seiten pro Vorlage)
const BILDER = path.resolve(process.env.BILDER_DIR || path.join(ROOT, 'images'));
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const CACHE = path.resolve(process.env.CACHE_DIR || path.join(ROOT, '.bildcache'));
const BREITEN = [480, 800, 1200, 1600, 2000];

const warnungen = [];
const warn = (text) => warnungen.push(text);

// ---------------------------------------------------------------------------
// 1. Daten laden und mit Standardwerten auffüllen
// ---------------------------------------------------------------------------

let s;
try {
  s = JSON.parse(fs.readFileSync(DATEI, 'utf8'));
} catch (e) {
  console.error(`✖ ${path.basename(DATEI)} konnte nicht gelesen werden: ${e.message}`);
  process.exit(1);
}

s.branche = s.branche || 'Café';
s.kontakt = s.kontakt || {};
s.kontakt.adresse = s.kontakt.adresse || {};
s.social = s.social || {};
s.farben = s.farben || {};
s.leistungen = (s.leistungen || []).filter((k) => k && k.kategorie && (k.eintraege || []).length);
s.team = (s.team || []).filter((m) => m && m.name);
s.galerie = (s.galerie || []).filter(Boolean);
s.bewertungen = (s.bewertungen || []).filter((b) => b && b.text);
s.bildnachweise = (s.bildnachweise || []).filter((b) => b && b.datei);
s.highlights = (s.highlights || []).filter((x) => x && x.titel);
if (s.preis_hinweis === undefined) {
  s.preis_hinweis = 'Alle Preise in Euro inkl. MwSt. Infos zu Allergenen bekommst du gern an der Theke.';
}

for (const feld of ['name', 'kontakt.telefon', 'kontakt.adresse.strasse', 'kontakt.adresse.plz', 'kontakt.adresse.ort']) {
  const wert = feld.split('.').reduce((o, k) => (o ? o[k] : undefined), s);
  if (!wert) {
    if (feld === 'name') { console.error('✖ Pflichtfeld "name" fehlt in cafe.json.'); process.exit(1); }
    warn(`Pflichtfeld "${feld}" ist leer.`);
  }
}

const demo = s.demo_modus === true;
const land = h.landInfo(s.kontakt.adresse.land);

// ---------------------------------------------------------------------------
// 2. Farben: Akzent aus cafe.json, Varianten mit ausreichendem Kontrast berechnen
// ---------------------------------------------------------------------------

const HINTERGRUND = '#FBF7F0';
const FLAECHE = '#F2EADD';
const DUNKEL = '#1F2E29';

let akzent = s.farben.akzent;
if (!h.hexZuRgb(akzent)) {
  if (akzent) warn(`Akzentfarbe "${akzent}" ist kein gültiger Hex-Wert – Standard wird verwendet.`);
  akzent = '#2F6B57';
}
let akzentDunkel = h.hexZuRgb(s.farben.akzent_dunkel) ? s.farben.akzent_dunkel : null;
// Dunkle Variante: für Buttons (weiße Schrift) und Text auf hellem Grund, mind. 4,5:1
akzentDunkel = h.abdunkelnBisKontrast(akzentDunkel || akzent, ['#FFFFFF', HINTERGRUND, FLAECHE]);
// Helle Variante für die dunkle Kontakt-Sektion
let akzentHell = akzent;
for (let i = 0; i < 30 && h.kontrast(akzentHell, DUNKEL) < 4.6; i++) akzentHell = h.mischen(akzentHell, '#FFFFFF', 0.06);
const akzentZart = h.mischen(akzent, HINTERGRUND, 0.82);

// ---------------------------------------------------------------------------
// 3. Ausgabeordner vorbereiten
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
// 4. Bilder: responsive WebP-Varianten erzeugen (mit Cache)
// ---------------------------------------------------------------------------

const hatCwebp = spawnSync('cwebp', ['-version']).status === 0;
if (!hatCwebp) warn('cwebp nicht gefunden – Bilder werden ohne Größenvarianten kopiert (siehe README, Abschnitt Bilder).');

const bildCache = new Map();
const benutzteBilder = new Set();

function normBild(ref) {
  if (!ref) return { datei: '', alt: '' };
  if (typeof ref === 'string') return { datei: ref, alt: '' };
  return { datei: ref.datei || '', alt: ref.alt || '', fokus: ref.fokus || '' };
}

function verarbeiteBild(datei) {
  if (!datei) return null;
  if (bildCache.has(datei)) return bildCache.get(datei);
  const quelle = path.join(BILDER, datei);
  let info = null;
  if (!fs.existsSync(quelle)) {
    warn(`Bild fehlt: images/${datei} – Platzhalter wird angezeigt.`);
  } else {
    const groesse = h.bildGroesse(quelle);
    const ext = path.extname(datei).toLowerCase();
    const basis = h.slug(path.basename(datei, ext));
    if (!groesse) {
      warn(`Bildformat von images/${datei} nicht erkannt (erlaubt: JPG, PNG, WebP, SVG).`);
    } else if (ext === '.svg' || !hatCwebp) {
      const name = basis + ext;
      fs.copyFileSync(quelle, path.join(DIST, 'img', name));
      info = { breite: groesse.breite, hoehe: groesse.hoehe, src: `img/${name}`, srcset: '', groesste: `img/${name}` };
    } else {
      const maxBreite = Math.min(groesse.breite, BREITEN[BREITEN.length - 1]);
      const breiten = [...new Set([...BREITEN.filter((b) => b < maxBreite), maxBreite])];
      const varianten = breiten.map((b) => {
        const name = `${basis}-${b}.webp`;
        const ziel = path.join(CACHE, name);
        const veraltet = !fs.existsSync(ziel) || fs.statSync(ziel).mtimeMs < fs.statSync(quelle).mtimeMs;
        if (veraltet) {
          const args = ['-quiet', '-q', '76', '-metadata', 'none'];
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
  }
  bildCache.set(datei, info);
  return info;
}

function platzhalter(alt, text = 'Foto folgt') {
  return alt
    ? `<div class="platzhalter" role="img" aria-label="${h.esc(alt)}"><span aria-hidden="true">${text}</span></div>`
    : `<div class="platzhalter" aria-hidden="true"><span>${text}</span></div>`;
}

function bild(ref, { sizes = '100vw', eager = false } = {}) {
  const r = normBild(ref);
  const info = verarbeiteBild(r.datei);
  if (!info) return platzhalter(r.alt);
  benutzteBilder.add(r.datei);
  const attr = [
    `src="${info.src}"`,
    info.srcset && `srcset="${info.srcset}"`,
    info.srcset && `sizes="${sizes}"`,
    `width="${info.breite}" height="${info.hoehe}"`,
    `alt="${h.esc(r.alt)}"`,
    eager ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"',
    r.fokus && `style="object-position:${h.esc(r.fokus)}"`,
  ].filter(Boolean);
  return `<img ${attr.join(' ')}>`;
}

const stockfotos = new Map(s.bildnachweise.map((n) => [n.datei, n]));
const istStockfoto = (datei) => stockfotos.has(datei);

// Teamfotos: nur echte Fotos. Stockfotos (mit Bildnachweis) werden hier bewusst abgelehnt.
function teamFoto(m) {
  const datei = normBild(m.foto).datei;
  if (datei && istStockfoto(datei)) {
    warn(`Teamfoto "${datei}" ist ein Stockfoto – im Team-Bereich sind nur echte Fotos erlaubt. Platzhalter wird angezeigt.`);
  } else if (datei && verarbeiteBild(datei)) {
    return bild({ datei, alt: `${m.name}${m.rolle ? `, ${m.rolle}` : ''}`, fokus: m.fokus }, { sizes: '(min-width: 900px) 25vw, (min-width: 600px) 45vw, 7rem' });
  }
  return `<div class="platzhalter platzhalter--person" aria-hidden="true"><span>${h.esc(h.initialen(m.name))}</span></div>`;
}

// ---------------------------------------------------------------------------
// 5. Kontext für die Templates
// ---------------------------------------------------------------------------

const k = s.kontakt;
const a = k.adresse;
const telInt = h.telefonInternational(k.telefon, a.land);
const waInt = h.telefonInternational(k.whatsapp, a.land).replace('+', '');
const buchung = /^https?:\/\//i.test(s.buchung_url || '') ? s.buchung_url : '';
if (s.buchung_url && !buchung) warn(`buchung_url "${s.buchung_url}" beginnt nicht mit https:// – wird ignoriert.`);
const adresseText = [a.strasse, `${a.plz || ''} ${a.ort || ''}`.trim(), a.land].filter(Boolean).join(', ');

const links = {
  tel: telInt ? `tel:${telInt}` : '',
  wa: waInt ? `https://wa.me/${waInt}?text=${encodeURIComponent('Hallo! Ich habe eine Frage:')}` : '',
  mail: k.email ? `mailto:${k.email}` : '',
  buchung,
  route: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.name}, ${adresseText}`)}`,
};

// Hauptaktion: Reservieren (Link) – sonst Anrufen. Optional zusätzlich „Online bestellen“.
const cta = buchung
  ? { text: s.buchung_text || 'Tisch reservieren', icon: 'kalender', attribute: `href="${h.esc(buchung)}" target="_blank" rel="noopener"` }
  : { text: 'Jetzt anrufen', icon: 'telefon', attribute: `href="${links.tel || '#kontakt'}"` };
const bestellUrl = /^https?:\/\//i.test(s.bestell_url || '') ? s.bestell_url : '';
if (s.bestell_url && !bestellUrl) warn(`bestell_url "${s.bestell_url}" beginnt nicht mit https:// – wird ignoriert.`);
links.bestellen = bestellUrl;
const bestellText = s.bestell_text || 'Online bestellen';

const zeiten = (s.oeffnungszeiten || []).map((z) => {
  const tag = h.wochentag(z.tag);
  if (!tag) warn(`Unbekannter Wochentag in oeffnungszeiten: "${z.tag}"`);
  const bereiche = h.zeitenParsen(z.zeiten);
  if (!bereiche.length && z.zeiten && !/geschlossen|ruhetag|closed/i.test(z.zeiten)) {
    warn(`Öffnungszeit "${z.zeiten}" (${z.tag}) nicht erkannt – Format z. B. "09:00–18:00" oder "geschlossen".`);
  }
  return { tag: z.tag, nr: tag ? tag.nr : null, schema: tag ? tag.schema : null, bereiche };
});

let logo = null;
if (s.logo) {
  const info = verarbeiteBild(s.logo);
  if (info) {
    const hoehe = 44;
    logo = { src: info.src, hoehe, breite: Math.round((info.breite / info.hoehe) * hoehe) };
    benutzteBilder.add(s.logo);
  }
}

const galerieBilder = s.galerie
  .map((g) => ({ ...normBild(g) }))
  .map((g) => ({ ...g, info: verarbeiteBild(g.datei) }))
  .filter((g) => g.info);

const hat = {
  leistungen: s.leistungen.length > 0,
  ueberUns: absatzVorhanden(s.ueber_uns_text),
  team: s.team.length > 0,
  galerie: galerieBilder.length > 0,
  bewertungen: s.bewertungen.length > 0 || !!s.google_bewertung,
};
function absatzVorhanden(t) { return h.absaetze(t).length > 0; }

const nav = [
  hat.leistungen && { id: 'leistungen', text: s.leistungen_nav || 'Speisekarte' },
  hat.ueberUns && { id: 'ueber-uns', text: 'Über uns' },
  hat.team && { id: 'team', text: 'Team' },
  hat.galerie && { id: 'galerie', text: 'Galerie' },
  hat.bewertungen && { id: 'bewertungen', text: 'Bewertungen' },
  { id: 'oeffnungszeiten', text: 'Öffnungszeiten' },
  { id: 'kontakt', text: 'Kontakt' },
].filter(Boolean);

const websiteUrl = (s.website_url || '').replace(/\/+$/, '');
const absolut = (rel) => (websiteUrl ? `${websiteUrl}/${rel}` : rel);

const css =
  fs.readFileSync(path.join(ROOT, 'src/css/style.css'), 'utf8') +
  `:root{--akzent:${akzent};--akzent-dunkel:${akzentDunkel};--akzent-hell:${akzentHell};--akzent-zart:${akzentZart}}`;

const c = {
  s, demo, land, links, cta, bestellText, nav, hat, zeiten, logo, galerieBilder,
  jahr: new Date().getFullYear(),
  css: minifyCss(css),
  bild, teamFoto, istStockfoto,
  // Helle und getönte Sektionen wechseln sich ab – auch wenn Sektionen ausgeblendet sind
  hintergrund(id) {
    const reihenfolge = nav.map((n) => n.id).filter((x) => x !== 'kontakt');
    return reihenfolge.indexOf(id) % 2 === 1 ? ' abschnitt--flaeche' : '';
  },
  seo: { url: websiteUrl, pfad: '', ogBild: '' },
  bildnachweise() {
    const gesehen = new Set();
    return s.bildnachweise
      .filter((n) => benutzteBilder.has(n.datei) && n.fotograf)
      .map((n) => ({ fotograf: n.fotograf, link: n.unsplash_link || 'https://unsplash.com' }))
      .filter((n) => !gesehen.has(n.fotograf) && gesehen.add(n.fotograf));
  },
};

function minifyCss(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// ---------------------------------------------------------------------------
// 6. Startseite
// ---------------------------------------------------------------------------

const heroInfo = verarbeiteBild(normBild(s.hero_bild).datei);
if (heroInfo) {
  c.seo.ogBild = absolut(heroInfo.srcset ? heroInfo.src : heroInfo.groesste);
}

// Sektionen zuerst rendern, damit bekannt ist, welche Bilder benutzt werden (Bildnachweis).
const inhalt = [
  A.hero(c),
  A.highlights(c),
  A.leistungen(c),
  A.ueberUns(c),
  A.team(c),
  A.galerie(c),
  A.bewertungen(c),
  A.oeffnungszeiten(c),
  A.kontakt(c),
].join('\n');

const heroPreload = heroInfo
  ? `<link rel="preload" as="image" href="${heroInfo.src}"${heroInfo.srcset ? ` imagesrcset="${heroInfo.srcset}" imagesizes="100vw"` : ''} fetchpriority="high">`
  : '';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': s.schema_typ || 'CafeOrCoffeeShop',
  name: s.name,
  description: s.kurzbeschreibung || undefined,
  url: websiteUrl || undefined,
  image: heroInfo ? [absolut(heroInfo.groesste)] : undefined,
  logo: logo ? absolut(logo.src) : undefined,
  telephone: telInt || undefined,
  email: k.email || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: a.strasse,
    postalCode: a.plz,
    addressLocality: a.ort,
    addressCountry: land.iso,
  },
  hasMap: links.route,
  openingHoursSpecification: zeiten
    .filter((z) => z.schema && z.bereiche.length)
    .flatMap((z) => z.bereiche.map((b) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: z.schema, opens: b.von, closes: b.bis }))),
  aggregateRating: s.google_bewertung
    ? { '@type': 'AggregateRating', ratingValue: s.google_bewertung, reviewCount: s.google_anzahl || undefined, bestRating: 5 }
    : undefined,
  sameAs: [s.social.instagram, s.social.facebook].filter((u) => u && /^https?:\/\/[^/]+\/.+/.test(u)),
  priceRange: s.preisspanne || undefined,
  servesCuisine: s.kueche || undefined,
  acceptsReservations: buchung ? true : undefined,
};
if (!jsonLd.sameAs.length) delete jsonLd.sameAs;
const jsonLdHtml = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;

const titel = `${s.name} – ${s.branche} in ${a.ort}${s.slogan ? ` | ${s.slogan.replace(/[.!]$/, '')}` : ''}`;
const beschreibung = (s.kurzbeschreibung || `${s.name}, ${s.branche} in ${a.ort}.`).slice(0, 160);

const startseite = layout(c, {
  titel,
  beschreibung,
  inhalt,
  startseite: true,
  zusatzHead: heroPreload + '\n' + jsonLdHtml,
  zusatzBody: A.mobilLeiste(c) + A.lightbox(c),
});
fs.writeFileSync(path.join(DIST, 'index.html'), startseite);

// ---------------------------------------------------------------------------
// 7. Impressum und Datenschutz
// ---------------------------------------------------------------------------

function rechtsSeite(datei, ueberschrift, quelle) {
  c.seo.pfad = '/' + datei;
  const nachweise = s.bildnachweise.filter((n) => benutzteBilder.has(n.datei));
  const nachweisListe = datei === 'impressum.html' && nachweise.length
    ? `<h2>Bildnachweise</h2><ul>${nachweise
        .map((n) => `<li>${h.esc(n.datei)}: Foto von <a href="${h.esc(n.unsplash_link || 'https://unsplash.com')}" rel="noopener">${h.esc(n.fotograf)}</a> / Unsplash</li>`)
        .join('')}</ul>`
    : '';
  const text = quelle
    ? h.markdown(quelle)
    : `<p class="hinweis">Dieser Text wird noch ergänzt.</p>`;
  if (!quelle) warn(`${ueberschrift} ist leer – bitte in cafe.json ergänzen, bevor die Seite online geht.`);
  const html = layout(c, {
    titel: `${ueberschrift} – ${s.name}`,
    beschreibung: `${ueberschrift} von ${s.name}, ${s.branche} in ${a.ort}.`,
    inhalt: `<section class="rechtliches"><div class="container"><p class="eyebrow"><a href="index.html">Zurück zur Startseite</a></p><h1>${ueberschrift}</h1><div class="rechtstext">${text}${nachweisListe}</div></div></section>`,
  });
  fs.writeFileSync(path.join(DIST, datei), html);
}
rechtsSeite('impressum.html', 'Impressum', s.impressum);
rechtsSeite('datenschutz.html', 'Datenschutz', s.datenschutz);

// ---------------------------------------------------------------------------
// 8. Favicon, robots.txt, sitemap.xml
// ---------------------------------------------------------------------------

fs.writeFileSync(
  path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${akzentDunkel}"/><text x="32" y="44" font-family="Georgia, serif" font-style="italic" font-size="34" text-anchor="middle" fill="#FBF7F0">${h.esc(s.name.trim()[0] || 'S')}</text></svg>`
);
fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  demo ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${websiteUrl ? `Sitemap: ${websiteUrl}/sitemap.xml\n` : ''}`
);
if (websiteUrl && !demo) {
  const heute = new Date().toISOString().slice(0, 10);
  const urls = ['', 'impressum.html', 'datenschutz.html']
    .map((p) => `<url><loc>${websiteUrl}/${p}</loc><lastmod>${heute}</lastmod></url>`)
    .join('');
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

console.log(`✔ ${s.name} gebaut → dist/  (${(groesse / 1024 / 1024).toFixed(1)} MB, ${demo ? 'DEMO-Modus: noindex' : 'live: indexierbar'})`);
console.log(`  Sektionen: ${nav.map((n) => n.text).join(', ')}`);
if (warnungen.length) {
  console.log(`\n⚠ ${warnungen.length} Hinweis(e):`);
  warnungen.forEach((w) => console.log('  - ' + w));
}

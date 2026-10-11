'use strict';
// Seitengerüst: <head>, Demo-Streifen, Kopfzeile, Fußzeile.

const { esc } = require('../lib/helfer');
const { icon } = require('./icons');

function kopfzeile(c, startseite) {
  const s = c.s;
  const basis = startseite ? '' : 'index.html';
  const marke = c.logo
    ? `<img src="${c.logo.src}" alt="${esc(s.name)}" width="${c.logo.breite}" height="${c.logo.hoehe}">`
    : esc(s.name);
  const links = c.nav
    .map((n) => `<li><a href="${basis}#${n.id}">${esc(n.text)}</a></li>`)
    .join('');
  return `
<header class="kopfzeile" data-kopf>
  <div class="container kopf-innen">
    <a class="marke" href="${startseite ? '#top' : 'index.html'}">${marke}</a>
    <nav id="hauptnav" class="hauptnav" aria-label="Hauptnavigation">
      <ul>${links}</ul>
      <a class="knopf mobilnav-cta" ${c.cta.attribute}>${icon(c.cta.icon)}${esc(c.cta.text)}</a>
    </nav>
    <a class="knopf kopf-cta" ${c.cta.attribute}>${esc(c.cta.text)}</a>
    <button class="menue-knopf" type="button" data-menue-knopf aria-expanded="false" aria-controls="hauptnav" aria-label="Menü öffnen">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}

function fusszeile(c) {
  const s = c.s;
  const a = s.kontakt.adresse;
  const nachweise = c.bildnachweise();
  const nachweisHtml = nachweise.length
    ? `<p class="bildnachweis">Fotos: ${nachweise
        .map((n) => `<a href="${esc(n.link)}" rel="noopener">${esc(n.fotograf)}</a>`)
        .join(', ')} / Unsplash</p>`
    : '';
  return `
<footer class="fusszeile">
  <div class="container">
    <div class="fuss-raster">
      <div>
        <p class="fuss-marke">${esc(s.name)}</p>
        <p>${esc(a.strasse)} · ${esc(a.plz)} ${esc(a.ort)}${c.links.tel ? `<br><a href="${c.links.tel}">${esc(s.kontakt.telefon)}</a>` : ''}</p>
      </div>
      <nav aria-label="Rechtliches">
        <ul class="fuss-links">
          <li><a href="impressum.html">Impressum</a></li>
          <li><a href="datenschutz.html">Datenschutz</a></li>
        </ul>
      </nav>
    </div>
    <p class="copyright">© <span data-jahr>${c.jahr}</span> ${esc(s.name)}</p>
    ${nachweisHtml}
  </div>
</footer>`;
}

function layout(c, { titel, beschreibung, inhalt, startseite = false, zusatzHead = '', zusatzBody = '' }) {
  const s = c.s;
  const url = c.seo.url;
  const seitenUrl = url ? url + (startseite ? '/' : c.seo.pfad) : '';
  const og = [
    ['og:type', 'website'],
    ['og:locale', c.land.locale],
    ['og:site_name', s.name],
    ['og:title', titel],
    ['og:description', beschreibung],
    seitenUrl && ['og:url', seitenUrl],
    c.seo.ogBild && ['og:image', c.seo.ogBild],
  ]
    .filter(Boolean)
    .map(([p, v]) => `<meta property="${p}" content="${esc(v)}">`)
    .join('\n');

  const demoStreifen = c.demo
    ? `<div class="demo-streifen" role="note">Entwurf für ${esc(s.name)}${s.ersteller ? ` – erstellt von ${esc(s.ersteller)}` : ''}</div>`
    : '';

  return `<!doctype html>
<html lang="${c.land.locale.replace('_', '-')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
${c.demo ? '<meta name="robots" content="noindex, nofollow">' : ''}
${seitenUrl ? `<link rel="canonical" href="${esc(seitenUrl)}">` : ''}
<meta name="theme-color" content="#FAF8F5">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/manrope-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
${zusatzHead}
${og}
<meta name="twitter:card" content="summary_large_image">
<style>${c.css}</style>
<script src="js/main.js" defer></script>
</head>
<body id="top">
<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
${demoStreifen}
${kopfzeile(c, startseite)}
<main id="inhalt">
${inhalt}
</main>
${fusszeile(c)}
${zusatzBody}
</body>
</html>
`;
}

module.exports = { layout };

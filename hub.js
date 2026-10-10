'use strict';
// Erzeugt die Startseite (/) mit Karten zu allen Seiten, die in sites.json einen "hub"-Eintrag haben.
// Wird von build-all.js aufgerufen, nachdem alle Seiten gebaut sind (nutzt deren WebP-Bilder).

const fs = require('fs');
const path = require('path');

const esc = (w) => String(w ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Dieselbe Umwandlung wie beim Bild-Build der Vorlagen (Dateiname → Bildname)
const { slug } = require('./salon-vorlage/src/lib/helfer');

// Sucht die WebP-Varianten des Hero-Bilds im gebauten Ordner und baut daraus src/srcset
function heroBild(PUBLIC, pfad, daten) {
  const datei = typeof daten.hero_bild === 'string' ? daten.hero_bild : daten.hero_bild?.datei;
  if (!datei) return null;
  const basis = slug(path.basename(datei, path.extname(datei)));
  const imgDir = path.join(PUBLIC, pfad, 'img');
  if (!fs.existsSync(imgDir)) return null;
  const varianten = fs.readdirSync(imgDir)
    .map((f) => f.match(new RegExp(`^${basis}-(\\d+)\\.webp$`)))
    .filter(Boolean)
    .map((m) => ({ b: Number(m[1]), url: `${pfad}/img/${m[0]}` }))
    .sort((a, b) => a.b - b.b);
  if (varianten.length) {
    const mittel = varianten.find((v) => v.b >= 800) || varianten[varianten.length - 1];
    return { src: mittel.url, srcset: varianten.map((v) => `${v.url} ${v.b}w`).join(', ') };
  }
  const kopie = fs.readdirSync(imgDir).find((f) => f.startsWith(basis + '.'));
  return kopie ? { src: `${pfad}/img/${kopie}`, srcset: '' } : null;
}

function karte(PUBLIC, s, daten, i) {
  const h = s.hub;
  const bild = heroBild(PUBLIC, s.pfad, daten);
  const akzent = /^#[0-9a-f]{6}$/i.test(daten.farben?.akzent || '') ? daten.farben.akzent : '#444444';
  const ort = daten.kontakt?.adresse?.ort || '';
  const img = bild
    ? `<img src="${esc(bild.src)}"${bild.srcset ? ` srcset="${esc(bild.srcset)}" sizes="(min-width: 900px) 46vw, 100vw"` : ''} alt="" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
    : '<div class="bild-leer"></div>';
  return `<li class="karte" style="--akzent:${akzent}">
    <a href="${esc(s.pfad)}/" class="karte-link">
      <div class="karte-bild">${img}<span class="karte-chip">${esc(h.branche || '')}</span></div>
      <div class="karte-text">
        <p class="karte-stil">${esc(h.stil ? `Stil: ${h.stil}` : '')}</p>
        <h2>${esc(daten.name)}</h2>
        ${h.beschreibung ? `<p class="karte-beschreibung">${esc(h.beschreibung)}</p>` : ''}
        ${(h.merkmale || []).length ? `<ul class="merkmale">${h.merkmale.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
        <p class="karte-fuss"><span>${esc(ort ? `Beispiel aus ${ort}` : 'Beispielprojekt')}</span><span class="ansehen">Ansehen <span aria-hidden="true">→</span></span></p>
      </div>
    </a>
  </li>`;
}

function erzeugeHub({ ROOT, PUBLIC, hub = {}, sites }) {
  const eintraege = sites.filter((s) => s.hub);
  const karten = eintraege.map((s, i) => {
    const daten = JSON.parse(fs.readFileSync(path.join(ROOT, s.daten), 'utf8'));
    return karte(PUBLIC, s, daten, i);
  }).join('\n');
  const titel = hub.titel || 'Beispielprojekte';
  const mail = hub.kontakt_email
    ? `<a class="knopf" href="mailto:${esc(hub.kontakt_email)}">Anfrage per E-Mail</a>`
    : '';
  const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#16181d"/><rect x="14" y="14" width="16" height="16" rx="4" fill="#B08D57"/><rect x="34" y="14" width="16" height="16" rx="4" fill="#A8502E"/><rect x="14" y="34" width="16" height="16" rx="4" fill="#2F6B57"/><rect x="34" y="34" width="16" height="16" rx="4" fill="#E4572E"/></svg>');

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)} – ${esc(hub.untertitel || 'Beispielprojekte')}</title>
<meta name="description" content="${esc((hub.intro || '').slice(0, 160))}">
${hub.noindex !== false ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta name="theme-color" content="#f6f5f2">
<link rel="icon" href="${favicon}">
<style>
:root{--bg:#f6f5f2;--karte:#fff;--text:#16181d;--gedaempft:#5d6068;--linie:#e3e1db;--radius:18px}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 1.0625rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{display:block;max-width:100%}
.container{width:100%;max-width:1180px;margin-inline:auto;padding-inline:clamp(1.25rem,5vw,2.5rem)}
header{padding-block:clamp(3.5rem,10vw,6.5rem) clamp(2rem,5vw,3rem)}
.kicker{display:inline-flex;align-items:center;gap:.6rem;margin:0 0 1.25rem;font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gedaempft)}
.punkte{display:inline-grid;grid-template-columns:repeat(4,8px);gap:3px}
.punkte i{width:8px;height:8px;border-radius:2px}
h1{max-width:16ch;margin:0;font-size:clamp(2.4rem,7vw,4.4rem);font-weight:800;line-height:1.03;letter-spacing:-.035em;text-wrap:balance}
.intro{max-width:40rem;margin:1.25rem 0 0;font-size:clamp(1.05rem,2.2vw,1.2rem);color:var(--gedaempft)}
.knopf{display:inline-flex;align-items:center;min-height:48px;margin-top:1.75rem;padding:.75rem 1.4rem;border-radius:999px;background:var(--text);color:#fff;font-weight:700;text-decoration:none}
.knopf:hover{background:#000}
main{padding-bottom:clamp(3rem,8vw,5rem)}
.raster{display:grid;gap:clamp(1rem,2.5vw,1.75rem);margin:0;padding:0;list-style:none}
@media (min-width:760px){.raster{grid-template-columns:1fr 1fr}}
.karte-link{display:flex;flex-direction:column;height:100%;overflow:hidden;border-radius:var(--radius);background:var(--karte);text-decoration:none;box-shadow:0 1px 2px rgba(22,24,29,.05),0 14px 34px -20px rgba(22,24,29,.35);transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s}
.karte-link:hover{transform:translateY(-4px);box-shadow:0 2px 4px rgba(22,24,29,.06),0 24px 50px -24px rgba(22,24,29,.45)}
.karte-link:focus-visible{outline:3px solid var(--akzent);outline-offset:4px}
.karte-bild{position:relative;aspect-ratio:16/10;overflow:hidden;background:var(--linie)}
.karte-bild img,.bild-leer{width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.karte-link:hover .karte-bild img{transform:scale(1.04)}
.karte-bild::after{content:"";position:absolute;inset:auto 0 0;height:5px;background:var(--akzent)}
.karte-chip{position:absolute;top:1rem;left:1rem;padding:.3rem .75rem;border-radius:999px;background:rgba(255,255,255,.94);font-size:.8rem;font-weight:700}
.karte-text{display:flex;flex-direction:column;flex:1;padding:1.4rem 1.5rem 1.4rem}
.karte-stil{margin:0 0 .3rem;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--akzent)}
h2{margin:0;font-size:1.6rem;font-weight:800;line-height:1.15;letter-spacing:-.02em}
.karte-beschreibung{margin:.6rem 0 0;color:var(--gedaempft)}
.merkmale{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0 0;padding:0;list-style:none}
.merkmale li{padding:.2rem .65rem;border:1px solid var(--linie);border-radius:999px;font-size:.82rem;font-weight:600;color:var(--gedaempft)}
.karte-fuss{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:auto 0 0;padding-top:1.25rem;font-size:.9rem;color:var(--gedaempft)}
.ansehen{font-weight:700;color:var(--text)}
.ansehen span{display:inline-block;transition:transform .3s}
.karte-link:hover .ansehen span{transform:translateX(4px)}
footer{padding-bottom:3rem;font-size:.88rem;color:var(--gedaempft)}
.fuss-innen{padding-top:2rem;border-top:1px solid var(--linie)}
footer p{margin:0 0 .35rem}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:0s!important}}
</style>
</head>
<body>
<header class="container">
  <p class="kicker"><span class="punkte" aria-hidden="true"><i style="background:#B08D57"></i><i style="background:#A8502E"></i><i style="background:#2F6B57"></i><i style="background:#E4572E"></i></span>${esc(hub.untertitel || 'Beispielprojekte')}</p>
  <h1>${esc(titel)}</h1>
  ${hub.intro ? `<p class="intro">${esc(hub.intro)}</p>` : ''}
  ${mail}
</header>
<main class="container">
  <ul class="raster">
${karten}
  </ul>
</main>
<footer class="container">
  <div class="fuss-innen">
  <p>Alle Beispiele zeigen fiktive Betriebe mit Platzhalter-Inhalten. Fotos: Unsplash (Nachweise auf den jeweiligen Seiten).</p>
  <p>Ohne Cookies, ohne Tracking, ohne externe Schriftarten.</p>
  </div>
</footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(PUBLIC, 'index.html'), html);
  return eintraege.length;
}

module.exports = { erzeugeHub };

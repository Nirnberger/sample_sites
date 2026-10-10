#!/usr/bin/env node
'use strict';
/*
 * Smoke-Test für alle Seiten aus sites.json – läuft in der CI-Pipeline und lokal.
 *
 *   node tests/smoke.js http://localhost:8080          (z. B. gegen den Docker-Container)
 *   node tests/smoke.js https://sample.seitenschwung.com
 *
 * Prüft je Seite (Startseite, Impressum, Datenschutz) und Hub, mobil (360 px) und Desktop:
 *   - Seite lädt mit Status 200, keine JavaScript-Fehler
 *   - keine Datei (Bild, Schrift, Skript) antwortet mit Fehler
 *   - kein seitliches Scrollen (Layout passt in die Breite)
 *   - alle Bilder lassen sich laden
 *   - Hub verlinkt genau die Seiten mit "hub"-Eintrag, /<pfad> leitet auf /<pfad>/ weiter
 *   - keine CSP-Verstöße, Sicherheits-Header auf HTML/Bildern/Schriften, keine internen Dateien erreichbar
 * Benötigt Playwright (npm i playwright && npx playwright install chromium).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASIS = (process.argv[2] || process.env.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const { sites } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sites.json'), 'utf8'));
const BREITEN = [['mobil', 360, 780], ['desktop', 1366, 900]];

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const fehler = [];
  let geprueft = 0;

  const seiten = ['/'];
  for (const s of sites) seiten.push(`/${s.pfad}/`, `/${s.pfad}/impressum.html`, `/${s.pfad}/datenschutz.html`);

  for (const [name, w, h] of BREITEN) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    let aktuell = '';
    page.on('pageerror', (e) => fehler.push(`${aktuell} [${name}] JavaScript-Fehler: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) fehler.push(`${aktuell} [${name}] CSP-Verstoß: ${m.text().slice(0, 160)}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().startsWith(BASIS)) fehler.push(`${aktuell} [${name}] ${r.status()} ${r.url().slice(BASIS.length)}`);
    });

    for (const url of seiten) {
      aktuell = url;
      const antwort = await page.goto(BASIS + url, { waitUntil: 'networkidle', timeout: 60000 });
      if (!antwort || antwort.status() !== 200) {
        fehler.push(`${url} [${name}] Status ${antwort ? antwort.status() : 'keine Antwort'}`);
        continue;
      }
      const info = await page.evaluate(async () => {
        for (const img of document.images) {
          if (!img.getAttribute('src')) continue; // z. B. leeres Lightbox-Bild
          img.loading = 'eager';
          await img.decode().catch(() => {});
        }
        return {
          breite: document.documentElement.scrollWidth,
          kaputt: [...document.images].filter((i) => i.getAttribute('src') && !i.naturalWidth).map((i) => i.getAttribute('src')),
        };
      });
      if (info.breite > w + 1) fehler.push(`${url} [${name}] seitliches Scrollen: ${info.breite}px bei ${w}px Breite`);
      info.kaputt.forEach((src) => fehler.push(`${url} [${name}] Bild lädt nicht: ${src}`));
      geprueft++;
    }
    await ctx.close();
  }

  // Hub: genau die Seiten mit "hub"-Eintrag verlinkt?
  const page = await browser.newPage();
  await page.goto(BASIS + '/');
  const links = await page.$$eval('.karte-link', (a) => a.map((x) => x.getAttribute('href')).sort());
  const soll = sites.filter((s) => s.hub).map((s) => `${s.pfad}/`).sort();
  if (JSON.stringify(links) !== JSON.stringify(soll)) fehler.push(`Hub-Links ${JSON.stringify(links)} ≠ erwartet ${JSON.stringify(soll)}`);

  // Sicherheits-Header auf HTML, Bildern und Schriften (nginx erbt add_header nicht automatisch)
  const pflichtHeader = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy'];
  const s0 = sites[0];
  const html = await page.request.get(`${BASIS}/${s0.pfad}/`);
  const bild = (await html.text()).match(/src="(img\/[^"]+\.webp)"/);
  const schrift = (await html.text()).match(/url\("?(fonts\/[^")]+\.woff2)/);
  const pruefUrls = [`${BASIS}/`, `${BASIS}/${s0.pfad}/`, `${BASIS}/robots.txt`];
  if (bild) pruefUrls.push(`${BASIS}/${s0.pfad}/${bild[1]}`);
  if (schrift) pruefUrls.push(`${BASIS}/${s0.pfad}/${schrift[1]}`);
  for (const u of pruefUrls) {
    const h = (await page.request.get(u)).headers();
    const fehlt = pflichtHeader.filter((k) => !h[k]);
    if (fehlt.length) fehler.push(`${u.slice(BASIS.length) || '/'}: Sicherheits-Header fehlen: ${fehlt.join(', ')}`);
  }
  for (const geheim of ['/.git/config', '/.env', '/sites.json', '/build-all.js']) {
    const st = (await page.request.get(BASIS + geheim)).status();
    if (st !== 404) fehler.push(`${geheim} ist erreichbar (Status ${st}) – sollte 404 sein`);
  }

  // Weiterleitung ohne Schrägstrich
  const r = await page.request.get(`${BASIS}/${sites[0].pfad}`, { maxRedirects: 0 });
  if (r.status() !== 301 || !String(r.headers().location || '').endsWith(`/${sites[0].pfad}/`)) {
    fehler.push(`/${sites[0].pfad} leitet nicht auf /${sites[0].pfad}/ weiter (Status ${r.status()})`);
  }
  await browser.close();

  if (fehler.length) {
    console.error(`✖ ${fehler.length} Problem(e):`);
    fehler.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log(`✔ ${geprueft} Seitenaufrufe geprüft (${seiten.length} Seiten × ${BREITEN.length} Breiten), Hub und Weiterleitung ok – ${BASIS}`);
})().catch((e) => { console.error(e); process.exit(1); });

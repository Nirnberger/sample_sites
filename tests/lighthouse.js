#!/usr/bin/env node
'use strict';
/*
 * Lighthouse-Prüfung aller Seiten aus sites.json (Startseite je Pfad, Mobil-Profil mit gedrosseltem Netz).
 *
 *   node tests/lighthouse.js http://localhost:8080 [berichte/]
 *
 * Bricht ab, wenn eine Seite unter den Mindestwerten liegt (GRENZEN). SEO wird nur angezeigt:
 * Demo-Seiten sind absichtlich auf „noindex“ gestellt und würden sonst immer durchfallen.
 * Optional werden HTML-Berichte in den angegebenen Ordner geschrieben (in der Pipeline als Artefakt).
 * Benötigt: npm i playwright lighthouse chrome-launcher (nutzt das Chromium von Playwright).
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Mindestwerte (0–100). Leistung schwankt in CI-Umgebungen etwas – daher mit Puffer.
const GRENZEN = { performance: 80, accessibility: 90, 'best-practices': 90 };
const KATEGORIEN = ['performance', 'accessibility', 'best-practices', 'seo'];

const BASIS = (process.argv[2] || 'http://localhost:8080').replace(/\/+$/, '');
const BERICHTE = process.argv[3];
const { sites } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sites.json'), 'utf8'));

(async () => {
  // lighthouse und chrome-launcher sind ES-Module
  const lighthouse = (await import('lighthouse')).default;
  const chromeLauncher = await import('chrome-launcher');
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  if (BERICHTE) fs.mkdirSync(BERICHTE, { recursive: true });
  const probleme = [];
  try {
    console.log(`${'Seite'.padEnd(20)} ${KATEGORIEN.map((k) => k.slice(0, 11).padStart(12)).join('')}`);
    for (const s of [{ pfad: '' }, ...sites]) {
      const url = `${BASIS}/${s.pfad ? s.pfad + '/' : ''}`;
      const messen = () => lighthouse(url, { port: chrome.port, output: BERICHTE ? 'html' : 'json', logLevel: 'error', onlyCategories: KATEGORIEN });
      let ergebnis = await messen();
      if (ergebnis.lhr.runtimeError) ergebnis = await messen(); // z. B. abgestürzter Tab: einmal wiederholen
      if (ergebnis.lhr.runtimeError) {
        probleme.push(`${s.pfad || '/'}: Lighthouse konnte nicht messen – ${ergebnis.lhr.runtimeError.message}`);
        console.log(`${(s.pfad || '(Startseite)').padEnd(20)} Messfehler: ${ergebnis.lhr.runtimeError.code}`);
        continue;
      }
      const werte = Object.fromEntries(KATEGORIEN.map((k) => [k, Math.round((ergebnis.lhr.categories[k].score || 0) * 100)]));
      console.log(`${(s.pfad || '(Startseite)').padEnd(20)} ${KATEGORIEN.map((k) => String(werte[k]).padStart(12)).join('')}`);
      for (const [k, min] of Object.entries(GRENZEN)) {
        if (werte[k] < min) {
          // die drei größten Bremsen nennen, damit klar ist, wo man ansetzen muss
          const gruende = ergebnis.lhr.categories[k].auditRefs
            .map((r) => ergebnis.lhr.audits[r.id])
            .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative')
            .slice(0, 3)
            .map((a) => a.title);
          probleme.push(`${s.pfad || '/'}: ${k} ${werte[k]} < ${min}${gruende.length ? ` – u. a. ${gruende.join('; ')}` : ''}`);
        }
      }
      if (BERICHTE) fs.writeFileSync(path.join(BERICHTE, `${(s.pfad || 'startseite').replace(/\//g, '-')}.html`), ergebnis.report);
    }
  } finally {
    await chrome.kill();
  }
  if (probleme.length) {
    console.error(`\n✖ ${probleme.length} Wert(e) unter dem Minimum:\n${probleme.map((p) => '  - ' + p).join('\n')}`);
    process.exit(1);
  }
  console.log(`\n✔ Alle Seiten über den Mindestwerten (${Object.entries(GRENZEN).map(([k, v]) => `${k} ≥ ${v}`).join(', ')})`);
})().catch((e) => { console.error(e); process.exit(1); });

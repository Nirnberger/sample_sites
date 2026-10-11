/*
 * Farbschema aus coolors.co (https://coolors.co) – läuft beim Bauen (Node) UND im Browser (Farb-Labor).
 * Die Vorlagen buehne und repertoire kopieren diese Datei nach dist/js/farbschema.js; so sieht die
 * Vorschau im Browser genau so aus wie die später gebaute Seite.
 *
 * Akzeptiert jedes coolors-Export-Format als Wert des Feldes "farbschema":
 *   "8c0902,e0c58f,f5f0e9,210100"                       CSV
 *   "#8c0902, #e0c58f, #f5f0e9, #210100"                With #
 *   ["8c0902","e0c58f", …]                              Array (auch als Text)
 *   {"Blood Red":"8c0902", …}                           Object (auch als Text)
 *   [{"name":"Blood Red","hex":"8c0902", …}, …]         Extended Array (auch als Text)
 *   "<palette><color name=… hex=… /></palette>"         XML
 *   "https://coolors.co/8c0902-e0c58f-f5f0e9-210100"    Link
 *
 * Die Reihenfolge der Farben ist egal: farbrollen() ordnet sie nach Helligkeit und Buntheit den Rollen
 * hell (Hintergrund), dunkel (Schrift), akzent (kräftigste Farbe) und weich (Flächen) zu. Die Vorlagen-
 * Zuordnungen regeln Textfarben nach, bis der Kontrast reicht (WCAG AA).
 *
 * Sicherheit: Aus der Eingabe werden ausschließlich sechsstellige Hex-Werte übernommen; in CSS und HTML
 * landen nur daraus berechnete "#RRGGBB"-Werte. Das Farb-Labor erzeugt seine Oberfläche nur mit DOM-
 * Methoden (kein innerHTML, kein eval), sendet nichts und speichert nichts.
 */
(function (wurzel, fabrik) {
  if (typeof module === 'object' && module.exports) module.exports = fabrik();
  else wurzel.Farbschema = fabrik();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Farbrechnung (bewusst ohne Abhängigkeiten, damit die Datei auch im Browser läuft) ----------

  function hexZuRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
  }
  function rgbZuHex(rgb) {
    return '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function luminanz(hex) {
    const [r, g, b] = hexZuRgb(hex).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function kontrast(a, b) {
    const [h, d] = [luminanz(a), luminanz(b)].sort((x, y) => y - x);
    return (h + 0.05) / (d + 0.05);
  }
  function mischen(a, b, anteilB) {
    const ra = hexZuRgb(a), rb = hexZuRgb(b);
    return rgbZuHex(ra.map((v, i) => v + (rb[i] - v) * anteilB));
  }
  function bisKontrast(hex, hintergruende, minimum, richtung) {
    let farbe = hex;
    for (let i = 0; i < 40 && hintergruende.some((bg) => kontrast(farbe, bg) < minimum); i++) farbe = mischen(farbe, richtung, 0.05);
    return farbe;
  }
  const abdunkeln = (hex, bgs, min = 4.6) => bisKontrast(hex, bgs, min, '#000000');
  const aufhellen = (hex, bgs, min = 4.6) => bisKontrast(hex, bgs, min, '#FFFFFF');
  const buntheit = (hex) => { const rgb = hexZuRgb(hex); return (Math.max(...rgb) - Math.min(...rgb)) / 255; };
  const rgbTeile = (hex) => hexZuRgb(hex).join(' ');

  // ---------- Einlesen ----------

  /** Liest ein Farbschema in beliebigem coolors-Format. Rückgabe: [{ name, hex: '#RRGGBB' }] (leer = nichts erkannt). */
  function farbschemaLesen(wert) {
    const farbe = (hex, name) => {
      const rgb = hexZuRgb(hex);
      return rgb ? { name: String(name || '').slice(0, 60), hex: rgbZuHex(rgb) } : null;
    };
    let liste = [];
    if (Array.isArray(wert)) {
      liste = wert.map((x) => (x && typeof x === 'object' ? farbe(x.hex, x.name) : farbe(x)));
    } else if (wert && typeof wert === 'object') {
      liste = Object.keys(wert).map((name) => farbe(wert[name], name));
    } else if (typeof wert === 'string') {
      const text = wert.trim().slice(0, 20000);
      if (/^[[{]/.test(text)) {
        try { return farbschemaLesen(JSON.parse(text)); } catch (e) { /* weiter als Text */ }
      }
      if (/<color\b/i.test(text)) {
        liste = (text.match(/<color\b[^>]*>/gi) || []).map((tag) => {
          const attr = (n) => (new RegExp('\\b' + n + '="([^"]*)"', 'i').exec(tag) || [])[1];
          return farbe(attr('hex'), attr('name'));
        });
      } else {
        // CSV, mit #, coolors-Link (…/8c0902-e0c58f-…): alle sechsstelligen Hex-Werte der Reihe nach
        liste = (text.match(/\b[0-9a-f]{6}\b/gi) || []).map((h) => farbe(h));
      }
    }
    return liste.filter(Boolean).slice(0, 12);
  }

  /**
   * Ordnet die Farben Rollen zu. Rückgabe: null (keine Farben) oder { hell, dunkel, akzent, weich }.
   * Bei nur einer Farbe ist nur "akzent" gesetzt. hell und dunkel werden notfalls auseinandergezogen,
   * damit Text auf Hintergrund gut lesbar bleibt (Kontrast mind. 10:1).
   */
  function farbrollen(farben) {
    const hexe = farben.map((f) => f.hex).filter((h, i, a) => a.indexOf(h) === i);
    if (!hexe.length) return null;
    if (hexe.length === 1) return { akzent: hexe[0] };
    const sortiert = hexe.slice().sort((a, b) => luminanz(a) - luminanz(b));
    let dunkel = sortiert[0];
    let hell = sortiert[sortiert.length - 1];
    const rest = sortiert.slice(1, -1);
    const kraeftigste = (liste) => liste.slice().sort((a, b) => buntheit(b) - buntheit(a))[0];
    const akzent = kraeftigste(rest.length ? rest : [dunkel, hell]);
    const uebrig = rest.filter((f) => f !== akzent);
    const weich = uebrig.length ? uebrig[uebrig.length - 1] : mischen(hell, akzent, 0.2);
    for (let i = 0; i < 40 && kontrast(hell, dunkel) < 10; i++) {
      hell = mischen(hell, '#FFFFFF', 0.08);
      dunkel = mischen(dunkel, '#000000', 0.08);
    }
    return { hell, dunkel, akzent, weich };
  }

  // ---------- Zuordnung je Vorlage: Rollen → CSS-Variablen ----------

  const VORLAGEN = {
    // Creme/Braun/Mint-Vorlage. Ohne Rollen: keine Variablen (Standard aus style.css).
    repertoire(rollen) {
      const F = { creme: '#F6F1E9', sand: '#ECE3D5', mint: '#D5E8DD', weiss: '#FFFDF9' };
      const v = {};
      if (!rollen) return v;
      if (rollen.hell) {
        F.creme = rollen.hell;
        F.braun = rollen.dunkel;
        F.weiss = mischen(rollen.hell, '#FFFFFF', 0.6);
        F.mint = rollen.weich;
        F.sand = mischen(rollen.hell, rollen.weich, 0.3);
        // Flächen hell genug für Fließtext halten
        for (let i = 0; i < 20 && kontrast(F.braun, F.mint) < 7; i++) F.mint = mischen(F.mint, F.creme, 0.1);
        for (let i = 0; i < 20 && kontrast(F.braun, F.sand) < 8; i++) F.sand = mischen(F.sand, F.creme, 0.1);
        Object.assign(v, {
          '--creme': F.creme, '--sand': F.sand, '--mint': F.mint, '--mint-tief': mischen(F.mint, F.braun, 0.18),
          '--braun': F.braun, '--braun-mittel': abdunkeln(mischen(F.braun, F.creme, 0.35), [F.creme, F.sand, F.mint, F.weiss]),
          '--linie': mischen(F.creme, F.braun, 0.14), '--weiss': F.weiss,
          '--fuss-leise': aufhellen(mischen(F.creme, F.braun, 0.15), [F.braun]),
          '--creme-rgb': rgbTeile(F.creme), '--braun-rgb': rgbTeile(F.braun),
        });
      }
      v['--salbei'] = abdunkeln(rollen.akzent, [F.creme, F.sand, F.mint, F.weiss]);
      return v;
    },

    // Bühnen-Vorlage: dunkelste = Bühne, hellste = Papier, kräftigste = Vorhang, übrige = Filmklappen-Gelb.
    // Die --rot*-Variablen kommen immer von hier (Standard: akzentStandard aus farben.akzent).
    buehne(rollen, akzentStandard) {
      let nacht = '#100E0D', papier = '#EDE5D6', papier2 = '#E2D7C3';
      const v = {};
      if (rollen && rollen.hell) {
        nacht = rollen.dunkel;
        papier = rollen.hell;
        const tinte = mischen(rollen.dunkel, rollen.hell, 0.04);
        const blatt = mischen(rollen.hell, '#FFFFFF', 0.45);
        papier2 = mischen(rollen.hell, rollen.weich, 0.25);
        for (let i = 0; i < 20 && kontrast(tinte, papier2) < 8; i++) papier2 = mischen(papier2, papier, 0.1);
        const nachtTief = mischen(nacht, '#000000', 0.35);
        const kodak = aufhellen(rollen.weich, [nacht, nachtTief]);
        Object.assign(v, {
          '--nacht': nacht, '--nacht-2': mischen(nacht, papier, 0.05), '--nacht-tief': nachtTief,
          '--papier': papier, '--papier-2': papier2, '--papier-3': mischen(papier2, tinte, 0.08), '--blatt': blatt,
          '--tinte': tinte, '--tinte-leise': abdunkeln(mischen(tinte, papier, 0.38), [papier, papier2, blatt]), '--kodak': kodak,
          '--papier-rgb': rgbTeile(papier), '--tinte-rgb': rgbTeile(tinte), '--nacht-rgb': rgbTeile(nacht),
          '--nacht-tief-rgb': rgbTeile(nachtTief), '--kodak-rgb': rgbTeile(kodak),
        });
      }
      const rot = (rollen && rollen.akzent) || (hexZuRgb(akzentStandard) ? rgbZuHex(hexZuRgb(akzentStandard)) : '#B8432A');
      let rotHell = rot;
      for (let i = 0; i < 30 && kontrast(rotHell, nacht) < 4.8; i++) rotHell = mischen(rotHell, '#FFFFFF', 0.06);
      v['--rot'] = rot;
      v['--rot-dunkel'] = abdunkeln(rot, [papier, papier2, '#FFFFFF']);
      v['--rot-hell'] = rotHell;
      return v;
    },
  };

  /** Eingabe (beliebiges Format) → { farben, rollen, variablen: { '--name': wert } } für die Vorlage. */
  function variablen(vorlage, wert, akzentStandard) {
    const farben = farbschemaLesen(wert);
    const rollen = farbrollen(farben);
    return { farben, rollen, variablen: VORLAGEN[vorlage](rollen, akzentStandard) };
  }

  /** CSS-Text ":root{--a:…;…}" aus einer Variablen-Liste (leer, wenn nichts zu setzen ist). */
  function cssRoot(v) {
    const teile = Object.keys(v).map((k) => k + ':' + v[k]);
    return teile.length ? ':root{' + teile.join(';') + '}' : '';
  }

  // ---------- Farb-Labor (nur Browser): Vorschau einer Palette direkt auf der Seite ----------
  // Öffnet sich nur über die Adresse …#farben bzw. …#farben=8c0902-e0c58f-… (teilbarer Vorschau-Link).
  // Wirkt nur in diesem Browser-Tab; dauerhaft wird ein Farbschema über das CMS (mit Anmeldung) gesetzt.

  function labor(vorlage) {
    const d = document;
    const wurzel = d.documentElement;
    const akzentStandard = getComputedStyle(wurzel).getPropertyValue('--rot').trim();
    let gesetzt = [];
    let panel = null;

    const el = (tag, stil, text) => {
      const e = d.createElement(tag);
      if (stil) e.style.cssText = stil;
      if (text) e.textContent = text;
      return e;
    };
    const KNOPF = 'font:600 14px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:1px solid #2B2522;cursor:pointer;';
    const knopf = (text, haupt) => {
      const b = el('button', KNOPF + (haupt ? 'background:#2B2522;color:#fff;' : 'background:#fff;color:#2B2522;'), text);
      b.type = 'button';
      return b;
    };

    function zuruecksetzen() {
      gesetzt.forEach((k) => wurzel.style.removeProperty(k));
      gesetzt = [];
    }
    function anwenden(eingabe) {
      const erg = variablen(vorlage, eingabe, akzentStandard);
      zuruecksetzen();
      if (!erg.rollen) return erg;
      Object.keys(erg.variablen).forEach((k) => {
        if (/^--[a-z0-9-]+$/.test(k) && /^(#[0-9A-F]{6}|\d{1,3} \d{1,3} \d{1,3})$/.test(erg.variablen[k])) {
          wurzel.style.setProperty(k, erg.variablen[k]);
          gesetzt.push(k);
        }
      });
      return erg;
    }

    function oeffnen(start) {
      if (!panel) bauen();
      panel.hidden = false;
      panel.minimieren(false);
      if (start) { panel.feld.value = start; panel.zeigen(anwenden(start)); }
      panel.feld.focus();
    }

    function bauen() {
      panel = el('section', 'position:fixed;z-index:2147483000;right:16px;bottom:16px;width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#2B2522;border:1px solid #CFC6BC;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px;font:15px/1.5 system-ui,sans-serif;text-align:left;');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'Farben ausprobieren');
      // Kopfzeile mit Minimieren: eingeklappt bleibt nur „Farben ausprobieren“ als kleine Leiste stehen
      const kopf = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:12px;');
      kopf.append(el('h2', 'font:700 18px/1.3 system-ui,sans-serif;margin:0;color:#2B2522;letter-spacing:0;text-transform:none;', 'Farben ausprobieren'));
      const bMini = el('button', KNOPF + 'background:#fff;color:#2B2522;padding:4px 10px;font-size:18px;line-height:1;', '–');
      bMini.type = 'button';
      kopf.append(bMini);
      panel.append(kopf);
      const inhalt = el('div', 'margin-top:6px;');
      panel.append(inhalt);
      inhalt.append(el('p', 'margin:0 0 12px;font-size:13px;color:#5C524B;', 'Palette auf coolors.co → Export → Code kopieren (jedes Format oder der Link) und hier einfügen. Nur eine Vorschau in diesem Browser – niemand sonst sieht sie.'));
      const label = el('label', 'display:block;font-weight:600;font-size:13px;margin-bottom:4px;', 'Farbschema');
      const feld = el('textarea', 'display:block;width:100%;box-sizing:border-box;min-height:84px;font:13px/1.4 ui-monospace,monospace;padding:8px;border:1px solid #CFC6BC;border-radius:8px;color:#2B2522;background:#fff;');
      feld.id = 'farblabor-feld';
      label.htmlFor = feld.id;
      feld.spellcheck = false;
      feld.maxLength = 20000;
      inhalt.append(label, feld);

      const leiste = el('div', 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0;');
      const bAnwenden = knopf('Anwenden', true);
      const bZurueck = knopf('Standardfarben');
      const bZu = knopf('Schließen');
      leiste.append(bAnwenden, bZurueck, bZu);
      inhalt.append(leiste);

      const ergebnis = el('div', 'font-size:13px;');
      ergebnis.setAttribute('aria-live', 'polite');
      inhalt.append(ergebnis);

      function zeigen(erg) {
        ergebnis.replaceChildren();
        if (!erg.rollen) {
          ergebnis.append(el('p', 'margin:0;color:#8A1C12;', feld.value.trim() ? 'Keine Farben erkannt.' : 'Standardfarben aktiv.'));
          return;
        }
        const r = erg.rollen;
        const namen = [['hell', 'Hintergrund'], ['dunkel', 'Schrift'], ['akzent', 'Akzent'], ['weich', 'Flächen']];
        const liste = el('ul', 'list-style:none;margin:0 0 10px;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:6px;');
        namen.filter(([k]) => r[k]).forEach(([k, n]) => {
          const li = el('li', 'display:flex;align-items:center;gap:8px;');
          li.append(el('span', 'width:22px;height:22px;border-radius:6px;border:1px solid #CFC6BC;flex:none;background:' + r[k] + ';'), el('span', '', n + ' ' + r[k]));
          liste.append(li);
        });
        ergebnis.append(liste);
        const csv = erg.farben.map((f) => f.hex.slice(1).toLowerCase()).join(',');
        ergebnis.append(el('p', 'margin:0 0 8px;color:#5C524B;', 'Gefällt es? Dauerhaft übernehmen: im CMS unter „Farbschema“ einfügen – danach baut die Pipeline die Seite neu.'));
        const kopieren = el('div', 'display:flex;flex-wrap:wrap;gap:8px;');
        const bCsv = knopf('Farbschema kopieren');
        const bLink = knopf('Vorschau-Link kopieren');
        const cms = el('a', KNOPF + 'background:#fff;color:#2B2522;text-decoration:none;', 'CMS öffnen ↗');
        cms.href = 'https://app.pagescms.org';
        cms.target = '_blank';
        cms.rel = 'noopener noreferrer';
        const merken = (b, text) => {
          const alt = b.textContent;
          const fertig = () => { b.textContent = 'Kopiert ✓'; setTimeout(() => { b.textContent = alt; }, 1600); };
          if (navigator.clipboard) navigator.clipboard.writeText(text).then(fertig, () => { feld.value = text; feld.select(); });
          else { feld.value = text; feld.select(); }
        };
        bCsv.addEventListener('click', () => merken(bCsv, csv));
        bLink.addEventListener('click', () => merken(bLink, location.href.split('#')[0] + '#farben=' + csv.replace(/,/g, '-')));
        kopieren.append(bCsv, bLink, cms);
        ergebnis.append(kopieren);
      }

      bAnwenden.addEventListener('click', () => zeigen(anwenden(feld.value)));
      bZurueck.addEventListener('click', () => { zuruecksetzen(); feld.value = ''; zeigen({ rollen: null }); });
      bZu.addEventListener('click', () => { panel.hidden = true; });
      const minimieren = (zu) => {
        inhalt.hidden = zu;
        panel.style.width = zu ? 'auto' : 'min(420px,calc(100vw - 32px))';
        panel.style.padding = zu ? '10px 14px' : '18px';
        bMini.textContent = zu ? '+' : '–';
        bMini.setAttribute('aria-expanded', String(!zu));
        bMini.setAttribute('aria-label', zu ? 'Farbfenster aufklappen' : 'Farbfenster minimieren');
      };
      bMini.addEventListener('click', () => minimieren(!inhalt.hidden));
      panel.minimieren = minimieren;
      minimieren(false);
      panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') panel.hidden = true; });
      panel.feld = feld;
      panel.zeigen = zeigen;
      d.body.append(panel);
    }

    function ausAdresse() {
      const m = /^#farben(?:=([0-9a-fA-F-]{6,200}))?$/.exec(location.hash);
      if (m) oeffnen(m[1] ? m[1].replace(/-/g, ',') : '');
    }
    window.addEventListener('hashchange', ausAdresse);
    ausAdresse();
  }

  return { farbschemaLesen, farbrollen, variablen, cssRoot, labor, kontrast, mischen, hexZuRgb };
});

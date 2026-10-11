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
 * Feste Rollen (so exportiert das Farb-Labor eine von Hand gewählte Verteilung):
 *   {"Hintergrund":"#F5F0E9","Schrift":"#210100","Akzent":"#8C0902","Flächen":"#E0C58F"}
 * Dann gilt genau diese Zuordnung: keine Rolle wird wegen einer anderen nachgeregelt (das Labor warnt bei
 * zu wenig Kontrast). Nur die Bühnen-Varianten des Akzents (auf Bühne/Papier) bleiben angepasst.
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
  const ROLLEN_NAMEN = { hell: /^(hell|hintergrund)$/i, dunkel: /^(dunkel|schrift)$/i, akzent: /^akzent$/i, weich: /^(weich|fl(ä|ae)chen)$/i };

  /** Feste Rollen aus benannten Farben (alle vier Namen nötig), sonst null. */
  function festeRollen(farben) {
    const r = {};
    farben.forEach((f) => Object.keys(ROLLEN_NAMEN).forEach((k) => { if (ROLLEN_NAMEN[k].test(f.name.trim())) r[k] = f.hex; }));
    return r.hell && r.dunkel && r.akzent && r.weich ? r : null;
  }

  function farbrollen(farben) {
    const fest = festeRollen(farben);
    if (fest) return fest;
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
    // fest = von Hand verteilte Rollen: Flächen und Akzent bleiben genau so, wie gewählt.
    repertoire(rollen, akzentStandard, fest) {
      const F = { creme: '#F6F1E9', sand: '#ECE3D5', mint: '#D5E8DD', weiss: '#FFFDF9' };
      const v = {};
      if (!rollen) return v;
      if (rollen.hell) {
        F.creme = rollen.hell;
        F.braun = rollen.dunkel;
        F.weiss = mischen(rollen.hell, '#FFFFFF', 0.6);
        F.mint = rollen.weich;
        F.sand = mischen(rollen.hell, rollen.weich, 0.3);
        // Flächen hell genug für Fließtext halten (nur bei automatischer Verteilung)
        for (let i = 0; i < 20 && !fest && kontrast(F.braun, F.mint) < 7; i++) F.mint = mischen(F.mint, F.creme, 0.1);
        for (let i = 0; i < 20 && !fest && kontrast(F.braun, F.sand) < 8; i++) F.sand = mischen(F.sand, F.creme, 0.1);
        Object.assign(v, {
          '--creme': F.creme, '--sand': F.sand, '--mint': F.mint, '--mint-tief': mischen(F.mint, F.braun, 0.18),
          '--braun': F.braun, '--braun-mittel': abdunkeln(mischen(F.braun, F.creme, 0.35), [F.creme, F.sand, F.mint, F.weiss]),
          '--linie': mischen(F.creme, F.braun, 0.14), '--weiss': F.weiss,
          '--fuss-leise': aufhellen(mischen(F.creme, F.braun, 0.15), [F.braun]),
          '--creme-rgb': rgbTeile(F.creme), '--braun-rgb': rgbTeile(F.braun),
        });
      }
      v['--salbei'] = fest ? rollen.akzent : abdunkeln(rollen.akzent, [F.creme, F.sand, F.mint, F.weiss]);
      return v;
    },

    // Bühnen-Vorlage: dunkelste = Bühne, hellste = Papier, kräftigste = Vorhang, übrige = Flächen.
    // Die --rot*-Variablen kommen immer von hier (Standard: akzentStandard aus farben.akzent).
    buehne(rollen, akzentStandard, fest) {
      let nacht = '#100E0D', papier = '#EDE5D6', papier2 = '#E2D7C3';
      const v = {};
      if (rollen && rollen.hell) {
        nacht = rollen.dunkel;
        papier = rollen.hell;
        const tinte = mischen(rollen.dunkel, rollen.hell, 0.04);
        const blatt = mischen(rollen.hell, '#FFFFFF', 0.45);
        papier2 = mischen(rollen.hell, rollen.weich, 0.25);
        for (let i = 0; i < 20 && !fest && kontrast(tinte, papier2) < 8; i++) papier2 = mischen(papier2, papier, 0.1);
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
    return { farben, rollen, variablen: VORLAGEN[vorlage](rollen, akzentStandard, !!festeRollen(farben)) };
  }

  /** CSS-Text ":root{--a:…;…}" aus einer Variablen-Liste (leer, wenn nichts zu setzen ist). */
  function cssRoot(v) {
    const teile = Object.keys(v).map((k) => k + ':' + v[k]);
    return teile.length ? ':root{' + teile.join(';') + '}' : '';
  }

  // ---------- Farb-Labor (nur Browser): Vorschau einer Palette direkt auf der Seite ----------
  // Öffnet sich nur über die Adresse …#farben bzw. …#farben=8c0902-e0c58f-… (teilbarer Vorschau-Link;
  // …#farben=r:<hintergrund>-<schrift>-<akzent>-<flächen> mit festen Rollen). Farben lassen sich per
  // Farbwähler ändern, Rollen per Klick zuweisen oder mischen.
  // Wirkt nur in diesem Browser-Tab; dauerhaft wird ein Farbschema über das CMS (mit Anmeldung) gesetzt.

  const ROLLEN_TEXT = {
    buehne: { hell: 'Papier (helle Szenen)', dunkel: 'Bühne & Schrift', akzent: 'Vorhang (Akzent)', weich: 'Flächen' },
    repertoire: { hell: 'Hintergrund', dunkel: 'Schrift', akzent: 'Akzent', weich: 'Flächen' },
  };
  const ROLLEN = ['hell', 'dunkel', 'akzent', 'weich'];
  // Farbpaare, die auf der Seite als Text/Hintergrund zusammentreffen (Kontrastanzeige im Labor)
  const KONTRAST_PAARE = {
    buehne: [['dunkel', 'hell']],
    repertoire: [['dunkel', 'hell'], ['dunkel', 'weich'], ['akzent', 'hell']],
  };

  function labor(vorlage) {
    const d = document;
    const wurzel = d.documentElement;
    const akzentStandard = getComputedStyle(wurzel).getPropertyValue('--rot').trim();
    const rollenText = ROLLEN_TEXT[vorlage];
    let gesetzt = [];
    let panel = null;
    // Zustand: Palette wie eingegeben, Rollen (automatisch oder von Hand)
    let palette = [];
    let rollen = null;
    let manuell = false;

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
    const farbwaehler = (wert, name) => {
      const f = el('input', 'width:40px;height:32px;padding:0 2px;border:1px solid #CFC6BC;border-radius:6px;background:#fff;cursor:pointer;flex:none;');
      f.type = 'color';
      f.value = wert.toLowerCase();
      f.setAttribute('aria-label', name);
      return f;
    };
    const normal = (wert) => rgbZuHex(hexZuRgb(wert));
    const alsObjekte = (hexe) => hexe.map((hex) => ({ name: '', hex }));

    function zuruecksetzen() {
      gesetzt.forEach((k) => wurzel.style.removeProperty(k));
      gesetzt = [];
    }
    // Rollen → CSS-Variablen der Vorlage (nur geprüfte Namen und Farbwerte)
    function setzen() {
      zuruecksetzen();
      if (!rollen) return;
      const v = VORLAGEN[vorlage](rollen, akzentStandard, !!fest());
      Object.keys(v).forEach((k) => {
        if (/^--[a-z0-9-]+$/.test(k) && /^(#[0-9A-F]{6}|\d{1,3} \d{1,3} \d{1,3})$/.test(v[k])) {
          wurzel.style.setProperty(k, v[k]);
          gesetzt.push(k);
        }
      });
    }
    function einlesen(text) {
      const farben = farbschemaLesen(text);
      palette = farben.map((f) => f.hex);
      rollen = farbrollen(farben);
      manuell = !!festeRollen(farben);
      setzen();
    }
    const fest = () => manuell && rollen && rollen.hell;
    // Text fürs CMS: Palette als CSV oder – bei Handverteilung – feste Rollen
    function alsText() {
      if (!rollen) return '';
      if (fest()) return JSON.stringify({ Hintergrund: rollen.hell, Schrift: rollen.dunkel, Akzent: rollen.akzent, 'Flächen': rollen.weich });
      return palette.map((h) => h.slice(1).toLowerCase()).join(',');
    }
    function alsLink() {
      const teil = fest()
        ? 'r:' + ROLLEN.map((k) => rollen[k].slice(1).toLowerCase()).join('-')
        : palette.map((h) => h.slice(1).toLowerCase()).join('-');
      return location.href.split('#')[0] + '#farben=' + teil;
    }

    // ---------- Bearbeiten ----------
    function paletteAendern(i, neu) {
      const alt = palette[i];
      palette[i] = neu;
      if (!rollen.hell) rollen = { akzent: neu };
      else if (manuell) ROLLEN.forEach((k) => { if (rollen[k] === alt) rollen[k] = neu; });
      else rollen = farbrollen(alsObjekte(palette));
    }
    // Eine Rolle ändern – Palette und die anderen Rollen bleiben, wie sie sind
    function rolleAendern(k, neu) {
      if (rollen.hell) manuell = true;
      rollen[k] = neu;
    }
    // Farbe aus der Palette einer Rolle geben (mehrere Rollen dürfen dieselbe Farbe haben)
    function zuweisen(k, hex) {
      manuell = true;
      rollen[k] = hex;
    }
    // Zufällige Verteilung, möglichst mit lesbarer Schrift (Kontrast ≥ 4,5)
    function rollenMischen() {
      const vorrat = palette.concat(ROLLEN.map((k) => rollen[k])).filter((h, i, a) => a.indexOf(h) === i);
      const jetzt = ROLLEN.map((k) => rollen[k]).join();
      let ersatz = null;
      for (let versuch = 0; versuch < 40; versuch++) {
        const v = vorrat.slice();
        for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
        const neu = ROLLEN.map((k, i) => v[i % v.length]);
        if (neu.join() === jetzt) continue;
        if (!ersatz) ersatz = neu;
        if (kontrast(neu[0], neu[1]) >= 4.5) { ersatz = neu; break; }
      }
      if (!ersatz) return;
      manuell = true;
      ROLLEN.forEach((k, i) => { rollen[k] = ersatz[i]; });
    }

    function oeffnen(start) {
      if (!panel) bauen();
      panel.hidden = false;
      panel.minimieren(false);
      if (start) { panel.feld.value = start; einlesen(start); panel.zeichnen(); }
      panel.feld.focus();
    }

    function bauen() {
      panel = el('section', 'position:fixed;z-index:2147483000;right:16px;bottom:16px;width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#2B2522;border:1px solid #CFC6BC;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px;font:15px/1.5 system-ui,sans-serif;text-align:left;');
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
      inhalt.append(el('p', 'margin:0 0 12px;font-size:13px;color:#5C524B;', 'Palette auf coolors.co → Export → Code kopieren (jedes Format oder der Link) und hier einfügen. Danach lassen sich Farben per Farbwähler ändern und Rollen einzeln zuweisen. Nur eine Vorschau in diesem Browser – niemand sonst sieht sie.'));
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
      inhalt.append(ergebnis);
      // Verweise auf Bedienelemente, damit Änderungen ohne Neuaufbau sichtbar werden (Farbwähler bleibt offen)
      let ref = null;

      const ZWISCHEN = 'font:700 12px/1.3 system-ui,sans-serif;margin:14px 0 6px;letter-spacing:.04em;text-transform:uppercase;color:#5C524B;';

      // Oberfläche passend zum Zustand neu aufbauen (nach Einlesen, Standardfarben)
      function zeichnen() {
        ergebnis.replaceChildren();
        ref = null;
        if (!rollen) {
          ergebnis.append(el('p', 'margin:0;color:#8A1C12;', feld.value.trim() ? 'Keine Farben erkannt.' : 'Standardfarben aktiv.'));
          return;
        }
        ref = { palette: [], rollen: {}, felder: {} };

        // Palette: jede eingegebene Farbe mit Farbwähler
        ergebnis.append(el('p', ZWISCHEN, 'Palette'));
        const pReihe = el('div', 'display:flex;flex-wrap:wrap;gap:8px;');
        palette.forEach((hex, i) => {
          const f = farbwaehler(hex, 'Farbe ' + (i + 1) + ' ändern');
          f.addEventListener('input', () => { paletteAendern(i, normal(f.value)); setzen(); auffrischen(); });
          ref.palette.push(f);
          pReihe.append(f);
        });
        ergebnis.append(pReihe);

        // Rollen: Farbwähler + Farbfelder der Palette (Klick = zuweisen, nur diese Rolle ändert sich)
        ergebnis.append(el('p', ZWISCHEN, 'Rollen'));
        const rListe = el('div', 'display:grid;gap:8px;');
        ROLLEN.filter((k) => rollen[k]).forEach((k) => {
          const zeile = el('div', 'display:grid;grid-template-columns:40px 1fr;gap:4px 10px;align-items:center;');
          const f = farbwaehler(rollen[k], rollenText[k] + ' ändern');
          f.addEventListener('input', () => { rolleAendern(k, normal(f.value)); setzen(); auffrischen(); });
          const text = el('div', 'font-size:13px;');
          const name = el('span', 'font-weight:600;', rollenText[k]);
          const wert = el('span', 'margin-left:6px;font:12px ui-monospace,monospace;color:#5C524B;');
          text.append(name, wert);
          zeile.append(f, text);
          const felder = [];
          if (rollen.hell && palette.length > 1) {
            const auswahl = el('div', 'grid-column:2;display:flex;flex-wrap:wrap;gap:4px;');
            palette.forEach((hex, i) => {
              const b = el('button', 'width:22px;height:22px;padding:0;border-radius:5px;border:1px solid #CFC6BC;cursor:pointer;');
              b.type = 'button';
              b.addEventListener('click', () => { zuweisen(k, palette[i]); setzen(); auffrischen(); });
              felder.push(b);
              auswahl.append(b);
            });
            zeile.append(auswahl);
          }
          ref.rollen[k] = { f, wert };
          ref.felder[k] = felder;
          rListe.append(zeile);
        });
        ergebnis.append(rListe);

        if (rollen.hell) {
          const werkzeuge = el('div', 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;');
          const bMischen = knopf('Rollen mischen');
          const bAuto = knopf('Automatisch');
          bMischen.addEventListener('click', () => { rollenMischen(); setzen(); auffrischen(); });
          bAuto.addEventListener('click', () => { manuell = false; rollen = farbrollen(alsObjekte(palette)); setzen(); auffrischen(); });
          werkzeuge.append(bMischen, bAuto);
          ergebnis.append(werkzeuge);
          ref.bAuto = bAuto;
          ref.kontrast = el('p', 'margin:8px 0 0;');
          ref.kontrast.setAttribute('aria-live', 'polite');
          ergebnis.append(ref.kontrast);
        }

        ergebnis.append(el('p', 'margin:14px 0 8px;color:#5C524B;', 'Gefällt es? Dauerhaft übernehmen: im CMS unter „Farbschema“ einfügen – danach baut die Pipeline die Seite neu.'));
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
        bCsv.addEventListener('click', () => merken(bCsv, alsText()));
        bLink.addEventListener('click', () => merken(bLink, alsLink()));
        kopieren.append(bCsv, bLink, cms);
        ergebnis.append(kopieren);
        auffrischen(true);
      }

      // Werte in der bestehenden Oberfläche nachziehen; Eingabefeld zeigt immer das aktuelle Farbschema
      function auffrischen(ohneFeld) {
        if (!ref) return;
        if (!ohneFeld) feld.value = alsText();
        palette.forEach((hex, i) => { if (ref.palette[i] && ref.palette[i].value !== hex.toLowerCase()) ref.palette[i].value = hex.toLowerCase(); });
        Object.keys(ref.rollen).forEach((k) => {
          const r = ref.rollen[k];
          if (r.f.value !== rollen[k].toLowerCase()) r.f.value = rollen[k].toLowerCase();
          r.wert.textContent = rollen[k];
          ref.felder[k].forEach((b, i) => {
            const an = palette[i] === rollen[k];
            b.style.background = palette[i];
            b.style.outline = an ? '2px solid #2B2522' : 'none';
            b.style.outlineOffset = '1px';
            b.setAttribute('aria-pressed', String(an));
            b.setAttribute('aria-label', 'Farbe ' + (i + 1) + ' (' + palette[i] + ') als ' + rollenText[k]);
          });
        });
        if (ref.kontrast) {
          ref.kontrast.replaceChildren();
          KONTRAST_PAARE[vorlage].forEach(([a, b]) => {
            const k = kontrast(rollen[a], rollen[b]);
            const zuWenig = k < 4.5;
            ref.kontrast.append(el('span', 'display:block;color:' + (zuWenig ? '#8A1C12' : '#5C524B') + ';',
              'Kontrast ' + rollenText[a] + ' / ' + rollenText[b] + ': ' + k.toFixed(1).replace('.', ',') + ' : 1' + (zuWenig ? ' – schwer lesbar (mind. 4,5)' : '')));
          });
          ref.bAuto.disabled = !manuell;
          ref.bAuto.style.opacity = manuell ? '1' : '.45';
        }
      }

      bAnwenden.addEventListener('click', () => { einlesen(feld.value); zeichnen(); });
      bZurueck.addEventListener('click', () => { palette = []; rollen = null; manuell = false; zuruecksetzen(); feld.value = ''; zeichnen(); });
      bZu.addEventListener('click', () => { panel.hidden = true; });
      const minimieren = (zu) => {
        inhalt.hidden = zu;
        panel.style.width = zu ? 'auto' : 'min(440px,calc(100vw - 32px))';
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
      panel.zeichnen = zeichnen;
      d.body.append(panel);
    }

    function ausAdresse() {
      const m = /^#farben(?:=(r:)?([0-9a-fA-F-]{6,200}))?$/.exec(location.hash);
      if (!m) return;
      const hexe = m[2] ? m[2].split('-') : [];
      if (m[1] && hexe.length === 4) {
        // Link mit festen Rollen: Hintergrund-Schrift-Akzent-Flächen
        const r = {};
        ['Hintergrund', 'Schrift', 'Akzent', 'Flächen'].forEach((n, i) => { r[n] = '#' + hexe[i]; });
        oeffnen(JSON.stringify(r));
      } else oeffnen(hexe.join(','));
    }
    window.addEventListener('hashchange', ausAdresse);
    ausAdresse();
  }

  return { farbschemaLesen, farbrollen, variablen, cssRoot, labor, kontrast, mischen, hexZuRgb };
});

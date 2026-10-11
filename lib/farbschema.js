'use strict';
/*
 * Farbschema aus coolors.co (https://coolors.co) übernehmen. Akzeptiert jedes Export-Format als
 * Wert des Feldes "farbschema" in der Inhaltsdatei:
 *   "8c0902,e0c58f,f5f0e9,210100"                       CSV
 *   "#8c0902, #e0c58f, #f5f0e9, #210100"                With #
 *   ["8c0902","e0c58f", …]                              Array (auch als Text)
 *   {"Blood Red":"8c0902", …}                           Object (auch als Text)
 *   [{"name":"Blood Red","hex":"8c0902", …}, …]         Extended Array (auch als Text)
 *   "<palette><color name=… hex=… /></palette>"         XML
 *   "https://coolors.co/8c0902-e0c58f-f5f0e9-210100"    Link
 *
 * Die Reihenfolge der Farben ist egal: farbrollen() ordnet sie nach Helligkeit und Buntheit den
 * Rollen hell (Hintergrund), dunkel (Text), akzent (kräftigste Farbe) und weich (Flächen) zu.
 * Lesbarkeit stellen die Vorlagen danach mit den Kontrast-Hilfen sicher.
 */

const h = require('./helfer');

const HEX = /#?\b([0-9a-f]{6})\b/gi;

/** Liest ein Farbschema in beliebigem coolors-Format. Rückgabe: [{ name, hex: '#RRGGBB' }] (leer = nichts erkannt). */
function farbschemaLesen(wert) {
  const farbe = (hex, name = '') => {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    return m ? { name: String(name || ''), hex: '#' + m[1].toUpperCase() } : null;
  };
  let liste = [];
  if (Array.isArray(wert)) {
    liste = wert.map((x) => (x && typeof x === 'object' ? farbe(x.hex, x.name) : farbe(x)));
  } else if (wert && typeof wert === 'object') {
    liste = Object.entries(wert).map(([name, hex]) => farbe(hex, name));
  } else if (typeof wert === 'string') {
    const text = wert.trim();
    if (/^[[{]/.test(text)) {
      try { return farbschemaLesen(JSON.parse(text)); } catch { /* weiter als Text */ }
    }
    if (/<color\b/i.test(text)) {
      liste = [...text.matchAll(/<color\b[^>]*>/gi)].map(([tag]) => {
        const attr = (n) => (new RegExp(`\\b${n}="([^"]*)"`, 'i').exec(tag) || [])[1];
        return farbe(attr('hex'), attr('name'));
      });
    } else {
      // CSV, mit #, coolors-Link (…/8c0902-e0c58f-…) – alle sechsstelligen Hex-Werte der Reihe nach
      liste = [...text.matchAll(HEX)].map((m) => farbe(m[1]));
    }
  }
  return liste.filter(Boolean);
}

/** Buntheit (Chroma) 0–1 */
function buntheit(hex) {
  const rgb = h.hexZuRgb(hex);
  return (Math.max(...rgb) - Math.min(...rgb)) / 255;
}

/** Hellt eine Farbe auf, bis sie auf allen Hintergründen den Mindestkontrast erreicht. */
function aufhellenBisKontrast(hex, hintergruende, minimum = 4.6) {
  let farbe = hex;
  for (let i = 0; i < 40 && hintergruende.some((bg) => h.kontrast(farbe, bg) < minimum); i++) {
    farbe = h.mischen(farbe, '#FFFFFF', 0.05);
  }
  return farbe;
}

/**
 * Ordnet die Farben Rollen zu. Rückgabe: null (keine Farben) oder { hell, dunkel, akzent, weich }.
 * Bei nur einer Farbe ist nur "akzent" gesetzt. hell und dunkel werden notfalls auseinandergezogen,
 * damit Text auf Hintergrund gut lesbar bleibt (Kontrast mind. 10:1).
 */
function farbrollen(farben) {
  const hexe = [...new Set(farben.map((f) => f.hex))];
  if (!hexe.length) return null;
  if (hexe.length === 1) return { akzent: hexe[0] };
  const sortiert = [...hexe].sort((a, b) => h.luminanz(a) - h.luminanz(b));
  let dunkel = sortiert[0];
  let hell = sortiert[sortiert.length - 1];
  const rest = sortiert.slice(1, -1);
  const nachBuntheit = (liste) => [...liste].sort((a, b) => buntheit(b) - buntheit(a));
  const akzent = nachBuntheit(rest.length ? rest : [dunkel, hell])[0];
  const uebrig = rest.filter((f) => f !== akzent);
  const weich = uebrig.length ? uebrig[uebrig.length - 1] : h.mischen(hell, akzent, 0.2);
  for (let i = 0; i < 40 && h.kontrast(hell, dunkel) < 10; i++) {
    hell = h.mischen(hell, '#FFFFFF', 0.08);
    dunkel = h.mischen(dunkel, '#000000', 0.08);
  }
  return { hell, dunkel, akzent, weich };
}

/** "#EDE5D6" → "237 229 214" (für rgb(var(--x-rgb) / .5) im CSS) */
const rgbTeile = (hex) => h.hexZuRgb(hex).join(' ');

module.exports = { farbschemaLesen, farbrollen, aufhellenBisKontrast, rgbTeile };

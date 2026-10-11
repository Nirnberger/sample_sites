'use strict';
// Kleiner JSON-Schema-Prüfer für die Inhaltsdateien (ohne npm-Abhängigkeiten).
// Unterstützt die Teilmenge, die unsere Schemas nutzen: type, properties, required, items,
// enum, pattern, minLength, minItems, minimum, maximum, anyOf, $ref (Datei und #/$defs/…).
// Meldungen sind auf Deutsch und nennen den Pfad, z. B. „kontakt.telefon: erwartet Text, gefunden Zahl“.

const fs = require('fs');
const path = require('path');

const TYPNAMEN = { string: 'Text', number: 'Zahl', integer: 'ganze Zahl', boolean: 'ja/nein (true/false)', object: 'Objekt { … }', array: 'Liste [ … ]', null: 'null' };

function typVon(wert) {
  if (wert === null) return 'null';
  if (Array.isArray(wert)) return 'array';
  return typeof wert;
}

function passtTyp(wert, typ) {
  if (typ === 'integer') return Number.isInteger(wert);
  if (typ === 'number') return typeof wert === 'number' && Number.isFinite(wert);
  return typVon(wert) === typ;
}

const geladen = new Map();
function ladeSchema(datei) {
  const voll = path.resolve(datei);
  if (!geladen.has(voll)) geladen.set(voll, JSON.parse(fs.readFileSync(voll, 'utf8')));
  return { schema: geladen.get(voll), datei: voll };
}

// $ref auflösen: "andere.json", "andere.json#/$defs/x" oder "#/$defs/x"
function aufloesen(ref, kontext) {
  const [dateiTeil, zeiger = ''] = ref.split('#');
  const ziel = dateiTeil ? ladeSchema(path.join(path.dirname(kontext.datei), dateiTeil)) : kontext;
  const schema = zeiger.split('/').filter(Boolean).reduce((s, teil) => s && s[teil], ziel.schema);
  if (!schema) throw new Error(`Schema-Verweis nicht gefunden: ${ref}`);
  return { schema, datei: ziel.datei, wurzel: ziel.schema };
}

function pruefeWert(wert, schema, pfad, kontext, fehler) {
  if (schema.$ref) {
    const z = aufloesen(schema.$ref, kontext);
    return pruefeWert(wert, z.schema, pfad, { datei: z.datei, schema: z.wurzel }, fehler);
  }
  const ort = pfad || '(Datei)';
  if (schema.anyOf) {
    const passt = schema.anyOf.some((teil) => { const f = []; pruefeWert(wert, teil, pfad, kontext, f); return !f.length; });
    if (!passt) fehler.push(`${ort}: ${schema.description || 'Wert hat nicht das erwartete Format'}`);
    return;
  }
  if (schema.type) {
    const typen = [].concat(schema.type);
    if (!typen.some((t) => passtTyp(wert, t))) {
      fehler.push(`${ort}: erwartet ${typen.map((t) => TYPNAMEN[t] || t).join(' oder ')}, gefunden ${TYPNAMEN[typVon(wert)] || typVon(wert)}`);
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(wert)) fehler.push(`${ort}: erlaubt sind ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  if (typeof wert === 'string') {
    if (schema.minLength && wert.trim().length < schema.minLength) fehler.push(`${ort}: darf nicht leer sein`);
    if (schema.pattern && wert !== '' && !new RegExp(schema.pattern).test(wert)) {
      fehler.push(`${ort}: „${wert.slice(0, 60)}“ – ${schema.description || `passt nicht zum Muster ${schema.pattern}`}`);
    }
  }
  if (typeof wert === 'number') {
    if (schema.minimum !== undefined && wert < schema.minimum) fehler.push(`${ort}: mindestens ${schema.minimum}`);
    if (schema.maximum !== undefined && wert > schema.maximum) fehler.push(`${ort}: höchstens ${schema.maximum}`);
  }
  if (Array.isArray(wert)) {
    if (schema.minItems && wert.length < schema.minItems) fehler.push(`${ort}: mindestens ${schema.minItems} Einträge`);
    if (schema.items) wert.forEach((x, i) => pruefeWert(x, schema.items, `${pfad}[${i}]`, kontext, fehler));
  }
  if (typVon(wert) === 'object') {
    for (const feld of schema.required || []) {
      if (wert[feld] === undefined) fehler.push(`${pfad ? pfad + '.' : ''}${feld}: Pflichtfeld fehlt`);
    }
    for (const [feld, teil] of Object.entries(schema.properties || {})) {
      if (wert[feld] !== undefined) pruefeWert(wert[feld], teil, pfad ? `${pfad}.${feld}` : feld, kontext, fehler);
    }
  }
}

/** Prüft `daten` gegen die Schema-Datei. Rückgabe: Liste von Fehlermeldungen (leer = alles gut). */
function pruefe(daten, schemaDatei) {
  const kontext = ladeSchema(schemaDatei);
  const fehler = [];
  pruefeWert(daten, kontext.schema, '', kontext, fehler);
  return fehler;
}

module.exports = { pruefe };

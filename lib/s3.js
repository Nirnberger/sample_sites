'use strict';
// Minimaler S3-Client (AWS Signature V4) ohne npm-Abhängigkeiten – für MinIO, Garage, SeaweedFS,
// Hetzner Object Storage, Cloudflare R2 usw. Nutzt Pfad-Adressierung: <endpunkt>/<bucket>/<schlüssel>.
// Kann: Objekte auflisten, herunterladen, hochladen, Bucket anlegen.

const crypto = require('crypto');

const sha256 = (daten) => crypto.createHash('sha256').update(daten).digest('hex');
const hmac = (schluessel, text) => crypto.createHmac('sha256', schluessel).update(text).digest();
// URI-Kodierung nach AWS-Regeln (strenger als encodeURIComponent)
const ENTITAETEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const xmlText = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITAETEN[e.toLowerCase()]);
const kodiere = (text) => encodeURIComponent(text).replace(/[!'()*]/g, (z) => '%' + z.charCodeAt(0).toString(16).toUpperCase());

function s3Client({ endpunkt, bucket, zugang, geheimnis, region = 'us-east-1' }) {
  if (!endpunkt || !bucket || !zugang || !geheimnis) throw new Error('S3: endpunkt, bucket, zugang und geheimnis sind nötig.');
  const basis = new URL(endpunkt.replace(/\/+$/, ''));

  async function anfrage(methode, schluessel = '', { abfrage = {}, koerper = null, kopf = {} } = {}) {
    const pfad = `${basis.pathname.replace(/\/$/, '')}/${kodiere(bucket)}${schluessel ? '/' + schluessel.split('/').map(kodiere).join('/') : ''}`;
    const query = Object.keys(abfrage).sort().map((k) => `${kodiere(k)}=${kodiere(String(abfrage[k]))}`).join('&');
    const jetzt = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const tag = jetzt.slice(0, 8);
    const nutzlast = sha256(koerper || '');
    const header = { host: basis.host, 'x-amz-content-sha256': nutzlast, 'x-amz-date': jetzt, ...kopf };
    const namen = Object.keys(header).map((k) => k.toLowerCase()).sort();
    const kanonisch = [methode, pfad, query, namen.map((k) => `${k}:${String(header[k]).trim()}\n`).join(''), namen.join(';'), nutzlast].join('\n');
    const bereich = `${tag}/${region}/s3/aws4_request`;
    const zuSignieren = ['AWS4-HMAC-SHA256', jetzt, bereich, sha256(kanonisch)].join('\n');
    const schl = hmac(hmac(hmac(hmac(`AWS4${geheimnis}`, tag), region), 's3'), 'aws4_request');
    const signatur = crypto.createHmac('sha256', schl).update(zuSignieren).digest('hex');
    const { host, ...ohneHost } = header;
    const antwort = await fetch(`${basis.origin}${pfad}${query ? '?' + query : ''}`, {
      method: methode,
      headers: { ...ohneHost, Authorization: `AWS4-HMAC-SHA256 Credential=${zugang}/${bereich}, SignedHeaders=${namen.join(';')}, Signature=${signatur}` },
      body: koerper,
    });
    if (!antwort.ok) {
      const text = await antwort.text();
      const code = (text.match(/<Code>([^<]+)<\/Code>/) || [])[1] || antwort.status;
      const err = new Error(`S3 ${methode} ${schluessel || bucket}: ${code}`);
      err.status = antwort.status;
      throw err;
    }
    return antwort;
  }

  return {
    /** Alle Objekte unter einem Präfix: [{ schluessel, groesse, etag }] */
    async liste(praefix = '') {
      const ergebnis = [];
      let weiter;
      do {
        const abfrage = { 'list-type': '2', prefix: praefix };
        if (weiter) abfrage['continuation-token'] = weiter;
        const xml = await (await anfrage('GET', '', { abfrage })).text();
        for (const teil of xml.split('<Contents>').slice(1)) {
          const feld = (n) => xmlText((teil.match(new RegExp(`<${n}>([^<]*)</${n}>`)) || [])[1] || '');
          ergebnis.push({ schluessel: feld('Key'), groesse: Number(feld('Size')), etag: feld('ETag').replace(/"/g, '') });
        }
        weiter = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (xml.match(/<NextContinuationToken>([^<]+)</) || [])[1] : null;
      } while (weiter);
      return ergebnis;
    },
    async holen(schluessel) {
      return Buffer.from(await (await anfrage('GET', schluessel)).arrayBuffer());
    },
    async ablegen(schluessel, inhalt, typ = 'application/octet-stream') {
      await anfrage('PUT', schluessel, { koerper: inhalt, kopf: { 'content-type': typ } });
    },
    async bucketAnlegen() {
      try { await anfrage('PUT'); } catch (e) { if (![409].includes(e.status)) throw e; }
    },
  };
}

// Zugangsdaten aus der Umgebung (Build-Variablen in Coolify bzw. Secrets in GitHub)
function s3AusUmgebung(env = process.env) {
  if (!env.MEDIEN_ENDPUNKT) return null;
  return s3Client({
    endpunkt: env.MEDIEN_ENDPUNKT,
    bucket: env.MEDIEN_BUCKET || 'kunden-medien',
    zugang: env.MEDIEN_ZUGANG,
    geheimnis: env.MEDIEN_GEHEIMNIS,
    region: env.MEDIEN_REGION || 'us-east-1',
  });
}

module.exports = { s3Client, s3AusUmgebung };

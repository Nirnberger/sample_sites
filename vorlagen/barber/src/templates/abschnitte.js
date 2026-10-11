'use strict';
// Die Sektionen der Startseite. Jede Funktion gibt '' zurück, wenn die Daten fehlen –
// dann taucht die Sektion (und ihr Menüpunkt) gar nicht erst auf.

const { esc, absaetze, slug, initialen } = require('../../../../lib/helfer');
const { icon, stern, sterne } = require('./icons');

const zahl = (n, stellen = 0) =>
  Number(n).toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

function kopf(id, eyebrow, titel, mitte = false) {
  return `<header class="abschnitt-kopf${mitte ? ' abschnitt-kopf--mitte' : ''} reveal">
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h2 id="${id}-titel">${esc(titel)}</h2>
  </header>`;
}

function googleBadge(c, klasse) {
  const s = c.s;
  if (!s.google_bewertung) return '';
  const text = `${zahl(s.google_bewertung, 1)}${s.google_anzahl ? ` · ${zahl(s.google_anzahl)} Google-Bewertungen` : ' auf Google'}`;
  const inhalt = `${stern()}<span>${text}</span>`;
  return s.google_link
    ? `<a class="${klasse}" href="${esc(s.google_link)}" target="_blank" rel="noopener">${inhalt}<span class="sr-only"> (öffnet Google in neuem Tab)</span></a>`
    : `<p class="${klasse}">${inhalt}</p>`;
}

function hero(c) {
  const s = c.s;
  const zweiter = c.hat.leistungen
    ? `<a class="knopf knopf--rand" href="#leistungen">Preise ansehen</a>`
    : `<a class="knopf knopf--rand" href="#kontakt">Kontakt</a>`;
  return `
<section class="hero" aria-labelledby="hero-titel">
  <div class="hero-bild">
    ${c.bild(s.hero_bild, { sizes: '100vw', eager: true })}
  </div>
  <div class="container hero-raster">
    <div class="hero-text">
      <p class="eyebrow">${esc(s.branche)} in ${esc(s.kontakt.adresse.ort)}</p>
      <h1 id="hero-titel">${esc(s.name)}</h1>
      ${s.slogan ? `<p class="hero-slogan">${esc(s.slogan)}</p>` : ''}
      ${s.kurzbeschreibung ? `<p class="hero-beschreibung">${esc(s.kurzbeschreibung)}</p>` : ''}
      <div class="knopf-reihe">
        <a class="knopf" ${c.cta.attribute}>${icon(c.cta.icon)}${esc(c.cta.text)}</a>
        ${zweiter}
      </div>
      ${googleBadge(c, 'hero-badge')}
    </div>
  </div>
</section>`;
}

function leistungen(c) {
  const kategorien = c.s.leistungen;
  if (!c.hat.leistungen) return '';
  const mehrere = kategorien.length > 1;
  const tabs = mehrere
    ? `<div class="tab-liste" role="tablist" aria-label="Leistungskategorien">${kategorien
        .map((k, i) => `<button class="tab" type="button" role="tab" id="tab-${slug(k.kategorie)}" aria-controls="panel-${slug(k.kategorie)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(k.kategorie)}</button>`)
        .join('')}</div>`
    : '';
  const panels = kategorien
    .map((k) => {
      const eintraege = (k.eintraege || [])
        .map((e) => {
          const info = [e.beschreibung, e.dauer].filter(Boolean).map(esc).join(' · ');
          return `<li class="preis-item">
            <div class="preis-zeile"><span class="preis-name">${esc(e.name)}</span><span class="preis-linie" aria-hidden="true"></span><span class="preis-wert">${esc(e.preis || '')}</span></div>
            ${info ? `<p class="preis-info">${info}</p>` : ''}
          </li>`;
        })
        .join('');
      const id = slug(k.kategorie);
      const rolle = mehrere ? ` role="tabpanel" aria-labelledby="tab-${id}" tabindex="0"` : '';
      return `<div class="tab-panel" id="panel-${id}"${rolle}>
        <h3 class="panel-titel">${esc(k.kategorie)}</h3>
        <ul class="preisliste">${eintraege}</ul>
      </div>`;
    })
    .join('');
  return `
<section id="leistungen" class="abschnitt${c.hintergrund('leistungen')}" aria-labelledby="leistungen-titel">
  <div class="container">
    ${kopf('leistungen', 'Leistungen & Preise', c.s.leistungen_titel || 'Die Preisliste')}
    <div class="tabs reveal" data-tabs>
      ${tabs}
      ${panels}
    </div>
    ${c.s.preis_hinweis ? `<p class="hinweis">${esc(c.s.preis_hinweis)}</p>` : ''}
  </div>
</section>`;
}

function ueberUns(c) {
  const s = c.s;
  if (!c.hat.ueberUns) return '';
  const punkte = (s.ueber_uns_punkte || []).filter(Boolean);
  return `
<section id="ueber-uns" class="abschnitt${c.hintergrund('ueber-uns')}" aria-labelledby="ueber-uns-titel">
  <div class="container zwei-spalten">
    <div class="ueber-bild reveal">
      ${c.bild(s.ueber_uns_bild, { sizes: '(min-width: 900px) 40vw, calc(100vw - 2.5rem)' })}
    </div>
    <div class="ueber-text reveal">
      <p class="eyebrow">Über uns</p>
      <h2 id="ueber-uns-titel">${esc(s.ueber_uns_titel || `Willkommen bei ${s.name}`)}</h2>
      ${absaetze(s.ueber_uns_text).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${punkte.length ? `<ul class="punkte">${punkte.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>`;
}

function team(c) {
  if (!c.hat.team) return '';
  const karten = c.s.team
    .map((m) => `<li class="team-karte reveal">
      <div class="team-foto">${c.teamFoto(m)}</div>
      <div>
        <h3>${esc(m.name)}</h3>
        ${m.rolle ? `<p class="team-rolle">${esc(m.rolle)}</p>` : ''}
        ${m.text ? `<p class="team-text">${esc(m.text)}</p>` : ''}
      </div>
    </li>`)
    .join('');
  return `
<section id="team" class="abschnitt${c.hintergrund('team')}" aria-labelledby="team-titel">
  <div class="container">
    ${kopf('team', 'Team', c.s.team_titel || 'Wer hier die Maschine schwingt')}
    <ul class="team-raster">${karten}</ul>
  </div>
</section>`;
}

function galerie(c) {
  const bilder = c.galerieBilder;
  if (!bilder.length) return '';
  const elemente = bilder
    .map((b, i) => `<li class="reveal"><a class="galerie-link" href="${b.info.groesste}" data-lightbox data-index="${i}">
        ${c.bild(b, { sizes: '(min-width: 800px) 31vw, 46vw' })}
        <span class="sr-only">Bild vergrößern</span>
      </a></li>`)
    .join('');
  const hinweis = c.demo && bilder.some((b) => c.istStockfoto(b.datei))
    ? '<p class="hinweis">Beispielfotos – im fertigen Auftritt zeigen wir hier Bilder aus deinem Laden.</p>'
    : '';
  return `
<section id="galerie" class="abschnitt${c.hintergrund('galerie')}" aria-labelledby="galerie-titel">
  <div class="container">
    ${kopf('galerie', 'Galerie', c.s.galerie_titel || 'Aus dem Laden')}
    <ul class="galerie-raster">${elemente}</ul>
    ${hinweis}
  </div>
</section>`;
}

function lightbox(c) {
  if (!c.galerieBilder.length) return '';
  return `
<dialog class="lightbox" data-lightbox-dialog aria-label="Bildansicht">
  <figure><figcaption></figcaption></figure>
  <button class="lb-knopf lb-schliessen" type="button" data-lb-schliessen aria-label="Schließen">${icon('schliessen')}</button>
  <button class="lb-knopf lb-zurueck" type="button" data-lb-zurueck aria-label="Vorheriges Bild">${icon('links')}</button>
  <button class="lb-knopf lb-weiter" type="button" data-lb-weiter aria-label="Nächstes Bild">${icon('rechts')}</button>
</dialog>`;
}

function bewertungen(c) {
  const s = c.s;
  if (!c.hat.bewertungen) return '';
  const karten = (s.bewertungen || [])
    .slice(0, 6)
    .map((b) => `<li class="reveal"><figure class="bewertung-karte">
      ${sterne(b.sterne ?? 5)}
      <blockquote><p>${esc(b.text)}</p></blockquote>
      <figcaption>${esc(b.autor)}</figcaption>
    </figure></li>`)
    .join('');
  const schnitt = s.google_bewertung
    ? `<div class="bewertung-schnitt reveal">
        <span class="schnitt-zahl">${zahl(s.google_bewertung, 1)}</span>
        <span>${sterne(s.google_bewertung)}<span class="schnitt-text">${s.google_anzahl ? `aus ${zahl(s.google_anzahl)} Google-Bewertungen` : 'auf Google'}</span></span>
      </div>`
    : '';
  return `
<section id="bewertungen" class="abschnitt${c.hintergrund('bewertungen')}" aria-labelledby="bewertungen-titel">
  <div class="container">
    ${kopf('bewertungen', 'Bewertungen', 'Was die Kundschaft sagt')}
    ${schnitt}
    ${karten ? `<ul class="bewertungen-raster">${karten}</ul>` : ''}
    ${s.google_link ? `<a class="textlink" href="${esc(s.google_link)}" target="_blank" rel="noopener">Alle Bewertungen auf Google${icon('pfeil')}<span class="sr-only"> (öffnet in neuem Tab)</span></a>` : ''}
  </div>
</section>`;
}

function oeffnungszeiten(c) {
  const s = c.s;
  const a = s.kontakt.adresse;
  const zeilen = c.zeiten
    .map((z) => {
      const text = z.bereiche.length ? z.bereiche.map((b) => `${b.von}–${b.bis}`).join(', ') : 'geschlossen';
      return `<tr${z.nr ? ` data-tag="${z.nr}"` : ''}${z.bereiche.length ? '' : ' class="ist-geschlossen"'}><th scope="row">${esc(z.tag)}</th><td>${esc(text)}</td></tr>`;
    })
    .join('');
  const daten = {};
  c.zeiten.forEach((z) => { if (z.nr) daten[z.nr] = z.bereiche.map((b) => [b.von, b.bis]); });
  return `
<section id="oeffnungszeiten" class="abschnitt${c.hintergrund('oeffnungszeiten')}" aria-labelledby="oeffnungszeiten-titel">
  <div class="container zwei-spalten zwei-spalten--oben">
    <div class="reveal">
      <p class="eyebrow">Komm vorbei</p>
      <h2 id="oeffnungszeiten-titel">Öffnungszeiten &amp; Anfahrt</h2>
      ${c.zeiten.length ? `<p class="oeffnungs-status" data-status hidden></p>
      <table class="zeiten" data-zeiten='${esc(JSON.stringify(daten))}' data-zeitzone="${c.land.zeitzone}">
        <caption class="sr-only">Öffnungszeiten</caption>
        <tbody>${zeilen}</tbody>
      </table>` : ''}
    </div>
    <div class="anfahrt reveal">
      <h3>Anfahrt</h3>
      <address>
        <strong>${esc(s.name)}</strong><br>
        ${esc(a.strasse)}<br>
        ${esc(a.plz)} ${esc(a.ort)}
      </address>
      ${s.anfahrt_hinweis ? `<p class="anfahrt-hinweis">${esc(s.anfahrt_hinweis)}</p>` : ''}
      <a class="knopf knopf--rand" href="${esc(c.links.route)}" target="_blank" rel="noopener">${icon('ort')}Route planen<span class="sr-only"> (öffnet Google Maps in neuem Tab)</span></a>
      <p class="klein">Der Link öffnet Google Maps. Eine Karte ist hier bewusst nicht eingebunden, damit beim Besuch keine Daten an Google gehen.</p>
    </div>
  </div>
</section>`;
}

function kontakt(c) {
  const s = c.s;
  const k = s.kontakt;
  const eintraege = [
    c.links.tel && { href: c.links.tel, icon: 'telefon', label: 'Telefon', wert: k.telefon },
    c.links.wa && { href: c.links.wa, icon: 'whatsapp', label: 'WhatsApp', wert: 'Nachricht schreiben', extern: true },
    c.links.mail && { href: c.links.mail, icon: 'mail', label: 'E-Mail', wert: k.email },
  ].filter(Boolean);
  const social = [
    s.social.instagram && { href: s.social.instagram, icon: 'instagram', label: 'Instagram' },
    s.social.facebook && { href: s.social.facebook, icon: 'facebook', label: 'Facebook' },
  ].filter(Boolean);
  return `
<section id="kontakt" class="abschnitt abschnitt--dunkel" aria-labelledby="kontakt-titel">
  <div class="container kontakt-raster">
    <div class="reveal">
      <p class="eyebrow">Kontakt</p>
      <h2 id="kontakt-titel">${esc(s.kontakt_titel || 'Bis gleich im Stuhl')}</h2>
      <p class="kontakt-intro">${c.links.buchung ? 'Termin online buchen, kurz anrufen oder einfach schreiben.' : 'Ruf kurz an oder schreib uns – wir finden einen Termin.'}</p>
      <a class="knopf knopf--hell" ${c.cta.attribute}>${icon(c.cta.icon)}${esc(c.cta.text)}</a>
      ${social.length ? `<ul class="social">${social.map((x) => `<li><a href="${esc(x.href)}" target="_blank" rel="noopener" aria-label="${x.label} (öffnet in neuem Tab)">${icon(x.icon)}</a></li>`).join('')}</ul>` : ''}
    </div>
    <ul class="kontakt-liste reveal">
      ${eintraege.map((e) => `<li><a href="${esc(e.href)}"${e.extern ? ' target="_blank" rel="noopener"' : ''}>
        <span class="kontakt-icon">${icon(e.icon)}</span>
        <span><span class="kontakt-label">${e.label}</span><span class="kontakt-wert">${esc(e.wert)}</span></span>
      </a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

function mobilLeiste(c) {
  const zweite = c.links.buchung
    ? `<a class="knopf" ${c.cta.attribute}>${icon('kalender')}Termin buchen</a>`
    : c.links.wa
      ? `<a class="knopf" href="${esc(c.links.wa)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>`
      : `<a class="knopf" href="${esc(c.links.route)}" target="_blank" rel="noopener">${icon('ort')}Route</a>`;
  const erste = c.links.tel
    ? `<a class="knopf knopf--rand" href="${c.links.tel}">${icon('telefon')}Anrufen</a>`
    : `<a class="knopf knopf--rand" href="#kontakt">Kontakt</a>`;
  return `<div class="mobil-leiste">${erste}${zweite}</div>`;
}

module.exports = { hero, leistungen, ueberUns, team, galerie, lightbox, bewertungen, oeffnungszeiten, kontakt, mobilLeiste };

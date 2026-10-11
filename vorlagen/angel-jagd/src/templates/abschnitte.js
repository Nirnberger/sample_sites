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
  const suche = c.hat.shop
    ? `<form class="hero-suche" action="#shop" role="search" data-hero-suche>
        <label class="sr-only" for="hero-suchfeld">Sortiment durchsuchen</label>
        ${icon('suche')}
        <input id="hero-suchfeld" name="suche" type="search" placeholder="${esc(s.shop.suche_platzhalter || 'Was suchst du? z. B. Wobbler, Fernglas …')}" autocomplete="off">
        <button class="knopf" type="submit">Suchen</button>
      </form>`
    : '';
  const knoepfe = c.hat.shop
    ? `<a class="knopf" href="#shop">${esc(s.shop.hero_knopf || 'Zum Sortiment')}</a>
       <a class="knopf knopf--rand" ${c.cta.attribute}>${icon(c.cta.icon)}${esc(c.cta.text)}</a>`
    : `<a class="knopf" ${c.cta.attribute}>${icon(c.cta.icon)}${esc(c.cta.text)}</a>`;
  return `
<section class="hero" aria-labelledby="hero-titel">
  <div class="hero-bild">${c.bild(s.hero_bild, { sizes: '100vw', eager: true })}</div>
  <div class="container hero-inhalt">
    <p class="eyebrow">${esc(s.branche)} · ${esc(s.kontakt.adresse.ort)}</p>
    <h1 id="hero-titel">${esc(s.name)}</h1>
    ${s.slogan ? `<p class="hero-slogan">${esc(s.slogan)}</p>` : ''}
    ${s.kurzbeschreibung ? `<p class="hero-beschreibung">${esc(s.kurzbeschreibung)}</p>` : ''}
    ${suche}
    <div class="knopf-reihe">${knoepfe}</div>
    <div class="hero-fuss">
      ${googleBadge(c, 'hero-badge')}
      ${c.zeiten.length ? `<p class="oeffnungs-status hero-status" data-status hidden></p>` : ''}
    </div>
  </div>
</section>`;
}

// Zwei (oder mehr) große Einstiegskarten, z. B. „Angeln“ und „Jagd“. Ein Klick filtert den Shop.
function bereiche(c) {
  const liste = c.s.bereiche;
  if (!liste.length) return '';
  return `
<section class="bereiche" aria-label="Unsere Bereiche">
  <ul class="container bereiche-raster">
    ${liste.map((b) => `<li class="reveal"><a class="bereich" href="#shop"${b.filter ? ` data-filter="${esc(b.filter)}"` : ''}>
      ${c.bild(b.bild, { sizes: '(min-width: 800px) 46vw, 100vw' })}
      <span class="bereich-text">
        <span class="bereich-titel">${esc(b.titel)}</span>
        ${b.text ? `<span class="bereich-beschreibung">${esc(b.text)}</span>` : ''}
        <span class="bereich-link">${esc(b.link_text || 'Sortiment ansehen')}${icon('pfeil')}</span>
      </span>
    </a></li>`).join('')}
  </ul>
</section>`;
}

function produktKarte(c, p) {
  const lager = {
    'auf lager': ['auf-lager', 'Auf Lager'],
    'wenige': ['wenige', 'Nur noch wenige'],
    'bestellbar': ['bestellbar', 'Lieferbar in 2–4 Tagen'],
  }[String(p.lager || 'auf lager').toLowerCase()] || ['bestellbar', p.lager];
  const angebot = p.preis_alt !== undefined && p.preis_alt !== '';
  const daten = JSON.stringify({ id: p.id, name: p.name, preis: typeof p.preis === 'number' ? p.preis : null, preisText: c.preis(p.preis), vorOrt: !!p.nur_vor_ort });
  const such = [p.name, p.marke, p.kategorie, p.beschreibung, ...(p.merkmale || [])].filter(Boolean).join(' ').toLowerCase();
  return `<li class="produkt" data-kategorie="${esc(p.kategorie)}" data-such="${esc(such)}">
    <div class="produkt-bild">
      ${p.bild ? c.bild({ datei: p.bild, alt: p.bild_alt || p.name }, { sizes: '(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 46vw' }) : `<div class="platzhalter produkt-platzhalter" aria-hidden="true">${icon(p.nur_vor_ort ? 'schild' : 'tuete')}</div>`}
      ${angebot ? '<span class="produkt-marke produkt-marke--angebot">Angebot</span>' : ''}
      ${p.neu ? '<span class="produkt-marke">Neu</span>' : ''}
    </div>
    <div class="produkt-info">
      <p class="produkt-kategorie">${esc(p.marke ? `${p.marke} · ${p.kategorie}` : p.kategorie)}</p>
      <h3 class="produkt-name">${esc(p.name)}</h3>
      ${p.beschreibung ? `<p class="produkt-beschreibung">${esc(p.beschreibung)}</p>` : ''}
      ${p.nur_vor_ort ? `<p class="produkt-hinweis">${icon('schild')}${esc(p.hinweis || 'Abgabe nur im Laden gegen Vorlage von Jagdschein bzw. WBK')}</p>` : ''}
      <p class="lager lager--${lager[0]}">${esc(lager[1])}</p>
      <div class="produkt-fuss">
        <p class="produkt-preis">${angebot ? `<del><span class="sr-only">statt </span>${esc(c.preis(p.preis_alt))}</del> ` : ''}<strong>${esc(c.preis(p.preis))}</strong>${p.einheit ? `<span class="einheit"> / ${esc(p.einheit)}</span>` : ''}</p>
        <button class="knopf knopf--klein merken" type="button" data-merken='${esc(daten)}' hidden aria-label="${esc(p.name)} auf den Merkzettel">${icon('plus')}<span>Merken</span></button>
      </div>
    </div>
  </li>`;
}

function shop(c) {
  if (!c.hat.shop) return '';
  const s = c.s;
  const chips = s.produkt_kategorien.length > 1
    ? `<div class="filter-chips" role="group" aria-label="Kategorie filtern">
        <button class="chip" type="button" data-kategorie-filter="" aria-pressed="true">Alle</button>
        ${s.produkt_kategorien.map((k) => `<button class="chip" type="button" data-kategorie-filter="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}
      </div>`
    : '';
  return `
<section id="shop" class="abschnitt abschnitt--shop" aria-labelledby="shop-titel">
  <div class="container">
    <header class="shop-kopf reveal">
      <div>
        <p class="eyebrow">${esc(s.shop.eyebrow || 'Shop · Click & Collect')}</p>
        <h2 id="shop-titel">${esc(s.shop.titel || 'Unser Sortiment')}</h2>
        <p class="shop-intro">${esc(s.shop.intro || 'Artikel merken, Anfrage abschicken, im Laden abholen und bezahlen. Wir legen dir alles zurück.')}</p>
      </div>
      <ol class="schritte" aria-label="So funktioniert's">
        <li><span>1</span>Merken</li>
        <li><span>2</span>Anfrage senden</li>
        <li><span>3</span>Abholen &amp; bezahlen</li>
      </ol>
    </header>
    <div class="shop-werkzeuge" data-shop-werkzeuge hidden>
      <label class="shop-suche">
        <span class="sr-only">Im Sortiment suchen</span>
        ${icon('suche')}
        <input type="search" placeholder="Suchen …" data-shop-suche autocomplete="off">
      </label>
      ${chips}
      <p class="treffer" data-treffer aria-live="polite"></p>
    </div>
    <ul class="produkt-raster" data-produkte>
      ${s.produkte.map((p) => produktKarte(c, p)).join('')}
    </ul>
    <p class="leer" data-leer hidden>Nichts gefunden. Ruf uns gern an – vieles haben wir im Laden oder bestellen es dir.</p>
    <p class="hinweis">${esc(s.shop.hinweis || 'Alle Preise inkl. MwSt. Die Reservierung ist unverbindlich und kostenlos, bezahlt wird bei Abholung. Kein Versand.')}</p>
  </div>
</section>`;
}

// Merkzettel als Dialog. Inhalt baut main.js auf; ohne JavaScript bleibt er unsichtbar.
function merkzettel(c) {
  if (!c.hat.shop) return '';
  const k = c.s.kontakt;
  const wa = c.links.wa ? c.links.wa.split('?')[0] : '';
  return `
<dialog class="merkzettel" data-merkzettel aria-labelledby="merkzettel-titel" data-wa="${esc(wa)}" data-mail="${esc(k.email || '')}" data-laden="${esc(c.s.name)}">
  <div class="merkzettel-innen">
    <header class="merkzettel-kopf">
      <h2 id="merkzettel-titel">Dein Merkzettel</h2>
      <button class="lb-knopf merkzettel-zu" type="button" data-merkzettel-schliessen aria-label="Merkzettel schließen">${icon('schliessen')}</button>
    </header>
    <ul class="merk-liste" data-merk-liste></ul>
    <p class="merk-leer" data-merk-leer>Noch nichts gemerkt. Tippe bei einem Artikel auf „Merken“.</p>
    <div class="merk-fuss" data-merk-fuss hidden>
      <p class="merk-summe"><span>Summe (unverbindlich)</span><strong data-merk-summe>0,00 €</strong></p>
      <p class="merk-vorort" data-merk-vorort hidden>${icon('schild')}Mindestens ein Artikel wird nur gegen Vorlage von Jagdschein bzw. WBK im Laden abgegeben.</p>
      <label class="merk-name">Dein Name (für die Abholung)<input type="text" data-merk-name autocomplete="name"></label>
      <div class="merk-aktionen">
        ${wa ? `<a class="knopf" href="#" data-merk-senden="wa" target="_blank" rel="noopener">${icon('whatsapp')}Per WhatsApp anfragen</a>` : ''}
        ${k.email ? `<a class="knopf ${wa ? 'knopf--rand' : ''}" href="#" data-merk-senden="mail">${icon('mail')}Per E-Mail anfragen</a>` : ''}
        ${c.links.tel ? `<a class="textlink" href="${c.links.tel}">${icon('telefon')}Lieber anrufen: ${esc(k.telefon)}</a>` : ''}
      </div>
      <p class="klein">Wir melden uns, sobald alles für dich bereitliegt. Bezahlung bei Abholung, bar oder mit Karte.</p>
    </div>
  </div>
</dialog>`;
}

// Kurze Vorzüge direkt unter dem Hero (z. B. „Frühstück bis 15 Uhr“). Ohne Menüpunkt.
function highlights(c) {
  const liste = c.s.highlights;
  if (!liste.length) return '';
  return `
<section class="highlights" aria-label="Das erwartet dich">
  <ul class="container highlights-raster">
    ${liste.slice(0, 4).map((x) => `<li class="highlight reveal">
      ${x.icon ? `<span class="highlight-icon">${icon(x.icon)}</span>` : ''}
      <p class="highlight-titel">${esc(x.titel)}</p>
      ${x.text ? `<p>${esc(x.text)}</p>` : ''}
    </li>`).join('')}
  </ul>
</section>`;
}

function leistungen(c) {
  const kategorien = c.s.leistungen;
  if (!c.hat.leistungen) return '';
  const mehrere = kategorien.length > 1;
  const tabs = mehrere
    ? `<div class="tab-liste" role="tablist" aria-label="Service-Kategorien">${kategorien
        .map((k, i) => `<button class="tab" type="button" role="tab" id="tab-${slug(k.kategorie)}" aria-controls="panel-${slug(k.kategorie)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(k.kategorie)}</button>`)
        .join('')}</div>`
    : '';
  const panels = kategorien
    .map((k) => {
      const eintraege = (k.eintraege || [])
        .map((e) => {
          const info = [e.beschreibung, e.dauer].filter(Boolean).map(esc).join(' · ');
          const merkmale = (e.merkmale || []).filter(Boolean);
          return `<li class="preis-item">
            <div class="preis-zeile"><span class="preis-name">${esc(e.name)}</span><span class="preis-linie" aria-hidden="true"></span><span class="preis-wert">${esc(e.preis || '')}</span></div>
            ${info ? `<p class="preis-info">${info}</p>` : ''}
            ${merkmale.length ? `<p class="merkmale">${merkmale.map((m) => `<span class="merkmal merkmal--${slug(m)}">${esc(m)}</span>`).join('')}</p>` : ''}
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
    ${kopf('leistungen', 'Service', c.s.leistungen_titel || 'Werkstatt, Angelkarten & mehr')}
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
    ${kopf('team', 'Team', c.s.team_titel || 'Deine Ansprechpartner')}
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
    ${kopf('galerie', 'Galerie', c.s.galerie_titel || 'Draußen unterwegs')}
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
    ${kopf('bewertungen', 'Bewertungen', 'Das sagen unsere Kunden')}
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
      <h2 id="kontakt-titel">${esc(s.kontakt_titel || 'Fragen? Ruf einfach an.')}</h2>
      <p class="kontakt-intro">${c.links.buchung ? 'Wir beraten dich gern – am Telefon, per WhatsApp oder direkt im Laden.' : 'Wir beraten dich gern – am Telefon, per WhatsApp oder direkt im Laden.'}</p>
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
  const erste = c.links.tel
    ? `<a class="knopf knopf--rand" href="${c.links.tel}">${icon('telefon')}Anrufen</a>`
    : `<a class="knopf knopf--rand" href="#kontakt">Kontakt</a>`;
  const zweite = c.hat.shop
    ? `<a class="knopf" href="#shop" data-merkzettel-oeffnen-mobil>${icon('tuete')}<span data-mobil-text>Zum Shop</span></a>`
    : `<a class="knopf" href="${esc(c.links.route)}" target="_blank" rel="noopener">${icon('ort')}Route</a>`;
  return `<div class="mobil-leiste">${erste}${zweite}</div>`;
}

module.exports = { hero, highlights, bereiche, shop, merkzettel, leistungen, ueberUns, team, galerie, lightbox, bewertungen, oeffnungszeiten, kontakt, mobilLeiste };

/* Shop-Vorlage „Angel & Jagd“ – minimales JavaScript (Menü, Tabs, Lightbox, Öffnungsstatus, Einblenden).
   Alle Inhalte stehen bereits im HTML; ohne JavaScript bleibt die Seite vollständig nutzbar. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');
  var wenigBewegung = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Jahr im Footer
  d.querySelectorAll('[data-jahr]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Kopfzeile beim Scrollen kompakt
  var kopf = d.querySelector('[data-kopf]');
  if (kopf) {
    var geplant = false;
    var pruefen = function () {
      kopf.classList.toggle('ist-kompakt', window.scrollY > 24);
      geplant = false;
    };
    window.addEventListener('scroll', function () {
      if (!geplant) { geplant = true; requestAnimationFrame(pruefen); }
    }, { passive: true });
    pruefen();
  }

  // Mobiles Menü
  var menueKnopf = d.querySelector('[data-menue-knopf]');
  var nav = d.getElementById('hauptnav');
  if (menueKnopf && nav) {
    var setzen = function (offen) {
      // Menühöhe an die echte Unterkante der Kopfzeile anpassen (z. B. mit Demo-Streifen darüber)
      if (offen) nav.style.setProperty('--nav-oben', Math.round(kopf.getBoundingClientRect().bottom) + 'px');
      menueKnopf.setAttribute('aria-expanded', String(offen));
      menueKnopf.setAttribute('aria-label', offen ? 'Menü schließen' : 'Menü öffnen');
      nav.toggleAttribute('data-offen', offen);
      d.body.classList.toggle('menue-offen', offen);
    };
    menueKnopf.addEventListener('click', function () {
      setzen(menueKnopf.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setzen(false);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menueKnopf.getAttribute('aria-expanded') === 'true') {
        setzen(false);
        menueKnopf.focus();
      }
    });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function () { setzen(false); });
  }

  // Tabs für Leistungen (Pfeiltasten, Pos1/Ende)
  d.querySelectorAll('[data-tabs]').forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    if (!tabs.length) { box.classList.add('ist-bereit'); return; }
    var waehlen = function (tab, fokus) {
      tabs.forEach(function (t) {
        var aktiv = t === tab;
        t.setAttribute('aria-selected', String(aktiv));
        t.tabIndex = aktiv ? 0 : -1;
        d.getElementById(t.getAttribute('aria-controls')).hidden = !aktiv;
      });
      if (fokus) tab.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { waehlen(t); });
      t.addEventListener('keydown', function (e) {
        var ziel = null;
        if (e.key === 'ArrowRight') ziel = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') ziel = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') ziel = tabs[0];
        else if (e.key === 'End') ziel = tabs[tabs.length - 1];
        if (ziel) { e.preventDefault(); waehlen(ziel, true); }
      });
    });
    waehlen(tabs[0]);
    box.classList.add('ist-bereit');
  });

  // Öffnungszeiten: heutigen Tag hervorheben und Status anzeigen
  var tabelle = d.querySelector('[data-zeiten]');
  if (tabelle) {
    var jetzt = (function (zone) {
      try {
        var teile = {};
        new Intl.DateTimeFormat('en-GB', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
          .formatToParts(new Date())
          .forEach(function (p) { teile[p.type] = p.value; });
        var tage = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
        return { tag: tage[teile.weekday], min: (+teile.hour % 24) * 60 + +teile.minute };
      } catch (e) {
        var n = new Date();
        return { tag: n.getDay() || 7, min: n.getHours() * 60 + n.getMinutes() };
      }
    })(tabelle.getAttribute('data-zeitzone'));

    var zeile = tabelle.querySelector('[data-tag="' + jetzt.tag + '"]');
    if (zeile) {
      zeile.classList.add('ist-heute');
      var marke = d.createElement('span');
      marke.className = 'heute-marke';
      marke.textContent = 'Heute';
      zeile.querySelector('th').appendChild(marke);
    }

    var zeiten = JSON.parse(tabelle.getAttribute('data-zeiten') || '{}');
    // Status kann mehrfach vorkommen (z. B. im Hero und bei den Öffnungszeiten)
    d.querySelectorAll('[data-status]').forEach(function (status) {
      var minuten = function (t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; };
      var offenBis = null;
      (zeiten[jetzt.tag] || []).forEach(function (b) {
        if (jetzt.min >= minuten(b[0]) && jetzt.min < minuten(b[1])) offenBis = b[1];
      });
      status.textContent = offenBis ? 'Jetzt geöffnet · bis ' + offenBis + ' Uhr' : 'Derzeit geschlossen';
      status.classList.toggle('ist-offen', !!offenBis);
      status.hidden = false;
    });
  }

  // Galerie-Lightbox
  var dialog = d.querySelector('[data-lightbox-dialog]');
  var links = Array.prototype.slice.call(d.querySelectorAll('[data-lightbox]'));
  if (dialog && links.length && typeof dialog.showModal === 'function') {
    var figur = dialog.querySelector('figure');
    var unterschrift = dialog.querySelector('figcaption');
    var gross = d.createElement('img');
    gross.decoding = 'async';
    figur.insertBefore(gross, unterschrift);
    var index = 0;
    var ausloeser = null;

    var zeigen = function (i) {
      index = (i + links.length) % links.length;
      var a = links[index];
      var klein = a.querySelector('img');
      gross.removeAttribute('srcset');
      if (klein && klein.srcset) { gross.srcset = klein.srcset; gross.sizes = '100vw'; }
      gross.src = a.getAttribute('href');
      gross.alt = klein ? klein.alt : '';
      unterschrift.textContent = (klein && klein.alt ? klein.alt + ' · ' : '') + (index + 1) + ' / ' + links.length;
    };

    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        ausloeser = a;
        zeigen(i);
        dialog.showModal();
        d.body.classList.add('menue-offen');
      });
    });
    dialog.querySelector('[data-lb-schliessen]').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('[data-lb-zurueck]').addEventListener('click', function () { zeigen(index - 1); });
    dialog.querySelector('[data-lb-weiter]').addEventListener('click', function () { zeigen(index + 1); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') zeigen(index + 1);
      if (e.key === 'ArrowLeft') zeigen(index - 1);
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target === figur) dialog.close();
    });
    dialog.addEventListener('close', function () {
      d.body.classList.remove('menue-offen');
      if (ausloeser) ausloeser.focus();
    });
    var startX = null;
    dialog.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) zeigen(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  // ---------------------------------------------------------------------------
  // Shop: Filter, Suche und Merkzettel (nur im Arbeitsspeicher, keine Cookies/kein Speicher)
  // ---------------------------------------------------------------------------
  var raster = d.querySelector('[data-produkte]');
  if (raster) {
    var produkte = Array.prototype.slice.call(raster.querySelectorAll('.produkt'));
    var werkzeuge = d.querySelector('[data-shop-werkzeuge]');
    var suchfeld = d.querySelector('[data-shop-suche]');
    var chips = Array.prototype.slice.call(d.querySelectorAll('[data-kategorie-filter]'));
    var trefferEl = d.querySelector('[data-treffer]');
    var leerEl = d.querySelector('[data-leer]');
    var filter = { kategorie: '', text: '' };
    if (werkzeuge) werkzeuge.hidden = false;

    var anwenden = function () {
      var woerter = filter.text.toLowerCase().split(/\s+/).filter(Boolean);
      var n = 0;
      produkte.forEach(function (p) {
        var such = p.getAttribute('data-such');
        var ok = (!filter.kategorie || p.getAttribute('data-kategorie') === filter.kategorie) &&
          woerter.every(function (w) { return such.indexOf(w) !== -1; });
        p.hidden = !ok;
        if (ok) n++;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-kategorie-filter') === filter.kategorie)); });
      if (trefferEl) trefferEl.textContent = n === 1 ? '1 Artikel' : n + ' Artikel';
      if (leerEl) leerEl.hidden = n > 0;
    };
    var setzeKategorie = function (k) { filter.kategorie = k; anwenden(); };
    chips.forEach(function (c) {
      c.addEventListener('click', function () { setzeKategorie(c.getAttribute('data-kategorie-filter')); });
    });
    if (suchfeld) suchfeld.addEventListener('input', function () { filter.text = suchfeld.value; anwenden(); });

    // Einstiegskarten (Angeln/Jagd) und Hero-Suche setzen den Filter
    d.querySelectorAll('[data-filter]').forEach(function (a) {
      a.addEventListener('click', function () { setzeKategorie(a.getAttribute('data-filter')); });
    });
    var heroSuche = d.querySelector('[data-hero-suche]');
    if (heroSuche) heroSuche.addEventListener('submit', function (e) {
      e.preventDefault();
      var wert = heroSuche.querySelector('input').value;
      filter.text = wert; filter.kategorie = '';
      if (suchfeld) suchfeld.value = wert;
      anwenden();
      d.getElementById('shop').scrollIntoView({ behavior: wenigBewegung ? 'auto' : 'smooth' });
    });
    anwenden();

    // Merkzettel
    var dlg = d.querySelector('[data-merkzettel]');
    var liste = [];
    var euro = function (z) { return z.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; };
    var zaehler = d.querySelectorAll('[data-merk-anzahl]');
    var mobilText = d.querySelector('[data-mobil-text]');
    var mobilKnopf = d.querySelector('[data-merkzettel-oeffnen-mobil]');
    var nachricht = function () {
      var name = (dlg.querySelector('[data-merk-name]').value || '').trim();
      var zeilen = liste.map(function (x) { return '- ' + x.menge + ' × ' + x.name + (x.preisText ? ' (' + x.preisText + ')' : ''); });
      return 'Hallo ' + dlg.getAttribute('data-laden') + ',\n\nich möchte folgende Artikel zur Abholung reservieren:\n' +
        zeilen.join('\n') + '\n\n' + (name ? 'Name: ' + name + '\n' : '') + 'Vielen Dank!';
    };
    var zeichnen = function () {
      var anzahl = liste.reduce(function (s, x) { return s + x.menge; }, 0);
      zaehler.forEach(function (z) { z.textContent = anzahl; });
      if (mobilText) mobilText.textContent = anzahl ? 'Merkzettel (' + anzahl + ')' : 'Zum Shop';
      var ul = dlg.querySelector('[data-merk-liste]');
      ul.innerHTML = '';
      liste.forEach(function (x, i) {
        var li = d.createElement('li');
        li.className = 'merk-eintrag';
        var name = d.createElement('span'); name.className = 'merk-eintrag-name'; name.textContent = x.name;
        var preis = d.createElement('span'); preis.className = 'merk-eintrag-preis';
        preis.textContent = x.preis !== null ? euro(x.preis * x.menge) : x.preisText;
        var menge = d.createElement('span'); menge.className = 'menge';
        menge.innerHTML = '<button type="button" aria-label="Weniger">−</button><output></output><button type="button" aria-label="Mehr">+</button>';
        menge.querySelector('output').textContent = x.menge;
        var btns = menge.querySelectorAll('button');
        btns[0].addEventListener('click', function () { x.menge--; if (x.menge < 1) liste.splice(i, 1); zeichnen(); });
        btns[1].addEventListener('click', function () { x.menge++; zeichnen(); });
        li.appendChild(name); li.appendChild(menge); li.appendChild(preis);
        ul.appendChild(li);
      });
      var summe = liste.reduce(function (s, x) { return s + (x.preis || 0) * x.menge; }, 0);
      dlg.querySelector('[data-merk-summe]').textContent = euro(summe);
      dlg.querySelector('[data-merk-leer]').hidden = liste.length > 0;
      dlg.querySelector('[data-merk-fuss]').hidden = liste.length === 0;
      dlg.querySelector('[data-merk-vorort]').hidden = !liste.some(function (x) { return x.vorOrt; });
      d.querySelectorAll('[data-merken]').forEach(function (b) {
        var drin = liste.some(function (x) { return x.id === JSON.parse(b.getAttribute('data-merken')).id; });
        b.classList.toggle('ist-gemerkt', drin);
        b.querySelector('span').textContent = drin ? 'Gemerkt' : 'Merken';
      });
    };
    var oeffnen = function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
    d.querySelectorAll('[data-merken]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        var p = JSON.parse(b.getAttribute('data-merken'));
        var x = liste.filter(function (y) { return y.id === p.id; })[0];
        if (x) x.menge++; else { p.menge = 1; liste.push(p); }
        zeichnen();
        b.classList.remove('puls'); void b.offsetWidth; b.classList.add('puls');
      });
    });
    d.querySelectorAll('[data-merkzettel-oeffnen]').forEach(function (b) { b.hidden = false; b.addEventListener('click', oeffnen); });
    if (mobilKnopf) mobilKnopf.addEventListener('click', function (e) { if (liste.length) { e.preventDefault(); oeffnen(); } });
    dlg.querySelector('[data-merkzettel-schliessen]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.querySelectorAll('[data-merk-senden]').forEach(function (a) {
      a.addEventListener('click', function () {
        var text = nachricht();
        if (a.getAttribute('data-merk-senden') === 'wa') {
          a.href = dlg.getAttribute('data-wa') + '?text=' + encodeURIComponent(text);
        } else {
          a.href = 'mailto:' + dlg.getAttribute('data-mail') + '?subject=' + encodeURIComponent('Reservierung: ' + liste.length + ' Artikel') + '&body=' + encodeURIComponent(text);
        }
      });
    });
    zeichnen();
  }

  // Sanftes Einblenden beim Scrollen
  var elemente = d.querySelectorAll('.reveal');
  if (wenigBewegung || !('IntersectionObserver' in window)) {
    elemente.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  } else {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('ist-sichtbar');
          beobachter.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    elemente.forEach(function (el) { beobachter.observe(el); });
  }
})();

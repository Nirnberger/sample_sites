/* Café-Vorlage – minimales JavaScript (Menü, Tabs, Lightbox, Öffnungsstatus, Einblenden).
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

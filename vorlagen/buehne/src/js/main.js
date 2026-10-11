/* Bühnen-Vorlage – JavaScript für Scheinwerfer, Rollenwechsel, Programm-Reiter, Lightbox, Einblenden.
   Alle Inhalte stehen bereits im HTML; ohne JavaScript bleibt die Seite vollständig nutzbar. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  d.querySelectorAll('[data-jahr]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Scheinwerfer: folgt dem Zeiger; ohne Maus wandert er langsam über die Bühne
  d.querySelectorAll('[data-scheinwerfer]:not([data-suchen])').forEach(function (buehne) {
    var setzen = function (x, y) { buehne.style.setProperty('--x', x + '%'); buehne.style.setProperty('--y', y + '%'); };
    buehne.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = buehne.getBoundingClientRect();
      setzen(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    });
    if (ruhig || window.matchMedia('(hover: hover)').matches) return;
    var start = performance.now();
    (function wandern(t) {
      var s = (t - start) / 1000;
      setzen(50 + Math.sin(s * 0.35) * 28, 42 + Math.cos(s * 0.27) * 16);
      requestAnimationFrame(wandern);
    })(start);
  });

  // Suchende Scheinwerfer (Ouvertüre): folgen dem Zeiger – der kleine mit Verzögerung. Ruht die Maus
  // ein paar Sekunden (oder gibt es keine), schwingen beide wie an der Lichtbrücke hin und her, gegeneinander
  // versetzt, als suchten sie die Schauspielerin. Läuft nur, solange die Ouvertüre zu sehen ist.
  d.querySelectorAll('[data-scheinwerfer][data-suchen]').forEach(function (buehne) {
    var lichter = Array.prototype.slice.call(buehne.querySelectorAll('.scheinwerfer')).map(function (el, i) {
      return { el: el, x: i ? 30 : 50, y: i ? 46 : 42 };
    });
    var setzen = function (l) { l.el.style.setProperty('--x', l.x + '%'); l.el.style.setProperty('--y', l.y + '%'); };
    var zeiger = null;
    var zuletzt = performance.now();
    buehne.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = buehne.getBoundingClientRect();
      zeiger = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
      zuletzt = performance.now();
      // Bewegung reduziert: kein Schwingen und kein Nachgleiten, die Lichter stehen direkt am Zeiger
      if (ruhig) lichter.forEach(function (l, i) { l.x = zeiger.x - i * 8; l.y = zeiger.y + i * 6; setzen(l); });
    });
    if (ruhig) return;
    // Pendel: x schwingt, y hebt sich an den Enden (Bogen des Lichtkegels); der kleine schwingt schneller
    // und gegenläufig, mit langsam wechselnder Weite – so wirkt es suchend statt mechanisch
    var schwingen = function (i, s) {
      var w = i ? 0.62 : 0.45;
      var winkel = Math.sin(s * w + (i ? 2.2 : 0));
      var weite = (i ? 26 : 32) + Math.sin(s * 0.17 + i) * 6;
      return { x: 50 + winkel * weite, y: (i ? 52 : 44) - winkel * winkel * (i ? 8 : 10) };
    };
    var sichtbar = true;
    var laeuft = false;
    var schritt = function (t) {
      if (!sichtbar) { laeuft = false; return; }
      var ruht = !zeiger || t - zuletzt > 2500;
      lichter.forEach(function (l, i) {
        var ziel = ruht ? schwingen(i, t / 1000) : { x: zeiger.x, y: zeiger.y };
        var k = ruht ? 0.035 : (i ? 0.045 : 0.16);
        l.x += (ziel.x - l.x) * k;
        l.y += (ziel.y - l.y) * k;
        setzen(l);
      });
      requestAnimationFrame(schritt);
    };
    var starten = function () { if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { sichtbar = e[0].isIntersecting; if (sichtbar) starten(); }).observe(buehne);
    }
    starten();
  });

  // Rollenwechsel in der Ouvertüre: Bild und Zeile wechseln gemeinsam
  var zeile = d.querySelector('[data-rollen]');
  var bilder = d.querySelectorAll('[data-rolle-bild]');
  if (zeile && bilder.length > 1 && !ruhig) {
    var rollen = JSON.parse(zeile.getAttribute('data-rollen'));
    var teile = [zeile.querySelector('.verb'), zeile.querySelector('.rolle'), zeile.querySelector('.werk')];
    var nr = 0;
    setInterval(function () {
      if (d.hidden) return;
      nr = (nr + 1) % rollen.length;
      zeile.classList.add('ist-wechsel');
      bilder.forEach(function (b, i) { b.classList.toggle('ist-aktiv', i === nr % bilder.length); });
      setTimeout(function () {
        teile.forEach(function (el, i) { el.textContent = rollen[nr][i]; });
        zeile.classList.remove('ist-wechsel');
      }, 450);
    }, 3800);
  }

  // Programm-Reiter: den Abschnitt markieren, der gerade im Bild ist (Prolog, Galerie usw.: keiner)
  var reiter = Array.prototype.slice.call(d.querySelectorAll('[data-reiter]'));
  var leiste = d.querySelector('.reiter');
  if (reiter.length && 'IntersectionObserver' in window) {
    var markieren = function (id) {
      reiter.forEach(function (a) {
        var an = a.getAttribute('data-reiter') === id;
        if (!an) { a.removeAttribute('aria-current'); return; }
        a.setAttribute('aria-current', 'true');
      });
    };
    // Schmale Leiste (Handy): aktiven Reiter erst nach dem Scrollen ins Bild holen – während des Scrollens
    // würde das Verschieben der Leiste das Scrollen der Seite abbrechen
    var warten;
    window.addEventListener('scroll', function () {
      clearTimeout(warten);
      warten = setTimeout(function () {
        var aktiv = leiste.querySelector('[aria-current]');
        if (aktiv && leiste.scrollWidth > leiste.clientWidth) leiste.scrollTo({ left: aktiv.offsetLeft - 16, behavior: 'smooth' });
      }, 250);
    }, { passive: true });
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) { if (e.isIntersecting) markieren(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    d.querySelectorAll('main > section').forEach(function (s) { beobachter.observe(s); });
  }

  // Lightbox für den Kontaktbogen
  var dialog = d.querySelector('[data-lightbox-dialog]');
  var links = Array.prototype.slice.call(d.querySelectorAll('[data-lightbox]'));
  if (dialog && links.length && typeof dialog.showModal === 'function') {
    var bild = dialog.querySelector('img');
    var text = dialog.querySelector('figcaption');
    var index = 0;
    var zeigen = function (i) {
      index = (i + links.length) % links.length;
      var link = links[index];
      var vorschau = link.querySelector('img');
      bild.src = link.getAttribute('href');
      bild.alt = vorschau ? vorschau.alt : '';
      text.textContent = [bild.alt, link.getAttribute('data-credit')].filter(Boolean).join(' · ');
    };
    links.forEach(function (link, i) {
      link.addEventListener('click', function (e) { e.preventDefault(); zeigen(i); dialog.showModal(); });
    });
    dialog.querySelector('[data-lightbox-zu]').addEventListener('click', function () { dialog.close(); });
    dialog.querySelector('[data-lightbox-vor]').addEventListener('click', function () { zeigen(index + 1); });
    dialog.querySelector('[data-lightbox-zurueck]').addEventListener('click', function () { zeigen(index - 1); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') zeigen(index + 1);
      if (e.key === 'ArrowLeft') zeigen(index - 1);
    });
    dialog.addEventListener('close', function () { links[index].focus(); });
  }

  // Sanft einblenden
  var elemente = d.querySelectorAll('[data-einblenden]');
  if ('IntersectionObserver' in window) {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('ist-sichtbar'); beobachter.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    elemente.forEach(function (el) { beobachter.observe(el); });
  } else {
    elemente.forEach(function (el) { el.classList.add('ist-sichtbar'); });
  }

  // Farb-Labor: Vorschau einer coolors.co-Palette – nur über die Adresse …#farben, lädt dann
  // js/farbschema.js nach (eigene Domain, CSP bleibt). Wirkt nur in diesem Tab, sendet und speichert nichts.
  var laborGeladen = false;
  var laborPruefen = function () {
    if (laborGeladen || !/^#farben(=|$)/.test(location.hash)) return;
    laborGeladen = true;
    var skript = d.createElement('script');
    skript.src = 'js/farbschema.js';
    skript.onload = function () { window.Farbschema.labor('buehne'); };
    d.head.appendChild(skript);
  };
  window.addEventListener('hashchange', laborPruefen);
  laborPruefen();
})();

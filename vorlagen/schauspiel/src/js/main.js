/* Schauspiel-Vorlage – minimales JavaScript (Menü, Vita-Reiter, Lightbox, Einblenden).
   Alle Inhalte stehen bereits im HTML; ohne JavaScript bleibt die Seite vollständig nutzbar. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');

  d.querySelectorAll('[data-jahr]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Kopfzeile: auf der Startseite erst transparent, beim Scrollen dunkel
  var kopf = d.querySelector('[data-kopf]');
  if (kopf) {
    var geplant = false;
    var pruefen = function () { kopf.classList.toggle('ist-kompakt', window.scrollY > 40); geplant = false; };
    window.addEventListener('scroll', function () { if (!geplant) { geplant = true; requestAnimationFrame(pruefen); } }, { passive: true });
    pruefen();
  }

  // Mobiles Menü
  var menueKnopf = d.querySelector('[data-menue-knopf]');
  var nav = d.getElementById('hauptnav');
  if (menueKnopf && nav) {
    var setzen = function (offen) {
      if (offen) nav.style.setProperty('--nav-oben', Math.round(kopf.getBoundingClientRect().bottom) + 'px');
      menueKnopf.setAttribute('aria-expanded', String(offen));
      menueKnopf.setAttribute('aria-label', offen ? 'Menü schließen' : 'Menü öffnen');
      nav.toggleAttribute('data-offen', offen);
      d.body.classList.toggle('menue-offen', offen);
      if (offen) kopf.classList.add('ist-kompakt');
    };
    menueKnopf.addEventListener('click', function () { setzen(menueKnopf.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setzen(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menueKnopf.getAttribute('aria-expanded') === 'true') { setzen(false); menueKnopf.focus(); }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function () { setzen(false); });
  }

  // Vita-Reiter (Pfeiltasten, Pos1/Ende)
  d.querySelectorAll('[data-tabs]').forEach(function (box) {
    var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
    var waehlen = function (tab, fokus) {
      tabs.forEach(function (t) {
        var aktiv = t === tab;
        t.setAttribute('aria-selected', String(aktiv));
        t.tabIndex = aktiv ? 0 : -1;
        d.getElementById(t.getAttribute('aria-controls')).hidden = !aktiv;
      });
      if (fokus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { waehlen(tab); });
      tab.addEventListener('keydown', function (e) {
        var ziel = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (ziel === undefined) return;
        e.preventDefault();
        waehlen(tabs[(ziel + tabs.length) % tabs.length], true);
      });
    });
    if (tabs.length) waehlen(tabs[0]);
  });

  // Lightbox für die Fotos
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
})();

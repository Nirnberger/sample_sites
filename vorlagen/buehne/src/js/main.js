/* Bühnen-Vorlage – JavaScript für Scheinwerfer, Rollenwechsel, Programm-Menü, Lightbox, Einblenden.
   Alle Inhalte stehen bereits im HTML; ohne JavaScript bleibt die Seite vollständig nutzbar. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('js');
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  d.querySelectorAll('[data-jahr]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Scheinwerfer: folgt dem Zeiger; ohne Maus wandert er langsam über die Bühne
  d.querySelectorAll('[data-scheinwerfer]').forEach(function (buehne) {
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

  // Programm (Menü)
  var knopf = d.querySelector('[data-menue-knopf]');
  var programm = d.getElementById('programm');
  if (knopf && programm) {
    var oeffnen = function (offen) {
      knopf.setAttribute('aria-expanded', String(offen));
      knopf.textContent = offen ? 'Schließen' : 'Programm';
      programm.toggleAttribute('data-offen', offen);
      d.body.classList.toggle('menue-offen', offen);
      if (offen) { var erster = programm.querySelector('a'); if (erster) erster.focus(); }
    };
    knopf.addEventListener('click', function () { oeffnen(knopf.getAttribute('aria-expanded') !== 'true'); });
    programm.addEventListener('click', function (e) { if (e.target.closest('a')) oeffnen(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && knopf.getAttribute('aria-expanded') === 'true') { oeffnen(false); knopf.focus(); }
    });
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
})();

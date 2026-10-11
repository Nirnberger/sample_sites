/* Repertoire-Vorlage – minimales JavaScript (Jahr im Fuß, Lightbox für Fotos).
   Alle Inhalte stehen bereits im HTML; ohne JavaScript öffnen Fotos einfach in groß. */
(function () {
  'use strict';
  var d = document;

  d.querySelectorAll('[data-jahr]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Aktiven Menüpunkt in der (auf dem Handy waagerecht scrollbaren) Leiste sichtbar machen
  var aktiv = d.querySelector('.hauptnav [aria-current="page"]');
  if (aktiv) {
    var leiste = aktiv.closest('ul');
    if (leiste.scrollWidth > leiste.clientWidth) leiste.scrollLeft = aktiv.offsetLeft - 16;
  }

  // Lightbox
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
})();

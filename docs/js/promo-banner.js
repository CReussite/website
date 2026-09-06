/* Bandeau RENTREE10 — affiché jusqu'au 30/09/2026 inclus, refermable */
(function () {
  var EXPIRY = new Date('2026-10-01T00:00:00+02:00'); // 1er oct. heure de Paris
  if (Date.now() >= EXPIRY.getTime()) return;
  if (sessionStorage.getItem('promo_banner_closed')) return;

  var banner = document.createElement('div');
  banner.id = 'promo-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Offre de rentrée');
  banner.innerHTML =
    '<span>Rentrée 2026 : <strong>−10 %</strong> sur toutes les fiches avec le code <strong>RENTREE10</strong>' +
    ' &mdash; valable jusqu\'au 30 septembre.</span>' +
    '<button id="promo-banner-close" aria-label="Fermer le bandeau">&times;</button>';

  document.body.insertAdjacentElement('afterbegin', banner);

  document.getElementById('promo-banner-close').addEventListener('click', function () {
    banner.remove();
    sessionStorage.setItem('promo_banner_closed', '1');
  });
})();

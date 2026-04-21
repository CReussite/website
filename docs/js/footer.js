(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = depth >= 1 ? '../' : '';

  document.getElementById('footer-placeholder').outerHTML = `
  <footer>
    <div class="container">
      <div class="footer-logo"><img src="${root}img/logo.jpeg" alt="C'Réussite" class="footer-logo-img"></div>
      <p>Fiches de révision Terminale Spécialité — Maths &amp; Physique-Chimie</p>
      <p class="mt-8">
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@c-reussite.fr" target="_blank" rel="noopener">contact@c-reussite.fr</a>
      </p>
      <p class="mt-8" style="font-size:0.82rem;opacity:.75;">
        <a href="${root}cgv.html">CGV</a>
        &nbsp;·&nbsp;
        <a href="${root}mentions-legales.html">Mentions légales</a>
        &nbsp;·&nbsp;
        <a href="${root}confidentialite.html">Confidentialité</a>
        &nbsp;·&nbsp;
        <a href="${root}cgu.html">CGU</a>
      </p>
      <p class="mt-8 footer-credit">© 2026 Camille Reinhardt — Tous droits réservés</p>
    </div>
  </footer>
`;
})();

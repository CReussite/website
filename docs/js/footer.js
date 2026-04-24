(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = depth >= 1 ? '../' : '';

  document.getElementById('footer-placeholder').outerHTML = `
  <footer>
    <div class="container">
      <div class="footer-grid">

        <div class="footer-col">
          <div class="footer-logo">
            <img src="${root}img/logo.jpeg" alt="C'Réussite" class="footer-logo-img">
          </div>
          <p class="footer-brand-text">Fiches de révision Bac 2026<br>Maths &amp; Physique-Chimie</p>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=contact@c-reussite.fr" target="_blank" rel="noopener" class="footer-brand-email">contact@c-reussite.fr</a>
        </div>

        <div class="footer-col">
          <h4>Produits</h4>
          <ul>
            <li><a href="${root}maths.html">Fiches Maths</a></li>
            <li><a href="${root}physique-chimie.html">Fiches Physique-Chimie</a></li>
            <li><a href="${root}pack.html">Le Pack</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Ressources</h4>
          <ul>
            <li><a href="${root}blog/">Blog</a></li>
            <li><a href="${root}index.html#faq">FAQ</a></li>
            <li><a href="${root}index.html#camille">À propos</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Légal</h4>
          <ul>
            <li><a href="${root}cgv.html">CGV</a></li>
            <li><a href="${root}mentions-legales.html">Mentions légales</a></li>
            <li><a href="${root}confidentialite.html">Politique de confidentialité</a></li>
            <li><a href="${root}cgu.html">CGU</a></li>
          </ul>
        </div>

      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>© 2026 Camille Reinhardt — Tous droits réservés</p>
      </div>
    </div>
  </footer>
`;
})();

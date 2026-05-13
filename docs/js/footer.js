(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = '../'.repeat(depth);

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
            <li><a href="/maths-terminale/">Ebook Maths</a></li>
            <li><a href="/physique-chimie-terminale/">Ebook Physique-Chimie</a></li>
            <li><a href="/pack-maths-physique-chimie/">Le Pack</a></li>
            <li><a href="/cours-particuliers/">Cours particuliers</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Ressources</h4>
          <ul>
            <li><a href="/fiches-maths-terminale/">Réviser les maths</a></li>
            <li><a href="/fiches-physique-chimie-terminale/">Réviser la physique-chimie</a></li>
            <li><a href="/blog/">Blog</a></li>
            <li><a href="/faq/">FAQ</a></li>
            <li><a href="/a-propos/">À propos</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Légal</h4>
          <ul>
            <li><a href="/cgv/">CGV</a></li>
            <li><a href="/mentions-legales/">Mentions légales</a></li>
            <li><a href="/confidentialite/">Politique de confidentialité</a></li>
            <li><a href="/cgu/">CGU</a></li>
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

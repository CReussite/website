document.getElementById('nav-placeholder').outerHTML = `
  <nav aria-label="Navigation principale">
    <div class="nav-inner">
      <a href="#" class="nav-logo">C'<span>Réussite</span></a>
      <button class="nav-burger" aria-label="Ouvrir le menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links">
        <li><a href="#fiches">Les fiches</a></li>
        <li><a href="#methode">À propos</a></li>
        <li><a href="#fiche-gratuite">Fiche gratuite</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </div>
  </nav>
`;

(function () {
  const burger = document.querySelector('.nav-burger');
  const links  = document.querySelector('.nav-links');
  burger.addEventListener('click', function () {
    const open = links.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open);
  });
  // Ferme le menu au clic sur un lien
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      links.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
})();

(function () {
  const isBlog = location.pathname.includes('/blog');
  const root   = isBlog ? '../' : '';

  document.getElementById('nav-placeholder').outerHTML = `
    <nav aria-label="Navigation principale">
      <div class="nav-inner">
        <a href="${root}index.html" class="nav-logo">
          <img src="${root}img/logo.jpeg" alt="C'Réussite" class="nav-logo-img">
        </a>
        <div class="nav-tools">
          <ul class="nav-links">
            <li><a href="${root}index.html">Accueil</a></li>
            <li><a href="${root}maths.html">Maths</a></li>
            <li><a href="${root}physique-chimie.html">Physique-Chimie</a></li>
            <li><a href="${root}pack.html">Le Pack</a></li>
            <li><a href="${root}blog/">Blog</a></li>
          </ul>
          <button class="nav-burger" aria-label="Ouvrir le menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  `;
})();

(function () {
  const burger = document.querySelector('.nav-burger');
  const links  = document.querySelector('.nav-links');
  burger.addEventListener('click', function () {
    const open = links.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open);
  });
  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      links.classList.remove('nav-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
})();

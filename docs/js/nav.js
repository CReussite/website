(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = depth >= 1 ? '../' : '';

  document.getElementById('nav-placeholder').outerHTML = `
    <nav aria-label="Navigation principale">
      <div class="nav-inner">
        <a href="/" class="nav-logo" aria-label="C'Réussite — Accueil">
          <img src="${root}img/logo.jpeg" alt="C'Réussite" class="nav-logo-img">
        </a>
        <div class="nav-tools">
          <ul class="nav-links">
            <li><a href="/maths-terminale/">Maths</a></li>
            <li><a href="/physique-chimie-terminale/">Physique-Chimie</a></li>
            <li><a href="/pack-maths-physique-chimie/">Le Pack</a></li>
            <li><a href="/cours-particuliers/">Cours particuliers</a></li>
            <li><a href="/#avis">Avis</a></li>
            <li><a href="/blog/">Blog</a></li>
          </ul>
          <button class="nav-extract-btn" aria-label="Recevoir un extrait gratuit">Extrait gratuit →</button>
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

(function () {
  const isBlog = location.pathname.includes('/blog');
  const root   = isBlog ? '../' : '';

  const btn = document.querySelector('.nav-extract-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    const overlay = document.getElementById('extract-overlay');
    if (overlay) {
      const trigger = document.querySelector('.btn-extract[data-extract="bundle"]');
      if (trigger) trigger.click();
    } else {
      window.location.href = '/#fiche-gratuite';
    }
  });
})();

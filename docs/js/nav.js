(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = '../'.repeat(depth);

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
            <li><a href="/cours-particuliers/">Cours</a></li>
            <li class="nav-dropdown-wrap">
              <button class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">
                Ressources <span class="nav-dropdown-arrow" aria-hidden="true">▾</span>
              </button>
              <ul class="nav-dropdown-menu" role="menu">
                <li><a href="/fiches-maths-terminale/" role="menuitem">Réviser les maths</a></li>
                <li><a href="/fiches-physique-chimie-terminale/" role="menuitem">Réviser la physique-chimie</a></li>
              </ul>
            </li>
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

// Burger menu (mobile)
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

// Dropdown Ressources — clic (mobile) + Escape
(function () {
  const wrap = document.querySelector('.nav-dropdown-wrap');
  if (!wrap) return;
  const btn = wrap.querySelector('.nav-dropdown-btn');

  function setOpen(state) {
    wrap.classList.toggle('open', state);
    btn.setAttribute('aria-expanded', state);
  }

  // Clic : toggle (utile sur mobile et pour l'accessibilité clavier)
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!wrap.classList.contains('open'));
  });

  // Fermer au clic hors du dropdown
  document.addEventListener('click', function (e) {
    if (!wrap.contains(e.target)) setOpen(false);
  });

  // Fermer avec Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// Bouton "Extrait gratuit"
(function () {
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

// Detect if we're on the homepage or a subpage
(function () {
  var isHome = /index\.html$/.test(location.pathname) || location.pathname.endsWith('/');
  var base = isHome ? '' : 'index.html';

  document.getElementById('nav-placeholder').outerHTML = `
    <nav aria-label="Navigation principale">
      <div class="nav-inner">
        <a href="${base || '#'}${isHome ? '' : '#'}" class="nav-logo"><img src="${isHome ? '' : ''}img/logo.jpeg" alt="C'R\u00e9ussite" class="nav-logo-img"></a>
        <div class="nav-tools">
          <ul class="nav-links">
            <li><a href="${base}#fiches">Les fiches</a></li>
            <li><a href="${base}#camille">&Agrave; propos</a></li>
            <li><a href="${base}#faq">FAQ</a></li>
            <li><a href="${base}#contact">Contact</a></li>
          </ul>
          <a href="admin.html" class="nav-admin-link" aria-label="Acceder au tableau de bord admin">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="nav-admin-icon">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1zm2 0h6V8a3 3 0 0 0-6 0v2z" fill="currentColor"></path>
            </svg>
          </a>
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

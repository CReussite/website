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

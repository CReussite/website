(function () {
  var sidebar = document.getElementById('toc-sidebar');
  if (!sidebar) return;

  // Collecte les h2 du corps de l'article (data-toc-skip = exclusion)
  var headings = Array.prototype.slice.call(
    document.querySelectorAll('.article-body h2')
  ).filter(function (h) { return !h.hasAttribute('data-toc-skip'); });
  if (headings.length < 2) { sidebar.style.display = 'none'; return; }

  // Ajoute un id à chaque heading s'il n'en a pas
  headings.forEach(function (h, i) {
    if (!h.id) {
      h.id = 'section-' + i;
    }
  });

  // Construit le sommaire
  var titleEl = document.createElement('p');
  titleEl.className = 'toc-title';
  titleEl.textContent = 'Sur cette page';
  sidebar.appendChild(titleEl);

  var list = document.createElement('ul');
  list.className = 'toc-list';
  list.setAttribute('role', 'list');

  var links = [];
  headings.forEach(function (h) {
    var li = document.createElement('li');
    li.className = 'toc-item toc-' + h.tagName.toLowerCase();
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.className = 'toc-link';
    li.appendChild(a);
    list.appendChild(li);
    links.push(a);
  });

  sidebar.appendChild(list);

  // Highlight de la section active au scroll
  function getActive() {
    var active = null;
    headings.forEach(function (h) {
      if (h.getBoundingClientRect().top <= 130) {
        active = h;
      }
    });
    return active;
  }

  function updateActive() {
    var active = getActive();
    links.forEach(function (l) { l.classList.remove('toc-active'); });
    if (active) {
      var link = sidebar.querySelector('[href="#' + active.id + '"]');
      if (link) link.classList.add('toc-active');
    }
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();

  // Smooth scroll au clic
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', a.href);
      }
    });
  });
})();

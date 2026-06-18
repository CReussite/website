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
          <div class="nav-search-wrap" role="search" aria-label="Recherche">
            <button type="button" class="nav-search-btn" aria-label="Rechercher" aria-expanded="false">
              <svg class="icon-search" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <svg class="icon-close" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <input class="nav-search-input" type="search" placeholder="Rechercher…" aria-label="Recherche sur C'Réussite" autocomplete="off" spellcheck="false">
          </div>
          <button class="nav-burger" aria-label="Ouvrir le menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
      <div class="nav-search-dropdown" role="listbox" aria-label="Résultats de recherche" aria-live="polite"></div>
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

// ── Recherche ──────────────────────────────────────────────────────────────
(function () {
  const depth = location.pathname.split('/').filter(s => s && !s.includes('.')).length;
  const root  = '../'.repeat(depth);

  const wrap     = document.querySelector('.nav-search-wrap');
  const btn      = document.querySelector('.nav-search-btn');
  const input    = document.querySelector('.nav-search-input');
  const dropdown = document.querySelector('.nav-search-dropdown');
  if (!wrap || !btn || !input || !dropdown) return;

  let index    = null;
  let loading  = false;
  let focusIdx = -1;

  // ── Chargement de l'index (lazy, au premier clic) ──
  function loadIndex() {
    if (index || loading) return;
    loading = true;
    fetch(root + 'content/search-index.json')
      .then(r => r.json())
      .then(data => {
        index = data;
        loading = false;
        const q = input.value.trim();
        if (q.length >= 2) doSearch(q);
      })
      .catch(() => { loading = false; });
  }

  // ── Normalisation (accents, casse, ponctuation) ──
  function normalize(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
  }

  // ── Recherche par mots-clés ──
  function doSearch(q) {
    if (!index) { loadIndex(); return; }
    if (q.length < 2) { hideDropdown(); return; }
    const words = normalize(q).split(/\s+/).filter(w => w.length >= 2);
    if (!words.length) { hideDropdown(); return; }

    const scored = index.map(item => {
      const hay = normalize(
        [item.title, item.excerpt, ...(item.keywords || [])].join(' ')
      );
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { item, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    renderDropdown(scored.map(x => x.item), q);
  }

  // ── Rendu du dropdown ──
  function renderDropdown(results, q) {
    focusIdx = -1;
    if (!results.length) {
      dropdown.innerHTML = `<div class="search-empty">Aucun résultat pour « ${esc(q)} »</div>`;
      dropdown.classList.add('visible');
      return;
    }
    const sections = [
      { key: 'blog',      label: 'Blog' },
      { key: 'ressource', label: 'Ressources' },
      { key: 'produit',   label: 'Produits' }
    ];
    let html = '';
    sections.forEach(({ key, label }) => {
      const items = results.filter(r => r.type === key).slice(0, 4);
      if (!items.length) return;
      html += `<div class="search-section-label">${label}</div>`;
      items.forEach(item => {
        html += `<a class="search-result" href="${esc(item.url)}">`;
        html += `<div class="search-result-title">${esc(item.title)}</div>`;
        if (item.excerpt) {
          html += `<div class="search-result-excerpt">${esc(item.excerpt.slice(0, 90))}…</div>`;
        }
        if (item.price) {
          html += `<div class="search-result-price">${esc(item.price)}</div>`;
        }
        html += `</a>`;
      });
    });
    dropdown.innerHTML = html;
    dropdown.querySelectorAll('.search-result').forEach(a => {
      a.addEventListener('click', closeSearch);
    });
    dropdown.classList.add('visible');
  }

  function hideDropdown() { dropdown.classList.remove('visible'); focusIdx = -1; }

  // ── Ouvrir / fermer ──
  function openSearch() {
    wrap.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
    document.querySelector('nav').classList.add('search-active');
    input.focus();
    loadIndex();
    // Fermer le burger si ouvert
    const links  = document.querySelector('.nav-links');
    const burger = document.querySelector('.nav-burger');
    if (links && links.classList.contains('nav-open')) {
      links.classList.remove('nav-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    }
  }

  function closeSearch() {
    wrap.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
    document.querySelector('nav').classList.remove('search-active');
    hideDropdown();
    input.value = '';
  }

  // ── Navigation clavier dans le dropdown ──
  function moveFocus(dir) {
    const items = dropdown.querySelectorAll('.search-result');
    if (!items.length) return;
    if (focusIdx >= 0) items[focusIdx].classList.remove('focused');
    focusIdx = Math.max(-1, Math.min(focusIdx + dir, items.length - 1));
    if (focusIdx >= 0) {
      items[focusIdx].classList.add('focused');
      items[focusIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  // ── Événements ──
  btn.addEventListener('click', e => {
    e.stopPropagation();
    wrap.classList.contains('active') ? closeSearch() : openSearch();
  });

  input.addEventListener('input', function () { doSearch(this.value.trim()); });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape')    { closeSearch(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
    if (e.key === 'Enter' && focusIdx >= 0) {
      const items = dropdown.querySelectorAll('.search-result');
      if (items[focusIdx]) items[focusIdx].click();
    }
  });

  // Fermer si clic hors du wrap ET hors du dropdown
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target) && !dropdown.contains(e.target)) closeSearch();
  });

  // Escape global
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  // ── Échapper le HTML ──
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();

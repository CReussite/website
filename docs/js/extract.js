(function () {
  var BACKEND_URL = 'https://creussite-backend.onrender.com';

  var labels = {
    maths: {
      title: 'Recevoir un extrait Maths',
      desc: 'Reçois une fiche Maths Terminale Spécialité gratuitement par email.',
      productId: 'maths'
    },
    physique: {
      title: 'Recevoir un extrait Physique-Chimie',
      desc: 'Reçois une fiche Physique-Chimie Terminale Spécialité gratuitement par email.',
      productId: 'physique'
    },
    bundle: {
      title: 'Recevoir un extrait Pack complet',
      desc: 'Reçois une fiche Maths et une fiche Physique-Chimie gratuitement par email.',
      productId: 'bundle'
    }
  };

  var overlay  = document.getElementById('extract-overlay');
  var title    = document.getElementById('extract-popup-title');
  var desc     = document.getElementById('extract-popup-desc');
  var product  = document.getElementById('extract-product');
  var closeBtn = overlay.querySelector('.extract-close');
  var popup    = overlay.querySelector('.extract-popup');
  var form     = document.getElementById('extract-form');
  var submitBtn = form.querySelector('button[type="submit"]');

  document.querySelectorAll('[data-extract]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key  = btn.getAttribute('data-extract');
      var info = labels[key];
      title.textContent = info.title;
      desc.textContent  = info.desc;
      product.value     = info.productId;
      popup.classList.toggle('extract-popup--pack', key === 'bundle');
      // Réinitialiser l'état du formulaire à chaque ouverture
      form.reset();
      form.hidden = false;
      hideMessage();
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
    });
  });

  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  // ── Notification ────────────────────────────────────────
  var msgEl = document.createElement('p');
  msgEl.className = 'extract-message';
  msgEl.hidden = true;
  form.parentNode.insertBefore(msgEl, form.nextSibling);

  function showMessage(text, isError) {
    msgEl.textContent = text;
    msgEl.style.color = isError ? '#c0392b' : '#27ae60';
    msgEl.style.fontWeight = '600';
    msgEl.style.marginTop = '12px';
    msgEl.hidden = false;
  }

  function hideMessage() {
    msgEl.hidden = true;
    msgEl.textContent = '';
  }

  // ── Soumission ──────────────────────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var email      = document.getElementById('extract-email').value;
    var product_id = product.value;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Envoi en cours…';
    hideMessage();

    try {
      var res = await fetch(BACKEND_URL + '/api/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, product_id }),
      });

      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur serveur');
      }

      form.hidden = true;
      showMessage('C\'est envoyé ! Vérifie ta boîte mail (et tes spams).', false);
    } catch (err) {
      showMessage(err.message || 'Une erreur est survenue. Réessaie.', true);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Recevoir mon extrait';
    }
  });
})();

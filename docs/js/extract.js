(function () {
  var BACKEND_URL = 'https://creussite-backend.onrender.com';

  var labels = {
    maths: {
      title: 'Recevoir un extrait gratuit',
      desc: 'Reçois une fiche Maths Terminale Spécialité gratuitement par email.',
      productId: 'maths'
    },
    physique: {
      title: 'Recevoir un extrait gratuit',
      desc: 'Reçois une fiche Physique-Chimie Terminale Spécialité gratuitement par email.',
      productId: 'physique'
    },
    bundle: {
      title: 'Recevoir un extrait gratuit',
      desc: 'Choisis la ou les matières et reçois un extrait gratuitement par email.',
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

  // Choix matière (pack)
  var choiceGroup  = document.getElementById('extract-choice');
  var pickMaths    = document.getElementById('extract-pick-maths');
  var pickPhysique = document.getElementById('extract-pick-physique');

  // Au moins une case cochée pour soumettre
  function updateSubmitState() {
    if (choiceGroup && !choiceGroup.hidden) {
      submitBtn.disabled = !pickMaths.checked && !pickPhysique.checked;
    }
  }
  if (pickMaths) pickMaths.addEventListener('change', updateSubmitState);
  if (pickPhysique) pickPhysique.addEventListener('change', updateSubmitState);

  document.querySelectorAll('[data-extract]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key  = btn.getAttribute('data-extract');
      var info = labels[key];
      title.textContent = info.title;
      desc.textContent  = info.desc;
      product.value     = info.productId;
      popup.classList.toggle('extract-popup--pack', key === 'bundle');

      // Afficher le choix uniquement pour le pack
      if (choiceGroup) {
        if (key === 'bundle') {
          choiceGroup.hidden = false;
          pickMaths.checked = true;
          pickPhysique.checked = true;
        } else {
          choiceGroup.hidden = true;
        }
      }

      // Réinitialiser l'état du formulaire à chaque ouverture
      form.reset();
      form.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Recevoir mon extrait';
      hideMessage();
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';

      // Re-cocher après reset pour le pack
      if (key === 'bundle' && choiceGroup) {
        pickMaths.checked = true;
        pickPhysique.checked = true;
      }
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
  async function doFetch(email, product_id) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 25000);
    try {
      var res = await fetch(BACKEND_URL + '/api/extract', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email, product_id: product_id }),
        signal:  controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    var email      = document.getElementById('extract-email').value;
    var product_id = product.value;

    // Si pack : déterminer le choix de l'élève
    if (product_id === 'bundle' && choiceGroup && !choiceGroup.hidden) {
      var wantsMaths    = pickMaths.checked;
      var wantsPhysique = pickPhysique.checked;
      if (wantsMaths && wantsPhysique) {
        product_id = 'bundle';
      } else if (wantsMaths) {
        product_id = 'maths';
      } else if (wantsPhysique) {
        product_id = 'physique';
      } else {
        return; // aucune case cochée
      }
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Envoi en cours…';
    hideMessage();

    try {
      var res;
      try {
        res = await doFetch(email, product_id);
      } catch (networkErr) {
        // Première tentative échouée (serveur en veille) → spinner + retry après 8s
        submitBtn.innerHTML = '<span class="btn-spinner"></span>';
        await new Promise(function (resolve) { setTimeout(resolve, 8000); });
        submitBtn.innerHTML = '';
        submitBtn.textContent = 'Envoi en cours…';
        hideMessage();
        res = await doFetch(email, product_id);
      }

      var data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur serveur');
      }

      form.hidden = true;
      showMessage('C\'est envoyé ! Vérifie ta boîte mail (et tes spams).', false);
    } catch (err) {
      var msg = (err.name === 'AbortError' || !err.message || err.message === 'Load failed' || err.message === 'Failed to fetch')
        ? 'Connexion impossible. Vérifie ta connexion et réessaie.'
        : err.message;
      showMessage(msg, true);
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Recevoir mon extrait';
    }
  });
})();

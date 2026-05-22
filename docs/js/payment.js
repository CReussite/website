/* =====================================================
   PAIEMENT — Stancer
   Flux : clic Commander → modal récapitulatif + consentements
          → POST /api/checkout → redirect Stancer
   ===================================================== */

const BACKEND_URL = 'https://creussite-backend.onrender.com';

async function initPayment() {
  let products;
  try {
    const res = await fetch('/content/products.json');
    products = await res.json();
  } catch (err) {
    console.error('[payment] Impossible de charger products.json :', err);
    return;
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  // ── Éléments du modal ─────────────────────────────────
  const modalOverlay = document.getElementById('payment-modal-overlay');
  const modalProduct = document.getElementById('payment-modal-product');
  const modalPrice = document.getElementById('payment-modal-price');
  const modalBtn = document.getElementById('payment-modal-btn');
  const modalClose = document.getElementById('payment-modal-close');
  const nameInput = document.getElementById('payment-name');
  const emailInput = document.getElementById('payment-email');
  const checkRetract = document.getElementById('check-retractation');
  const checkCgv = document.getElementById('check-cgv');

  let currentProductId = null;

  function formatPrice(centimes) {
    return (centimes / 100).toFixed(2).replace('.', ',') + ' €';
  }

  function updateModalBtn() {
    const nameValid = nameInput.value.trim() !== '';
    const emailValid = emailInput.value.trim() !== '' && emailInput.validity.valid;
    modalBtn.disabled = !(checkRetract.checked && checkCgv.checked && nameValid && emailValid);
  }

  function openModal(productId) {
    const product = productMap[productId];
    if (!product) return;

    currentProductId = productId;
    modalProduct.textContent = product.name;
    modalPrice.textContent = formatPrice(product.price);

    // Réinitialiser les cases à chaque ouverture
    checkRetract.checked = false;
    checkCgv.checked = false;
    nameInput.value = '';
    emailInput.value = '';
    modalBtn.disabled = true;
    modalBtn.textContent = 'Procéder au paiement';

    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
    currentProductId = null;
  }

  // ── Ouvrir le modal au clic sur Commander ─────────────
  document.querySelectorAll('[data-product]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(btn.dataset.product);
    });
  });

  // ── Fermer le modal ───────────────────────────────────
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modalOverlay.hidden) closeModal();
  });

  // ── Activer le bouton quand les deux cases sont cochées ─
  checkRetract.addEventListener('change', updateModalBtn);
  checkCgv.addEventListener('change', updateModalBtn);
  nameInput.addEventListener('input', updateModalBtn);
  emailInput.addEventListener('input', updateModalBtn);

  // ── Procéder au paiement ──────────────────────────────
  modalBtn.addEventListener('click', async function () {
    if (!currentProductId) return;

    modalBtn.textContent = 'Redirection…';
    modalBtn.disabled = true;

    // Feedback si le backend met trop de temps à démarrer (Render cold start)
    const slowTimer = setTimeout(() => {
      modalBtn.textContent = 'Démarrage du serveur…';
    }, 8000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`${BACKEND_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: currentProductId, name: nameInput.value.trim(), email: emailInput.value.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      clearTimeout(slowTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const { url, paymentId, productId } = await res.json();
      // sessionStorage en priorité (fonctionne en navigation privée), localStorage en fallback
      try { if (paymentId) sessionStorage.setItem('stancer_pending_payment', paymentId); } catch (_) {}
      try { if (productId) sessionStorage.setItem('stancer_pending_product', productId); } catch (_) {}
      try { if (paymentId) localStorage.setItem('stancer_pending_payment', paymentId); } catch (_) {}
      try { if (productId) localStorage.setItem('stancer_pending_product', productId); } catch (_) {}
      window.location.href = url;
    } catch (err) {
      clearTimeout(slowTimer);
      console.error('[payment] Erreur :', err.message);
      modalBtn.textContent = 'Procéder au paiement';
      modalBtn.disabled = false;
      const msg = err.name === 'AbortError'
        ? 'Le serveur met trop de temps à répondre. Réessaie dans quelques instants.'
        : 'Une erreur est survenue. Réessaie dans quelques instants.';
      alert(msg);
    }
  });
}

initPayment();

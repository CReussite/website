/* =====================================================
   PAIEMENT — Stripe Checkout Sessions
   Flux : clic Commander → modal récapitulatif + consentements
          → POST /api/checkout → redirect Stripe
   ===================================================== */

const BACKEND_URL = 'https://creussite-backend.onrender.com';

async function initPayment() {
  let products;
  try {
    const res = await fetch('/content/products.json');
    products  = await res.json();
  } catch (err) {
    console.error('[payment] Impossible de charger products.json :', err);
    return;
  }

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // ── Éléments du modal ─────────────────────────────────
  const modalOverlay  = document.getElementById('payment-modal-overlay');
  const modalProduct  = document.getElementById('payment-modal-product');
  const modalPrice    = document.getElementById('payment-modal-price');
  const modalBtn      = document.getElementById('payment-modal-btn');
  const modalClose    = document.getElementById('payment-modal-close');
  const checkRetract  = document.getElementById('check-retractation');
  const checkCgv      = document.getElementById('check-cgv');

  let currentProductId = null;

  function formatPrice(centimes) {
    return (centimes / 100).toFixed(2).replace('.', ',') + ' €';
  }

  function updateModalBtn() {
    modalBtn.disabled = !(checkRetract.checked && checkCgv.checked);
  }

  function openModal(productId) {
    const product = productMap[productId];
    if (!product) return;

    currentProductId = productId;
    modalProduct.textContent = product.name;
    modalPrice.textContent   = formatPrice(product.price);

    // Réinitialiser les cases à chaque ouverture
    checkRetract.checked = false;
    checkCgv.checked     = false;
    modalBtn.disabled    = true;
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

  // ── Procéder au paiement ──────────────────────────────
  modalBtn.addEventListener('click', async function () {
    if (!currentProductId) return;

    modalBtn.textContent = 'Redirection…';
    modalBtn.disabled    = true;

    try {
      const res = await fetch(`${BACKEND_URL}/api/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ product_id: currentProductId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('[payment] Erreur :', err.message);
      modalBtn.textContent = 'Procéder au paiement';
      modalBtn.disabled    = false;
      alert('Une erreur est survenue. Réessaie dans quelques instants.');
    }
  });
}

initPayment();

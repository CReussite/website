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
  const modalOverlay  = document.getElementById('payment-modal-overlay');
  const modalProduct  = document.getElementById('payment-modal-product');
  const modalPrice    = document.getElementById('payment-modal-price');
  const modalBtn      = document.getElementById('payment-modal-btn');
  const modalClose    = document.getElementById('payment-modal-close');
  const nameInput     = document.getElementById('payment-name');
  const emailInput    = document.getElementById('payment-email');
  const checkRetract  = document.getElementById('check-retractation');
  const checkCgv      = document.getElementById('check-cgv');
  // Promo
  const promoInput    = document.getElementById('payment-promo');
  const promoBtnEl    = document.getElementById('payment-promo-btn');
  const promoFeedback = document.getElementById('payment-promo-feedback');

  let currentProductId   = null;
  let appliedPromoCode   = null;   // code validé
  let appliedDiscount    = 0;      // pourcentage
  let finalPriceCents    = null;   // prix après remise (centimes)

  function formatPrice(centimes) {
    return (centimes / 100).toFixed(2).replace('.', ',') + ' €';
  }

  function updatePriceDisplay() {
    if (!currentProductId) return;
    const product = productMap[currentProductId];
    if (appliedDiscount > 0 && finalPriceCents !== null) {
      modalPrice.innerHTML =
        `<span style="text-decoration:line-through;color:#999;font-size:0.9em;">${formatPrice(product.price)}</span>` +
        `&nbsp;<strong style="color:#1a7a3c;">${formatPrice(finalPriceCents)}</strong>` +
        `&nbsp;<span style="background:#e8f5e9;color:#1a7a3c;padding:2px 8px;border-radius:4px;font-size:0.8em;font-weight:700;">−${appliedDiscount} %</span>`;
    } else {
      modalPrice.textContent = formatPrice(product.price);
    }
  }

  function updateModalBtn() {
    const nameValid  = nameInput.value.trim() !== '';
    const emailValid = emailInput.value.trim() !== '' && emailInput.validity.valid;
    modalBtn.disabled = !(checkRetract.checked && checkCgv.checked && nameValid && emailValid);
  }

  function resetPromo() {
    appliedPromoCode = null;
    appliedDiscount  = 0;
    finalPriceCents  = null;
    if (promoInput)    promoInput.value = '';
    if (promoFeedback) { promoFeedback.hidden = true; promoFeedback.textContent = ''; }
    updatePriceDisplay();
  }

  function openModal(productId, prefillPromo) {
    const product = productMap[productId];
    if (!product) return;

    currentProductId = productId;
    modalProduct.textContent = product.name;

    checkRetract.checked = false;
    checkCgv.checked     = false;
    nameInput.value      = '';
    emailInput.value     = '';
    modalBtn.disabled    = true;
    modalBtn.textContent = 'Procéder au paiement';
    resetPromo();

    // Pré-remplir le code promo depuis l'URL (?promo=TOKEN)
    if (prefillPromo && promoInput) {
      promoInput.value = prefillPromo;
      validatePromo(prefillPromo, productId);
    }

    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
    currentProductId = null;
    resetPromo();
  }

  // ── Validation du code promo côté serveur ─────────────
  async function validatePromo(code, productId) {
    if (!code || code.trim().length < 3) return;
    if (promoFeedback) {
      promoFeedback.hidden = false;
      promoFeedback.style.color = '#555';
      promoFeedback.textContent = 'Vérification…';
    }
    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/promo/validate?code=${encodeURIComponent(code)}&product_id=${productId}`
      );
      const data = await resp.json();
      if (data.valid) {
        appliedPromoCode = code.trim();
        appliedDiscount  = data.discount_percent;
        finalPriceCents  = data.discounted_price;
        if (promoFeedback) {
          promoFeedback.hidden = false;
          promoFeedback.style.color = '#1a7a3c';
          promoFeedback.textContent = `Code appliqué : −${appliedDiscount} % (${formatPrice(finalPriceCents)})`;
        }
        updatePriceDisplay();
      } else {
        appliedPromoCode = null;
        appliedDiscount  = 0;
        finalPriceCents  = null;
        if (promoFeedback) {
          promoFeedback.hidden = false;
          promoFeedback.style.color = '#c0392b';
          promoFeedback.textContent = data.error || 'Code invalide.';
        }
        updatePriceDisplay();
      }
    } catch (_) {
      if (promoFeedback) {
        promoFeedback.hidden = false;
        promoFeedback.style.color = '#c0392b';
        promoFeedback.textContent = 'Impossible de vérifier le code.';
      }
    }
  }

  // ── Ouvrir le modal au clic sur Commander ─────────────
  // Lire le code promo depuis l'URL une seule fois
  const urlPromo = new URLSearchParams(window.location.search).get('promo');

  document.querySelectorAll('[data-product]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(btn.dataset.product, urlPromo);
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

  // ── Activer le bouton quand les cases sont cochées ────
  checkRetract.addEventListener('change', updateModalBtn);
  checkCgv.addEventListener('change', updateModalBtn);
  nameInput.addEventListener('input', updateModalBtn);
  emailInput.addEventListener('input', updateModalBtn);

  // ── Bouton "Appliquer" du code promo ──────────────────
  if (promoBtnEl) {
    promoBtnEl.addEventListener('click', function () {
      if (promoInput && currentProductId) {
        validatePromo(promoInput.value, currentProductId);
      }
    });
  }
  if (promoInput) {
    promoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        validatePromo(promoInput.value, currentProductId);
      }
    });
  }

  // ── Procéder au paiement ──────────────────────────────
  modalBtn.addEventListener('click', async function () {
    if (!currentProductId) return;

    modalBtn.textContent = 'Redirection…';
    modalBtn.disabled = true;

    const slowTimer = setTimeout(() => {
      modalBtn.textContent = 'Démarrage du serveur…';
    }, 8000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const body = {
        product_id: currentProductId,
        name:       nameInput.value.trim(),
        email:      emailInput.value.trim(),
      };
      if (appliedPromoCode) body.promo_code = appliedPromoCode;

      const res = await fetch(`${BACKEND_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      clearTimeout(slowTimer);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const { url, paymentId, productId, finalPrice } = await res.json();
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

      if (err.name === 'AbortError') {
        alert('Le serveur met trop de temps à répondre. Réessaie dans quelques instants.');
        return;
      }

      // Erreur liée au code promo (expiré, invalide, déjà utilisé) :
      // afficher dans le bandeau promo + réinitialiser sans alert()
      const isPromoError = err.message && (
        err.message.includes('promo') ||
        err.message.includes('expiré') ||
        err.message.includes('utilisé') ||
        err.message.includes('invalide')
      );

      if (isPromoError && promoFeedback) {
        appliedPromoCode = null;
        appliedDiscount  = 0;
        finalPriceCents  = null;
        updatePriceDisplay();
        promoFeedback.hidden = false;
        promoFeedback.style.color = '#c0392b';
        promoFeedback.textContent = err.message.replace('Code promo invalide : ', '');
        if (promoInput) promoInput.value = '';
      } else {
        alert('Une erreur est survenue. Réessaie dans quelques instants.');
      }
    }
  });
}

initPayment();

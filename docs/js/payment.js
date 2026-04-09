/* =====================================================
   PAIEMENT — Stripe Checkout Sessions
   Source de vérité : /content/products.json
   Backend : BACKEND_URL défini ci-dessous
   ===================================================== */

const BACKEND_URL = 'https://creussite-backend.up.railway.app';

/**
 * Charge le catalogue depuis la source de vérité statique,
 * puis attache les handlers de clic sur les boutons Commander.
 */
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

  document.querySelectorAll('[data-product]').forEach(function (btn) {
    const productId = btn.dataset.product;
    const product   = productMap[productId];
    if (!product) return;

    btn.addEventListener('click', async function (e) {
      e.preventDefault();

      const originalText = btn.textContent;
      btn.textContent = 'Redirection…';
      btn.disabled = true;

      try {
        const res = await fetch(`${BACKEND_URL}/api/checkout`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ product_id: productId }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erreur serveur');
        }

        const { url } = await res.json();
        window.location.href = url;
      } catch (err) {
        console.error('[payment] Erreur :', err.message);
        btn.textContent = originalText;
        btn.disabled = false;
        alert("Une erreur est survenue. Réessaie dans quelques instants.");
      }
    });
  });
}

initPayment();

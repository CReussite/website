/* =====================================================
   CONFIGURATION PRODUITS & PAIEMENT
   Pour ajouter un produit : ajouter une entrée ici,
   un article data-product="clé" dans index.html,
   et le mapping dans backend/services/mailer.js
   ===================================================== */

const PRODUCTS = {
  maths: {
    name:       "Fiches Maths Terminale Spécialité",
    price:      "14,99 €",
    stripeLink: "https://buy.stripe.com/test_3cI3cv6IC3SGeky5KrgnK00",
  },
  physique: {
    name:       "Fiches Physique-Chimie Terminale Spécialité",
    price:      "14,99 €",
    stripeLink: "https://buy.stripe.com/test_14A28r5EygFseky3CjgnK01",
  },
  bundle: {
    name:       "Pack Maths + Physique-Chimie",
    price:      "24,99 €",
    stripeLink: "https://buy.stripe.com/test_00waEX4Au60O3FU3CjgnK02",
  },
};

document.querySelectorAll('[data-product]').forEach(function (btn) {
  const product = PRODUCTS[btn.dataset.product];
  if (!product) return;
  btn.href   = product.stripeLink;
  btn.target = "_blank";
  btn.rel    = "noopener noreferrer";
});

const express = require('express');
const path = require('node:path');
const { validatePromoCode } = require('../services/db');

const router = express.Router();

const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

/**
 * GET /api/promo/validate?code=RENTREE10&product_id=maths
 * Valide un code et retourne le prix remisé pour affichage côté client.
 * Le montant réel sera recalculé côté serveur au checkout — ce résultat
 * est informatif uniquement.
 */
router.get('/validate', async (req, res) => {
  const { code, product_id } = req.query;

  if (!code || code.trim().length < 3) {
    return res.status(400).json({ valid: false, error: 'Code trop court.' });
  }

  const result = await validatePromoCode(code);
  if (!result.valid) {
    return res.json({ valid: false, error: result.error });
  }

  let discountedPrice = null;
  if (product_id) {
    const product = PRODUCT_MAP[product_id];
    if (product) {
      discountedPrice = Math.round(product.price * (1 - result.discountPercent / 100));
    }
  }

  res.json({
    valid: true,
    discount_percent: result.discountPercent,
    discounted_price: discountedPrice,
    type: result.type,
  });
});

module.exports = router;

const express = require('express');
const path = require('node:path');
const { validatePromoCode, markExtraitTokenUsed, insertPendingPayment } = require('../services/db');

const router = express.Router();

const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://c-reussite.fr';
const STANCER_API = 'https://api.stancer.com/v2';

function stancerAuth() {
  return 'Basic ' + Buffer.from(process.env.STANCER_SECRET_KEY + ':').toString('base64');
}

router.post('/', express.json(), async (req, res) => {
  const { product_id, name, email, promo_code } = req.body;

  const product = PRODUCT_MAP[product_id];
  if (!product) {
    return res.status(400).json({ error: `Produit inconnu : ${product_id}` });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  // Calcul du montant : prix catalogue, remisé si code valide
  let finalAmount = product.price;
  let discountPercent = 0;
  let promoType = null;
  let promoToken = null;
  let appliedCode = null;

  if (promo_code && promo_code.trim()) {
    const promoResult = await validatePromoCode(promo_code);
    if (!promoResult.valid) {
      return res.status(400).json({ error: `Code promo invalide : ${promoResult.error}` });
    }
    discountPercent = promoResult.discountPercent;
    promoType = promoResult.type;
    finalAmount = Math.round(product.price * (1 - discountPercent / 100));
    appliedCode = promoResult.code || promo_code.trim();
    if (promoType === 'extrait') promoToken = promoResult.token;
  }

  try {
    const response = await fetch(`${STANCER_API}/payments/`, {
      method: 'POST',
      headers: {
        Authorization: stancerAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency: 'eur',
        description: product.name,
        capture: true,
        order_id: `CRE-${Date.now()}`,
        customer: { ...(name ? { name: name.trim() } : {}), email },
        return_url: `${FRONTEND_URL}/success.html`,
        auth: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[checkout] Stancer API error:', response.status, JSON.stringify(err), '| email:', email, '| product:', product_id);
      throw new Error(err.message || `Stancer ${response.status}`);
    }

    const payment = await response.json();
    console.log('[checkout] Paiement créé:', payment.id, '| product:', product_id, '| email:', email, '| montant:', finalAmount, '| promo:', appliedCode || 'aucun');

    // Enregistrer en base pour la réconciliation Stancer
    await insertPendingPayment({
      paymentId:        payment.id,
      productId:        product_id,
      email,
      promoCode:        appliedCode,
      originalAmount:   product.price,
      discountedAmount: finalAmount,
    });

    // Marquer le token EXTRAIT15 comme utilisé dès le checkout (usage unique)
    if (promoType === 'extrait' && promoToken) {
      await markExtraitTokenUsed(promoToken).catch(e =>
        console.warn('[checkout] markExtraitTokenUsed failed:', e.message)
      );
    }

    const paymentUrl = `https://payment.stancer.com/${process.env.STANCER_PUBLIC_KEY}/${payment.id}`;

    res.json({
      url: paymentUrl,
      paymentId: payment.id,
      productId: product_id,
      originalPrice: product.price,
      finalPrice: finalAmount,
      discountPercent,
    });
  } catch (err) {
    console.error('[checkout] Erreur création paiement Stancer :', err.message, '| email:', email, '| product:', product_id);
    res.status(500).json({ error: 'Impossible de créer la session de paiement.' });
  }
});

module.exports = router;

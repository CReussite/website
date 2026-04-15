const express = require('express');
const path = require('node:path');

const router = express.Router();

// Chargement unique du catalogue depuis la source de vérité
const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://c-reussite.fr';
const STANCER_API = 'https://api.stancer.com/v2';

function stancerAuth() {
  return 'Basic ' + Buffer.from(process.env.STANCER_SECRET_KEY + ':').toString('base64');
}

router.post('/', express.json(), async (req, res) => {
  const { product_id, email } = req.body;

  const product = PRODUCT_MAP[product_id];
  if (!product) {
    return res.status(400).json({ error: `Produit inconnu : ${product_id}` });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  try {
    const response = await fetch(`${STANCER_API}/payments/`, {
      method: 'POST',
      headers: {
        Authorization: stancerAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: product.price,
        currency: 'eur',
        description: product.name,
        capture: true,
        customer: { email },
        return_url: `${FRONTEND_URL}/success.html`,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[checkout] Stancer API error:', response.status, JSON.stringify(err));
      throw new Error(err.message || `Stancer ${response.status}`);
    }

    const payment = await response.json();
    const paymentUrl = `https://payment.stancer.com/${process.env.STANCER_PUBLIC_KEY}/${payment.id}`;

    res.json({ url: paymentUrl, paymentId: payment.id, productId: product_id });
  } catch (err) {
    console.error('[checkout] Erreur création paiement Stancer :', err.message);
    res.status(500).json({ error: 'Impossible de créer la session de paiement.' });
  }
});

module.exports = router;

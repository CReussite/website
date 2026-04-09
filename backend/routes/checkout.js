const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path    = require('path');

const router = express.Router();

// Chargement unique du catalogue depuis la source de vérité
const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://c-reussite.fr';

router.post('/', express.json(), async (req, res) => {
  const { product_id } = req.body;

  const product = PRODUCT_MAP[product_id];
  if (!product) {
    return res.status(400).json({ error: `Produit inconnu : ${product_id}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: product.name },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      metadata: { product_id },
      customer_email: undefined, // Stripe collecte l'email
      success_url: `${FRONTEND_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${FRONTEND_URL}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Erreur création session :', err.message);
    res.status(500).json({ error: 'Impossible de créer la session de paiement.' });
  }
});

module.exports = router;

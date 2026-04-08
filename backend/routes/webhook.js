const express  = require('express');
const { sendPDF } = require('../services/mailer');

const router = express.Router();

// Stripe exige le body brut (non parsé) pour vérifier la signature
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Récupérer les line items pour connaître le produit acheté
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ['data.price.product'] });
      const customerEmail = session.customer_details?.email || session.customer_email;

      for (const item of lineItems.data) {
        const productId = item.price?.product?.id;
        if (productId && customerEmail) {
          await sendPDF(customerEmail, productId);
        }
      }
    } catch (err) {
      console.error('[webhook] Erreur envoi PDF :', err.message);
      // On répond 200 à Stripe pour éviter les retries, mais on log l'erreur
    }
  }

  res.json({ received: true });
});

module.exports = router;

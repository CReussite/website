const express  = require('express');
const path     = require('path');
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { insertOrderIdempotent } = require('../services/db');
const { generateInvoice }       = require('../services/invoice');
const { sendOrderEmail }        = require('../services/mailer');

const router = express.Router();

// Source de vérité produits
const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
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
    const customerEmail = session.customer_details?.email || session.customer_email;
    const productId     = session.metadata?.product_id;
    const amount        = session.amount_total; // en centimes

    if (!customerEmail || !productId) {
      console.error('[webhook] Données manquantes — email:', customerEmail, 'product_id:', productId);
      return res.json({ received: true });
    }

    const product = PRODUCT_MAP[productId];
    if (!product) {
      console.error('[webhook] Produit inconnu :', productId);
      return res.json({ received: true });
    }

    try {
      // 1. Sauvegarder en DB (idempotent)
      const { invoiceNumber, isNew } = await insertOrderIdempotent({
        email: customerEmail,
        productId,
        amount,
        stripeSessionId: session.id,
      });

      if (!isNew) {
        console.log(`[webhook] Session déjà traitée : ${session.id}`);
        return res.json({ received: true });
      }

      // 2. Générer la facture PDF
      const invoicePdf = await generateInvoice({
        invoiceNumber,
        email: customerEmail,
        productName: product.name,
        amount,
        date: new Date(),
      });

      // 3. Envoyer email (PDF produit(s) + facture)
      await sendOrderEmail({
        toEmail:       customerEmail,
        product,
        invoicePdf,
        invoiceNumber,
      });

      console.log(`[webhook] Commande ${invoiceNumber} traitée — ${customerEmail} — ${product.name}`);
    } catch (err) {
      console.error('[webhook] Erreur traitement :', err.message);
      // Répondre 500 pour que Stripe réessaie
      return res.status(500).send('Internal error');
    }
  }

  res.json({ received: true });
});

module.exports = router;

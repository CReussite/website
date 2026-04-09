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
      // 1. Sauvegarder en DB (idempotent via stripe_session_id UNIQUE)
      const { invoiceNumber, isNew, order } = await insertOrderIdempotent({
        email: customerEmail,
        productId,
        amount,
        stripeSessionId: session.id,
      });

      if (!isNew) {
        // Session déjà traitée : l'email a peut-être échoué avant,
        // on retente l'envoi si email_sent n'est pas marqué
        if (!order.email_sent) {
          console.log(`[webhook] Retry email pour session déjà en DB : ${session.id}`);
          // Pas de retour anticipé — on continue pour renvoyer l'email
        } else {
          console.log(`[webhook] Session déjà complètement traitée : ${session.id}`);
          return res.json({ received: true });
        }
      }

      // 2. Générer la facture PDF (en mémoire, pas stockée)
      const invoicePdf = await generateInvoice({
        invoiceNumber,
        email: customerEmail,
        productName: product.name,
        amount,
        date: new Date(order?.created_at || Date.now()),
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
      // Retourner 500 → Stripe retentera (utile si email temporairement indisponible)
      return res.status(500).send('Internal error');
    }
  }

  res.json({ received: true });
});

module.exports = router;

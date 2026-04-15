const express = require('express');
const path = require('node:path');
const {
  insertOrderIdempotent,
  markEmailSent,
  uploadInvoicePdf,
  saveInvoicePath,
} = require('../services/db');
const { generateInvoice } = require('../services/invoice');
const { sendOrderEmail } = require('../services/mailer');
const { sendOpsAlert } = require('../services/alerts');

const router = express.Router();

// Source de vérité produits
const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const STANCER_API = 'https://api.stancer.com/v2';

function stancerAuth() {
  return 'Basic ' + Buffer.from(process.env.STANCER_SECRET_KEY + ':').toString('base64');
}

/** Vérifie et récupère le paiement Stancer depuis l'API (source de vérité). */
async function fetchStancerPayment(paymentId) {
  const response = await fetch(`${STANCER_API}/payments/${paymentId}`, {
    headers: { Authorization: stancerAuth() },
  });
  if (!response.ok) throw new Error(`Stancer API ${response.status}`);
  return response.json();
}

router.post('/', express.json(), async (req, res) => {
  const event = req.body;

  // Stancer envoie les événements sous la forme { payment: { id, status, ... } }
  if (!event?.payment) {
    return res.status(400).send('Payload invalide');
  }

  const { payment: webhookPayment } = event;

  // Vérifier le paiement côté Stancer (source de vérité)
  let payment;
  try {
    payment = await fetchStancerPayment(webhookPayment.id);
  } catch (err) {
    console.error('[webhook] Impossible de vérifier le paiement Stancer :', err.message);
    return res.status(400).send('Vérification paiement échouée');
  }

  const VALID_STATUSES = ['captured', 'to_capture', 'capture_sent'];
  if (!VALID_STATUSES.includes(payment.status)) {
    // Paiement non finalisé — ignorer silencieusement
    return res.json({ received: true });
  }

  const customerEmail = payment.customer?.email || payment.metadata?.email;
  const customerName = payment.customer?.name || customerEmail;
  const productId = payment.metadata?.product_id;
  const amount = payment.amount; // en centimes

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
    // 1. Sauvegarder en DB (idempotent via payment_session_id UNIQUE)
    const { invoiceNumber, isNew, order } = await insertOrderIdempotent({
      email: customerEmail,
      productId,
      amount,
      paymentSessionId: payment.id,
    });

    if (isNew === false) {
      if (order.email_sent) {
        console.log(`[webhook] Paiement déjà complètement traité : ${payment.id}`);
        return res.json({ received: true });
      }
      console.log(`[webhook] Retry email pour paiement déjà en DB : ${payment.id}`);
    }

    // 2. Générer la facture PDF (en mémoire)
    const invoicePdf = await generateInvoice({
      invoiceNumber,
      email: customerEmail,
      productName: product.name,
      amount,
      date: new Date(order?.created_at || Date.now()),
      paymentRef: payment.id,
    });

    // 3. Envoyer email (PDF produit(s) + facture)
    await sendOrderEmail({
      toEmail: customerEmail,
      customerName,
      product,
      invoicePdf,
      invoiceNumber,
      amount,
      orderDate: new Date(order?.created_at || Date.now()),
    });

    // 4. Marquer l'email comme envoyé
    await markEmailSent(payment.id);

    // 5. Archiver la facture dans Supabase Storage (non bloquant)
    const invoicePath = await uploadInvoicePdf(invoiceNumber, invoicePdf);
    if (invoicePath) await saveInvoicePath(payment.id, invoicePath);

    console.log(`[webhook] Commande ${invoiceNumber} traitée — ${customerEmail} — ${product.name}`);
  } catch (err) {
    console.error('[webhook] Erreur traitement :', err.message);
    try {
      await sendOpsAlert({
        subject: 'Echec traitement commande Stancer',
        message: "Le traitement d'une commande a echoue dans le webhook Stancer.",
        details: {
          error: err.message,
          payment_session_id: payment.id,
          customer_email: customerEmail,
          product_id: productId,
          amount,
        },
      });
    } catch (alertErr) {
      console.error('[webhook] Echec envoi alerte :', alertErr.message);
    }
    return res.status(500).send('Internal error');
  }

  res.json({ received: true });
});

module.exports = router;

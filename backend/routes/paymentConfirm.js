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

const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const STANCER_API = 'https://api.stancer.com/v2';

function stancerAuth() {
  return 'Basic ' + Buffer.from(process.env.STANCER_SECRET_KEY + ':').toString('base64');
}

/**
 * GET /api/payment/confirm?id=pay_xxx
 * Appelé par success.html après le retour de la page Stancer.
 * Vérifie le paiement, déclenche l'email, retourne { success, invoiceNumber }.
 */
router.get('/', express.json(), async (req, res) => {
  const { id: paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Paramètre id manquant.' });
  }

  // Vérifier le paiement auprès de Stancer
  let payment;
  try {
    const response = await fetch(`${STANCER_API}/payments/${paymentId}`, {
      headers: { Authorization: stancerAuth() },
    });
    if (!response.ok) throw new Error(`Stancer API ${response.status}`);
    payment = await response.json();
  } catch (err) {
    console.error('[payment-confirm] Erreur vérification Stancer :', err.message);
    return res
      .status(502)
      .json({ error: 'Impossible de vérifier le paiement.', debug: err.message });
  }

  const VALID_STATUSES = ['captured', 'to_capture', 'capture_sent'];
  if (!VALID_STATUSES.includes(payment.status)) {
    return res.status(402).json({
      error: `Paiement non finalisé (statut : ${payment.status}).`,
      debug: `status=${payment.status}`,
    });
  }

  console.log('[payment-confirm] Stancer payment.customer:', JSON.stringify(payment.customer));
  console.log(
    '[payment-confirm] Stancer payment status:',
    payment.status,
    '| amount:',
    payment.amount,
  );

  // Stancer peut retourner customer comme objet { email } ou string (ID)
  let customerEmail = null;
  if (typeof payment.customer === 'object' && payment.customer?.email) {
    customerEmail = payment.customer.email;
  } else if (typeof payment.customer === 'string') {
    // customer est un ID — récupérer l'email via GET /v2/customers/{id}
    try {
      const custResp = await fetch(`${STANCER_API}/customers/${payment.customer}`, {
        headers: { Authorization: stancerAuth() },
      });
      if (custResp.ok) {
        const custData = await custResp.json();
        customerEmail = custData.email;
        console.log('[payment-confirm] Fetched customer email via API:', customerEmail);
      }
    } catch (e) {
      console.error('[payment-confirm] Failed to fetch customer:', e.message);
    }
  }
  const customerName =
    (typeof payment.customer === 'object' ? payment.customer?.name : null) || customerEmail;
  const amount = payment.amount;

  // product_id passé par le frontend via localStorage (Stancer n'a pas de champ metadata)
  const productId = req.query.product_id;

  if (!customerEmail) {
    console.error(
      '[payment-confirm] Email client manquant. payment.customer =',
      JSON.stringify(payment.customer),
    );
    return res.status(422).json({
      error: 'Email client introuvable dans le paiement Stancer.',
      debug: `customer=${JSON.stringify(payment.customer)}`,
    });
  }

  if (!productId) {
    console.error('[payment-confirm] product_id manquant');
    return res.status(422).json({ error: 'Données de commande incomplètes.' });
  }

  const product = PRODUCT_MAP[productId];
  if (!product) {
    return res.status(422).json({ error: `Produit inconnu : ${productId}` });
  }

  // Validation anti-fraude : le montant Stancer doit correspondre au prix catalogue
  if (amount !== product.price) {
    console.error('[payment-confirm] Montant incohérent :', { amount, expected: product.price });
    return res.status(422).json({
      error: 'Montant du paiement incohérent.',
      debug: `got=${amount} expected=${product.price}`,
    });
  }

  try {
    const { invoiceNumber, isNew, order } = await insertOrderIdempotent({
      email: customerEmail,
      productId,
      amount,
      paymentSessionId: paymentId,
    });

    if (isNew === false && order.email_sent) {
      // Déjà traité — on renvoie juste le succès (idempotent)
      return res.json({ success: true, invoiceNumber, alreadySent: true });
    }

    const invoicePdf = await generateInvoice({
      invoiceNumber,
      email: customerEmail,
      productName: product.name,
      amount,
      date: new Date(order?.created_at || Date.now()),
      paymentRef: paymentId,
    });

    await sendOrderEmail({
      toEmail: customerEmail,
      customerName,
      product,
      invoicePdf,
      invoiceNumber,
      amount,
      orderDate: new Date(order?.created_at || Date.now()),
    });

    await markEmailSent(paymentId);

    const invoicePath = await uploadInvoicePdf(invoiceNumber, invoicePdf);
    if (invoicePath) await saveInvoicePath(paymentId, invoicePath);

    console.log(`[payment-confirm] Commande ${invoiceNumber} traitée — ${customerEmail}`);
    res.json({ success: true, invoiceNumber });
  } catch (err) {
    console.error('[payment-confirm] Erreur traitement :', err.message);
    try {
      await sendOpsAlert({
        subject: 'Echec traitement commande Stancer',
        message: "Le traitement d'une commande a echoue dans payment-confirm.",
        details: {
          error: err.message,
          payment_session_id: paymentId,
          customer_email: customerEmail,
          product_id: productId,
          amount,
        },
      });
    } catch (_) {}
    res.status(500).json({
      error: 'Erreur lors du traitement de ta commande. Écris-nous à contact@c-reussite.fr.',
      debug: err.message,
    });
  }
});

module.exports = router;

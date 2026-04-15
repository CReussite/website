const express = require('express');
const path    = require('node:path');
const { insertOrderIdempotent, markEmailSent, uploadInvoicePdf, saveInvoicePath } = require('../services/db');
const { generateInvoice } = require('../services/invoice');
const { sendOrderEmail }  = require('../services/mailer');
const { sendOpsAlert }    = require('../services/alerts');

const router = express.Router();

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const STANCER_API = 'https://api.stancer.com/v1';

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
    const response = await fetch(`${STANCER_API}/payment/${paymentId}`, {
      headers: { Authorization: stancerAuth() },
    });
    if (!response.ok) throw new Error(`Stancer API ${response.status}`);
    payment = await response.json();
  } catch (err) {
    console.error('[payment-confirm] Erreur vérification Stancer :', err.message);
    return res.status(502).json({ error: 'Impossible de vérifier le paiement.' });
  }

  if (payment.status !== 'captured') {
    return res.status(402).json({ error: `Paiement non finalisé (statut : ${payment.status}).` });
  }

  const customerEmail = payment.customer?.email || payment.metadata?.email;
  const customerName  = payment.customer?.name  || customerEmail;
  const productId     = payment.metadata?.product_id;
  const amount        = payment.amount;

  if (!customerEmail || !productId) {
    console.error('[payment-confirm] Données manquantes :', { customerEmail, productId });
    return res.status(422).json({ error: 'Données de commande incomplètes.' });
  }

  const product = PRODUCT_MAP[productId];
  if (!product) {
    return res.status(422).json({ error: `Produit inconnu : ${productId}` });
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
      toEmail:      customerEmail,
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
        details: { error: err.message, payment_session_id: paymentId, customer_email: customerEmail, product_id: productId, amount },
      });
    } catch (_) {}
    res.status(500).json({ error: 'Erreur lors du traitement de ta commande. Écris-nous à contact@c-reussite.fr.' });
  }
});

module.exports = router;

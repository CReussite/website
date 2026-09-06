const path = require('node:path');
const {
  getUnconfirmedPayments,
  confirmPendingPayment,
  insertOrderIdempotent,
  markEmailSent,
  uploadInvoicePdf,
  saveInvoicePath,
  countReferralSales,
} = require('./db');
const { generateInvoice } = require('./invoice');
const { sendOrderEmail } = require('./mailer');
const { sendOpsAlert } = require('./alerts');

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const STANCER_API        = 'https://api.stancer.com/v2';
const REFERRAL_THRESHOLD = 5;

function stancerAuth() {
  return 'Basic ' + Buffer.from(process.env.STANCER_SECRET_KEY + ':').toString('base64');
}

/**
 * Récupère et traite un paiement Stancer non encore confirmé par success.html.
 * Appelé par le cron horaire pour couvrir les cas où le client ferme l'onglet.
 */
async function processPendingPayment(pending) {
  const { payment_id, product_id, promo_code, original_amount, discounted_amount } = pending;

  let payment;
  try {
    const resp = await fetch(`${STANCER_API}/payments/${payment_id}`, {
      headers: { Authorization: stancerAuth() },
    });
    if (!resp.ok) throw new Error(`Stancer ${resp.status}`);
    payment = await resp.json();
  } catch (e) {
    console.warn(`[stancer-sync] Impossible de vérifier ${payment_id}: ${e.message}`);
    return;
  }

  const VALID_STATUSES = ['captured', 'to_capture', 'capture_sent'];
  if (!VALID_STATUSES.includes(payment.status)) return;

  const product = PRODUCT_MAP[product_id];
  if (!product) {
    console.warn(`[stancer-sync] Produit inconnu pour ${payment_id}: ${product_id}`);
    return;
  }

  // Récupérer l'email client
  let customerEmail = null;
  if (typeof payment.customer === 'object' && payment.customer?.email) {
    customerEmail = payment.customer.email;
  } else if (typeof payment.customer === 'string') {
    try {
      const custResp = await fetch(`${STANCER_API}/customers/${payment.customer}`, {
        headers: { Authorization: stancerAuth() },
      });
      if (custResp.ok) customerEmail = (await custResp.json()).email;
    } catch (_) {}
  }

  if (!customerEmail) {
    console.warn(`[stancer-sync] Email introuvable pour ${payment_id}`);
    return;
  }

  const discountPct = original_amount > 0
    ? Math.round((1 - discounted_amount / original_amount) * 100)
    : 0;

  try {
    const { invoiceNumber, isNew, order } = await insertOrderIdempotent({
      email:           customerEmail,
      productId:       product_id,
      amount:          payment.amount,
      paymentSessionId: payment_id,
      promoCode:       promo_code,
      discountPercent: discountPct,
      originalAmount:  original_amount,
    });

    if (!isNew && order?.email_sent) {
      await confirmPendingPayment(payment_id);
      return;
    }

    const invoicePdf = await generateInvoice({
      invoiceNumber,
      email: customerEmail,
      productName: product.name,
      amount: payment.amount,
      date: new Date(order?.created_at || Date.now()),
      paymentRef: payment_id,
    });

    await sendOrderEmail({
      toEmail: customerEmail,
      customerName: customerEmail,
      product,
      invoicePdf,
      invoiceNumber,
      amount: payment.amount,
      orderDate: new Date(order?.created_at || Date.now()),
    });

    await markEmailSent(payment_id);
    await confirmPendingPayment(payment_id);

    const invoicePath = await uploadInvoicePdf(invoiceNumber, invoicePdf);
    if (invoicePath) await saveInvoicePath(payment_id, invoicePath);

    if (promo_code) {
      const count = await countReferralSales(promo_code);
      if (count === REFERRAL_THRESHOLD) {
        await sendOpsAlert({
          subject: `Parrainage : ${promo_code} a atteint ${REFERRAL_THRESHOLD} ventes`,
          message: `Le code élève ${promo_code} vient d'atteindre ${REFERRAL_THRESHOLD} ventes valides (réconciliation Stancer). Offrir 1h de cours particulier.`,
          details: { promo_code, last_buyer: customerEmail, valid_sales: count },
        });
      }
    }

    console.log(`[stancer-sync] Commande ${invoiceNumber} réconciliée — ${customerEmail}`);
  } catch (e) {
    console.error(`[stancer-sync] Erreur traitement ${payment_id}:`, e.message);
  }
}

/**
 * Lance la réconciliation pour tous les paiements non confirmés depuis > 30 min.
 * Appelé toutes les heures par le cron dans server.js.
 */
async function syncUnconfirmedPayments() {
  if (!process.env.STANCER_SECRET_KEY) return;

  let pendings;
  try {
    pendings = await getUnconfirmedPayments();
  } catch (e) {
    console.warn('[stancer-sync] getUnconfirmedPayments failed:', e.message);
    return;
  }

  if (pendings.length === 0) return;

  console.log(`[stancer-sync] ${pendings.length} paiement(s) non confirmé(s) à vérifier`);
  for (const p of pendings) {
    await processPendingPayment(p);
  }
}

module.exports = { syncUnconfirmedPayments };

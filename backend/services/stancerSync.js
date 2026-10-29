const path = require('node:path');
const {
  getUnconfirmedPayments,
  confirmPendingPayment,
  insertOrderIdempotent,
  markEmailSent,
  uploadInvoicePdf,
  saveInvoicePath,
  countReferralSales,
  getStuckOrders,
  getAdminSettings,
  setAdminSetting,
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
    // 404 = paiement inconnu de Stancer (réseau test, paiement annulé, etc.)
    // On le marque confirmé pour stopper les retentatives
    if (resp.status === 404) {
      console.warn(`[stancer-sync] Paiement ${payment_id} introuvable sur Stancer (404) — marqué abandonné`);
      await confirmPendingPayment(payment_id);
      return;
    }
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

const STUCK_ALERTED_KEY = 'stuck_orders_alerted';

/**
 * Alerte par email (ALERT_EMAIL) si des commandes payées restent non livrées :
 * email non parti depuis plus d'une heure, donc après que la réconciliation
 * horaire a déjà tenté de les traiter. Message métier explicite ("commande payée
 * non livrée") plutôt que le signal "down" ambigu du health check.
 *
 * Anti-spam : ne signale chaque commande qu'une seule fois. La liste des commandes
 * déjà signalées est persistée dans admin_settings et réduite aux commandes encore
 * bloquées (pour re-signaler uniquement si un nouveau problème apparaît).
 */
async function alertStuckOrders() {
  let stuck;
  try {
    stuck = await getStuckOrders({ minAgeMinutes: 60 });
  } catch (e) {
    console.warn('[stuck-alert] getStuckOrders failed:', e.message);
    return;
  }

  const stuckIds = stuck.map(o => o.payment_session_id);

  let alreadyAlerted = [];
  try {
    const settings = await getAdminSettings();
    if (settings[STUCK_ALERTED_KEY]) alreadyAlerted = JSON.parse(settings[STUCK_ALERTED_KEY]);
  } catch (e) {
    console.warn('[stuck-alert] lecture admin_settings échouée:', e.message);
  }

  const newStuck = stuck.filter(o => !alreadyAlerted.includes(o.payment_session_id));

  if (newStuck.length > 0) {
    await sendOpsAlert({
      subject: `${newStuck.length} commande(s) payée(s) non livrée(s)`,
      message: "Des clients ont payé mais n'ont pas reçu leur email avec les fiches (échec d'envoi persistant depuis plus d'une heure, malgré la réconciliation automatique). À traiter manuellement depuis l'admin.",
      details: {
        commandes: newStuck
          .map(o => `${o.invoice_number} — ${o.email} — ${(o.amount / 100).toFixed(2)} € — ${o.product_id}`)
          .join('\n'),
      },
    }).catch(e => console.error('[stuck-alert] sendOpsAlert failed:', e.message));
    console.log(`[stuck-alert] ${newStuck.length} commande(s) bloquée(s) signalée(s)`);
  }

  // Ne garder que les commandes encore bloquées : une commande résolue sort de
  // la liste et pourra re-déclencher une alerte si elle se re-bloquait.
  try {
    await setAdminSetting(STUCK_ALERTED_KEY, JSON.stringify(stuckIds));
  } catch (e) {
    console.warn('[stuck-alert] écriture admin_settings échouée:', e.message);
  }
}

module.exports = { syncUnconfirmedPayments, alertStuckOrders };

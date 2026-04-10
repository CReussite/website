const { createClient } = require('@supabase/supabase-js');

let _supabase = null;
function getClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

/**
 * Insère une commande si elle n'existe pas déjà (idempotence via stripe_session_id).
 * Retourne { order, invoiceNumber, isNew }
 *   - isNew = false si la session était déjà en base (retry Stripe)
 */
async function insertOrderIdempotent({ email, productId, amount, stripeSessionId }) {
  const supabase = getClient();

  // Vérifier si la session existe déjà
  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (existing) {
    return { order: existing, invoiceNumber: existing.invoice_number, isNew: false };
  }

  // Calculer le prochain numéro de facture (YYYY-XXX)
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${year}-%`);

  const seq = String((count || 0) + 1).padStart(3, '0');
  const invoiceNumber = `${year}-${seq}`;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      email,
      product_id: productId,
      amount,
      stripe_session_id: stripeSessionId,
      invoice_number: invoiceNumber,
    })
    .select()
    .single();

  if (error) throw new Error(`DB insert failed: ${error.message}`);

  return { order, invoiceNumber, isNew: true };
}

/**
 * Marque l'email comme envoyé pour une commande donnée.
 */
async function markEmailSent(stripeSessionId) {
  const supabase = getClient();
  const { error } = await supabase
    .from('orders')
    .update({ email_sent: true })
    .eq('stripe_session_id', stripeSessionId);
  if (error) throw new Error(`DB markEmailSent failed: ${error.message}`);
}

/**
 * Retourne les commandes, triées par date décroissante.
 * @param {object} opts
 * @param {number}  [opts.year]   - filtre sur l'année (ex: 2026)
 * @param {number}  [opts.limit]  - nombre max de résultats (défaut: 1000)
 */
async function getOrders({ year, limit = 1000 } = {}) {
  const supabase = getClient();
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (year) query = query.like('invoice_number', `${year}-%`);

  const { data, error } = await query;
  if (error) throw new Error(`DB getOrders failed: ${error.message}`);
  return data;
}

/**
 * Upload le PDF de facture dans Supabase Storage (bucket "invoices").
 * Non bloquant : retourne null si le bucket n'existe pas encore.
 */
async function uploadInvoicePdf(invoiceNumber, pdfBuffer) {
  const supabase = getClient();
  const year     = invoiceNumber.split('-')[0];
  const filePath = `${year}/${invoiceNumber}.pdf`;

  const { error } = await supabase.storage
    .from('invoices')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  if (error) {
    console.warn(`[storage] Upload facture ignoré (${error.message})`);
    return null;
  }
  return filePath;
}

/**
 * Sauvegarde le chemin du PDF facture dans la commande.
 */
async function saveInvoicePath(stripeSessionId, invoicePath) {
  const supabase = getClient();
  const { error } = await supabase
    .from('orders')
    .update({ invoice_path: invoicePath })
    .eq('stripe_session_id', stripeSessionId);
  if (error) console.warn(`[storage] saveInvoicePath échoué : ${error.message}`);
}

module.exports = { getClient, insertOrderIdempotent, markEmailSent, getOrders, uploadInvoicePdf, saveInvoicePath };

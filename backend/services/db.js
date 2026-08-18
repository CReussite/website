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
 * Insère une commande si elle n'existe pas déjà (idempotence via payment_session_id).
 * Retourne { order, invoiceNumber, isNew }
 *   - isNew = false si la session était déjà en base (retry Stancer)
 */
async function insertOrderIdempotent({ email, productId, amount, paymentSessionId }) {
  const supabase = getClient();

  // Vérifier si la session existe déjà
  const { data: existing } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_session_id', paymentSessionId)
    .maybeSingle();

  if (existing) {
    return { order: existing, invoiceNumber: existing.invoice_number, isNew: false };
  }

  // Numérotation unifiée : compte ebooks + CP pour éviter toute collision
  const year = new Date().getFullYear();
  const [{ count: ebookCount }, { count: cpCount }] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).like('invoice_number', `CRE-${year}-%`),
    supabase.from('cp_invoices').select('*', { count: 'exact', head: true }).like('invoice_number', `CRE-${year}-%`),
  ]);

  const seq = String((ebookCount || 0) + (cpCount || 0) + 1).padStart(5, '0');
  const invoiceNumber = `CRE-${year}-${seq}`;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      email,
      product_id: productId,
      amount,
      payment_session_id: paymentSessionId,
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
async function markEmailSent(paymentSessionId) {
  const supabase = getClient();
  const { error } = await supabase
    .from('orders')
    .update({ email_sent: true })
    .eq('payment_session_id', paymentSessionId);
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
    .neq('product_id', 'cours_particuliers')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (year) query = query.or(`invoice_number.like.${year}-%,invoice_number.like.CRE-${year}-%`);

  const { data, error } = await query;
  if (error) throw new Error(`DB getOrders failed: ${error.message}`);
  return data;
}

/**
 * Retourne les statistiques admin calculées depuis la table orders.
 * @param {object} opts
 * @param {number} [opts.year] - filtre sur l'année (ex: 2026)
 */
async function getAdminStats({ year } = {}) {
  const supabase = getClient();
  let query = supabase
    .from('orders')
    .select('email, amount, email_sent, invoice_number')
    .neq('product_id', 'cours_particuliers');

  if (year) query = query.or(`invoice_number.like.${year}-%,invoice_number.like.CRE-${year}-%`);

  const { data, error } = await query;
  if (error) throw new Error(`DB getAdminStats failed: ${error.message}`);

  let extractQuery = supabase
    .from('extract_requests')
    .select('email, sent_at');

  if (year) {
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;
    extractQuery = extractQuery.gte('sent_at', start).lt('sent_at', end);
  }

  const { data: extracts, error: extractsError } = await extractQuery;
  if (extractsError && extractsError.code !== 'PGRST205') {
    throw new Error(`DB getAdminStats extracts failed: ${extractsError.message}`);
  }

  const uniqueEmails = new Set();
  let totalRevenue = 0;
  let sentOrders = 0;

  for (const order of data) {
    totalRevenue += Number(order.amount || 0);
    if (order.email) uniqueEmails.add(String(order.email).trim().toLowerCase());
    if (order.email_sent) sentOrders += 1;
  }

  const uniqueExtractEmails = new Set();
  for (const extract of extracts || []) {
    if (extract.email) uniqueExtractEmails.add(String(extract.email).trim().toLowerCase());
  }

  return {
    total_orders: data.length,
    total_revenue: totalRevenue,
    unique_emails: uniqueEmails.size,
    sent_orders: sentOrders,
    pending_orders: data.length - sentOrders,
    extract_requests: (extracts || []).length,
    extract_emails: uniqueExtractEmails.size,
  };
}

async function insertExtractRequest({ email, productId, source = 'website' }) {
  const supabase = getClient();
  const { error } = await supabase
    .from('extract_requests')
    .insert({
      email,
      product_id: productId,
      source,
    });

  if (error) throw new Error(`DB insertExtractRequest failed: ${error.message}`);
}

async function getExtractRequests({ year, limit = 200 } = {}) {
  const supabase = getClient();
  let query = supabase
    .from('extract_requests')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (year) {
    const start = `${year}-01-01T00:00:00.000Z`;
    const end = `${year + 1}-01-01T00:00:00.000Z`;
    query = query.gte('sent_at', start).lt('sent_at', end);
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw new Error(`DB getExtractRequests failed: ${error.message}`);
  }
  return data;
}

/**
 * Upload le PDF de facture dans Supabase Storage (bucket "invoices").
 * Non bloquant : retourne null si le bucket n'existe pas encore.
 */
async function uploadInvoicePdf(invoiceNumber, pdfBuffer) {
  const supabase = getClient();
  // Extraire l'année du numéro de facture (CRE-2026-00001 → 2026, ou 2026-001 → 2026)
  const yearMatch = invoiceNumber.match(/(\d{4})/);
  const year      = yearMatch ? yearMatch[1] : new Date().getFullYear();
  const filePath  = `${year}/${invoiceNumber}.pdf`;

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
async function saveInvoicePath(paymentSessionId, invoicePath) {
  const supabase = getClient();
  const { error } = await supabase
    .from('orders')
    .update({ invoice_path: invoicePath })
    .eq('payment_session_id', paymentSessionId);
  if (error) console.warn(`[storage] saveInvoicePath échoué : ${error.message}`);
}

/**
 * Crée une facture de cours particuliers dans la table cp_invoices.
 * Numérotation indépendante CRE-YYYY-NNNNN, sans impact sur le compteur ebooks.
 */
async function insertCoursParticuliersInvoice({
  customerName,
  customerEmail,
  customerAddress,
  items,
  paymentDate,
  paymentMethod,
  rib,
}) {
  const supabase = getClient();

  const year = new Date().getFullYear();
  const [{ count: cpCount }, { count: ebookCount }] = await Promise.all([
    supabase.from('cp_invoices').select('*', { count: 'exact', head: true }).like('invoice_number', `CRE-${year}-%`),
    supabase.from('orders').select('*', { count: 'exact', head: true }).like('invoice_number', `CRE-${year}-%`),
  ]);

  const seq = String((cpCount || 0) + (ebookCount || 0) + 1).padStart(5, '0');
  const invoiceNumber = `CRE-${year}-${seq}`;

  const totalEur = items.reduce((sum, item) => sum + Number(item.total), 0);
  const totalCents = Math.round(totalEur * 100);

  const { data: invoice, error } = await supabase
    .from('cp_invoices')
    .insert({
      invoice_number: invoiceNumber,
      email: customerEmail,
      customer_name: customerName,
      customer_address: customerAddress || '',
      amount: totalCents,
      items,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      ...(rib ? { rib } : {}),
    })
    .select()
    .single();

  if (error) throw new Error(`DB insertCoursParticuliers failed: ${error.message}`);

  return { invoice, invoiceNumber };
}

/**
 * Marque une facture CP comme payée : met à jour payment_method/date + items, efface le rib.
 */
async function markCpInvoicePaid(invoiceNumber, { paymentDate, paymentMethod }) {
  const supabase = getClient();
  const { data: current, error: getErr } = await supabase
    .from('cp_invoices')
    .select('items, payment_method')
    .eq('invoice_number', invoiceNumber)
    .maybeSingle();
  if (getErr) throw new Error(`DB markCpInvoicePaid get: ${getErr.message}`);
  if (!current) { const e = new Error('Facture introuvable.'); e.statusCode = 404; throw e; }
  if (current.payment_method !== 'À payer') { const e = new Error('Cette facture est déjà acquittée.'); e.statusCode = 409; throw e; }

  const updatedItems = Array.isArray(current.items)
    ? current.items.map(item => ({ ...item, status: 'paid', payment_date: paymentDate, payment_method: paymentMethod }))
    : current.items;

  const { data, error } = await supabase
    .from('cp_invoices')
    .update({ payment_method: paymentMethod, payment_date: paymentDate, items: updatedItems, rib: null })
    .eq('invoice_number', invoiceNumber)
    .select()
    .single();
  if (error) throw new Error(`DB markCpInvoicePaid update: ${error.message}`);
  return data;
}

/**
 * Récupère une facture de cours particuliers par son numéro.
 */
async function getCoursParticuliersInvoice(invoiceNumber) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cp_invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .maybeSingle();
  if (error) throw new Error(`DB getCoursParticuliersInvoice failed: ${error.message}`);
  return data;
}

/**
 * Supprime une facture de cours particuliers (erreur de saisie, doublon, etc.).
 * Supprime aussi le PDF archivé dans le storage s'il existe.
 * Retourne la ligne supprimée, ou null si elle n'existait pas.
 */
async function deleteCoursParticuliersInvoice(invoiceNumber) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cp_invoices')
    .delete()
    .eq('invoice_number', invoiceNumber)
    .select()
    .maybeSingle();
  if (error) throw new Error(`DB deleteCoursParticuliersInvoice failed: ${error.message}`);
  if (!data) return null;

  const yearMatch = invoiceNumber.match(/(\d{4})/);
  if (yearMatch) {
    const filePath = `${yearMatch[1]}/${invoiceNumber}.pdf`;
    const { error: storageError } = await supabase.storage.from('invoices').remove([filePath]);
    if (storageError) console.warn(`[storage] Suppression PDF ignorée (${storageError.message})`);
  }

  return data;
}

module.exports = {
  getClient,
  insertOrderIdempotent,
  insertExtractRequest,
  markEmailSent,
  getOrders,
  getAdminStats,
  getExtractRequests,
  uploadInvoicePdf,
  saveInvoicePath,
  insertCoursParticuliersInvoice,
  getCoursParticuliersInvoice,
  markCpInvoicePaid,
  deleteCoursParticuliersInvoice,
};

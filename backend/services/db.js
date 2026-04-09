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

module.exports = { insertOrderIdempotent };

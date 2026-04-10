/**
 * Script de test — envoie un email avec PDF produit + facture fictive.
 * Usage : node scripts/test-email.js [email] [product_id]
 *
 * Exemples :
 *   node scripts/test-email.js test@example.com maths
 *   node scripts/test-email.js test@example.com physique
 *   node scripts/test-email.js test@example.com bundle
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path                = require('path');
const { sendOrderEmail }  = require('../services/mailer');
const { generateInvoice } = require('../services/invoice');

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const email        = process.argv[2] || 'test@example.com';
const productId    = process.argv[3] || 'maths';
const customerName = process.argv[4] || 'Client Test';
const product   = PRODUCT_MAP[productId];

if (!product) {
  console.error(`Produit inconnu : ${productId}. Choix : ${Object.keys(PRODUCT_MAP).join(' | ')}`);
  process.exit(1);
}

const invoiceNumber = `TEST-${Date.now()}`;

console.log(`Envoi à ${email} — produit : ${productId}`);

generateInvoice({
  invoiceNumber,
  email,
  productName: product.name,
  amount:      product.price,
  date:        new Date(),
})
  .then(invoicePdf => sendOrderEmail({ toEmail: email, customerName, product, invoicePdf, invoiceNumber }))
  .then(() => console.log('✅ Email envoyé avec succès'))
  .catch(err => {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  });

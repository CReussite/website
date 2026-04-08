/**
 * Script de test — envoie un email avec les PDFs à une adresse de test.
 * Usage : node scripts/test-email.js [email] [produit]
 *
 * Exemples :
 *   node scripts/test-email.js test@example.com maths
 *   node scripts/test-email.js test@example.com physique
 *   node scripts/test-email.js test@example.com bundle
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendPDF } = require('../services/mailer');

const PRODUCT_IDS = {
  maths:    'prod_UIc5mslp2TR9ym',
  physique: 'prod_UIc5Mc666PbQnC',
  bundle:   'prod_UIc5HOO8ErMqzh',
};

const email   = process.argv[2] || 'test@example.com';
const produit = process.argv[3] || 'physique';
const productId = PRODUCT_IDS[produit];

if (!productId) {
  console.error(`Produit inconnu : ${produit}. Choix : maths | physique | bundle`);
  process.exit(1);
}

console.log(`Envoi à ${email} — produit : ${produit} (${productId})`);

sendPDF(email, productId)
  .then(() => console.log('✅ Email envoyé avec succès'))
  .catch(err => {
    console.error('❌ Erreur :', err.message);
    process.exit(1);
  });

const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs   = require('fs');
const path = require('path');

// Init client Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ── Mapping produit Stripe → PDF(s) ─────────────────
// Clés = IDs produits Stripe (test)
const PRODUCT_PDF_MAP = {
  'prod_UIc5mslp2TR9ym': ['fiches-maths.pdf'],
  'prod_UIc5Mc666PbQnC': ['fiches-physique-chimie.pdf'],
  'prod_UIc5HOO8ErMqzh': ['fiches-maths.pdf', 'fiches-physique-chimie.pdf'],
};

const PRODUCT_NAME_MAP = {
  'prod_UIc5mslp2TR9ym': 'Fiches Maths Terminale Spécialité',
  'prod_UIc5Mc666PbQnC': 'Fiches Physique-Chimie Terminale Spécialité',
  'prod_UIc5HOO8ErMqzh': 'Pack Maths + Physique-Chimie Terminale Spécialité',
};

/**
 * Envoie le(s) PDF(s) commandé(s) à l'acheteur via Brevo.
 * @param {string} toEmail   - email de l'acheteur
 * @param {string} productId - ID produit Stripe
 */
async function sendPDF(toEmail, productId) {
  const files = PRODUCT_PDF_MAP[productId];
  if (!files) throw new Error(`Produit inconnu : ${productId}`);

  const productName = PRODUCT_NAME_MAP[productId] || "C'Réussite";

  // Lire les PDFs et les encoder en base64 pour Brevo
  const attachments = files.map(filename => {
    const filePath = path.join(__dirname, '..', 'assets', filename);
    const content  = fs.readFileSync(filePath).toString('base64');
    return { name: filename, content };
  });

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender      = { name: process.env.FROM_NAME, email: process.env.FROM_EMAIL };
  sendSmtpEmail.to          = [{ email: toEmail }];
  sendSmtpEmail.subject     = `Tes fiches sont là — ${productName}`;
  sendSmtpEmail.attachment  = attachments;
  sendSmtpEmail.htmlContent = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
      <h2 style="color:#112250;">Merci pour ta commande !</h2>
      <p>Tu trouveras tes fiches en pièce jointe à cet email.</p>
      <p><strong>${productName}</strong></p>
      <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">
      <p style="font-size:0.85rem;color:#6b7280;">
        Une question ? Réponds à cet email ou écris à
        <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a>.
      </p>
      <p style="font-size:0.85rem;color:#6b7280;">— Clara Renaud, C'Réussite</p>
    </div>
  `;

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log(`[mailer] PDF envoyé à ${toEmail} — messageId: ${result.messageId}`);
  return result;
}

module.exports = { sendPDF };

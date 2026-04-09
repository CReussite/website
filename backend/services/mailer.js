const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs   = require('fs');
const path = require('path');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Envoie le(s) PDF(s) produit + la facture à l'acheteur.
 * @param {object} opts
 * @param {string}   opts.toEmail       - email de l'acheteur
 * @param {object}   opts.product       - objet produit depuis products.json
 * @param {Buffer}   opts.invoicePdf    - facture générée en mémoire
 * @param {string}   opts.invoiceNumber - numéro de facture (ex: 2025-001)
 */
async function sendOrderEmail({ toEmail, product, invoicePdf, invoiceNumber }) {
  // Pièces jointes : PDF(s) produit
  const attachments = product.pdf_files.map(filename => {
    const filePath = path.join(__dirname, '..', 'assets', filename);
    const content  = fs.readFileSync(filePath).toString('base64');
    return { name: filename, content };
  });

  // Ajouter la facture
  attachments.push({
    name:    `facture-${invoiceNumber}.pdf`,
    content: invoicePdf.toString('base64'),
  });

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender     = { name: process.env.FROM_NAME, email: process.env.FROM_EMAIL };
  sendSmtpEmail.to         = [{ email: toEmail }];
  sendSmtpEmail.subject    = `Tes fiches sont là — ${product.name}`;
  sendSmtpEmail.attachment = attachments;
  sendSmtpEmail.htmlContent = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
      <h2 style="color:#112250;">Merci pour ta commande !</h2>
      <p>Tu trouveras tes fiches en pièce jointe à cet email.</p>
      <p><strong>${product.name}</strong></p>
      <p style="font-size:0.9rem;color:#6b7280;">
        Ta facture (n° ${invoiceNumber}) est également jointe à cet email.
      </p>
      <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">
      <p style="font-size:0.85rem;color:#6b7280;">
        Une question ? Réponds à cet email ou écris à
        <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a>.
      </p>
      <p style="font-size:0.85rem;color:#6b7280;">— Clara Renaud, C'Réussite</p>
    </div>
  `;

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log(`[mailer] Email envoyé à ${toEmail} — facture ${invoiceNumber} — messageId: ${result.messageId}`);
  return result;
}

module.exports = { sendOrderEmail };

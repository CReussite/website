const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs   = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const CONTACT_EMAIL = 'contact@creussite.fr';

/**
 * Ajoute les métadonnées de traçabilité + un filigrane invisible dans chaque page du PDF.
 * Le nom de l'acheteur est inscrit dans les métadonnées Author et Keywords.
 */
async function stampPdf(pdfBuffer, customerEmail, customerName) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Métadonnées de traçabilité (supprimables, mais première ligne de défense)
  pdfDoc.setAuthor(`Acheté par : ${customerName} <${customerEmail}>`);
  pdfDoc.setKeywords([`acheteur:${customerEmail}`, `client:${customerName}`, 'C\'Réussite']);
  pdfDoc.setSubject(`Document personnel — ${customerName}`);
  pdfDoc.setCreator('C\'Réussite');

  // Stéganographie : texte invisible intégré dans le flux de contenu de chaque page.
  // Opacité 0, blanc sur blanc, taille 4pt — visuellement absent mais physiquement présent
  // dans le PDF. Résiste à la suppression des métadonnées. Détectable via "Sélectionner tout"
  // dans Adobe Acrobat ou tout outil d'analyse forensique de PDF.
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();

    const stamp = `${customerName} <${customerEmail}>`;

    const positions = [
      { x: 50,              y: height - 30 },
      { x: width / 2 - 60, y: height / 2  },
      { x: 50,              y: 30          },
      { x: width - 160,     y: height - 30 },
      { x: width - 160,     y: 30          },
    ];

    for (const { x, y } of positions) {
      page.drawText(stamp, {
        x,
        y,
        size: 4,
        color: rgb(1, 1, 1),
        opacity: 0.004, // imperceptible à l'oeil, présent dans le flux PDF
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}

/**
 * Envoie le(s) PDF(s) produit + la facture à l'acheteur.
 * @param {object} opts
 * @param {string}   opts.toEmail       - email de l'acheteur
 * @param {string}   opts.customerName  - nom de l'acheteur (depuis Stripe)
 * @param {object}   opts.product       - objet produit depuis products.json
 * @param {Buffer}   opts.invoicePdf    - facture générée en mémoire
 * @param {string}   opts.invoiceNumber - numéro de facture (ex: 2026-001)
 */
async function sendOrderEmail({ toEmail, customerName, product, invoicePdf, invoiceNumber, amount, orderDate }) {
  const name      = customerName || toEmail;
  const amountStr = amount ? (amount / 100).toFixed(2).replace('.', ',') + ' €' : '';
  const dateStr   = orderDate
    ? new Date(orderDate).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  // Pièces jointes : PDF(s) produit avec watermark stéganographique
  const attachments = await Promise.all(product.pdf_files.map(async filename => {
    const filePath = path.join(__dirname, '..', 'assets', filename);
    const rawBuffer = fs.readFileSync(filePath);
    const stamped = await stampPdf(rawBuffer, toEmail, name);
    return { name: filename, content: stamped.toString('base64') };
  }));

  // Ajouter la facture
  attachments.push({
    name:    `facture-${invoiceNumber}.pdf`,
    content: invoicePdf.toString('base64'),
  });

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender     = { name: process.env.FROM_NAME || "C'Réussite", email: process.env.FROM_EMAIL };
  sendSmtpEmail.replyTo    = { email: CONTACT_EMAIL, name: process.env.FROM_NAME || "C'Réussite" };
  sendSmtpEmail.to         = [{ email: toEmail, name }];
  sendSmtpEmail.subject    = `Tes fiches sont là — ${product.name}`;
  sendSmtpEmail.attachment = attachments;
  sendSmtpEmail.htmlContent = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
      <h2 style="color:#112250;">Merci pour ta commande !</h2>
      <p>Bonjour ${name},</p>
      <p>Tu trouveras tes fiches en pièce jointe à cet email.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:0.9rem;">
        <tr style="background:#f8f5ee;">
          <td style="padding:10px 14px;font-weight:700;">Produit</td>
          <td style="padding:10px 14px;">${product.name}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:700;">Prix TTC</td>
          <td style="padding:10px 14px;">${amountStr}</td>
        </tr>
        <tr style="background:#f8f5ee;">
          <td style="padding:10px 14px;font-weight:700;">Date</td>
          <td style="padding:10px 14px;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-weight:700;">Facture</td>
          <td style="padding:10px 14px;">N° ${invoiceNumber} — en pièce jointe</td>
        </tr>
      </table>

      <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">

      <p style="font-size:0.82rem;color:#6b7280;background:#f8f5ee;padding:14px;border-radius:8px;">
        <strong>Droit de rétractation :</strong> conformément à l'article L221-28 du Code de la consommation,
        le droit de rétractation ne s'applique pas aux contenus numériques fournis sur support immatériel
        dont l'exécution a commencé avec l'accord du consommateur.
        En validant votre commande, vous avez reconnu renoncer à ce droit.
        En cas d'insatisfaction, contactez-nous — nous examinerons chaque demande individuellement.
      </p>

      <p style="font-size:0.82rem;color:#6b7280;margin-top:16px;">
        <a href="https://c-reussite.fr/cgv.html" style="color:#6b7280;">Conditions Générales de Vente</a>
        &nbsp;·&nbsp;
        <a href="https://c-reussite.fr/confidentialite.html" style="color:#6b7280;">Confidentialité</a>
      </p>

      <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">

      <p style="font-size:0.85rem;color:#6b7280;">
        Une question ? Réponds à cet email ou écris à
        <a href="mailto:${CONTACT_EMAIL}" style="color:#112250;">${CONTACT_EMAIL}</a>.
      </p>
      <p style="font-size:0.85rem;color:#6b7280;">L'équipe C'Réussite</p>
    </div>
  `;

  const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
  console.log(`[mailer] Email envoyé à ${toEmail} — facture ${invoiceNumber} — messageId: ${result.messageId}`);
  return result;
}

module.exports = { sendOrderEmail };

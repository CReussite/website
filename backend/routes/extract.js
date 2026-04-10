const express = require('express');
const fs      = require('fs');
const path    = require('path');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const router = express.Router();

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

router.post('/', express.json(), async (req, res) => {
  const { email, product_id } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  const product = PRODUCT_MAP[product_id];
  if (!product) {
    return res.status(400).json({ error: 'Produit inconnu.' });
  }

  if (!product.extract_files || product.extract_files.length === 0) {
    return res.status(404).json({ error: 'Aucun extrait disponible pour ce produit.' });
  }

  // Vérifier que les fichiers extraits existent
  const attachments = [];
  for (const filename of product.extract_files) {
    const filePath = path.join(__dirname, '..', 'assets', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Extrait non disponible pour le moment.' });
    }
    const content = fs.readFileSync(filePath).toString('base64');
    attachments.push({ name: filename, content });
  }

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender      = { name: process.env.FROM_NAME || "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.replyTo     = { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME || "C'Réussite" };
    sendSmtpEmail.to          = [{ email }];
    sendSmtpEmail.subject     = `Ton extrait gratuit — ${product.name}`;
    sendSmtpEmail.attachment  = attachments;
    sendSmtpEmail.htmlContent = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
        <h2 style="color:#112250;">Voici ton extrait gratuit !</h2>
        <p>Tu trouveras en pièce jointe un aperçu de <strong>${product.name}</strong>.</p>
        <p>Si tu veux accéder à l'intégralité des fiches, tu peux les commander directement sur
          <a href="https://c-reussite.fr" style="color:#112250;">c-reussite.fr</a>.
        </p>
        <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">
        <p style="font-size:0.85rem;color:#6b7280;">
          Une question ? Écris-nous à
          <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a>.
        </p>
        <p style="font-size:0.85rem;color:#6b7280;">L'équipe C'Réussite</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[extract] Extrait envoyé à ${email} — ${product.name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[extract] Erreur envoi :', err.message);
    res.status(500).json({ error: "L'envoi a échoué. Réessaie dans quelques instants." });
  }
});

module.exports = router;

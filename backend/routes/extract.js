const express = require('express');
const path    = require('path');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { insertExtractRequest, getClient, createExtraitToken } = require('../services/db');

const router = express.Router();

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const CONTACT_EMAIL  = 'contact@c-reussite.fr';
const FRONTEND_URL   = process.env.FRONTEND_URL || 'https://c-reussite.fr';
const DISCOUNT_PCT   = 15;

// Mapping produit → page où le promo s'applique le mieux
const PRODUCT_PAGES = {
  maths:    '/maths-terminale/',
  physique: '/physique-chimie-terminale/',
  bundle:   '/pack-maths-physique-chimie/',
};

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

  // Télécharger les extraits depuis Supabase Storage
  const attachments = [];
  for (const filename of product.extract_files) {
    const { data, error } = await getClient().storage
      .from('product-assets')
      .download(filename);
    if (error) {
      console.error(`[extract] Supabase download failed (${filename}):`, error.message);
      return res.status(404).json({ error: 'Extrait non disponible pour le moment.' });
    }
    const rawBuffer = Buffer.from(await data.arrayBuffer());
    attachments.push({ name: filename, content: rawBuffer.toString('base64') });
  }

  // Générer le token EXTRAIT15 (24h, usage unique)
  let promoToken = null;
  let promoLink  = null;
  try {
    promoToken = await createExtraitToken(email);
    const page  = PRODUCT_PAGES[product_id] || '/maths-terminale/';
    promoLink   = `${FRONTEND_URL}${page}?promo=${promoToken}`;
  } catch (e) {
    console.warn('[extract] Impossible de créer le token EXTRAIT15 :', e.message);
  }

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender      = { name: process.env.FROM_NAME || "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.replyTo     = { email: CONTACT_EMAIL, name: process.env.FROM_NAME || "C'Réussite" };
    sendSmtpEmail.to          = [{ email }];
    sendSmtpEmail.bcc         = [{ email: process.env.BCC_EMAIL || 'creussite2026@gmail.com' }];
    sendSmtpEmail.subject     = `Ton extrait gratuit — ${product.name}`;
    sendSmtpEmail.attachment  = attachments;
    sendSmtpEmail.htmlContent = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A2E;">
        <div style="text-align:center;padding:24px 0 16px;">
          <img src="https://c-reussite.fr/img/logo.jpeg" alt="C'Réussite" style="height:72px;width:auto;">
        </div>
        <h2 style="color:#112250;">Voici ton extrait gratuit !</h2>
        <p>Tu trouveras en pièce jointe un aperçu de <strong>${product.name}</strong>.</p>
        <p>Si tu veux accéder à l'intégralité des fiches, tu peux les commander directement sur
          <a href="https://c-reussite.fr" style="color:#112250;">c-reussite.fr</a>.
        </p>
        ${promoLink ? `
        <div style="background:#f8f5ee;border-left:4px solid #E0C58F;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
          <p style="margin:0 0 8px;font-weight:700;color:#112250;">Offre exclusive : −${DISCOUNT_PCT} % sur ta commande</p>
          <p style="margin:0 0 12px;color:#555;font-size:0.9rem;">Valable <strong>24 heures</strong> à partir de maintenant. Non cumulable avec d'autres offres.</p>
          <a href="${promoLink}"
             style="display:inline-block;background:#112250;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:700;">
            Utiliser mon −${DISCOUNT_PCT} % maintenant →
          </a>
          <p style="margin:10px 0 0;font-size:0.78rem;color:#999;">
            Ou copie ce code à la commande : <code style="background:#e8e4dc;padding:2px 6px;border-radius:4px;">${promoToken}</code>
          </p>
        </div>
        ` : ''}
        <hr style="border:none;border-top:1px solid #E0C58F;margin:24px 0;">
        <p style="font-size:0.85rem;color:#6b7280;">
          Une question ? Écris-nous à
          <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
        </p>
        <p style="font-size:0.85rem;color:#6b7280;">L'équipe C'Réussite</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    await insertExtractRequest({ email: 'anonyme', productId: product_id });
    console.log(`[extract] Extrait envoyé à ${email} — ${product.name} — token: ${promoToken}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[extract] Erreur envoi :', err.message);
    res.status(500).json({ error: "L'envoi a échoué. Réessaie dans quelques instants." });
  }
});

module.exports = router;

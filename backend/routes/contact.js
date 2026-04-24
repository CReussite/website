const express = require('express');
const SibApiV3Sdk = require('sib-api-v3-sdk');

const router = express.Router();
router.use(express.json());

const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const CONTACT_EMAIL = 'contact@c-reussite.fr';

function esc(v) {
  if (!v) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

router.post('/', async (req, res) => {
  const { name, email, subject, body } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }
  if (!body || body.trim().length < 5) {
    return res.status(400).json({ error: 'Message trop court.' });
  }

  const senderName = (name || '').trim() || email;
  const subjectLine = (subject || '').trim() || `Message depuis c-reussite.fr`;

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender  = { name: process.env.FROM_NAME || "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.replyTo = { email, name: senderName };
    sendSmtpEmail.to      = [{ email: CONTACT_EMAIL }];
    sendSmtpEmail.subject = `[Contact] ${subjectLine}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family:sans-serif;max-width:560px;color:#1a1a2e;">
        <h2 style="color:#112250;">Nouveau message depuis c-reussite.fr</h2>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr><td style="padding:8px 12px;font-weight:700;width:30%;">Nom</td><td style="padding:8px 12px;">${esc(senderName)}</td></tr>
          <tr style="background:#f8f5ee;"><td style="padding:8px 12px;font-weight:700;">Email</td><td style="padding:8px 12px;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr><td style="padding:8px 12px;font-weight:700;">Sujet</td><td style="padding:8px 12px;">${esc(subjectLine)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #E0C58F;margin:20px 0;">
        <p style="white-space:pre-wrap;">${esc(body.trim())}</p>
      </div>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[contact] Message reçu de ${email} — ${subjectLine}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[contact] Erreur :', err.message);
    res.status(500).json({ error: "L'envoi a échoué. Réessaie dans quelques instants." });
  }
});

module.exports = router;

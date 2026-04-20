const express        = require('express');
const SibApiV3Sdk    = require('sib-api-v3-sdk');
const router         = express.Router();
const { getClient }  = require('../services/db');

router.use(express.json({ limit: '50kb' }));

// ── Brevo init ──────────────────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const REVIEW_EMAIL = 'creussite2026@gmail.com';

// ── GET /api/avis — avis visibles pour le site ──────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await getClient()
      .from('avis')
      .select('auteur, niveau, matiere, note, commentaire')
      .eq('visible', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/avis — soumission d'un avis depuis le site ─
router.post('/', async (req, res) => {
  try {
    const prenom  = String(req.body.prenom  || '').trim().slice(0, 100);
    const note    = Math.min(5, Math.max(1, parseInt(req.body.note) || 5));
    const message = String(req.body.message || '').trim().slice(0, 2000);

    if (!prenom || !message) {
      return res.status(400).json({ error: 'Prénom et message requis.' });
    }

    const stars = '★'.repeat(note) + '☆'.repeat(5 - note);

    const sendSmtpEmail       = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender      = { name: "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.to          = [{ email: REVIEW_EMAIL }];
    sendSmtpEmail.subject     = `[Avis] ${stars} — ${prenom}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#112250;padding:20px 24px;border-radius:12px 12px 0 0;">
          <h2 style="color:#E0C58F;margin:0;font-size:1rem;">Nouvel avis client</h2>
        </div>
        <div style="background:#fff;padding:20px 24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
          <p><strong>Prénom :</strong> ${prenom}</p>
          <p><strong>Note :</strong> ${stars} (${note}/5)</p>
          <p><strong>Avis :</strong></p>
          <blockquote style="border-left:3px solid #E0C58F;margin:0;padding:10px 16px;color:#374151;font-style:italic;">
            ${message.replace(/\n/g, '<br>')}
          </blockquote>
        </div>
      </div>`;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[avis] Avis reçu de ${prenom} — ${note}/5`);

    res.json({ ok: true });
  } catch (err) {
    console.error('[avis] Erreur :', err.message);
    res.status(500).json({ error: "Erreur lors de l'envoi." });
  }
});

module.exports = router;

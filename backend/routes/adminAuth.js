// ── Routes d'authentification admin (2FA) ─────────────────────────────────────
// Montées sur /api/admin/auth. Aucune n'est derrière requireSession : ce sont
// elles qui établissent la session après vérification des deux facteurs.
//
// Flux :
//   POST /login             { password }                 → { step:'setup'|'2fa', preauth }
//   POST /setup             { preauth }                  → { qrDataUrl, secret, otpauthUrl }
//   POST /setup/confirm     { preauth, code }            → { token, exp }
//   POST /verify            { preauth, code }            → { token, exp }
//   POST /email-otp         { preauth }                  → { challenge, sentTo }
//   POST /email-otp/verify  { preauth, challenge, code } → { token, exp }

const express = require('express');
const QRCode = require('qrcode');
const auth = require('../services/adminAuth');
const { getAdminSettings, setAdminSetting } = require('../services/db');
const { sendAdminOtpEmail } = require('../services/mailer');

const router = express.Router();
router.use(express.json());

// Garde-fou commun : ADMIN_KEY présente + ticket preauth valide.
function requirePreauth(req, res) {
  if (!auth.isConfigured()) {
    res.status(503).json({ error: 'ADMIN_KEY non configurée sur le serveur.' });
    return null;
  }
  const payload = auth.verifyToken(req.body?.preauth, 'preauth');
  if (!payload) {
    res.status(401).json({ error: 'Étape mot de passe expirée. Recommencez la connexion.' });
    return null;
  }
  return payload;
}

function issueSession(res) {
  const token = auth.signToken('session');
  const exp = Math.floor(Date.now() / 1000) + auth.TTL.session;
  return res.json({ token, exp });
}

// ── POST /login : vérifie le mot de passe, délivre un ticket preauth ────────────
router.post('/login', async (req, res) => {
  try {
    if (!auth.isConfigured()) {
      return res.status(503).json({ error: 'ADMIN_KEY non configurée sur le serveur.' });
    }
    if (!auth.verifyPassword(req.body?.password)) {
      return res.status(401).json({ error: 'Mot de passe invalide.' });
    }
    const settings = await getAdminSettings();
    const step = settings.totp_secret ? '2fa' : 'setup';
    return res.json({ step, preauth: auth.signToken('preauth') });
  } catch (err) {
    console.error('[adminAuth] login erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /setup : génère un secret TOTP (pending) + QR ─────────────────────────
router.post('/setup', async (req, res) => {
  const pre = requirePreauth(req, res);
  if (!pre) return;
  try {
    const secret = auth.generateTotpSecret();
    await setAdminSetting('totp_secret_pending', secret);
    const otpauthUrl = auth.totpKeyuri(secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });
    res.json({ qrDataUrl, secret, otpauthUrl });
  } catch (err) {
    console.error('[adminAuth] setup erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /setup/confirm : valide le 1er code, active la 2FA, ouvre la session ──
router.post('/setup/confirm', async (req, res) => {
  const pre = requirePreauth(req, res);
  if (!pre) return;
  try {
    const settings = await getAdminSettings();
    const pending = settings.totp_secret_pending;
    if (!pending) {
      return res.status(400).json({ error: 'Aucune configuration en cours. Recommencez.' });
    }
    if (!auth.verifyTotp(req.body?.code, pending)) {
      return res.status(401).json({ error: 'Code incorrect. Vérifiez votre application.' });
    }
    await setAdminSetting('totp_secret', pending);
    await setAdminSetting('totp_secret_pending', '');
    return issueSession(res);
  } catch (err) {
    console.error('[adminAuth] setup/confirm erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /verify : vérifie un code TOTP, ouvre la session ──────────────────────
router.post('/verify', async (req, res) => {
  const pre = requirePreauth(req, res);
  if (!pre) return;
  try {
    const settings = await getAdminSettings();
    if (!settings.totp_secret) {
      return res.status(400).json({ error: 'Double authentification non configurée.' });
    }
    if (!auth.verifyTotp(req.body?.code, settings.totp_secret)) {
      return res.status(401).json({ error: 'Code incorrect. Vérifiez votre application.' });
    }
    return issueSession(res);
  } catch (err) {
    console.error('[adminAuth] verify erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /email-otp : envoie un code par email (secours) ───────────────────────
router.post('/email-otp', async (req, res) => {
  const pre = requirePreauth(req, res);
  if (!pre) return;
  try {
    const code = auth.generateEmailCode();
    await sendAdminOtpEmail({ code });
    // Le challenge porte l'empreinte du code (jamais le code en clair) et expire.
    const challenge = auth.signToken('emailotp', { codeHash: auth.hashEmailCode(code) });
    res.json({ challenge });
  } catch (err) {
    console.error('[adminAuth] email-otp erreur :', err.message);
    res.status(500).json({ error: "Impossible d'envoyer le code par email." });
  }
});

// ── POST /email-otp/verify : vérifie le code email, ouvre la session ───────────
router.post('/email-otp/verify', async (req, res) => {
  const pre = requirePreauth(req, res);
  if (!pre) return;
  try {
    const challenge = auth.verifyToken(req.body?.challenge, 'emailotp');
    if (!challenge) {
      return res.status(401).json({ error: 'Code expiré. Demandez-en un nouveau.' });
    }
    if (auth.hashEmailCode(req.body?.code || '') !== challenge.codeHash) {
      return res.status(401).json({ error: 'Code incorrect.' });
    }
    return issueSession(res);
  } catch (err) {
    console.error('[adminAuth] email-otp/verify erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

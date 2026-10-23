// ─────────────────────────────────────────────────────────────────────────────
// Module bêta multi-niveaux (indépendant de la bêta historique maths/physique).
// Monté sur /api/beta-niveaux. N'altère aucune route existante.
//   POST /auth        → connexion email + mot de passe
//   GET  /pdf/:type   → sert le PDF depuis Supabase Storage (bucket "beta-assets")
// Les PDF ne sont jamais dans le repo : ils vivent dans Supabase Storage.
// ─────────────────────────────────────────────────────────────────────────────
const express       = require('express');
const { getClient } = require('../services/db');

const router = express.Router();
router.use(express.json({ limit: '200kb' }));

// ── Ebooks ───────────────────────────────────────────────────────────────────
// Clés → fichiers dans le bucket Supabase Storage "beta-assets" (privé).
const PDF_FILES = {
  'pc-2nde':         'pc-2nde.pdf',
  'pc-1ere':         'pc-1ere.pdf',
  'maths-terminale': 'maths-terminale.pdf',
};
const EBOOK_KEYS = Object.keys(PDF_FILES);

// ── Comptes testeurs ─────────────────────────────────────────────────────────
// BETA_TESTERS = [{"email":"marie@exemple.fr","password":"xyz","expires":"2026-06-30"}]
// Un compte donne accès à tous les ebooks. Les mots de passe doivent être uniques.
function getTesters() {
  try { return JSON.parse(process.env.BETA_TESTERS || '[]'); }
  catch { return []; }
}
function notExpired(t) { return !t.expires || new Date(t.expires) >= new Date(); }

function validateTester(email, password) {
  if (!email || !password) return null;
  const e = String(email).trim().toLowerCase();
  const t = getTesters().find(x => String(x.email).trim().toLowerCase() === e && x.password === password);
  return (t && notExpired(t)) ? t : null;
}
// Le jeton transmis pour accéder aux PDF est le mot de passe lui-même.
function validateByToken(password) {
  if (!password) return null;
  const t = getTesters().find(x => x.password === password);
  return (t && notExpired(t)) ? t : null;
}
function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

// ── POST /api/beta-niveaux/auth ──────────────────────────────────────────────
router.post('/auth', (req, res) => {
  const { email, password } = req.body || {};
  const tester = validateTester(email, password);
  if (!tester) {
    return res.status(401).json({ error: 'Identifiants invalides ou accès expiré.' });
  }
  res.json({
    ok:      true,
    email:   String(tester.email).trim().toLowerCase(),
    expires: fmtDate(tester.expires),
    ebooks:  EBOOK_KEYS,
  });
});

// ── GET /api/beta-niveaux/pdf/:type ──────────────────────────────────────────
router.get('/pdf/:type', async (req, res) => {
  const password = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const type     = req.params.type;

  if (!PDF_FILES[type]) {
    return res.status(400).json({ error: 'Type invalide.' });
  }
  if (!validateByToken(password)) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  try {
    const { data, error } = await getClient()
      .storage
      .from('beta-assets')
      .download(PDF_FILES[type]);

    if (error) throw error;

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader('Content-Type',           'application/pdf');
    res.setHeader('Content-Length',         buffer.length);
    res.setHeader('Cache-Control',          'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma',                 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);

  } catch (err) {
    console.error('[betaNiveaux] Storage error:', err.message);
    res.status(404).json({ error: 'Fichier introuvable. Contacte l\'administrateur.' });
  }
});

module.exports = router;

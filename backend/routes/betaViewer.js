const express      = require('express');
const { getClient } = require('../services/db');

const router = express.Router();
router.use(express.json({ limit: '10kb' }));

// Noms des fichiers dans le bucket Supabase Storage "beta-assets" (privé)
const PDF_FILES = {
  maths:    'maths.pdf',
  physique: 'physique.pdf',
};

// BETA_VIEWER_PASSWORDS = JSON dans Render, ex :
// [{"password":"abc123","type":"maths","expires":"2026-05-10"},
//  {"password":"xyz789","type":"physique","expires":"2026-05-10"},
//  {"password":"pack01","type":"bundle","expires":"2026-05-10"}]
function getPasswords() {
  try { return JSON.parse(process.env.BETA_VIEWER_PASSWORDS || '[]'); }
  catch { return []; }
}

function validatePassword(password) {
  if (!password) return null;
  const entry = getPasswords().find(p => p.password === password);
  if (!entry) return null;
  if (new Date(entry.expires) < new Date()) return null; // expiré
  return entry;
}

function hasAccess(entry, requestedType) {
  if (!entry) return false;
  if (entry.type === 'bundle') return true; // accès aux deux
  return entry.type === requestedType;
}

// POST /api/beta-viewer/auth
router.post('/auth', (req, res) => {
  const { password } = req.body || {};
  const entry = validatePassword(password);
  if (!entry) {
    return res.status(401).json({ error: 'Mot de passe invalide ou accès expiré.' });
  }
  const expires = new Date(entry.expires).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  res.json({ ok: true, type: entry.type, expires });
});

// GET /api/beta-viewer/pdf/:type  (maths | physique)
router.get('/pdf/:type', async (req, res) => {
  const password = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const entry    = validatePassword(password);
  const reqType  = req.params.type;

  if (!PDF_FILES[reqType]) {
    return res.status(400).json({ error: 'Type invalide.' });
  }
  if (!hasAccess(entry, reqType)) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  try {
    const { data, error } = await getClient()
      .storage
      .from('beta-assets')
      .download(PDF_FILES[reqType]);

    if (error) throw error;

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader('Content-Type',           'application/pdf');
    res.setHeader('Content-Length',         buffer.length);
    res.setHeader('Cache-Control',          'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma',                 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(buffer);

  } catch (err) {
    console.error('[betaViewer] Storage error:', err.message);
    res.status(404).json({ error: 'Fichier introuvable. Contacte l\'administrateur.' });
  }
});

module.exports = router;

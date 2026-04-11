const express = require('express');
const path    = require('path');
const fs      = require('fs');

const router = express.Router();
router.use(express.json({ limit: '10kb' }));

const PDF_FILES = {
  maths:    'C_Réussite_Maths_TleSpe.pdf',
  physique: 'C_Réussite_PhysiqueChimie_TleSpe.pdf',
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
router.get('/pdf/:type', (req, res) => {
  const password = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const entry    = validatePassword(password);
  const reqType  = req.params.type;

  if (!PDF_FILES[reqType]) {
    return res.status(400).json({ error: 'Type invalide.' });
  }
  if (!hasAccess(entry, reqType)) {
    return res.status(403).json({ error: 'Accès non autorisé.' });
  }

  const filePath = path.join(__dirname, '../assets', PDF_FILES[reqType]);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier introuvable.' });
  }

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type',           'application/pdf');
  res.setHeader('Content-Length',         stat.size);
  res.setHeader('Cache-Control',          'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma',                 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Pas de Content-Disposition: attachment — évite le prompt "Enregistrer sous"
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;

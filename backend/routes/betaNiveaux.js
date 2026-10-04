// ─────────────────────────────────────────────────────────────────────────────
// Module bêta multi-niveaux (indépendant de la bêta historique maths/physique).
// Monté sur /api/beta-niveaux. N'altère aucune route existante.
//   POST /auth        → connexion email + mot de passe
//   GET  /pdf/:type   → sert le PDF depuis Supabase Storage (bucket "beta-assets")
//   POST /feedback    → envoie le questionnaire de retour par email (Brevo)
// Les 4 PDF ne sont jamais dans le repo : ils vivent dans Supabase Storage.
// ─────────────────────────────────────────────────────────────────────────────
const express     = require('express');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { getClient } = require('../services/db');

const router = express.Router();
router.use(express.json({ limit: '200kb' }));

// ── Brevo (même pattern que mailer.js / beta.js) ─────────────────────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const BETA_EMAIL  = process.env.NOTIFY_EMAIL || process.env.BCC_EMAIL;

// ── Ebooks ───────────────────────────────────────────────────────────────────
// Clés → fichiers dans le bucket Supabase Storage "beta-assets" (privé).
const PDF_FILES = {
  'pc-2nde':         'pc-2nde.pdf',
  'pc-1ere':         'pc-1ere.pdf',
  'pc-terminale':    'pc-terminale.pdf',
  'maths-terminale': 'maths-terminale.pdf',
};
const EBOOK_KEYS   = Object.keys(PDF_FILES);
const EBOOK_LABELS = {
  'pc-2nde':         'Physique-Chimie (Seconde)',
  'pc-1ere':         'Physique-Chimie (1re Spé)',
  'pc-terminale':    'Physique-Chimie (Terminale Spé)',
  'maths-terminale': 'Mathématiques (Terminale Spé)',
};

// ── Comptes testeurs ─────────────────────────────────────────────────────────
// BETA_TESTERS = [{"email":"marie@exemple.fr","password":"xyz","expires":"2026-06-30"}]
// Un compte donne accès aux 4 ebooks. Les mots de passe doivent être uniques.
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

// ── Helpers email ────────────────────────────────────────────────────────────
const LABELS = {
  recommandation: {
    oui_certain: 'Oui, sans hésiter', oui_probablement: 'Probablement oui',
    je_sais_pas: 'Je ne sais pas', probablement_pas: 'Probablement pas', non: 'Non',
  },
  prix: {
    oui_certain: 'Oui, sans hésiter', oui_probablement: 'Oui, probablement',
    je_sais_pas: 'Je ne sais pas', probablement_pas: 'Probablement pas', non: 'Non',
  },
  niveau: { seconde: 'Seconde', premiere: 'Première', terminale: 'Terminale', autre: 'Autre' },
  matieres: {
    hg: 'Histoire-Géographie', ses: 'SES', philo: 'Philosophie', svt: 'SVT',
    anglais: 'Anglais', francais: 'Français', non: 'Pas intéressé(e)',
  },
};

function esc(v) {
  if (!v && v !== 0) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}
function lbl(map, val) {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(v => map[v] || v).join(', ');
  return map[val] || val;
}
function stars(n) {
  const v = Math.min(5, Math.max(0, Number(n) || 0));
  return '★'.repeat(v) + '☆'.repeat(5 - v) + `  (${v}/5)`;
}
function yesNo(v) { return v === 'oui' ? 'Oui' : v === 'non' ? 'Non' : esc(v); }
function cond(radioVal, detail) {
  if (!radioVal) return '';
  if (radioVal !== 'oui') return 'Non';
  return detail ? `Oui : ${esc(detail)}` : 'Oui';
}
function sectionRow(title) {
  return `<tr><td colspan="2" style="padding:11px 16px 9px;background:#112250;color:#E0C58F;
    font-weight:700;font-size:0.78rem;letter-spacing:0.07em;text-transform:uppercase;">${title}</td></tr>`;
}
function row(label, value) {
  if (!value && value !== 0) return '';
  return `<tr>
    <td style="padding:9px 16px;font-weight:600;color:#6b7280;width:38%;vertical-align:top;
      border-bottom:1px solid #f3f4f6;font-size:0.83rem;">${esc(label)}</td>
    <td style="padding:9px 16px;color:#1a1a2e;vertical-align:top;
      border-bottom:1px solid #f3f4f6;font-size:0.86rem;">${value}</td></tr>`;
}

function buildEmailHtml(d) {
  const ebooks = Array.isArray(d.ebooks) ? d.ebooks.filter(k => EBOOK_LABELS[k]) : [];
  let rows = '';

  rows += sectionRow('Bêta-testeur');
  rows += row('Prénom',           esc(d.prenom));
  rows += row('Email',            esc(d.email));
  rows += row('Niveau',           lbl(LABELS.niveau, d.niveau));
  rows += row('Ebooks consultés', ebooks.map(k => EBOOK_LABELS[k]).join(', '));
  rows += row('Date',             new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

  ebooks.forEach((k, i) => {
    rows += sectionRow(`Ebook ${i + 1} : ${EBOOK_LABELS[k]}`);
    rows += row('Note',                stars(d[`note_${k}`]));
    rows += row('Fiche la plus utile', esc(d[`utile_${k}`]));
    rows += row('Erreurs repérées',    cond(d[`erreurs_${k}`], d[`erreurs_${k}_detail`]));
    rows += row('Contenu manquant',    cond(d[`manque_${k}`],  d[`manque_${k}_detail`]));
  });

  rows += sectionRow('Avis global');
  rows += row('Recommandation',          lbl(LABELS.recommandation, d.recommandation));
  rows += row('Pourquoi',                esc(d.recommandation_pourquoi));
  rows += row("Frein à l'achat",         esc(d.frein_achat));
  rows += row('Prix raisonnable',        lbl(LABELS.prix, d.prix_avis));
  rows += row('Prix souhaité',           esc(d.prix_propose));
  rows += row('Avis à publier',          esc(d.avis_publiable));
  rows += row('Accord publication',      yesNo(d.accord_publication));
  rows += row('Prénom pour publication', esc(d.prenom_publication));

  rows += sectionRow('Pour la suite');
  rows += row('Matières souhaitées',  lbl(LABELS.matieres, d.matieres_souhaitees));
  rows += row('Commentaires',         esc(d.commentaires));

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:680px;margin:0 auto;color:#1a1a2e;background:#f5f0e9;padding:20px;">
  <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#112250;padding:28px 28px 22px;">
      <img src="https://c-reussite.fr/img/logo.jpeg" alt="C'Réussite" style="height:52px;width:auto;display:block;margin-bottom:14px;">
      <h1 style="color:#E0C58F;font-size:1.1rem;margin:0 0 4px;">Retour bêta multi-niveaux</h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.8rem;margin:0;">${esc(d.prenom || 'Anonyme')} · ${esc(d.email || '')}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
  </div>
</body>
</html>`;
}

// ── POST /api/beta-niveaux/feedback ──────────────────────────────────────────
router.post('/feedback', async (req, res) => {
  try {
    const rest   = req.body || {};
    const prenom = (rest.prenom || '').trim().slice(0, 100);
    const email  = (rest.email  || '').trim().slice(0, 160);

    const d = { prenom, email, ...rest };
    const htmlContent = buildEmailHtml(d);
    const subject     = `[Beta niveaux] ${prenom || 'Anonyme'} · ${email}`.trim();

    const sendSmtpEmail       = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender      = { name: "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.to          = [{ email: BETA_EMAIL }];
    sendSmtpEmail.subject     = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[betaNiveaux] Retour reçu · ${prenom || 'Anonyme'} · ${email}`);

    res.json({ ok: true });
  } catch (err) {
    console.error('[betaNiveaux] Erreur feedback :', err.message);
    res.status(500).json({ error: "Erreur lors de l'envoi. Réessaie dans quelques instants." });
  }
});

module.exports = router;

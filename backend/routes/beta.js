const express        = require('express');
const SibApiV3Sdk    = require('sib-api-v3-sdk');

const router = express.Router();
router.use(express.json({ limit: '200kb' }));

// ── Brevo init (same pattern as mailer.js) ──────────────
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const BETA_EMAIL = 'creussite2026@gmail.com';

// ── Label maps ──────────────────────────────────────────
const LABELS = {
  recommandation: {
    oui_certain:      'Oui, sans hésiter',
    oui_probablement: 'Probablement oui',
    je_sais_pas:      'Je ne sais pas',
    probablement_pas: 'Probablement pas',
    non:              'Non',
  },
  prix_parents: {
    oui_certain:      'Oui, sans hésiter',
    oui_probablement: 'Oui, probablement',
    je_sais_pas:      'Je ne sais pas',
    probablement_pas: 'Probablement pas',
    non:              'Non',
  },
  utile_avant: {
    oui:       'Oui, vraiment',
    peut_etre: 'Peut-être',
    non:       'Non, pas vraiment',
  },
  matieres: {
    hg:      'Histoire-Géographie',
    ses:     'SES',
    philo:   'Philosophie',
    svt:     'SVT',
    anglais: 'Anglais',
    autre:   'Autre',
    non:     'Pas intéressé(e)',
  },
};

// ── HTML helpers ────────────────────────────────────────
function esc(v) {
  if (!v && v !== 0) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
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

function yesNo(v) {
  return v === 'oui' ? 'Oui' : v === 'non' ? 'Non' : esc(v);
}

function cond(radioVal, trigger, detail) {
  if (!radioVal) return '';
  if (radioVal === 'non' || radioVal !== trigger) return 'Non';
  return detail ? `Oui — ${esc(detail)}` : 'Oui';
}

function sectionRow(title) {
  return `<tr>
    <td colspan="2" style="padding:11px 16px 9px;background:#112250;color:#E0C58F;
      font-weight:700;font-size:0.78rem;letter-spacing:0.07em;text-transform:uppercase;">
      ${title}
    </td>
  </tr>`;
}

function row(label, value) {
  if (!value && value !== 0) return '';
  return `<tr>
    <td style="padding:9px 16px;font-weight:600;color:#6b7280;width:38%;
      vertical-align:top;border-bottom:1px solid #f3f4f6;font-size:0.83rem;">${esc(label)}</td>
    <td style="padding:9px 16px;color:#1a1a2e;vertical-align:top;
      border-bottom:1px solid #f3f4f6;font-size:0.86rem;">${value}</td>
  </tr>`;
}

// ── Build structured HTML email ─────────────────────────
function buildEmailHtml(type, d) {
  const isPack  = type === 'bundle';
  const isMaths = type === 'maths';
  const formName = isPack ? 'Pack Maths + Physique-Chimie'
                 : isMaths ? 'Mathématiques uniquement'
                 : 'Physique-Chimie uniquement';

  let rows = '';

  // ── Identification
  rows += sectionRow('Bêta-testeur');
  rows += row('Prénom',     esc(d.prenom));
  rows += row('Formulaire', formName);
  rows += row('Date',       new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

  if (isPack) {
    rows += sectionRow('Bloc 1 — Expérience e-book Mathématiques');
    rows += row('Fiche Maths la plus utile', esc(d.maths_q1_fiche_utile));
    rows += row('Erreurs (Maths)',           cond(d.maths_q2_erreurs, 'oui', d.maths_q2_erreurs_detail));
    rows += row('Notion incomprise (Maths)', cond(d.maths_q3_incompris, 'oui', d.maths_q3_incompris_detail));
    rows += row('Contenu manquant (Maths)',  cond(d.maths_q4_manquant, 'oui', d.maths_q4_manquant_detail));

    rows += sectionRow('Bloc 2 — Expérience e-book Physique-Chimie');
    rows += row('Fiche PC la plus utile',   esc(d.pc_q1_fiche_utile));
    rows += row('Erreurs (PC)',             cond(d.pc_q2_erreurs, 'oui', d.pc_q2_erreurs_detail));
    rows += row('Notion incomprise (PC)',   cond(d.pc_q3_incompris, 'oui', d.pc_q3_incompris_detail));
    rows += row('Contenu manquant (PC)',    cond(d.pc_q4_manquant, 'oui', d.pc_q4_manquant_detail));

    rows += sectionRow('Bloc 3 — Avis global');
    rows += row('Note e-book Maths', stars(d.note_maths));
    rows += row('Note e-book PC',    stars(d.note_pc));

  } else if (isMaths) {
    rows += sectionRow('Bloc 1 — Expérience e-book Mathématiques');
    rows += row('Fiche la plus utile', esc(d.maths_q1_fiche_utile));
    rows += row('Erreurs repérées',    cond(d.maths_q2_erreurs, 'oui', d.maths_q2_erreurs_detail));
    rows += row('Notion incomprise',   cond(d.maths_q3_incompris, 'oui', d.maths_q3_incompris_detail));
    rows += row('Contenu manquant',    cond(d.maths_q4_manquant, 'oui', d.maths_q4_manquant_detail));

    rows += sectionRow('Bloc 2 — Avis global');
    rows += row('Note', stars(d.note_maths));

  } else {
    rows += sectionRow('Bloc 1 — Expérience e-book Physique-Chimie');
    rows += row('Fiche la plus utile', esc(d.pc_q1_fiche_utile));
    rows += row('Erreurs repérées',    cond(d.pc_q2_erreurs, 'oui', d.pc_q2_erreurs_detail));
    rows += row('Notion incomprise',   cond(d.pc_q3_incompris, 'oui', d.pc_q3_incompris_detail));
    rows += row('Contenu manquant',    cond(d.pc_q4_manquant, 'oui', d.pc_q4_manquant_detail));

    rows += sectionRow('Bloc 2 — Avis global');
    rows += row('Note', stars(d.note_pc));
  }

  // Shared avis global fields
  rows += row('Recommandation',               lbl(LABELS.recommandation, d.recommandation));
  rows += row('Pourquoi',                     esc(d.recommandation_pourquoi));
  rows += row("Frein à l'achat",              esc(d.frein_achat));
  rows += row('Avis à publier',               esc(d.avis_publiable));
  rows += row('Accord publication',           yesNo(d.accord_publication));
  rows += row('Prénom pour publication',      esc(d.prenom_publication));

  // ── Parents
  const parentsNum = isPack ? 4 : 3;
  rows += sectionRow(`Bloc ${parentsNum} — Avis des parents (optionnel)`);
  rows += row('Avis parents',                 esc(d.parents_avis));
  rows += row('Prix raisonnable',             lbl(LABELS.prix_parents, d.parents_prix));
  rows += row('Prix souhaité',                esc(d.parents_prix_propose));
  rows += row('Avis parents à publier',       esc(d.parents_avis_publiable));
  rows += row('Prénom parent',                esc(d.parents_prenom_publication));
  rows += row('Accord publication parents',   yesNo(d.parents_accord_publication));

  // ── Pour la suite
  const suiteNum = isPack ? 5 : 4;
  rows += sectionRow(`Bloc ${suiteNum} — Pour la suite`);
  rows += row('Matières souhaitées',          lbl(LABELS.matieres, d.matieres_souhaitees));
  rows += row('Utile les années précédentes', lbl(LABELS.utile_avant, d.utile_avant));
  rows += row('Précisions',                   esc(d.utile_avant_detail));
  rows += row('Commentaires généraux',        esc(d.commentaires));

  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;max-width:680px;margin:0 auto;color:#1a1a2e;background:#f5f0e9;padding:20px;">
  <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#112250;padding:28px 28px 22px;">
      <img src="https://c-reussite.fr/img/logo.jpeg" alt="C'Réussite"
        style="height:52px;width:auto;display:block;margin-bottom:14px;">
      <h1 style="color:#E0C58F;font-size:1.1rem;margin:0 0 4px;">
        Nouveau retour bêta-testeur
      </h1>
      <p style="color:rgba(255,255,255,0.55);font-size:0.8rem;margin:0;">${formName}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${rows}
    </table>
  </div>
</body>
</html>`;
}

// ── POST /api/beta-feedback ─────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { type, ...rest } = req.body || {};

    if (!['pc', 'maths', 'bundle'].includes(type)) {
      return res.status(400).json({ error: 'Type de formulaire invalide.' });
    }

    const d = {
      type,
      prenom: (rest.prenom || '').trim().slice(0, 100),
      ...rest,
    };

    const htmlContent = buildEmailHtml(type, d);
    const subjectType = type === 'bundle' ? 'Pack Maths + PC' : type === 'maths' ? 'Maths' : 'Physique-Chimie';
    const subject     = `[Beta] ${subjectType} — ${d.prenom || 'Anonyme'}`;

    const sendSmtpEmail          = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender         = { name: "C'Réussite", email: process.env.FROM_EMAIL };
    sendSmtpEmail.to             = [{ email: BETA_EMAIL }];
    sendSmtpEmail.subject        = subject;
    sendSmtpEmail.htmlContent    = htmlContent;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[beta] Retour reçu — ${type} — ${d.prenom || 'Anonyme'}`);

    res.json({ ok: true });
  } catch (err) {
    console.error('[beta] Erreur :', err.message);
    res.status(500).json({ error: "Erreur lors de l'envoi. Réessaie dans quelques instants." });
  }
});

module.exports = router;

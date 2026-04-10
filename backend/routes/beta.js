const express = require('express');
const router  = express.Router();

router.use(express.json());

// Allowed values for validation
const VALID = {
  fiches:        ['maths', 'physique'],
  note_globale:  [1, 2, 3, 4, 5],
  clarte:        ['tres_clair', 'globalement_clair', 'moyen', 'pas_clair'],
  presentation:  ['top', 'bien', 'moyenne', 'confuse'],
  couverture:    ['complet', 'quasi_complet', 'lacunes'],
  points_forts:  ['synthese', 'exemples', 'formules', 'mise_en_page', 'structure', 'methodes'],
  ameliorations: ['plus_exemples', 'plus_exos', 'plus_schemas', 'lisibilite', 'couleurs', 'chapitres_manquants', 'erreurs'],
  utilisation:   ['revision_exam', 'complement_cours', 'decouverte', 'regulier'],
  recommandation:['oui_certain', 'oui_probablement', 'pas_sur', 'non'],
  prix:          ['bon_rapport', 'un_peu_cher', 'trop_cher', 'pas_cher'],
};

function isSubset(arr, allowed) {
  return Array.isArray(arr) && arr.every(v => allowed.includes(v));
}

router.post('/', async (req, res) => {
  try {
    const {
      email, prenom, fiches, note_globale, clarte, presentation,
      couverture, points_forts, ameliorations, utilisation,
      recommandation, prix, commentaire
    } = req.body;

    // Required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide.' });
    }
    if (!Array.isArray(fiches) || fiches.length === 0 || !isSubset(fiches, VALID.fiches)) {
      return res.status(400).json({ error: 'Fiches testées invalides.' });
    }
    if (!VALID.note_globale.includes(Number(note_globale))) {
      return res.status(400).json({ error: 'Note globale invalide.' });
    }
    if (!VALID.clarte.includes(clarte)) {
      return res.status(400).json({ error: 'Clarté invalide.' });
    }
    if (!VALID.presentation.includes(presentation)) {
      return res.status(400).json({ error: 'Présentation invalide.' });
    }
    if (!VALID.couverture.includes(couverture)) {
      return res.status(400).json({ error: 'Couverture invalide.' });
    }
    if (!VALID.recommandation.includes(recommandation)) {
      return res.status(400).json({ error: 'Recommandation invalide.' });
    }

    // Optional arrays — validate if provided
    const safeForts = Array.isArray(points_forts) && isSubset(points_forts, VALID.points_forts)
      ? points_forts : [];
    const safeAmel  = Array.isArray(ameliorations) && isSubset(ameliorations, VALID.ameliorations)
      ? ameliorations : [];
    const safeUtil  = VALID.utilisation.includes(utilisation) ? utilisation : null;
    const safePrix  = VALID.prix.includes(prix) ? prix : null;
    const safeComm  = typeof commentaire === 'string' ? commentaire.slice(0, 5000) : '';
    const safePre   = typeof prenom === 'string' ? prenom.slice(0, 100) : '';

    // Insert in Supabase
    const { getClient } = require('../services/db');
    const supabase = getClient();

    const { error } = await supabase.from('beta_feedback').insert({
      email:          email.trim().toLowerCase().slice(0, 320),
      prenom:         safePre,
      fiches:         fiches,
      note_globale:   Number(note_globale),
      clarte:         clarte,
      presentation:   presentation,
      couverture:     couverture,
      points_forts:   safeForts,
      ameliorations:  safeAmel,
      utilisation:    safeUtil,
      recommandation: recommandation,
      prix:           safePrix,
      commentaire:    safeComm,
    });

    if (error) {
      console.error('Beta feedback insert error:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Beta feedback route error:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;

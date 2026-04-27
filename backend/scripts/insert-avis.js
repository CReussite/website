/**
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/insert-avis.js
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const avis = {
  auteur:      'Lucie',
  niveau:      'Terminale',
  matiere:     'Maths et Physique-Chimie',
  note:        5,
  commentaire: "Ces fiches regroupent le cours en une seule page, elles m'aident au quotidien, sont faciles d'accès et très récapitulative. Tu peux voir ton chapitre en un clin d'oeil. Je ne m'en passe plus. Très satisfaite de mon achat.",
  visible:     true,
};

(async () => {
  const { data, error } = await supabase.from('avis').insert(avis).select().single();
  if (error) {
    console.error('Erreur :', error.message);
    process.exit(1);
  }
  console.log('Avis inséré :', data);
})();

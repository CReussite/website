-- Table des avis clients C'Réussite
-- Chaque avis est lié à une matière (une ligne par matière/avis)

CREATE TABLE IF NOT EXISTS avis (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur      text        NOT NULL,                  -- Prénom de l'élève
  niveau      text        NOT NULL,                  -- Ex: "Élève de Terminale"
  matiere     text        NOT NULL,                  -- Ex: "Maths", "Physique-chimie"
  commentaire text        NOT NULL,
  note        integer     CHECK (note >= 1 AND note <= 5),  -- Note de 1 à 5 étoiles
  visible     boolean     DEFAULT true,              -- Modération : false = masqué
  created_at  timestamptz DEFAULT now()
);

-- Index pour filtrer par matière ou visibilité
CREATE INDEX IF NOT EXISTS idx_avis_matiere  ON avis (matiere);
CREATE INDEX IF NOT EXISTS idx_avis_visible  ON avis (visible);

-- Avis de Neyla (Terminale)
INSERT INTO avis (auteur, niveau, matiere, note, commentaire) VALUES
(
  'Neyla',
  'Élève de Terminale',
  'Maths',
  5,
  'Les fiches sont géniales, le cours est très bien expliqué et il y a des méthodes qui s''appliquent à tous les exercices. Il y a aussi des explications sur quand et comment il faut utiliser certaines formules lorsqu''il y en a plusieurs dans un seul chapitre et je trouve ça vraiment utile.'
),
(
  'Neyla',
  'Élève de Terminale',
  'Physique-chimie',
  5,
  'Les fiches sont très complètes. On retrouve le cours entier en une seule page avec des méthodes qui s''appliquent pour tous les exercices. Je les recommande.'
);

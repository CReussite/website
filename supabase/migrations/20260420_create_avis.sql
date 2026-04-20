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

-- Les avis sont insérés manuellement via l'API Supabase (pas via migration).

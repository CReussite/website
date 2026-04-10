-- Beta feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        NOT NULL,
  prenom          text,
  fiches          text[]      NOT NULL,
  note_globale    smallint    NOT NULL CHECK (note_globale BETWEEN 1 AND 5),
  clarte          text        NOT NULL,
  presentation    text        NOT NULL,
  couverture      text        NOT NULL,
  points_forts    text[]      DEFAULT '{}',
  ameliorations   text[]      DEFAULT '{}',
  utilisation     text,
  recommandation  text        NOT NULL,
  prix            text,
  commentaire     text        DEFAULT '',
  created_at      timestamptz DEFAULT now()
);

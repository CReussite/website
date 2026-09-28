-- Table clé-valeur pour les préférences admin (IBAN, BIC, etc.)
CREATE TABLE IF NOT EXISTS admin_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

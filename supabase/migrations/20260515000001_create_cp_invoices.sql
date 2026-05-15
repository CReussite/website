-- Table dédiée aux factures de cours particuliers.
-- Séquence entièrement indépendante de la table orders (préfixe CP-YYYY-NNNNN).
-- Les factures cours particuliers ne doivent PAS apparaître dans orders
-- afin de ne pas polluer le compteur des factures ebooks (CRE-YYYY-NNNNN).

CREATE TABLE IF NOT EXISTS cp_invoices (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number   text        UNIQUE NOT NULL,
  email            text        NOT NULL,
  customer_name    text,
  customer_address text,
  amount           integer     NOT NULL,   -- en centimes
  items            jsonb,
  payment_date     text,
  payment_method   text,
  created_at       timestamptz DEFAULT now()
);

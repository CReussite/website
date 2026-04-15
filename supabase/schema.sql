-- Table des commandes C'Réussite
-- À exécuter dans : Supabase → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  product_id        text        NOT NULL,
  amount            integer     NOT NULL,           -- en centimes (ex: 1499 = 14,99 €)
  stripe_session_id text        UNIQUE NOT NULL,    -- idempotence : empêche les doublons
  invoice_number    text        NOT NULL,           -- ex: CRE-2026-00001
  created_at        timestamptz DEFAULT now()
);

-- Index pour accélérer les lookups par email ou session
CREATE INDEX IF NOT EXISTS idx_orders_email           ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session  ON orders (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number  ON orders (invoice_number);

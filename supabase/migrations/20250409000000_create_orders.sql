-- Migration: création de la table des commandes C'Réussite
-- Appliquée automatiquement par la GitHub integration Supabase

CREATE TABLE IF NOT EXISTS orders (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  product_id        text        NOT NULL,
  amount            integer     NOT NULL,
  stripe_session_id text        UNIQUE NOT NULL,
  invoice_number    text        NOT NULL,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_email           ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session  ON orders (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number  ON orders (invoice_number);

-- Migration: ajout du champ email_sent sur la table orders
-- Permet de savoir si l'email de livraison a bien été envoyé,
-- et de relancer l'envoi en cas d'échec sans risque de doublon.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_email_sent ON orders (email_sent)
  WHERE email_sent = false;

-- Migration : renommer stripe_session_id → payment_session_id dans la table orders
-- Passage du système de paiement Stripe → Stancer.
ALTER TABLE orders RENAME COLUMN stripe_session_id TO payment_session_id;

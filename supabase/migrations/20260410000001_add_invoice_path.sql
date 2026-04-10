-- Migration: ajout du champ invoice_path sur la table orders
-- Stocke le chemin du PDF facture dans Supabase Storage (bucket "invoices").
-- Null si l'archivage a échoué (non bloquant).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS invoice_path text;

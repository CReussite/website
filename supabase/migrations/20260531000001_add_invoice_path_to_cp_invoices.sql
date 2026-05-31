-- Stockage du chemin PDF dans Supabase Storage (même convention que orders).
ALTER TABLE cp_invoices ADD COLUMN IF NOT EXISTS invoice_path text;

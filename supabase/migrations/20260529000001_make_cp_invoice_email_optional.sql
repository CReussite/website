-- L'email client est optionnel pour les factures de cours particuliers.
ALTER TABLE cp_invoices
  ALTER COLUMN email DROP NOT NULL;

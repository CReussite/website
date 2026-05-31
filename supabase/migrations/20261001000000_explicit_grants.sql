-- Grants explicites requis par la nouvelle politique Supabase (enforced Oct 2026).
-- Le backend utilise exclusivement service_role ; les rôles anon/authenticated
-- ne doivent PAS avoir accès aux données métier de ce projet.
GRANT ALL ON TABLE orders           TO service_role;
GRANT ALL ON TABLE cp_invoices      TO service_role;
GRANT ALL ON TABLE avis             TO service_role;
GRANT ALL ON TABLE extract_requests TO service_role;
GRANT ALL ON TABLE beta_feedback    TO service_role;

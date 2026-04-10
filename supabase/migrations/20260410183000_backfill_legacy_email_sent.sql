-- Backfill des commandes historiques :
-- avant l'ajout du champ email_sent le 10 avril 2026, les commandes
-- déjà livrées restent à false par défaut. On les marque comme envoyées.

UPDATE orders
SET email_sent = true
WHERE email_sent = false
  AND created_at < TIMESTAMPTZ '2026-04-10 00:00:00+00';

-- Les tokens EXTRAIT15 ne conservent plus l'email du demandeur.
-- Le token (UUID aléatoire) suffit à valider la remise et à bloquer sa réutilisation.
-- Met la base en conformité avec la politique de confidentialité
-- (adresses du formulaire d'extrait non conservées en base).
-- La suppression de la colonne efface aussi les adresses enregistrées depuis le 06/09/2026.
DROP INDEX IF EXISTS extrait_tokens_email_idx;
ALTER TABLE extrait_tokens DROP COLUMN IF EXISTS email;

-- Migration : purger les commandes de test avant la mise en production
-- ⚠️  À exécuter UNE SEULE FOIS, juste avant le passage en production,
--     après confirmation explicite de la propriétaire.
--     Cette opération est IRRÉVERSIBLE.
--
-- Remet le compteur de numéros de facture à zéro (CRE-2026-00001 pour la 1ère vraie commande).
DELETE FROM orders;

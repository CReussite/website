-- Migration : anonymiser les emails dans extract_requests (RGPD)
-- Les adresses collectées via le formulaire d'extrait ne sont plus stockées.
UPDATE extract_requests SET email = 'anonyme' WHERE email != 'anonyme';

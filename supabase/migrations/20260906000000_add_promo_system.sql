-- ── Codes promo ─────────────────────────────────────────────────────────────
-- type : 'public' (RENTREE10) | 'eleve' (codes nominatifs + parrainage)
-- EXTRAIT15 est géré via la table extrait_tokens (token unique 24h par personne)
CREATE TABLE IF NOT EXISTS promo_codes (
  code             text PRIMARY KEY,
  type             text        NOT NULL CHECK (type IN ('public', 'eleve')),
  discount_percent integer     NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  expires_at       timestamptz,                  -- null = pas d'expiration
  owner_email      text,                         -- obligatoire pour type='eleve'
  active           boolean     DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- Code de rentrée public
INSERT INTO promo_codes (code, type, discount_percent, expires_at)
VALUES ('RENTREE10', 'public', 10, '2026-09-30 21:59:59+00')  -- 23:59:59 heure de Paris (UTC+2)
ON CONFLICT (code) DO NOTHING;

-- ── Tokens EXTRAIT15 ─────────────────────────────────────────────────────────
-- Un token par envoi d'extrait : unique, lié à l'email, expire 24h après envoi
CREATE TABLE IF NOT EXISTS extrait_tokens (
  token      text PRIMARY KEY,
  email      text        NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz              -- null = pas encore utilisé
);

CREATE INDEX IF NOT EXISTS extrait_tokens_email_idx ON extrait_tokens (email);

-- ── Paiements en attente ─────────────────────────────────────────────────────
-- Créés lors du checkout, utilisés pour la réconciliation Stancer (cron horaire)
CREATE TABLE IF NOT EXISTS pending_payments (
  payment_id        text PRIMARY KEY,
  product_id        text        NOT NULL,
  email             text,
  promo_code        text,
  original_amount   integer     NOT NULL,          -- prix catalogue en centimes
  discounted_amount integer     NOT NULL,          -- montant facturé à Stancer
  created_at        timestamptz DEFAULT now(),
  confirmed         boolean     DEFAULT false,
  confirmed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS pending_payments_unconfirmed_idx
  ON pending_payments (confirmed, created_at)
  WHERE confirmed = false;

-- ── Colonnes supplémentaires dans orders ─────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code       text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_amount  integer;  -- prix avant remise

-- ── Permissions RLS (service role uniquement) ─────────────────────────────────
ALTER TABLE promo_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrait_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_payments  ENABLE ROW LEVEL SECURITY;

-- Le service role bypass RLS automatiquement — pas de policy supplémentaire nécessaire

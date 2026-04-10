CREATE TABLE IF NOT EXISTS extract_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  product_id  text        NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  source      text        NOT NULL DEFAULT 'website'
);

CREATE INDEX IF NOT EXISTS idx_extract_requests_sent_at
  ON extract_requests (sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_extract_requests_email
  ON extract_requests (email);

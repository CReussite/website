// ── Authentification admin à double facteur (2FA) ─────────────────────────────
//
// Modèle : mot de passe (ADMIN_KEY) PUIS second facteur (code TOTP d'une app
// authenticator, ou code à usage unique envoyé par email). Une fois les deux
// facteurs validés, le backend délivre un « jeton de session » signé et expirable
// qui remplace la clé brute dans toutes les requêtes suivantes.
//
// Les jetons sont SANS ÉTAT (stateless) : signés en HMAC-SHA256 avec ADMIN_KEY
// comme clé. Ils survivent aux redémarrages de Render sans table de session, et
// une rotation d'ADMIN_KEY invalide automatiquement tous les jetons existants.

const crypto = require('crypto');
const { authenticator } = require('otplib');

// Tolérance d'une fenêtre (±30 s) pour absorber le décalage d'horloge du téléphone.
authenticator.options = { window: 1 };

// Durées de vie (secondes)
const TTL = {
  preauth:  5 * 60,        // ticket « mot de passe OK », le temps de saisir le 2e facteur
  emailotp: 10 * 60,       // validité du code reçu par email
  session:  12 * 60 * 60,  // session admin active
};

function signingKey() {
  const key = process.env.ADMIN_KEY;
  if (!key) throw new Error('ADMIN_KEY non configurée');
  return key;
}

/** La 2FA est-elle configurable côté serveur ? (ADMIN_KEY présente) */
function isConfigured() {
  return !!process.env.ADMIN_KEY;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function hmac(data) {
  return crypto.createHmac('sha256', signingKey()).update(data).digest();
}

/**
 * Signe un jeton `base64url(payload).base64url(hmac)`.
 * @param {string} typ   - 'preauth' | 'emailotp' | 'session'
 * @param {object} extra - données additionnelles à embarquer (ex: codeHash)
 */
function signToken(typ, extra = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { typ, iat: now, exp: now + (TTL[typ] || 300), ...extra };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = b64url(hmac(payloadB64));
  return `${payloadB64}.${sig}`;
}

/**
 * Vérifie un jeton et son type. Retourne le payload si valide, sinon null.
 * @param {string} token
 * @param {string} expectedTyp
 */
function verifyToken(token, expectedTyp) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  let expected, provided;
  try {
    expected = hmac(payloadB64);
    provided = Buffer.from(sigB64, 'base64url');
  } catch {
    return null;
  }
  if (expected.length !== provided.length) return null;
  if (!crypto.timingSafeEqual(expected, provided)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload.typ !== expectedTyp) return null;
  if (!payload.exp || Math.floor(Date.now() / 1000) >= payload.exp) return null;
  return payload;
}

/** Compare un mot de passe fourni à ADMIN_KEY, à temps constant. */
function verifyPassword(input) {
  if (typeof input !== 'string' || !isConfigured()) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(process.env.ADMIN_KEY);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── TOTP (app authenticator) ───────────────────────────────────────────────────

function generateTotpSecret() {
  return authenticator.generateSecret(); // secret base32
}

/** URI otpauth:// à encoder dans le QR code. */
function totpKeyuri(secret, account = "C'Reussite admin", issuer = "C'Reussite") {
  return authenticator.keyuri(account, issuer, secret);
}

function verifyTotp(code, secret) {
  if (!code || !secret) return false;
  try {
    return authenticator.verify({ token: String(code).trim(), secret });
  } catch {
    return false;
  }
}

// ── Code email (secours) ────────────────────────────────────────────────────────

/** Génère un code numérique à 6 chiffres (cryptographiquement aléatoire). */
function generateEmailCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Empreinte HMAC d'un code email, embarquée dans le jeton `emailotp` (jamais le code en clair). */
function hashEmailCode(code) {
  return b64url(hmac('emailotp:' + String(code).trim()));
}

// ── Middleware : exige un jeton de session valide ───────────────────────────────

function readToken(req) {
  return (
    req.headers['x-admin-key'] ||
    req.query.key ||
    req.query.admin_key ||
    ''
  );
}

function requireSession(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'ADMIN_KEY non configurée sur le serveur.' });
  }
  const token = readToken(req);
  const payload = verifyToken(token, 'session');
  if (!payload) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
  req.adminSession = payload;
  next();
}

module.exports = {
  TTL,
  isConfigured,
  signToken,
  verifyToken,
  verifyPassword,
  generateTotpSecret,
  totpKeyuri,
  verifyTotp,
  generateEmailCode,
  hashEmailCode,
  requireSession,
};

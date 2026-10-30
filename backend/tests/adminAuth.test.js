const { test } = require('node:test');
const assert = require('node:assert');
const { authenticator } = require('otplib');

// ADMIN_KEY doit être présente avant d'utiliser le service (lu paresseusement).
process.env.ADMIN_KEY = 'test-admin-key-123456';

const auth = require('../services/adminAuth');

test('signToken / verifyToken : aller-retour valide', () => {
  const token = auth.signToken('session');
  const payload = auth.verifyToken(token, 'session');
  assert.ok(payload, 'le jeton valide doit être accepté');
  assert.strictEqual(payload.typ, 'session');
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test('verifyToken : rejette un mauvais type', () => {
  const token = auth.signToken('preauth');
  assert.strictEqual(auth.verifyToken(token, 'session'), null);
});

test('verifyToken : rejette un jeton falsifié', () => {
  const token = auth.signToken('session');
  const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
  assert.strictEqual(auth.verifyToken(tampered, 'session'), null);
});

test('verifyToken : rejette un jeton expiré', () => {
  const original = auth.TTL.session;
  auth.TTL.session = -10; // exp dans le passé
  const token = auth.signToken('session');
  auth.TTL.session = original;
  assert.strictEqual(auth.verifyToken(token, 'session'), null);
});

test('verifyToken : rejette la clé brute et le vide', () => {
  assert.strictEqual(auth.verifyToken(process.env.ADMIN_KEY, 'session'), null);
  assert.strictEqual(auth.verifyToken('', 'session'), null);
  assert.strictEqual(auth.verifyToken(null, 'session'), null);
});

test('verifyPassword : vrai sur la bonne clé, faux sinon', () => {
  assert.strictEqual(auth.verifyPassword('test-admin-key-123456'), true);
  assert.strictEqual(auth.verifyPassword('mauvais'), false);
  assert.strictEqual(auth.verifyPassword(''), false);
});

test('TOTP : vérifie un code généré par otplib', () => {
  const secret = auth.generateTotpSecret();
  const code = authenticator.generate(secret);
  assert.strictEqual(auth.verifyTotp(code, secret), true);
  assert.strictEqual(auth.verifyTotp('000000', secret), false);
  assert.strictEqual(auth.verifyTotp(code, auth.generateTotpSecret()), false);
});

test('code email : hash déterministe et sensible au code', () => {
  const h1 = auth.hashEmailCode('123456');
  const h2 = auth.hashEmailCode('123456');
  const h3 = auth.hashEmailCode('654321');
  assert.strictEqual(h1, h2);
  assert.notStrictEqual(h1, h3);
});

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

test('requireSession : accepte un jeton de session valide', () => {
  const token = auth.signToken('session');
  const req = { headers: { 'x-admin-key': token }, query: {} };
  const res = fakeRes();
  let called = false;
  auth.requireSession(req, res, () => { called = true; });
  assert.strictEqual(called, true);
  assert.strictEqual(res.statusCode, null);
});

test('requireSession : refuse la clé brute (401)', () => {
  const req = { headers: {}, query: { key: process.env.ADMIN_KEY } };
  const res = fakeRes();
  let called = false;
  auth.requireSession(req, res, () => { called = true; });
  assert.strictEqual(called, false);
  assert.strictEqual(res.statusCode, 401);
});

test('requireSession : refuse un preauth à la place du session (401)', () => {
  const req = { headers: { 'x-admin-key': auth.signToken('preauth') }, query: {} };
  const res = fakeRes();
  let called = false;
  auth.requireSession(req, res, () => { called = true; });
  assert.strictEqual(called, false);
  assert.strictEqual(res.statusCode, 401);
});

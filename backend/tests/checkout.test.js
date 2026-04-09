/**
 * Test: route /api/checkout (création de session Stripe)
 * Nécessite STRIPE_SECRET_KEY pour le test live.
 * Le test "produit inconnu" fonctionne sans credential.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const https  = require('node:https');
const http   = require('node:http');
const path   = require('node:path');

const PRODUCTS    = require(path.join(__dirname, '../../docs/content/products.json'));
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

// ── Helper: POST JSON ─────────────────────────────────

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const u    = new URL(url);
    const data = JSON.stringify(body);
    const lib  = u.protocol === 'https:' ? https : http;
    const req  = lib.request({
      hostname: u.hostname,
      port:     u.port || (u.protocol === 'https:' ? 443 : 80),
      path:     u.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Tests sans serveur (logique produit) ─────────────

describe('Logique produit', () => {
  test('tous les product_ids reconnus dans le catalogue', () => {
    for (const id of ['maths', 'physique', 'bundle']) {
      assert.ok(id in PRODUCT_MAP, `"${id}" doit exister dans products.json`);
    }
  });

  test('prix en centimes, positifs', () => {
    for (const p of PRODUCTS) {
      assert.ok(p.price > 0 && Number.isInteger(p.price));
    }
  });
});

// ── Test live contre le backend Railway ──────────────

const BACKEND = process.env.BACKEND_URL || 'https://website-production-2f4e.up.railway.app';

describe(`Checkout live (${BACKEND})`, () => {
  test('produit inconnu → 400', { skip: process.env.SKIP_LIVE ? 'SKIP_LIVE défini' : false }, async () => {
    const r = await postJSON(`${BACKEND}/api/checkout`, { product_id: 'inexistant' });
    assert.equal(r.status, 400);
    assert.ok(r.body.error);
  });

  test('product_id valide → URL Stripe retournée', {
    skip: !process.env.STRIPE_SECRET_KEY
      ? 'STRIPE_SECRET_KEY non défini — test live skippé'
      : (process.env.SKIP_LIVE ? 'SKIP_LIVE défini' : false),
  }, async () => {
    const r = await postJSON(`${BACKEND}/api/checkout`, { product_id: 'maths' });
    assert.equal(r.status, 200, `réponse inattendue : ${JSON.stringify(r.body)}`);
    assert.ok(r.body.url, 'doit retourner une URL Stripe');
    assert.ok(r.body.url.startsWith('https://checkout.stripe.com'), 'URL doit être Stripe Checkout');
  });
});

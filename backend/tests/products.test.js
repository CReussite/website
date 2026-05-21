/**
 * Test: validation du catalogue produits (source de vérité)
 * Vérifie que products.json est cohérent et complet.
 */
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');

const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));

const REQUIRED_FIELDS = ['id', 'name', 'price', 'pdf_files'];
const MERCHANT_FIELDS = [
  'merchant_title',
  'description',
  'currency',
  'availability',
  'condition',
  'brand',
  'mpn',
  'link',
  'canonical_link',
  'image_link',
  'google_product_category',
  'product_type',
  'shipping_country',
  'shipping_price',
];

test('products.json contient au moins un produit', () => {
  assert.ok(Array.isArray(PRODUCTS), 'doit être un tableau');
  assert.ok(PRODUCTS.length >= 1, 'doit avoir au moins 1 produit');
});

test('chaque produit a tous les champs requis', () => {
  for (const p of PRODUCTS) {
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in p, `produit "${p.id || '?'}" manque le champ "${field}"`);
    }
  }
});

test('les IDs sont uniques', () => {
  const ids = PRODUCTS.map(p => p.id);
  const unique = new Set(ids);
  assert.equal(unique.size, ids.length, 'les IDs doivent être uniques');
});

test('les prix sont des entiers positifs (centimes)', () => {
  for (const p of PRODUCTS) {
    assert.ok(Number.isInteger(p.price), `prix de "${p.id}" doit être un entier`);
    assert.ok(p.price > 0, `prix de "${p.id}" doit être positif`);
  }
});

test('pdf_files est un tableau non vide de strings', () => {
  for (const p of PRODUCTS) {
    assert.ok(Array.isArray(p.pdf_files), `pdf_files de "${p.id}" doit être un tableau`);
    assert.ok(p.pdf_files.length > 0, `pdf_files de "${p.id}" ne doit pas être vide`);
    for (const f of p.pdf_files) {
      assert.equal(typeof f, 'string', `chaque entrée de pdf_files doit être une string`);
      assert.ok(f.endsWith('.pdf'), `"${f}" doit se terminer par .pdf`);
    }
  }
});

test('le bundle contient plusieurs PDF', () => {
  const bundle = PRODUCTS.find(p => p.id === 'bundle');
  assert.ok(bundle, 'le produit bundle doit exister');
  assert.ok(bundle.pdf_files.length > 1, 'le bundle doit avoir plusieurs PDF');
});

test('chaque produit contient les attributs requis pour Google Merchant Center', () => {
  for (const p of PRODUCTS) {
    for (const field of MERCHANT_FIELDS) {
      assert.ok(field in p, `produit "${p.id}" manque le champ Merchant "${field}"`);
    }
    assert.equal(p.currency, 'EUR', `devise de "${p.id}" doit être EUR`);
    assert.match(p.link, /^https:\/\/c-reussite\.fr\//, `link de "${p.id}" doit être une URL publique`);
    assert.match(p.image_link, /^https:\/\/c-reussite\.fr\//, `image_link de "${p.id}" doit être une URL publique`);
    assert.ok(p.description.length >= 80, `description de "${p.id}" doit être suffisamment descriptive`);
    assert.ok(Number.isInteger(p.shipping_price), `shipping_price de "${p.id}" doit être un entier en centimes`);
  }
});

test('le flux Google Merchant est généré et contient tous les produits', () => {
  const feedPath = path.join(__dirname, '../../docs/google-merchant-feed.xml');
  assert.ok(fs.existsSync(feedPath), 'docs/google-merchant-feed.xml doit exister');

  const feed = fs.readFileSync(feedPath, 'utf8');
  assert.match(feed, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  for (const p of PRODUCTS) {
    assert.ok(feed.includes(`<g:id>${p.id}</g:id>`), `flux Merchant incomplet pour "${p.id}"`);
    assert.ok(feed.includes(`<g:price>${(p.price / 100).toFixed(2)} ${p.currency}</g:price>`), `prix Merchant incohérent pour "${p.id}"`);
  }
});

test('les pages produit exposent un JSON-LD enrichi et cohérent', () => {
  const pages = {
    maths: 'docs/maths-terminale/index.html',
    physique: 'docs/physique-chimie-terminale/index.html',
    bundle: 'docs/pack-maths-physique-chimie/index.html',
  };

  for (const p of PRODUCTS) {
    const html = fs.readFileSync(path.join(__dirname, '../..', pages[p.id]), 'utf8');
    const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    assert.ok(match, `JSON-LD introuvable pour "${p.id}"`);

    const schema = JSON.parse(match[1]);
    const productNode = schema['@graph'].find((node) => node['@type'] === 'Product');
    assert.ok(productNode, `Product JSON-LD introuvable pour "${p.id}"`);
    assert.equal(productNode['@id'], `${p.link}#product`);
    assert.equal(productNode.mpn, p.mpn);
    assert.equal(productNode.offers.price, (p.price / 100).toFixed(2));
    assert.equal(productNode.offers.priceCurrency, p.currency);
    assert.ok(productNode.offers.shippingDetails, `shippingDetails manquant pour "${p.id}"`);
    assert.ok(productNode.offers.hasMerchantReturnPolicy, `hasMerchantReturnPolicy manquant pour "${p.id}"`);
  }
});

/**
 * Test: validation du catalogue produits (source de vérité)
 * Vérifie que products.json est cohérent et complet.
 */
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('node:path');

const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));

const REQUIRED_FIELDS = ['id', 'name', 'price', 'pdf_files'];

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

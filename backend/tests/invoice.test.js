/**
 * Test: génération de facture PDF
 * Ne nécessite aucune credential externe — teste la logique pure.
 */
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { generateInvoice } = require('../services/invoice');

test('generateInvoice retourne un Buffer non vide', async () => {
  const buf = await generateInvoice({
    invoiceNumber: '2025-001',
    email:         'test@example.com',
    productName:   'Fiches Maths Terminale Spécialité',
    amount:        1499,
    date:          new Date('2025-01-15'),
  });

  assert.ok(buf instanceof Buffer, 'le résultat doit être un Buffer');
  assert.ok(buf.length > 1000, `PDF trop petit (${buf.length} octets)`);
  // Un PDF commence toujours par %PDF
  assert.equal(buf.toString('ascii', 0, 4), '%PDF', 'doit commencer par %PDF');
});

test('generateInvoice avec bundle (2499 cts) retourne un Buffer valide', async () => {
  const buf = await generateInvoice({
    invoiceNumber: '2025-002',
    email:         'test@example.com',
    productName:   'Pack Maths + Physique-Chimie',
    amount:        2499,
    date:          new Date('2025-01-15'),
  });
  assert.ok(buf instanceof Buffer && buf.length > 1000, 'PDF bundle invalide');
  assert.equal(buf.toString('ascii', 0, 4), '%PDF');
});

test('generateInvoice avec tous les produits du catalogue', async () => {
  const path     = require('node:path');
  const products = require(path.join(__dirname, '../../docs/content/products.json'));
  for (const p of products) {
    const buf = await generateInvoice({
      invoiceNumber: `2025-00${products.indexOf(p) + 1}`,
      email:         'test@example.com',
      productName:   p.name,
      amount:        p.price,
      date:          new Date(),
    });
    assert.ok(buf instanceof Buffer && buf.length > 1000, `PDF invalide pour ${p.id}`);
    assert.equal(buf.toString('ascii', 0, 4), '%PDF', `${p.id} doit produire un PDF`);
  }
});

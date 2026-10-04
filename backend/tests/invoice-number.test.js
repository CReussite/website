/**
 * Test: numérotation des factures (logique pure, sans base de données)
 *
 * Règle : le prochain numéro est max(numéro existant de l'année) + 1.
 * Garantit une séquence strictement croissante, jamais un numéro déjà
 * utilisé — y compris après suppression d'une facture (régression signalée :
 * "ça me fait le numéro précédent quand je fais une nouvelle facture").
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeNextInvoiceNumber } = require('../services/db');

const YEAR = 2026;

describe('computeNextInvoiceNumber', () => {
  test('première facture de l\'année → 00001', () => {
    assert.equal(computeNextInvoiceNumber([], YEAR), 'CRE-2026-00001');
  });

  test('séquence continue → max + 1', () => {
    const existing = ['CRE-2026-00001', 'CRE-2026-00002', 'CRE-2026-00003'];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00004');
  });

  test('ordre indifférent (non trié) → toujours max + 1', () => {
    const existing = ['CRE-2026-00003', 'CRE-2026-00001', 'CRE-2026-00002'];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00004');
  });

  test('série unifiée ebooks (orders) + cours particuliers (cp_invoices)', () => {
    const existing = ['CRE-2026-00001', 'CRE-2026-00002', 'CRE-2026-00003', 'CRE-2026-00004'];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00005');
  });

  test('RÉGRESSION : un trou (facture supprimée) ne fait jamais reprendre un numéro', () => {
    // Avec l'ancienne logique count+1 : 3 lignes → 00004, qui est < 00005 existant
    // donc finirait par entrer en collision. max+1 doit donner 00006.
    const existing = ['CRE-2026-00001', 'CRE-2026-00002', 'CRE-2026-00005'];
    const next = computeNextInvoiceNumber(existing, YEAR);
    assert.equal(next, 'CRE-2026-00006');
    // Propriété clé : strictement supérieur à tous les numéros existants
    const nextSeq = parseInt(next.slice(-5), 10);
    for (const num of existing) {
      assert.ok(nextSeq > parseInt(num.slice(-5), 10), `${next} doit dépasser ${num}`);
    }
  });

  test('RÉGRESSION : suppression de la dernière facture → le numéro suivant ne régresse pas sous le max restant', () => {
    // Après avoir créé 1..3 puis supprimé la n°3, il reste [1, 2].
    // La prochaine doit être 00003 (max restant + 1), jamais 00002 (le précédent).
    const existing = ['CRE-2026-00001', 'CRE-2026-00002'];
    const next = computeNextInvoiceNumber(existing, YEAR);
    assert.equal(next, 'CRE-2026-00003');
    assert.notEqual(next, 'CRE-2026-00002', 'ne doit jamais rendre le numéro précédent');
  });

  test('isolation par année : les numéros d\'autres années sont ignorés', () => {
    const existing = ['CRE-2025-00042', 'CRE-2026-00001', 'CRE-2024-99999'];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00002');
  });

  test('entrées invalides (null, vide, mauvais format) ignorées sans planter', () => {
    const existing = [null, '', 'FACTURE-X', 'CRE-2026-00007', undefined];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00008');
  });

  test('padding sur 5 chiffres conservé au-delà de 9', () => {
    const existing = ['CRE-2026-00010'];
    assert.equal(computeNextInvoiceNumber(existing, YEAR), 'CRE-2026-00011');
  });
});

/**
 * Test: logique du webhook (avec mocks des services externes)
 * Simule un événement Stripe checkout.session.completed complet.
 *
 * Ce test nécessite STRIPE_SECRET_KEY pour générer une signature valide.
 * Sans credential, les tests de signature sont skippés automatiquement.
 */
const { test, mock, beforeEach, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateInvoice } = require('../services/invoice');

// ── Helpers ───────────────────────────────────────────

function makeSession(overrides = {}) {
  return {
    id:               'cs_test_abc123',
    amount_total:     1499,
    metadata:         { product_id: 'maths' },
    customer_details: { email: 'acheteur@test.com' },
    customer_email:   null,
    ...overrides,
  };
}

// ── Test: invoice pipeline (no external deps) ─────────

describe('Pipeline invoice + email (mocks)', () => {
  test('génère une facture et appelle sendOrderEmail', async () => {
    const calls = [];

    // Mock sendOrderEmail
    const fakeMailer = {
      sendOrderEmail: async (opts) => {
        calls.push(opts);
        return { messageId: 'fake-msg-id' };
      },
    };

    // Mock DB
    const fakeDb = {
      insertOrderIdempotent: async ({ stripeSessionId }) => ({
        order:         { id: 'uuid-fake' },
        invoiceNumber: '2025-001',
        isNew:         true,
      }),
    };

    const session = makeSession();
    const product = { id: 'maths', name: 'Fiches Maths Terminale Spécialité', price: 1499, pdf_files: ['fiches-maths.pdf'] };
    const email   = session.customer_details.email;

    // Simulate webhook business logic (extracted from route)
    const { invoiceNumber, isNew } = await fakeDb.insertOrderIdempotent({
      email,
      productId:       session.metadata.product_id,
      amount:          session.amount_total,
      stripeSessionId: session.id,
    });

    assert.ok(isNew, 'la commande doit être nouvelle');
    assert.equal(invoiceNumber, '2025-001');

    const invoicePdf = await generateInvoice({
      invoiceNumber,
      email,
      productName: product.name,
      amount:      session.amount_total,
      date:        new Date(),
    });

    assert.ok(invoicePdf instanceof Buffer);
    assert.ok(invoicePdf.length > 1000);

    await fakeMailer.sendOrderEmail({ toEmail: email, product, invoicePdf, invoiceNumber });

    assert.equal(calls.length, 1, 'sendOrderEmail doit être appelé une fois');
    assert.equal(calls[0].toEmail, 'acheteur@test.com');
    assert.equal(calls[0].invoiceNumber, '2025-001');
    assert.ok(calls[0].invoicePdf instanceof Buffer);
  });

  test('idempotence : double appel ne génère pas de second envoi', async () => {
    const emails = [];
    const fakeMailer = { sendOrderEmail: async (o) => emails.push(o) };

    let callCount = 0;
    const fakeDb = {
      insertOrderIdempotent: async () => {
        callCount++;
        // Deuxième appel → isNew = false (déjà traité)
        return { order: {}, invoiceNumber: '2025-001', isNew: callCount === 1 };
      },
    };

    const session = makeSession();

    // Premier appel
    const r1 = await fakeDb.insertOrderIdempotent({ stripeSessionId: session.id });
    if (r1.isNew) {
      const pdf = await generateInvoice({ invoiceNumber: r1.invoiceNumber, email: 'x@x.com', productName: 'X', amount: 1499, date: new Date() });
      await fakeMailer.sendOrderEmail({ toEmail: 'x@x.com', product: {}, invoicePdf: pdf, invoiceNumber: r1.invoiceNumber });
    }

    // Second appel (retry Stripe)
    const r2 = await fakeDb.insertOrderIdempotent({ stripeSessionId: session.id });
    if (r2.isNew) {
      await fakeMailer.sendOrderEmail({});
    }

    assert.equal(emails.length, 1, "l'email ne doit être envoyé qu'une seule fois");
    assert.equal(callCount, 2, 'la DB doit être consultée deux fois');
  });
});

// ── Test: signature Stripe (nécessite STRIPE_SECRET_KEY) ──

describe('Stripe webhook signature', () => {
  test('signature valide acceptée, invalide rejetée', { skip: !process.env.STRIPE_SECRET_KEY ? 'STRIPE_SECRET_KEY non défini' : false }, async () => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const secret = 'whsec_test_secret_for_tests_only';

    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: makeSession() } });
    const header  = stripe.webhooks.generateTestHeaderString({ payload, secret });

    // Signature valide
    let event;
    assert.doesNotThrow(() => {
      event = stripe.webhooks.constructEvent(payload, header, secret);
    }, 'signature valide doit être acceptée');
    assert.equal(event.type, 'checkout.session.completed');

    // Signature invalide
    assert.throws(() => {
      stripe.webhooks.constructEvent(payload, 'bad-header', secret);
    }, 'signature invalide doit lever une erreur');
  });
});

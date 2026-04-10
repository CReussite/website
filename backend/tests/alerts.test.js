const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildAlertPayload, getMissingAlertConfig } = require('../services/alerts');

test('buildAlertPayload prefixe le sujet et serialize les details', () => {
  const payload = buildAlertPayload({
    subject: 'Webhook en erreur',
    message: 'Le traitement a echoue.',
    details: {
      stripe_session_id: 'cs_test_123',
      product_id: 'maths',
    },
  });

  assert.equal(payload.subject, '[ALERTE] Webhook en erreur');
  assert.match(payload.text, /stripe_session_id: cs_test_123/);
  assert.match(payload.html, /product_id/);
});

test('getMissingAlertConfig detecte les variables manquantes', () => {
  const previous = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    ALERT_EMAIL: process.env.ALERT_EMAIL,
  };

  delete process.env.BREVO_API_KEY;
  delete process.env.FROM_EMAIL;
  delete process.env.ALERT_EMAIL;

  const missing = getMissingAlertConfig();

  assert.deepEqual(missing.sort(), ['ALERT_EMAIL', 'BREVO_API_KEY', 'FROM_EMAIL']);

  Object.entries(previous).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
});

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const REQUIRED_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BREVO_API_KEY',
  'FROM_EMAIL',
  'FROM_NAME',
];

// ── CORS (autoriser le frontend GitHub Pages) ────────
const allowedOrigins = [
  'https://c-reussite.fr',
  'https://www.c-reussite.fr',
  'https://creussite.github.io',
  // Dev local
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin: (origin, cb) => {
    // Autoriser les requêtes sans origin (Stripe webhook, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
}));

// ── Routes ────────────────────────────────────────────
// /!\ Le webhook Stripe doit recevoir le body RAW → monté en premier
app.use('/webhook', require('./routes/webhook'));

// Checkout session (body JSON)
app.use('/api/checkout', require('./routes/checkout'));

// Envoi d'extrait gratuit
app.use('/api/extract', require('./routes/extract'));

// Admin (commandes, export CSV, téléchargement factures)
app.use('/api/admin', require('./routes/admin'));

// Beta feedback
app.use('/api/beta-feedback', require('./routes/beta'));

app.get('/api/healthz', (req, res) => {
  const missingEnv = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const hasAlerts = Boolean(process.env.ALERT_EMAIL);

  res.status(missingEnv.length ? 503 : 200).json({
    status: missingEnv.length ? 'degraded' : 'ok',
    service: "C'Reussite backend",
    checks: {
      env: missingEnv.length ? 'missing' : 'ok',
      alerting: hasAlerts ? 'configured' : 'not_configured',
    },
    missing_env: missingEnv,
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: "C'Réussite backend" }));

// Diagnostic temporaire (à supprimer après debug)
app.get('/api/debug', async (req, res) => {
  const results = {};
  // Test Supabase
  try {
    const { getClient } = require('./services/db');
    const sb = getClient();
    const { data, error } = await sb.from('beta_feedback').select('*').limit(1);
    results.supabase = error ? { ok: false, error: error.message } : { ok: true, rows: data.length };
  } catch (e) { results.supabase = { ok: false, error: e.message }; }
  // Test Brevo
  try {
    const SibApiV3Sdk = require('sib-api-v3-sdk');
    const dc = SibApiV3Sdk.ApiClient.instance;
    dc.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const api = new SibApiV3Sdk.AccountApi();
    const account = await api.getAccount();
    results.brevo = { ok: true, email: account.email };
  } catch (e) { results.brevo = { ok: false, error: e.message, status: e.status }; }
  // Test products.json path
  try {
    const p = require('path');
    const f = require('fs');
    const pPath = p.join(__dirname, '../docs/content/products.json');
    results.products_json = { ok: f.existsSync(pPath), path: pPath };
  } catch (e) { results.products_json = { ok: false, error: e.message }; }
  // Test assets
  try {
    const p = require('path');
    const f = require('fs');
    const assetPath = p.join(__dirname, 'assets');
    results.assets = { ok: f.existsSync(assetPath), files: f.readdirSync(assetPath) };
  } catch (e) { results.assets = { ok: false, error: e.message }; }
  res.json(results);
});

// Catalogue produits (même source que le frontend)
app.get('/api/products', (req, res) => {
  res.json(require(path.join(__dirname, '../docs/content/products.json')));
});

// ── Démarrage ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] C'Réussite démarré sur le port ${PORT}`);
});

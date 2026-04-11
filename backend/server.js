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

// Beta viewer (pages protégées par mot de passe)
app.use('/api/beta-viewer', require('./routes/betaViewer'));

app.get('/api/healthz', async (req, res) => {
  const missingEnv = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  const isOk = missingEnv.length === 0;
  const uptime = process.uptime();
  const uptimeStr = uptime < 60 ? `${Math.floor(uptime)}s`
    : uptime < 3600 ? `${Math.floor(uptime / 60)}min`
    : `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}min`;

  // Check commandes non livrées (email_sent = false depuis > 10 min)
  let stuckOrders = 0;
  let dbOk = true;
  try {
    const { getClient } = require('./services/db');
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await getClient()
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('email_sent', false)
      .lt('created_at', tenMinAgo);
    if (error) throw error;
    stuckOrders = data?.length ?? 0;
  } catch {
    dbOk = false;
  }

  const hasAlert = stuckOrders > 0;
  const allOk = isOk && dbOk && !hasAlert;

  // JSON pour les appels API (curl, fetch, etc.)
  if (!req.accepts('html') || req.headers['user-agent']?.includes('curl')) {
    return res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      service: "C'Reussite backend",
      checks: { env: isOk ? 'ok' : 'missing', db: dbOk ? 'ok' : 'unreachable', stuck_orders: stuckOrders },
      missing_env: missingEnv,
    });
  }

  // HTML pour le navigateur
  const checks = [
    { label: 'Variables d\'env', ok: isOk, detail: isOk ? 'OK' : `${missingEnv.length} manquante(s)` },
    { label: 'Base de données', ok: dbOk, detail: dbOk ? 'Connectée' : 'Injoignable' },
    { label: 'Livraison emails', ok: stuckOrders === 0, detail: stuckOrders === 0 ? 'Aucune en attente' : `${stuckOrders} bloquée(s)` },
    { label: 'Uptime', ok: true, detail: uptimeStr, neutral: true },
  ];

  const statusText = allOk ? 'Actif' : hasAlert ? 'Alerte' : 'Dégradé';
  const statusColor = allOk ? '#27ae60' : hasAlert ? '#c0392b' : '#e67e22';
  const statusDot = `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${statusColor};margin-right:10px;vertical-align:middle;box-shadow:0 0 8px ${statusColor}60"></span>`;

  const checksHtml = checks.map(c => {
    const color = c.neutral ? '#888' : c.ok ? '#27ae60' : '#c0392b';
    const dot = c.neutral ? '' : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:8px"></span>`;
    return `<div class="row"><span class="label">${c.label}</span><span class="value">${dot}${c.detail}</span></div>`;
  }).join('\n      ');

  res.status(allOk ? 200 : 503).send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>C'Réussite — État du backend</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f6f8; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 2px 20px rgba(0,0,0,0.06); max-width: 420px; width: 100%; overflow: hidden; }
    .header { background: #1a2744; padding: 32px 32px 28px; text-align: center; }
    .header .title { font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: 0.02em; }
    .header .sub { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 4px; }
    .status-bar { display: flex; align-items: center; justify-content: center; padding: 20px 32px; border-bottom: 1px solid #f0f0f0; }
    .status-bar .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${statusColor}; margin-right: 10px; box-shadow: 0 0 8px ${statusColor}50; }
    .status-bar .text { font-size: 1.1rem; font-weight: 700; color: ${statusColor}; }
    .checks { padding: 8px 32px 16px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f5f5f5; }
    .row:last-child { border-bottom: none; }
    .row .label { font-size: 0.88rem; color: #555; font-weight: 500; }
    .row .value { font-size: 0.88rem; color: #333; font-weight: 600; display: flex; align-items: center; }
    .footer { text-align: center; padding: 12px 32px 20px; font-size: 0.72rem; color: #bbb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">C'Réussite</div>
      <div class="sub">Backend · creussite-backend.onrender.com</div>
    </div>
    <div class="status-bar">
      <span class="dot"></span>
      <span class="text">${statusText}</span>
    </div>
    <div class="checks">
      ${checksHtml}
    </div>
    <div class="footer">Render free tier · Frankfurt · ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</div>
  </div>
</body>
</html>`);
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: "C'Réussite backend" }));

// Catalogue produits (même source que le frontend)
app.get('/api/products', (req, res) => {
  res.json(require(path.join(__dirname, '../docs/content/products.json')));
});

// ── Démarrage ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] C'Réussite démarré sur le port ${PORT}`);
});


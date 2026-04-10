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
  const statusLabel = allOk ? '✅ Actif' : hasAlert ? '🚨 Alerte' : '⚠️ Dégradé';
  const statusColor = allOk ? '#27ae60' : hasAlert ? '#c0392b' : '#e67e22';
  const envLabel = isOk ? '✅ OK' : `❌ ${missingEnv.length} manquante(s)`;
  const dbLabel = dbOk ? '✅ Connectée' : '❌ Injoignable';
  const ordersLabel = stuckOrders === 0 ? '✅ Aucune' : `🚨 ${stuckOrders} commande(s) bloquée(s)`;

  res.status(allOk ? 200 : 503).send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>C'Réussite — État du backend</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px 48px; max-width: 440px; width: 90%; text-align: center; }
    .logo { font-size: 1.4rem; font-weight: 700; color: #1a2744; margin-bottom: 4px; }
    .sub { font-size: 0.82rem; color: #888; margin-bottom: 28px; }
    .status { font-size: 2rem; font-weight: 700; color: ${statusColor}; margin-bottom: 24px; }
    .checks { text-align: left; border-top: 1px solid #eee; padding-top: 20px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.92rem; color: #444; border-bottom: 1px solid #f5f5f5; }
    .row span:first-child { font-weight: 600; }
    .footer { margin-top: 24px; font-size: 0.75rem; color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">C'Réussite</div>
    <div class="sub">Backend — creussite-backend.onrender.com</div>
    <div class="status">${statusLabel}</div>
    <div class="checks">
      <div class="row"><span>Variables d'env</span><span>${envLabel}</span></div>
      <div class="row"><span>Base de données</span><span>${dbLabel}</span></div>
      <div class="row"><span>Commandes non livrées</span><span>${ordersLabel}</span></div>
      <div class="row"><span>Uptime</span><span>${uptimeStr}</span></div>
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


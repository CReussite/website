require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

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

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: "C'Réussite backend" }));

// Debug: test Supabase connection (temporaire — à retirer en production)
app.get('/api/debug/db', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await client.from('orders').select('count').limit(1);
    if (error) return res.json({ ok: false, error: error.message, url: process.env.SUPABASE_URL });
    res.json({ ok: true, url: process.env.SUPABASE_URL, data });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Catalogue produits (même source que le frontend)
app.get('/api/products', (req, res) => {
  res.json(require(path.join(__dirname, '../docs/content/products.json')));
});

// ── Démarrage ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] C'Réussite démarré sur le port ${PORT}`);
});

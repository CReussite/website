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

// Envoi d'extrait gratuit
app.use('/api/extract', require('./routes/extract'));

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

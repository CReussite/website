require('dotenv').config();
const express = require('express');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Routes ──────────────────────────────────────────
app.use('/webhook', require('./routes/webhook'));

// Health check (utile pour Railway/Render)
app.get('/', (req, res) => res.json({ status: 'ok', service: "C'Réussite backend" }));

// ── Démarrage ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] C'Réussite backend démarré sur le port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── API Routes (avant les fichiers statiques) ───────
app.use('/webhook', require('./routes/webhook'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: "C'Réussite backend" }));

// ── Site statique (docs/) ────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'docs')));

// Fallback → index.html pour toute route non trouvée
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'docs', 'index.html'));
});

// ── Démarrage ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] C'Réussite démarré sur le port ${PORT}`);
});

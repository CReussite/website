const express = require('express');
const { getOrders }        = require('../services/db');
const { generateInvoice }  = require('../services/invoice');

const router = express.Router();

// ── Middleware auth ───────────────────────────────────────────────────────────
function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return res.status(503).json({ error: 'ADMIN_KEY non configurée sur le serveur.' });
  if (req.query.key !== adminKey) return res.status(401).json({ error: 'Clé invalide.' });
  next();
}

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
// Retourne la liste des commandes en JSON.
// Paramètres optionnels : ?year=2026
router.get('/orders', requireAdminKey, async (req, res) => {
  try {
    const year   = req.query.year ? parseInt(req.query.year) : undefined;
    const orders = await getOrders({ year });
    res.json(orders);
  } catch (err) {
    console.error('[admin] getOrders erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/export ─────────────────────────────────────────────────────
// Génère et télécharge un fichier CSV de toutes les commandes.
// Paramètre optionnel : ?year=2026
router.get('/export', requireAdminKey, async (req, res) => {
  try {
    const year   = req.query.year ? parseInt(req.query.year) : undefined;
    const orders = await getOrders({ year });

    const cols = ['N° Facture', 'Date', 'Email client', 'Produit', 'Montant (€)', 'Email envoyé'];

    function escapeCell(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const rows = orders.map(o => [
      o.invoice_number,
      new Date(o.created_at).toLocaleDateString('fr-FR'),
      o.email,
      o.product_id,
      (o.amount / 100).toFixed(2).replace('.', ','),
      o.email_sent ? 'Oui' : 'Non',
    ].map(escapeCell).join(','));

    const csv = [cols.join(','), ...rows].join('\r\n');

    const filename = year ? `commandes-${year}.csv` : 'commandes.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM UTF-8 pour Excel Windows
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('[admin] export erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/invoice/:invoiceNumber ─────────────────────────────────────
// Re-génère et télécharge la facture PDF à partir des données en base.
router.get('/invoice/:invoiceNumber', requireAdminKey, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const orders = await getOrders({ limit: 1000 });
    const order  = orders.find(o => o.invoice_number === invoiceNumber);

    if (!order) return res.status(404).json({ error: 'Facture introuvable.' });

    const pdfBuffer = await generateInvoice({
      invoiceNumber: order.invoice_number,
      email:         order.email,
      productName:   order.product_id,
      amount:        order.amount,
      date:          new Date(order.created_at),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[admin] invoice erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

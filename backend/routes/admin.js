const express = require('express');
const { getOrders, getAdminStats, getExtractRequests } = require('../services/db');
const { generateInvoice }  = require('../services/invoice');

const router = express.Router();

// ── Middleware auth ───────────────────────────────────────────────────────────
function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return res.status(503).json({ error: 'ADMIN_KEY non configurée sur le serveur.' });
  if (req.query.key !== adminKey) return res.status(401).json({ error: 'Clé invalide.' });
  next();
}

// ── GET /api/admin/config ─────────────────────────────────────────────────────
// Retourne la configuration de l'environnement (mode Stripe).
router.get('/config', requireAdminKey, (req, res) => {
  const key = process.env.STRIPE_SECRET_KEY || '';
  res.json({ stripe_mode: key.startsWith('sk_live_') ? 'live' : 'test' });
});

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

// GET /api/admin/stats
// Retourne les stats calculées depuis la base.
// Paramètre optionnel : ?year=2026
router.get('/stats', requireAdminKey, async (req, res) => {
  try {
    const year  = req.query.year ? parseInt(req.query.year) : undefined;
    const stats = await getAdminStats({ year });
    res.json(stats);
  } catch (err) {
    console.error('[admin] stats erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/extracts', requireAdminKey, async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const extracts = await getExtractRequests({ year });
    res.json(extracts);
  } catch (err) {
    console.error('[admin] extracts erreur :', err.message);
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

// ── GET /api/admin/invoice-data/:invoiceNumber ────────────────────────────────
// Retourne les données de facture en JSON pour la prévisualisation HTML.
router.get('/invoice-data/:invoiceNumber', requireAdminKey, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const orders = await getOrders({ limit: 1000 });
    const order  = orders.find(o => o.invoice_number === invoiceNumber);

    if (!order) return res.status(404).json({ error: 'Facture introuvable.' });

    const path    = require('path');
    const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
    const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

    const product = PRODUCT_MAP[order.product_id];
    const amountEur = order.amount / 100;

    // Construire les lignes de la facture
    let items;
    if (order.product_id === 'bundle' && product) {
      // Le pack contient 2 ebooks — on détaille les lignes
      const mathsProduct = PRODUCT_MAP['maths'];
      const physiqueProduct = PRODUCT_MAP['physique'];
      items = [
        {
          description: `Ebook — ${mathsProduct ? mathsProduct.name : 'Maths Terminale Spécialité'} (PDF)`,
          quantity: 1,
          unit_price: mathsProduct ? mathsProduct.price / 100 : 14.99,
        },
        {
          description: `Ebook — ${physiqueProduct ? physiqueProduct.name : 'Physique-Chimie Terminale Spécialité'} (PDF)`,
          quantity: 1,
          unit_price: physiqueProduct ? physiqueProduct.price / 100 : 14.99,
        },
      ];
      // Ajuster les prix unitaires pour que le total corresponde au prix du pack
      const sumItems = items.reduce((s, i) => s + i.unit_price, 0);
      if (Math.abs(sumItems - amountEur) > 0.01) {
        // Répartir proportionnellement
        items.forEach(item => {
          item.unit_price = Math.round((item.unit_price / sumItems) * amountEur * 100) / 100;
        });
        // Corriger l'arrondi sur le dernier item
        const diff = amountEur - items.reduce((s, i) => s + i.unit_price, 0);
        items[items.length - 1].unit_price = Math.round((items[items.length - 1].unit_price + diff) * 100) / 100;
      }
    } else {
      items = [
        {
          description: `Ebook — ${product ? product.name : order.product_id} (PDF)`,
          quantity: 1,
          unit_price: amountEur,
        },
      ];
    }

    const dateObj = new Date(order.created_at);
    const dateStr = dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });

    res.json({
      invoice_number: order.invoice_number,
      date: dateStr,
      payment_ref: order.stripe_session_id || '—',
      payment_date: dateStr,
      payment_method: 'Carte bancaire',
      customer: {
        name: order.email,
        email: order.email,
        address: '',
      },
      items,
    });
  } catch (err) {
    console.error('[admin] invoice-data erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

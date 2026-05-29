const express = require('express');
const { getOrders, getAdminStats, getExtractRequests, insertCoursParticuliersInvoice, getCoursParticuliersInvoice } = require('../services/db');
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
// Retourne la configuration de l'environnement (mode Stancer).
router.get('/config', requireAdminKey, (req, res) => {
  const key = process.env.STANCER_SECRET_KEY || '';
  res.json({ stancer_mode: key.startsWith('sprod_') ? 'live' : 'test' });
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

    // Facture cours particuliers → table cp_invoices
    if (invoiceNumber.startsWith('CP-')) {
      const cpInvoice = await getCoursParticuliersInvoice(invoiceNumber);
      if (!cpInvoice) return res.status(404).json({ error: 'Facture introuvable.' });

      const pdfBuffer = await generateInvoice({
        invoiceNumber: cpInvoice.invoice_number,
        email:         cpInvoice.email,
        productName:   'Cours particuliers',
        amount:        cpInvoice.amount,
        date:          new Date(cpInvoice.created_at),
        paymentRef:    '—',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-${invoiceNumber}.pdf"`);
      return res.send(pdfBuffer);
    }

    // Facture ebook → table orders
    const orders = await getOrders({ limit: 1000 });
    const order  = orders.find(o => o.invoice_number === invoiceNumber);

    if (!order) return res.status(404).json({ error: 'Facture introuvable.' });

    const pdfBuffer = await generateInvoice({
      invoiceNumber: order.invoice_number,
      email:         order.email,
      productName:   order.product_id,
      amount:        order.amount,
      date:          new Date(order.created_at),
      paymentRef:    order.payment_session_id || '—',
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

    // ── Cours particuliers : données dans cp_invoices ─────────────────────────
    if (invoiceNumber.startsWith('CP-')) {
      const cpInvoice = await getCoursParticuliersInvoice(invoiceNumber);
      if (!cpInvoice) return res.status(404).json({ error: 'Facture introuvable.' });

      const dateObj = new Date(cpInvoice.created_at);
      const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const items = (Array.isArray(cpInvoice.items) && cpInvoice.items.length > 0)
        ? cpInvoice.items.map(function (item) {
            return {
              description: `${item.nature} — ${item.date}`,
              quantity: Number(item.hours),
              unit_price: Number(item.hourly_rate),
              payment_date: item.payment_date || '',
              payment_method: item.payment_method || '',
            };
          })
        : [{ description: 'Cours particuliers', quantity: 1, unit_price: cpInvoice.amount / 100 }];

      const firstPaidItem = Array.isArray(cpInvoice.items)
        ? cpInvoice.items.find(item => item.payment_date || item.payment_method)
        : null;

      return res.json({
        invoice_number: cpInvoice.invoice_number,
        date: dateStr,
        payment_date: cpInvoice.payment_date || firstPaidItem?.payment_date || dateStr,
        payment_ref: '—',
        payment_method: cpInvoice.payment_method || firstPaidItem?.payment_method || '—',
        customer: {
          name: cpInvoice.customer_name || cpInvoice.email,
          email: cpInvoice.email || '',
          address: cpInvoice.customer_address || '',
        },
        items,
      });
    }

    // ── Ebooks : données dans orders ──────────────────────────────────────────
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

    // Date d'émission = date de création de la commande
    // Date de paiement = même date (paiement instantané par carte)
    const paymentDateStr = dateStr;

    res.json({
      invoice_number: order.invoice_number,
      date: dateStr,
      payment_date: paymentDateStr,
      payment_ref: order.payment_session_id || '—',
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

// ── POST /api/admin/cours-particuliers ───────────────────────────────────────
// Génère une facture de cours particuliers et la stocke en base.
router.post('/cours-particuliers', express.json(), requireAdminKey, async (req, res) => {
  try {
    const { customerName, customerEmail, customerAddress, items, paymentDate, paymentMethod } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Données manquantes (nom, cours).' });
    }
    const normalizedItems = items.map(item => ({
      ...item,
      payment_date: item.payment_date || paymentDate || '',
      payment_method: item.payment_method || paymentMethod || '',
    }));

    const hasIncompleteItem = normalizedItems.some(item => (
      !item.nature ||
      !item.date ||
      !item.hours ||
      !item.hourly_rate ||
      !item.payment_date ||
      !item.payment_method
    ));

    if (hasIncompleteItem) {
      return res.status(400).json({ error: 'Cours incomplet (cours, date, montant et paiement requis).' });
    }

    const { invoiceNumber } = await insertCoursParticuliersInvoice({
      customerName,
      customerEmail: customerEmail || '',
      customerAddress,
      items: normalizedItems,
      paymentDate: paymentDate || normalizedItems[0].payment_date,
      paymentMethod: paymentMethod || normalizedItems[0].payment_method,
    });

    res.json({ invoiceNumber });
  } catch (err) {
    console.error('[admin] cours-particuliers erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

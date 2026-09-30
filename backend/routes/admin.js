const express = require('express');
const { getOrders, getAdminStats, getExtractRequests, insertCoursParticuliersInvoice, getCpInvoices, getCoursParticuliersInvoice, markCpInvoicePaid, deleteCoursParticuliersInvoice, uploadInvoicePdf, getAdminSettings, setAdminSetting, getNextCpInvoiceNumber } = require('../services/db');
const { generateInvoice, generateCpInvoice } = require('../services/invoice');

const router = express.Router();

// Convertit "2026-05-10" → "10/05/2026" ; laisse intact si déjà formaté (ex: "03/05/2026")
function fmtDate(d) {
  if (!d) return d;
  const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : d;
}


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

// ── GET /api/admin/settings ──────────────────────────────────────────────────
router.get('/settings', requireAdminKey, async (req, res) => {
  try {
    const s = await getAdminSettings();
    if (!s.rib_iban && process.env.CP_INVOICE_IBAN)           s.rib_iban = process.env.CP_INVOICE_IBAN;
    if (!s.rib_bic  && process.env.CP_INVOICE_BIC)            s.rib_bic  = process.env.CP_INVOICE_BIC;
    if (!s.rib_titulaire && process.env.CP_INVOICE_ACCOUNT_HOLDER) s.rib_titulaire = process.env.CP_INVOICE_ACCOUNT_HOLDER;
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/admin/settings ─────────────────────────────────────────────────
router.post('/settings', requireAdminKey, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key requis' });
    await setAdminSetting(key, value || '');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/admin/next-invoice-number ───────────────────────────────────────
router.get('/next-invoice-number', requireAdminKey, async (req, res) => {
  try { res.json({ number: await getNextCpInvoiceNumber() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
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

    // Essaie cp_invoices d'abord (préfixe CRE- ou CP- legacy), sinon ebooks
    const cpInvoice = await getCoursParticuliersInvoice(invoiceNumber);
    if (cpInvoice) {
      const cpItems = Array.isArray(cpInvoice.items) && cpInvoice.items.length > 0
        ? cpInvoice.items.map(item => ({
            description: `${item.nature} - ${fmtDate(item.date)}`,
            hours: Number(item.hours),
            hourlyRate: Number(item.hourly_rate),
            paymentDate: fmtDate(item.payment_date || ''),
            paymentMethod: item.payment_method || '',
            status: item.status || '',
          }))
        : [{ description: 'Cours particuliers', hours: 1, hourlyRate: cpInvoice.amount / 100 }];

      const isPaid = cpInvoice.payment_method !== 'À payer';
      const pdfBuffer = await generateCpInvoice({
        invoiceNumber:   cpInvoice.invoice_number,
        customerName:    cpInvoice.customer_name || cpInvoice.email || '—',
        customerAddress: cpInvoice.customer_address || '',
        items:           cpItems,
        invoiceDate:     new Date(cpInvoice.created_at),
        paymentDate:     fmtDate(cpInvoice.payment_date || ''),
        paymentMethod:   'À payer',
        rib:             cpInvoice.rib || {},
        acquittedDate:   isPaid ? fmtDate(cpInvoice.payment_date || '') : null,
        acquittedMethod: isPaid ? (cpInvoice.payment_method || '') : null,
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

    // ── Cours particuliers : essaie cp_invoices d'abord (CRE- ou CP- legacy) ───
    const cpInvoice = await getCoursParticuliersInvoice(invoiceNumber);
    if (cpInvoice) {

      const dateObj = new Date(cpInvoice.created_at);
      const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const items = (Array.isArray(cpInvoice.items) && cpInvoice.items.length > 0)
        ? cpInvoice.items.map(function (item) {
            return {
              date:           fmtDate(item.date),
              nature:         item.nature || 'Cours particuliers',
              quantity:       Number(item.hours),
              unit_price:     Number(item.hourly_rate),
              payment_date:   fmtDate(item.payment_date || ''),
              payment_method: item.payment_method || '',
              status:         item.status || '',
              is_discount:    Number(item.hourly_rate) < 0,
            };
          })
        : [{ date: '', nature: 'Cours particuliers', quantity: 1, unit_price: cpInvoice.amount / 100, is_discount: false }];

      const firstPaidItem = Array.isArray(cpInvoice.items)
        ? cpInvoice.items.find(item => item.payment_date || item.payment_method)
        : null;

      return res.json({
        invoice_number: cpInvoice.invoice_number,
        invoice_type: 'cp',
        payment_status: cpInvoice.payment_method === 'À payer' || firstPaidItem?.status === 'a_payer' ? 'a_payer' : 'paid',
        payment_details: cpInvoice.rib || {},
        date: dateStr,
        payment_date: fmtDate(cpInvoice.payment_date || firstPaidItem?.payment_date || ''),
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

// ── GET /api/admin/recettes ───────────────────────────────────────────────────
// Livre de recettes : ebooks payés + CP acquittées, triés par date.
router.get('/recettes', requireAdminKey, async (req, res) => {
  try {
    const path = require('path');
    const year = req.query.year ? parseInt(req.query.year) : null;
    const PRODUCTS = require(path.join(__dirname, '../../docs/content/products.json'));
    const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

    // ── Ebooks (orders) ──
    const orders = await getOrders({ limit: 10000 });
    const ebookLines = orders
      .filter(o => !year || new Date(o.created_at).getFullYear() === year)
      .map(o => {
        const product = PRODUCT_MAP[o.product_id];
        const d = new Date(o.created_at);
        return {
          date_sort: d.getTime(),
          date:      d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          invoice_number: o.invoice_number,
          client:    o.email,
          prestation: product ? product.name : o.product_id,
          montant:   o.amount,
          mode:      'Carte bancaire',
          type:      'ebook',
        };
      });

    // ── Cours particuliers acquittés ──
    const cpAll = await getCpInvoices({});
    const cpLines = cpAll
      .filter(inv => inv.payment_method && inv.payment_method !== 'À payer')
      .filter(inv => {
        if (!year) return true;
        const d = inv.payment_date || inv.created_at || '';
        const y = d.includes('/') ? parseInt(d.split('/')[2]) : new Date(d).getFullYear();
        return y === year;
      })
      .map(inv => {
        // date_sort : payment_date est en DD/MM/YYYY
        let dateSort = 0;
        let dateFmt  = inv.payment_date || '';
        if (dateFmt && dateFmt.includes('/')) {
          const [dd, mm, yyyy] = dateFmt.split('/');
          dateSort = new Date(`${yyyy}-${mm}-${dd}`).getTime();
        } else if (inv.created_at) {
          dateSort = new Date(inv.created_at).getTime();
          dateFmt  = new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        const prestation = Array.isArray(inv.items) && inv.items.length
          ? [...new Set(inv.items.filter(i => !i.nature?.toLowerCase().includes('remise')).map(i => i.nature))].join(', ')
          : 'Cours particuliers';
        return {
          date_sort: dateSort,
          date:      dateFmt,
          invoice_number: inv.invoice_number,
          client:    inv.customer_name || inv.email || '—',
          prestation,
          montant:   inv.amount,
          mode:      inv.payment_method,
          type:      'cp',
        };
      });

    const lines = [...ebookLines, ...cpLines].sort((a, b) => a.date_sort - b.date_sort);
    res.json(lines);
  } catch (err) {
    console.error('[admin] recettes erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/cp-invoices ────────────────────────────────────────────────
router.get('/cp-invoices', requireAdminKey, async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : undefined;
    res.json(await getCpInvoices({ year }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/admin/cp-invoices/:invoiceNumber ──────────────────────────────
router.delete('/cp-invoices/:invoiceNumber', requireAdminKey, async (req, res) => {
  try {
    const deleted = await deleteCoursParticuliersInvoice(req.params.invoiceNumber);
    if (!deleted) return res.status(404).json({ error: 'Facture introuvable.' });
    res.json({ ok: true, invoiceNumber: req.params.invoiceNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/admin/cours-particuliers ───────────────────────────────────────
// Génère une facture de cours particuliers et la stocke en base.
router.post('/cours-particuliers', express.json(), requireAdminKey, async (req, res) => {
  try {
    const { customerName, customerEmail, customerAddress, items, paymentDate, paymentMethod, rib, invoiceNumber: explicitNumber } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Données manquantes (nom, cours).' });
    }
    const normalizedItems = items.map(item => {
      const status = item.status || (item.payment_method === 'À payer' ? 'a_payer' : 'paid');
      return {
        ...item,
        status,
        payment_date: status === 'a_payer' ? '' : (item.payment_date || paymentDate || ''),
        payment_method: status === 'a_payer' ? 'À payer' : (item.payment_method || paymentMethod || ''),
      };
    });

    const hasIncompleteItem = normalizedItems.some(item => (
      !item.nature ||
      !item.date ||
      !item.hours ||
      !item.hourly_rate ||
      (item.status !== 'a_payer' && !item.payment_date) ||
      !item.payment_method
    ));

    if (hasIncompleteItem) {
      return res.status(400).json({ error: 'Cours incomplet (cours, date, montant et statut de paiement requis).' });
    }

    const hasUnpaid = normalizedItems.some(item => item.status === 'a_payer');
    const { invoiceNumber } = await insertCoursParticuliersInvoice({
      customerName,
      customerEmail: customerEmail || '',
      customerAddress,
      items: normalizedItems,
      paymentDate: paymentDate || normalizedItems[0].payment_date,
      paymentMethod: paymentMethod || normalizedItems[0].payment_method,
      rib: hasUnpaid && rib ? rib : null,
      invoiceNumber: explicitNumber || null,
    });

    res.json({ invoiceNumber });
  } catch (err) {
    console.error('[admin] cours-particuliers erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/admin/cours-particuliers/:invoiceNumber ────────────────────────
// Marque une facture CP comme payée, régénère et réarchive le PDF.
router.patch('/cours-particuliers/:invoiceNumber', express.json(), requireAdminKey, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const { paymentDate, paymentMethod } = req.body;
    if (!paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'Date et moyen de paiement requis.' });
    }

    const updated = await markCpInvoicePaid(invoiceNumber, { paymentDate, paymentMethod });

    const cpItems = (Array.isArray(updated.items) && updated.items.length > 0)
      ? updated.items.map(item => ({
          description: `${item.nature} - ${fmtDate(item.date)}`,
          hours: Number(item.hours),
          hourlyRate: Number(item.hourly_rate),
          paymentDate: fmtDate(item.payment_date || paymentDate),
          paymentMethod: item.payment_method || paymentMethod,
          status: 'paid',
        }))
      : [{ description: 'Cours particuliers', hours: 1, hourlyRate: updated.amount / 100, paymentDate: fmtDate(paymentDate), paymentMethod }];

    const pdfBuffer = await generateCpInvoice({
      invoiceNumber:   updated.invoice_number,
      customerName:    updated.customer_name || updated.email || '—',
      customerAddress: updated.customer_address || '',
      items:           cpItems,
      invoiceDate:     new Date(updated.created_at),
      paymentDate:     fmtDate(paymentDate),
      paymentMethod,
      rib:             {},
    });

    await uploadInvoicePdf(invoiceNumber, pdfBuffer);

    res.json({ invoiceNumber });
  } catch (err) {
    console.error('[admin] mark-paid erreur :', err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/cours-particuliers/:invoiceNumber ───────────────────────
// Supprime une facture CP (erreur de saisie, ex. RIB manquant) et son PDF archivé.
router.delete('/cours-particuliers/:invoiceNumber', requireAdminKey, async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const deleted = await deleteCoursParticuliersInvoice(invoiceNumber);
    if (!deleted) return res.status(404).json({ error: 'Facture introuvable.' });
    res.json({ invoiceNumber, deleted: true });
  } catch (err) {
    console.error('[admin] delete cours-particuliers erreur :', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const {
  getPromoCodes,
  createPromoCode,
  togglePromoCode,
  getPromoStats,
  countReferralSales,
} = require('../services/db');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  next();
}

// GET /api/admin/promo — liste des codes + stats
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [codes, stats] = await Promise.all([getPromoCodes(), getPromoStats()]);

    // Enrichir chaque code élève avec le compteur de parrainage
    const codesWithStats = await Promise.all(
      codes.map(async (c) => {
        const s = stats[c.code] || { sales: 0, revenue: 0 };
        let referralCount = null;
        if (c.type === 'eleve') {
          referralCount = await countReferralSales(c.code).catch(() => 0);
        }
        return {
          ...c,
          sales:          s.sales,
          revenue_cents:  s.revenue,
          referral_count: referralCount,
        };
      })
    );

    res.json(codesWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/promo — créer un code élève
router.post('/', requireAdmin, express.json(), async (req, res) => {
  const { prenom, email } = req.body;
  if (!prenom || !email) {
    return res.status(400).json({ error: 'prenom et email requis.' });
  }
  // Ex: LUCIE20 — prénom en majuscules + "20"
  const code = prenom.trim().toUpperCase().replace(/[^A-Z]/g, '') + '20';
  if (code.length < 3) {
    return res.status(400).json({ error: 'Prénom trop court.' });
  }

  try {
    const created = await createPromoCode({ code, ownerEmail: email.trim().toLowerCase() });
    res.status(201).json(created);
  } catch (err) {
    if (err.message.includes('duplicate') || err.message.includes('already exists') || err.message.includes('unique')) {
      return res.status(409).json({ error: `Le code ${code} existe déjà.` });
    }
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/promo/:code — activer/désactiver
router.patch('/:code', requireAdmin, express.json(), async (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active (boolean) requis.' });
  }
  try {
    const updated = await togglePromoCode(req.params.code, active);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getClient } = require('../services/db');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await getClient()
      .from('avis')
      .select('auteur, niveau, matiere, note, commentaire')
      .eq('visible', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * Script one-shot : upload les PDFs produit vers Supabase Storage.
 *
 * Buckets cibles :
 *   - product-assets  (privé) : fiches et extraits envoyés aux clients
 *   - beta-assets     (privé) : PDFs du viewer bêta
 *
 * Usage : node scripts/upload-assets.js
 */
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const ASSETS = path.join(__dirname, '..', 'assets');

const FILES = [
  // PDFs envoyés aux acheteurs
  { bucket: 'product-assets', local: 'fiches-maths.pdf' },
  { bucket: 'product-assets', local: 'fiches-physique-chimie.pdf' },
  // Extraits gratuits
  { bucket: 'product-assets', local: 'extrait-maths.pdf' },
  { bucket: 'product-assets', local: 'extrait-physique-chimie.pdf' },
  // PDFs du viewer bêta
  { bucket: 'beta-assets', local: 'maths.pdf' },
  { bucket: 'beta-assets', local: 'physique.pdf' },
];

async function upload({ bucket, local }) {
  const filePath = path.join(ASSETS, local);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Fichier introuvable : ${filePath}`);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(local, buffer, { contentType: 'application/pdf', upsert: true });

  if (error) {
    console.error(`  ✗ ${bucket}/${local} — ${error.message}`);
  } else {
    const size = (buffer.length / 1024).toFixed(0);
    console.log(`  ✓ ${bucket}/${local} (${size} KB)`);
  }
}

(async () => {
  console.log('Upload PDFs vers Supabase Storage...\n');
  for (const f of FILES) await upload(f);
  console.log('\nTerminé.');
})();

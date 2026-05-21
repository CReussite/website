const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const products = require(path.join(root, 'docs/content/products.json'));
const outputPath = path.join(root, 'docs/google-merchant-feed.xml');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function price(product) {
  const amount = (product.price / 100).toFixed(2);
  return `${amount} ${product.currency || 'EUR'}`;
}

function item(product) {
  const additionalImages = (product.additional_image_links || [])
    .filter((url) => url !== product.image_link)
    .slice(0, 10)
    .map((url) => `      <g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`)
    .join('\n');

  return `    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${escapeXml(product.merchant_title || product.name)}</g:title>
      <g:description>${escapeXml(product.description)}</g:description>
      <g:link>${escapeXml(product.link)}</g:link>
      <g:canonical_link>${escapeXml(product.canonical_link || product.link)}</g:canonical_link>
      <g:image_link>${escapeXml(product.image_link)}</g:image_link>
${additionalImages}
      <g:availability>${escapeXml(product.availability || 'in_stock')}</g:availability>
      <g:price>${escapeXml(price(product))}</g:price>
      <g:condition>${escapeXml(product.condition || 'new')}</g:condition>
      <g:brand>${escapeXml(product.brand)}</g:brand>
      <g:mpn>${escapeXml(product.mpn)}</g:mpn>
      <g:google_product_category>${escapeXml(product.google_product_category)}</g:google_product_category>
      <g:product_type>${escapeXml(product.product_type)}</g:product_type>
      <g:shipping>
        <g:country>${escapeXml(product.shipping_country || 'FR')}</g:country>
        <g:service>Livraison numérique immédiate</g:service>
        <g:price>${escapeXml(((product.shipping_price || 0) / 100).toFixed(2))} ${escapeXml(product.currency || 'EUR')}</g:price>
      </g:shipping>
    </item>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>C'Réussite - Produits</title>
    <link>https://c-reussite.fr/</link>
    <description>Flux produits pour Google Merchant Center</description>
${products.map(item).join('\n')}
  </channel>
</rss>
`;

fs.writeFileSync(outputPath, xml, 'utf8');
console.log(`Generated ${path.relative(root, outputPath)} (${products.length} products)`);

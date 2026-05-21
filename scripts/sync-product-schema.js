const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const products = require(path.join(root, 'docs/content/products.json'));

const pages = {
  maths: 'docs/maths-terminale/index.html',
  physique: 'docs/physique-chimie-terminale/index.html',
  bundle: 'docs/pack-maths-physique-chimie/index.html',
};

function pagePath(product) {
  return path.join(root, pages[product.id]);
}

function offerEnhancements(product) {
  return {
    itemCondition: `https://schema.org/${product.condition === 'new' ? 'NewCondition' : product.condition}`,
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: (product.shipping_price / 100).toFixed(2),
        currency: product.currency,
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: product.shipping_country,
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 0,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 0,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: product.shipping_country,
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
      merchantReturnLink: 'https://c-reussite.fr/cgv/',
    },
  };
}

function sync(product) {
  const file = pagePath(product);
  let html = fs.readFileSync(file, 'utf8');
  const scriptMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!scriptMatch) throw new Error(`No JSON-LD script found in ${file}`);

  const schema = JSON.parse(scriptMatch[1]);
  const productNode = schema['@graph'].find((node) => node['@type'] === 'Product');
  if (!productNode) throw new Error(`No Product node found in ${file}`);

  Object.assign(productNode, {
    '@id': `${product.link}#product`,
    url: product.link,
    name: product.merchant_title,
    description: product.description,
    image: product.image_link,
    sku: product.mpn,
    mpn: product.mpn,
    category: product.product_type,
    brand: { '@type': 'Brand', name: product.brand },
  });

  productNode.offers = {
    ...productNode.offers,
    price: (product.price / 100).toFixed(2),
    priceCurrency: product.currency,
    availability: 'https://schema.org/InStock',
    url: product.link,
    ...offerEnhancements(product),
  };

  const nextScript = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`;
  html = html.replace(scriptMatch[0], nextScript);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`Synced ${path.relative(root, file)}`);
}

for (const product of products) {
  sync(product);
}

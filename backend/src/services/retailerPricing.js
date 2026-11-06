const fetch = require('node-fetch');

const pickarooPaths = { snr: 'sr', sm: 'sm-markets' };

function invalidSource(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function parseProductUrl(retailer, productUrl) {
  let url;
  try {
    url = new URL(productUrl);
  } catch {
    throw invalidSource('Paste a valid retailer product link.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw invalidSource('Use an HTTPS product link from the selected retailer.');
  }
  if (retailer === 'landers' && ['landers.ph', 'www.landers.ph'].includes(url.hostname)) {
    const match = url.pathname.match(/^\/[\w-]+\/[\w-]+-(\d+)-\d+\/?$/);
    if (match) {
      return {
        productUrl: `https://www.landers.ph${url.pathname}`,
        fetchUrl: `https://www.landers.ph/rest/V1/products/${match[1]}`,
      };
    }
  }
  const shop = Object.hasOwn(pickarooPaths, retailer) && pickarooPaths[retailer];
  if (shop && ['pickaroo.com', 'www.pickaroo.com'].includes(url.hostname)) {
    const productPath = /^\/[\w-]+\/products\/[\w-]+\/product-detail\/\d+\/[\w%-]+\/?$/;
    if (url.pathname.startsWith(`/${shop}/`) && productPath.test(url.pathname)) {
      const productUrl = `https://pickaroo.com${url.pathname}`;
      return { productUrl, fetchUrl: productUrl };
    }
  }
  throw invalidSource('Use a Landers product page or a branch-specific S&R or SM Markets product page on Pick.A.Roo.');
}

function normalizeSource(source) {
  if (source == null) return null;
  const { retailer, productUrl, pricedQuantity } = source;
  const quantity = Number(pricedQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw invalidSource('Enter the positive quantity covered by the listed price.');
  }
  return { retailer, productUrl: parseProductUrl(retailer, productUrl).productUrl, pricedQuantity: quantity };
}

async function fetchRetailerQuote(retailer, productUrl) {
  const listing = parseProductUrl(retailer, productUrl);
  try {
    const response = await fetch(listing.fetchUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      size: 2 * 1024 * 1024,
      headers: { Accept: retailer === 'landers' ? 'application/json' : 'text/html' },
    });
    if (!response.ok) throw new Error('Product page unavailable');

    let price;
    let priceUnit = '';
    if (retailer === 'landers') {
      const product = await response.json();
      const finalPrice = product.extension_attributes?.final_price;
      price = Number(finalPrice ?? product.price);
    } else {
      const html = await response.text();
      const match = html.match(/<div class="price">\s*(?:&#8369;|₱)\s*([\d,.]+)\s*<span class="product-unit">([^<]*)<\/span>/i);
      price = Number(match?.[1].replaceAll(',', ''));
      priceUnit = match?.[2].trim() || '';
    }
    if (!Number.isFinite(price) || price <= 0) throw new Error('Price unavailable');
    return { price, priceUnit, productUrl: listing.productUrl };
  } catch {
    throw Object.assign(new Error('The retailer’s listed price is unavailable. Try again or enter the cost manually.'), { statusCode: 502 });
  }
}

module.exports = { fetchRetailerQuote, normalizeSource };

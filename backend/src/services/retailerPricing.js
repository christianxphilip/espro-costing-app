const fetch = require('node-fetch');

const pickarooPaths = { snr: 'sr', sm: 'sm-markets' };
const pickarooBranches = {
  snr: { slug: 'sr-nuvali', name: 'S&R Nuvali' },
};

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
    const shareSku = url.pathname === '/' ? url.searchParams.get('sku') : null;
    const sku = match?.[1] || (/^\d{1,18}$/.test(shareSku || '') ? shareSku : null);
    if (sku) {
      const productUrl = new URL(url.pathname, 'https://www.landers.ph');
      if (!match) {
        const name = url.searchParams.get('name');
        if (name) productUrl.searchParams.set('name', name);
        productUrl.searchParams.set('sku', sku);
      }
      return { productUrl: productUrl.href, fetchUrl: `https://www.landers.ph/rest/V1/products/${sku}` };
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
  if (retailer === 'landers') throw invalidSource('Open the item on landers.ph and paste its product link. Search and category pages do not have an item price.');
  if (shop) {
    const name = retailer === 'snr' ? 'S&R' : 'SM Supermarket';
    throw invalidSource(`Open ${name} on Pick.A.Roo, choose a branch, then open the exact item and paste its product link. A store, category, or branch-selection page cannot be synced.`);
  }
  throw invalidSource('Choose Landers, S&R, or SM Supermarket before syncing a price.');
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

function cleanText(text = '') {
  const entities = { amp: '&', quot: '"', apos: "'", '#39': "'", nbsp: ' ', '#34': '"' };
  return text.replace(/&([\w#]+);/g, (match, entity) => entities[entity] || match).trim();
}

async function searchStore(retailer, query) {
  const branch = pickarooBranches[retailer];
  const url = new URL(branch
    ? `https://pickaroo.com/${pickarooPaths[retailer]}/products/${branch.slug}/search`
    : 'https://www.landers.ph/rest/V1/products');
  if (branch) {
    url.searchParams.set('name', query);
  } else {
    const terms = query.match(/[\p{L}\p{N}]+/gu) || [];
    if (!terms.length) return [];
    for (const [index, term] of terms.slice(0, 8).entries()) {
      const key = `searchCriteria[filterGroups][${index}][filters][0]`;
      url.searchParams.set(`${key}[field]`, 'name');
      url.searchParams.set(`${key}[value]`, `%${term}%`);
      url.searchParams.set(`${key}[condition_type]`, 'like');
    }
    url.searchParams.set('searchCriteria[pageSize]', '8');
  }

  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(8000),
    size: 2 * 1024 * 1024,
  });
  if (!response.ok) throw new Error('Retailer search unavailable');

  if (!branch) {
    const { items } = await response.json();
    return items.filter(item => /^\d{1,18}$/.test(item.sku)).map(item => ({
      retailer,
      name: item.name,
      pack: item.extension_attributes?.package_text || '',
      price: Number(item.extension_attributes?.final_price ?? item.price),
      priceUnit: '',
      productUrl: `https://www.landers.ph/?sku=${item.sku}`,
    })).filter(item => Number.isFinite(item.price) && item.price > 0).slice(0, 5);
  }

  const html = await response.text();
  const cards = html.split(/inventory-card"\s+data-inventory-id="\d+"/).slice(1);
  return cards.flatMap(card => {
    const productPath = card.match(/href="([^"]+\/product-detail\/[^"]+)"/)?.[1];
    const name = cleanText(card.match(/<span class="name">([^<]+)<\/span>/)?.[1]);
    const priceMatch = card.match(/<span class="price-new">\s*(?:&#8369;|₱)\s*([\d,.]+)\s*<span class="product-unit">([^<]*)<\/span>/);
    const price = Number(priceMatch?.[1].replaceAll(',', ''));
    if (!productPath || !name || !Number.isFinite(price) || price <= 0) return [];
    const { productUrl } = parseProductUrl(retailer, new URL(productPath, url).href);
    return [{
      retailer,
      branch: branch.name,
      name,
      pack: cleanText(card.match(/<span class="desc">([^<]*)<\/span>/)?.[1]),
      price,
      priceUnit: cleanText(priceMatch[2]),
      productUrl,
    }];
  }).slice(0, 5);
}

async function searchRetailerProducts(value) {
  const query = typeof value === 'string' ? value.trim() : '';
  if (query.length < 3 || query.length > 100) {
    throw invalidSource('Enter a product name between 3 and 100 characters.');
  }
  return Promise.all(['landers', 'snr', 'sm'].map(async retailer => {
    if (retailer === 'sm') return { retailer, products: [], unavailable: true };
    try {
      return { retailer, products: await searchStore(retailer, query) };
    } catch (error) {
      console.warn('Retailer search failed', retailer, error.name);
      return { retailer, products: [], unavailable: true };
    }
  }));
}

module.exports = { fetchRetailerQuote, normalizeSource, searchRetailerProducts };

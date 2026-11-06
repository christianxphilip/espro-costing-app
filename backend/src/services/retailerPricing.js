const fetch = require('node-fetch');

const pickarooPaths = { snr: 'sr', sm: 'sm-markets' };
const pickarooBranches = {
  snr: { slug: 'sr-nuvali', name: 'S&R Nuvali' },
};
const smStoreCode = 'sm_supermarket_sta_rosa';

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
  if (retailer === 'sm' && url.hostname === 'smmarkets.ph') {
    const product = url.pathname.match(/^\/([\w-]+)(?:\.html)?$/);
    if (product) return { productUrl: `https://smmarkets.ph${url.pathname}`, smProductKey: product[1] };
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
    if (listing.smProductKey) {
      const [product] = await searchSm(listing.smProductKey, true);
      if (!product) throw new Error('Price unavailable');
      return { price: product.price, priceUnit: '', productUrl: listing.productUrl };
    }
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

function productWords(text) {
  return text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [];
}

async function searchSm(term, exactProduct = false) {
  const url = new URL('https://smmarkets.ph/graphql');
  const value = JSON.stringify(term);
  const filter = exactProduct ? `url_key:{eq:${value}}` : `name:{match:${value}}`;
  url.searchParams.set('query', `{storeConfig{code} products(filter:{${filter}},pageSize:5){items{sku name url_key url_suffix price_range{minimum_price{final_price{value currency}}}}}}`);
  const response = await fetch(url, {
    headers: { Store: smStoreCode, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
    size: 1024 * 1024,
  });
  if (!response.ok) throw new Error('SM Markets catalog unavailable');
  const { data } = await response.json();
  if (data?.storeConfig?.code !== smStoreCode || !Array.isArray(data.products?.items)) {
    throw new Error('SM Markets did not confirm the Santa Rosa catalog');
  }
  return data.products.items.flatMap(item => {
    const amount = item.price_range?.minimum_price?.final_price;
    const price = Number(amount?.value);
    if (!/^\d+$/.test(item.sku || '') || !/^[\w-]+$/.test(item.url_key || '')
      || amount?.currency !== 'PHP' || !Number.isFinite(price) || price <= 0) return [];
    return [{
      retailer: 'sm',
      branch: 'SM Supermarket Santa Rosa',
      name: item.name,
      pack: '',
      price,
      priceUnit: '',
      productUrl: `https://smmarkets.ph/${item.url_key}${item.url_suffix === '.html' ? '.html' : ''}`,
    }];
  });
}

async function searchStore(retailer, query, matchesProduct) {
  if (retailer === 'sm') {
    const products = await searchSm(query);
    return products.filter(item => matchesProduct(item.name)).slice(0, 5);
  }
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
    url.searchParams.set('searchCriteria[pageSize]', '20');
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
    })).filter(item => Number.isFinite(item.price) && item.price > 0 && matchesProduct(item.name)).slice(0, 5);
  }

  const html = await response.text();
  const cards = html.split(/inventory-card"\s+data-inventory-id="\d+"/).slice(1);
  return cards.flatMap(card => {
    const productPath = card.match(/href="([^"]+\/product-detail\/[^"]+)"/)?.[1];
    const name = cleanText(card.match(/<span class="name">([^<]+)<\/span>/)?.[1]);
    const priceMatch = card.match(/<span class="price-new">\s*(?:&#8369;|₱)\s*([\d,.]+)\s*<span class="product-unit">([^<]*)<\/span>/);
    const price = Number(priceMatch?.[1].replaceAll(',', ''));
    if (!productPath || !name || !Number.isFinite(price) || price <= 0 || !matchesProduct(name)) return [];
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

async function searchRetailerProducts(value, tag = '') {
  const query = typeof value === 'string' ? value.trim() : '';
  if (query.length < 3 || query.length > 100) {
    throw invalidSource('Enter a product name between 3 and 100 characters.');
  }
  if (typeof tag !== 'string' || tag.length > 60) {
    throw invalidSource('The search tag must be 60 characters or fewer.');
  }
  const tagTerms = tag.trim().split(/\s+/);
  const included = tagTerms.filter(term => !term.startsWith('-')).join(' ').trim();
  const excluded = tagTerms.filter(term => term.startsWith('-')).flatMap(productWords);
  const searchQuery = included ? `${included} ${query}` : query;
  const required = tag.trim() ? productWords(searchQuery) : [];
  const matchesProduct = (name) => {
    const words = productWords(name);
    return required.every(word => words.includes(word)) && !excluded.some(word => words.includes(word));
  };
  return Promise.all(['landers', 'snr', 'sm'].map(async retailer => {
    try {
      return { retailer, products: await searchStore(retailer, searchQuery, matchesProduct) };
    } catch (error) {
      console.warn('Retailer search failed', retailer, error.name);
      return { retailer, products: [], unavailable: true };
    }
  }));
}

module.exports = { fetchRetailerQuote, normalizeSource, searchRetailerProducts };

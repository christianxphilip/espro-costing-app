const measures = {
  g: ['weight', 1], kg: ['weight', 1000],
  ml: ['volume', 1], l: ['volume', 1000],
  pc: ['count', 1], pcs: ['count', 1],
};

const differentProduct = /\b(?:alternative|detergent|flavored|flavoured|free|imitation|scented|scrub|shampoo|soap|substitute)\b/;

const words = text => text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [];

function nearWord(first, second) {
  if (Math.min(first.length, second.length) < 4 || Math.abs(first.length - second.length) > 1) return false;
  const [short, long] = first.length <= second.length ? [first, second] : [second, first];
  const index = [...short].findIndex((letter, i) => letter !== long[i]);
  if (index === -1) return true;
  return short.slice(index + 1) === long.slice(index + 1)
    || (short.length < long.length && short.slice(index) === long.slice(index + 1))
    || (short[index] === long[index + 1] && short[index + 1] === long[index] && short.slice(index + 2) === long.slice(index + 2));
}

export function matchScore(query, name) {
  const terms = words(query);
  const listing = words(name);
  const different = listing.some(term => differentProduct.test(term) && !terms.includes(term));
  if (!terms.length || !listing.length) return 0;
  const available = [...listing];
  let matched = 0;
  for (const term of terms) {
    const exact = available.indexOf(term);
    if (exact < 0) continue;
    available.splice(exact, 1);
    matched++;
  }
  if (matched === terms.length) {
    if (different) return 70;
    return listing.some((_, index) => terms.every((term, offset) => term === listing[index + offset])) ? 100 : 92;
  }
  const missing = terms.filter(term => !listing.includes(term));
  for (const term of missing) {
    const near = available.findIndex(word => nearWord(term, word));
    if (near >= 0) {
      available.splice(near, 1);
      matched += 0.65;
    }
  }
  return Math.min(different ? 70 : 89, Math.round(100 * matched / terms.length));
}

export function rankProducts(products, query) {
  return products.map(product => ({ ...product, score: matchScore(query, product.name) }))
    .sort((a, b) => b.score - a.score);
}

export function suggestedQuantity(product, unit) {
  const base = measures[unit.trim().toLowerCase()];
  const rate = product.priceUnit?.trim().match(/^\/\s*(kg|g|ml|l|pcs?)$/i);
  const description = product.pack || product.name;
  const pack = description.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pcs?)\.?$/i);
  const measure = measures[(rate?.[1] || pack?.[2] || '').toLowerCase()];
  if (!base || !measure || base[0] !== measure[0]) return '';
  if (!rate && /\d\s*(?:kg|g|ml|l|pcs?)?\s*(?:x|×|\*|\+)\s*\d|\b(?:pack|packs|set|multipack)\b/i.test(`${product.name} ${product.pack || ''}`)) return '';
  const quantity = (rate ? 1 : Number(pack[1])) * measure[1] / base[1];
  return Number.isFinite(quantity) && quantity > 0 ? quantity : '';
}

export function bestStorePrices(results, query, unit) {
  return results.flatMap(({ products }) => {
    const product = rankProducts(products, query).find(item => item.score >= 92 && suggestedQuantity(item, unit));
    if (!product) return [];
    const pricedQuantity = suggestedQuantity(product, unit);
    return [{ ...product, pricedQuantity, costPerUnit: product.price / pricedQuantity }];
  }).sort((a, b) => b.score - a.score || a.costPerUnit - b.costPerUnit);
}

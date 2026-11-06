import React, { useState } from 'react';
import { ingredientsAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';
import { rankProducts, suggestedQuantity } from '../utils/retailerMatch';

const stores = { landers: 'Landers', snr: 'S&R Nuvali', sm: 'SM Supermarket Santa Rosa' };
const santaRosaCatalog = 'https://smmarkets.ph/';
export default function RetailerPrice({ name, source, unit, tag, onChangeTag, onUsePrice, onRemoveSource, initialResults, showMatch = false }) {
  const [query, setQuery] = useState(null);
  const [results, setResults] = useState(undefined);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchText = query ?? name;
  const pricedQuantity = selected ? (quantity?.unit === unit ? quantity.value : suggestedQuantity(selected, unit)) : '';
  const costPerUnit = selected && unit.trim() && Number(pricedQuantity) > 0 ? selected.price / Number(pricedQuantity) : null;

  const search = async () => {
    if (searchText.trim().length < 3 || loading) return;
    setLoading(true);
    setResults(null);
    setSelected(null);
    setError('');
    try {
      const { data } = await ingredientsAPI.searchRetailers(searchText, tag);
      setResults(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not search the retailers. Try again or enter the cost manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset className="rounded-lg border border-gray-200 p-4 space-y-3" disabled={loading}>
      <div>
        <label className="label" htmlFor="ingredient-retailer-search">Find a retailer price</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="ingredient-retailer-search"
            className="input flex-1 min-w-0"
            value={searchText}
            placeholder="Product or ingredient name"
            maxLength={100}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults(null);
              setSelected(null);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                search();
              }
            }}
          />
          <button type="button" className="btn btn-secondary" disabled={loading || searchText.trim().length < 3} onClick={search}>
            {loading ? 'Searching…' : 'Sync retailer prices'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Searches Landers, S&R Nuvali and SM Supermarket Santa Rosa. You can also enter the cost manually above.</p>
      </div>
      <div>
        <label className="label" htmlFor="ingredient-retailer-tag">Search tag (optional)</label>
        <input
          id="ingredient-retailer-tag"
          className="input"
          value={tag}
          maxLength={60}
          placeholder="e.g. pure -shampoo -ham"
          onChange={(event) => {
            onChangeTag(event.target.value);
            setResults(null);
            setSelected(null);
            setError('');
          }}
        />
        <p className="mt-1 text-xs text-gray-500">Require words in the product name or put a minus before words to exclude, like -shampoo or -ham.</p>
      </div>
      {source && (
        <p className="text-sm">
          Linked product · <a href={source.productUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">View original listing</a>
          <button type="button" onClick={onRemoveSource} className="ml-3 text-gray-600 underline">Remove link</button>
        </p>
      )}
      {(results === undefined ? initialResults : results)?.map(({ retailer, products, unavailable }) => (
        <div key={retailer}>
          <h4 className="text-sm font-semibold">{stores[retailer]}</h4>
          {products.length === 0 && (
            <p className="text-sm text-gray-500">
              {unavailable ? 'Search temporarily unavailable.' : 'No matching products.'}
              {retailer === 'sm' && unavailable && (
                <> <a href={santaRosaCatalog} target="_blank" rel="noreferrer" className="text-blue-700 underline">Open SM Markets</a> to check the branch price manually.</>
              )}
            </p>
          )}
          {(showMatch ? rankProducts(products, searchText) : products).map(product => (
            <button
              key={product.productUrl}
              type="button"
              aria-pressed={selected?.productUrl === product.productUrl}
              className={`mt-1 flex w-full justify-between gap-3 rounded border p-2 text-left text-sm ${selected?.productUrl === product.productUrl ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              onClick={() => { setSelected(product); setQuantity(null); }}
            >
              <span>{product.name}{product.pack && <span className="block text-xs text-gray-500">{product.pack}</span>}</span>
              <span className="whitespace-nowrap">{formatPeso(product.price)}{product.priceUnit || ' / pack'}{showMatch && <span className="block text-xs text-gray-500">{product.score}% name match</span>}</span>
            </button>
          ))}
        </div>
      ))}
      {selected && (
        <div className="space-y-2 rounded bg-gray-50 p-3">
          <label className="label" htmlFor="ingredient-priced-quantity">Quantity covered by the listed price{unit.trim() && ` (${unit.trim()})`}</label>
          <input
            id="ingredient-priced-quantity"
            type="number"
            step="any"
            className="input"
            value={pricedQuantity}
            onChange={(event) => setQuantity({ unit, value: event.target.value })}
          />
          <p className="text-xs text-gray-500">Confirm the quantity in your base unit. For a price per kg, enter 1,000 if your base unit is g.</p>
          {costPerUnit !== null && Number.isFinite(costPerUnit) && (
            <button type="button" className="btn btn-secondary" onClick={() => onUsePrice(costPerUnit, {
              retailer: selected.retailer,
              productUrl: selected.productUrl,
              pricedQuantity: Number(pricedQuantity),
            })}>
              Use ₱{Number(costPerUnit.toPrecision(8))} / {unit.trim()}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </fieldset>
  );
}

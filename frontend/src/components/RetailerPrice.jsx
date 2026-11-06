import React, { useState } from 'react';
import { ingredientsAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

const stores = {
  landers: { name: 'Landers', url: 'https://www.landers.ph/' },
  snr: { name: 'S&R', url: 'https://pickaroo.com/sr/' },
  sm: { name: 'SM Supermarket', url: 'https://pickaroo.com/sm-markets/' },
};

export default function RetailerPrice({ source, unit, onChange, onUsePrice }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const quantity = Number(source?.pricedQuantity);
  const costPerUnit = quote && unit.trim() && quantity > 0 ? quote.price / quantity : null;

  const syncPrice = async () => {
    setLoading(true);
    setQuote(null);
    setError('');
    try {
      const { data } = await ingredientsAPI.getRetailerQuote(source);
      setQuote(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch the price. Try again or enter the cost manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset disabled={loading} className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div>
        <label className="label" htmlFor="ingredient-retailer">Cost source</label>
        <select
          id="ingredient-retailer"
          className="input"
          value={source?.retailer || ''}
          onChange={(event) => {
            const retailer = event.target.value;
            setQuote(null);
            setError('');
            onChange(retailer ? { retailer, productUrl: '', pricedQuantity: '' } : null);
          }}
        >
          <option value="">Enter cost manually</option>
          {Object.entries(stores).map(([key, store]) => <option key={key} value={key}>{store.name}</option>)}
        </select>
      </div>
      {source && (
        <>
          <div>
            <label className="label" htmlFor="ingredient-product-url">Product link</label>
            <input
              id="ingredient-product-url"
              type="url"
              className="input"
              value={source.productUrl}
              required
              onChange={(event) => {
                setQuote(null);
                setError('');
                onChange({ ...source, productUrl: event.target.value });
              }}
            />
            <a href={stores[source.retailer].url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline">
              Browse {stores[source.retailer].name}{source.retailer !== 'landers' && ' on Pick.A.Roo'}
            </a>
          </div>
          <div>
            <label className="label" htmlFor="ingredient-priced-quantity">
              Quantity covered by the listed price{unit.trim() && ` (${unit.trim()})`}
            </label>
            <input
              id="ingredient-priced-quantity"
              type="number"
              step="any"
              className="input"
              required
              value={source.pricedQuantity}
              onChange={(event) => onChange({ ...source, pricedQuantity: event.target.value })}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use the ingredient’s base unit. For a 500 g pack priced by pack, enter 500 if your base unit is g.
              For a price per kg, enter 1,000 if your base unit is g.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-secondary" disabled={!source.productUrl.trim() || loading} onClick={syncPrice}>
              {loading ? 'Checking price…' : 'Sync retailer price'}
            </button>
            {quote && <span>{formatPeso(quote.price)}{quote.priceUnit || ' per pack'}</span>}
            {costPerUnit !== null && Number.isFinite(costPerUnit) && (
              <button type="button" className="btn btn-secondary" onClick={() => onUsePrice(costPerUnit)}>
                Use ₱{Number(costPerUnit.toPrecision(8))} / {unit.trim()}
              </button>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </>
      )}
    </fieldset>
  );
}

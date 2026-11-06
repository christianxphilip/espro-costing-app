import React, { useEffect, useRef, useState } from 'react';
import { ingredientsAPI } from '../services/api';
import { bestStorePrices } from '../utils/retailerMatch';
import RetailerPrice from './RetailerPrice';

const stores = { landers: 'Landers', snr: 'S&R', sm: 'SM' };
const searchKey = ({ name, retailerSearchTag }) => JSON.stringify([name, retailerSearchTag || '']);
const eligible = ingredient => ingredient.costPerUnit === null
  && ingredient.name.trim().length >= 3
  && ingredient.category.trim().toLowerCase() !== 'kitchen prep';

export default function IngredientImportPreview({ ingredients, disabled, onChange }) {
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({});
  const [queue] = useState(() => [...new Map(ingredients.filter(eligible).map(row => [searchKey(row), row])).values()]);
  const dialog = useRef(null);
  const unpriced = ingredients.filter(row => row.costPerUnit === null).length;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let next = 0;
    async function lookup() {
      while (!signal.aborted && next < queue.length) {
        const row = queue[next++];
        const key = searchKey(row);
        try {
          const { data } = await ingredientsAPI.searchRetailers(row.name, row.retailerSearchTag || '', signal);
          if (!signal.aborted) setResults(previous => ({ ...previous, [key]: data.data }));
        } catch {
          if (!signal.aborted) setResults(previous => ({ ...previous, [key]: null }));
        }
      }
    }
    lookup();
    lookup();
    return () => controller.abort();
  }, [queue]);

  useEffect(() => {
    if (selected !== null && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  const ingredient = selected === null ? null : ingredients[selected];
  const pending = queue.length - Object.keys(results).length;
  const applyPrice = (index, { retailer, productUrl, pricedQuantity, costPerUnit }) => {
    onChange(index, { costPerUnit, retailerSource: { retailer, productUrl, pricedQuantity } });
  };

  return (
    <>
      <fieldset disabled={disabled} className="space-y-3">
        <p className="text-sm text-gray-600">
          Select a suggested price to use it. The match percentage compares listing names.
          {unpriced > 0 && ` ${unpriced} unpriced ingredients will save at ₱0.`}
        </p>
        {pending > 0 && <p role="status" className="text-sm text-gray-600">Looking up supermarket prices · {pending} remaining</p>}
        <div className="overflow-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Cost per unit (₱)</th>
                <th className="p-2">Supermarket price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ingredients.map((row, index) => {
                const groups = results[searchKey(row)];
                const prices = groups ? bestStorePrices(groups, row.name, row.unit) : [];
                const awaiting = groups === undefined && queue.some(entry => searchKey(entry) === searchKey(row));
                return (
                  <tr key={index}>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.category}</td>
                    <td className="p-2">{row.unit}</td>
                    <td className="p-2">
                      <input
                        className="input max-w-32"
                        type="number"
                        min="0"
                        step="any"
                        aria-label={`Cost per ${row.unit} for ${row.name}`}
                        value={row.costPerUnit ?? ''}
                        onChange={event => onChange(index, {
                          costPerUnit: event.target.value === '' ? null : event.target.valueAsNumber,
                          retailerSource: null,
                        })}
                      />
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {prices.map((price, rank) => {
                          const active = row.retailerSource?.productUrl === price.productUrl;
                          return (
                            <button
                              key={price.retailer}
                              type="button"
                              aria-pressed={active}
                              className={`rounded-lg border px-3 py-2 text-left ${active ? 'border-green-600 bg-green-50' : rank === 0 ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}
                              onClick={() => applyPrice(index, price)}
                            >
                              <span className="block font-medium">
                                ₱{Number(price.costPerUnit.toPrecision(6))}/{row.unit} · {stores[price.retailer]}
                              </span>
                              <span className="block max-w-52 truncate text-xs" title={price.name}>{price.name}</span>
                              <span className="block text-xs text-gray-600">{active ? 'Applied · ' : rank === 0 ? 'Top match · ' : ''}{price.score}% match</span>
                            </button>
                          );
                        })}
                        {!prices.length && awaiting && <span className="text-xs text-gray-500">Waiting for prices…</span>}
                        {!prices.length && groups && <span className="text-xs text-gray-500">No price ready to apply</span>}
                        <button type="button" className="btn btn-secondary" onClick={() => setSelected(index)}>
                          Find more prices
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>
      {ingredient && (
        <dialog
          ref={dialog}
          aria-labelledby="ingredient-price-title"
          className="m-auto max-h-[90vh] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-xl p-5 backdrop:bg-black/40"
          onClose={() => setSelected(null)}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 id="ingredient-price-title" className="font-semibold">Find more prices for {ingredient.name}</h4>
            <button type="button" className="btn btn-secondary" onClick={() => dialog.current.close()}>Close</button>
          </div>
          <RetailerPrice
            name={ingredient.name}
            unit={ingredient.unit}
            source={ingredient.retailerSource}
            tag={ingredient.retailerSearchTag || ''}
            initialResults={results[searchKey(ingredient)]}
            showMatch
            onChangeTag={retailerSearchTag => onChange(selected, { retailerSearchTag })}
            onRemoveSource={() => onChange(selected, { retailerSource: null })}
            onUsePrice={(costPerUnit, retailerSource) => {
              onChange(selected, { costPerUnit, retailerSource });
              dialog.current.close();
            }}
          />
        </dialog>
      )}
    </>
  );
}

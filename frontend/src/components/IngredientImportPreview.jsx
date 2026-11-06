import React, { useState } from 'react';
import RetailerPrice from './RetailerPrice';

export default function IngredientImportPreview({ ingredients, disabled, onChange }) {
  const [selected, setSelected] = useState(null);
  const unpriced = ingredients.filter(row => row.costPerUnit === null).length;

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <p className="text-sm text-gray-600">
        Search supermarkets, select a listing and confirm its pack size in the ingredient’s unit. You can also enter the cost per unit.
        {unpriced > 0 && ` ${unpriced} unpriced ingredients will save at ₱0.`}
      </p>
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
            {ingredients.map((ingredient, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td className="p-2">{ingredient.name}</td>
                  <td className="p-2">{ingredient.category}</td>
                  <td className="p-2">{ingredient.unit}</td>
                  <td className="p-2">
                    <input
                      className="input max-w-32"
                      type="number"
                      min="0"
                      step="any"
                      aria-label={`Cost per ${ingredient.unit} for ${ingredient.name}`}
                      value={ingredient.costPerUnit ?? ''}
                      onChange={event => onChange(index, {
                        costPerUnit: event.target.value === '' ? null : event.target.valueAsNumber,
                        retailerSource: null,
                      })}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      aria-expanded={selected === index}
                      className="btn btn-secondary"
                      onClick={() => setSelected(selected === index ? null : index)}
                    >
                      {selected === index ? 'Close lookup' : ingredient.retailerSource ? 'Change linked price' : 'Find price'}
                    </button>
                  </td>
                </tr>
                {selected === index && (
                  <tr>
                    <td colSpan={5} className="p-2">
                      <RetailerPrice
                        name={ingredient.name}
                        unit={ingredient.unit}
                        source={ingredient.retailerSource}
                        tag={ingredient.retailerSearchTag || ''}
                        onChangeTag={retailerSearchTag => onChange(index, { retailerSearchTag })}
                        onRemoveSource={() => onChange(index, { retailerSource: null })}
                        onUsePrice={(costPerUnit, retailerSource) => onChange(index, { costPerUnit, retailerSource })}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}

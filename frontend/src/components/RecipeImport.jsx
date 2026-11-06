import React, { useState } from 'react';
import { importAPI, ingredientsAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';
import RetailerPrice from './RetailerPrice';

const key = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
const aliases = {
  kl: 'kg', kilo: 'kg', kilos: 'kg', grams: 'g', liter: 'l', liters: 'l',
  pcs: 'pc', piece: 'pc', pieces: 'pc', cups: 'cup', packs: 'pack',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbps: 'tbsp', tsbp: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', laddle: 'ladle',
};
const unitKey = unit => aliases[key(unit)] || key(unit);
const measures = { g: ['mass', 1], kg: ['mass', 1000], ml: ['volume', 1], l: ['volume', 1000], tsp: ['volume', 5], tbsp: ['volume', 15] };
const message = error => error.response?.data?.message || 'The request failed. Try again.';

function quantityInUnit(line, target) {
  if (line.amount == null || !target) return '';
  const from = unitKey(line.unit);
  const to = unitKey(target);
  if (from === to || (!from && to === 'pc')) return line.amount;
  const a = measures[from];
  const b = measures[to];
  return a && b && a[0] === b[0] ? line.amount * a[1] / b[1] : '';
}

const initializeRecipes = recipes => recipes.map(recipe => ({ ...recipe, unit: '', yield: '' }));

export default function RecipeImport({ initialDraft }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [recipes, setRecipes] = useState(() => initializeRecipes(initialDraft?.recipes || []));
  const [library, setLibrary] = useState(initialDraft?.library || []);
  const [drafts, setDrafts] = useState({});
  const [matches, setMatches] = useState({});
  const [quantities, setQuantities] = useState({});
  const [pricing, setPricing] = useState('');
  const [summary, setSummary] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (file, url) => {
    if ((!file && !url) || busy) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      if (file) body.append('file', file);
      const [workbook, ingredients] = await Promise.all([
        file ? importAPI.uploadRecipes(body) : importAPI.loadRecipeSheet(url),
        ingredientsAPI.getAll({ active: true }),
      ]);
      setRecipes(initializeRecipes(workbook.data.data));
      setLibrary(ingredients.data.data);
      setDrafts({});
      setMatches({});
      setQuantities({});
      setPricing('');
      setSummary(null);
      setSaved(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const revise = change => {
    change();
    setSummary(null);
    setSaved(false);
    setError('');
  };

  const prepOptions = recipes.flatMap((recipe, index) => recipe.prep ? [{ ...recipe, _id: `prep:${index}`, index }] : []);
  const options = new Map([...library, ...prepOptions].map(option => [option._id, option]));
  const names = new Map();
  const payload = recipes.map((recipe, recipeIndex) => ({
    ...recipe,
    lines: recipe.lines.map((line, lineIndex) => {
      const name = key(line.name);
      const exact = library.filter(option => key(option.name) === name);
      const prep = prepOptions.find(option => option.index !== recipeIndex && key(option.name) === name);
      const source = matches[name] || (exact.length === 1 ? exact[0]._id : prep?._id || 'new');
      const selected = options.get(source);
      const field = `${recipeIndex}:${lineIndex}`;
      const draft = drafts[name];
      const unit = source === 'new' ? draft?.unit || '' : selected?.unit || '';
      const edit = quantities[field];
      const quantity = edit?.source === source && edit?.unit === unit ? edit.value : quantityInUnit(line, unit);
      const current = names.get(name) || { name: line.name, units: [] };
      if (source === 'new' && quantity !== 0 && quantity !== '0') current.units.push(unitKey(line.unit));
      names.set(name, current);
      return { ...line, source, unit, quantity, field };
    }),
  }));
  const missing = [...names.entries()].filter(([, entry]) => entry.units.length);
  const updateDraft = (name, fields) => revise(() => setDrafts(previous => ({
    ...previous, [name]: { ...previous[name], ...fields },
  })));

  const review = async action => {
    setBusy(true);
    setError('');
    try {
      const additions = missing.map(([name, entry]) => ({ name: entry.name, ...drafts[name] }));
      const { data } = await importAPI.reviewRecipes(action, { recipes: payload, additions, summary });
      setSummary(data.data);
      setSaved(action === 'save');
    } catch (err) {
      if (err.response?.status === 409) setSummary(null);
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="card space-y-3">
        <h2 className="text-xl font-bold">Kitchen recipe import</h2>
        <p>Drop your workbook or paste a Google Sheets link. Review ingredient matches, supermarket prices, and batch yields before importing.</p>
        <label
          className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6"
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); load(event.dataTransfer.files[0]); }}
        >
          <span className="block font-semibold">Drop an Excel or CSV workbook here, or choose a file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={busy}
            onChange={event => { load(event.target.files[0]); event.target.value = ''; }}
          />
        </label>
        <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); load(null, sheetUrl.trim()); }}>
          <input className="input flex-1" type="url" aria-label="Google Sheets link" placeholder="Paste Google Sheets link" value={sheetUrl} onChange={event => setSheetUrl(event.target.value)} />
          <button className="btn btn-secondary" disabled={busy || !sheetUrl.trim()}>Load Google Sheet</button>
        </form>
      </div>
      {recipes.length > 0 && (
        <fieldset className="space-y-5" disabled={busy || saved}>
          <div className="card space-y-3">
            <h3 className="font-bold">{missing.length} ingredients need prices</h3>
            <p className="text-sm">Match spelling variations to your library or a batch preparation. Enter the purchase unit before applying a supermarket price.</p>
            {[...names.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([name, entry]) => {
              const draft = drafts[name] || {};
              return (
                <details key={name} className="rounded border p-3">
                  <summary className="cursor-pointer">
                    {entry.name} · {entry.units.length ? (draft.cost !== '' && draft.cost != null && draft.unit ? 'Price entered' : 'Needs price') : 'Matched or omitted'}
                  </summary>
                  <label className="mt-2 block">
                    Ingredient source
                    <select className="input" value={matches[name] || ''} onChange={event => revise(() => setMatches({ ...matches, [name]: event.target.value }))}>
                      <option value="">Auto match by name</option>
                      <option value="new">Create a library ingredient</option>
                      {prepOptions.map(option => <option key={option._id} value={option._id}>Prep: {option.name}</option>)}
                      {library.map(option => <option key={option._id} value={option._id}>{option.name} ({option.unit}, {option.category})</option>)}
                    </select>
                  </label>
                  {entry.units.length > 0 && (
                    <div className="mt-2 space-y-3">
                      <p className="text-sm text-gray-600">Recipe units: {[...new Set(entry.units)].filter(Boolean).join(', ') || 'unspecified'}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>Purchase unit
                          <input className="input" value={draft.unit || ''} placeholder="e.g. g, ml, pc" onChange={event => updateDraft(name, { unit: event.target.value, cost: '', source: null })} />
                        </label>
                        <label>Cost per purchase unit (₱)
                          <input type="number" min="0" step="any" className="input" value={draft.cost ?? ''} onChange={event => updateDraft(name, { cost: event.target.value, source: null })} />
                        </label>
                      </div>
                      {pricing === name ? (
                        <RetailerPrice
                          key={name}
                          name={entry.name}
                          unit={draft.unit || ''}
                          source={draft.source}
                          tag={draft.tag || ''}
                          onChangeTag={tag => updateDraft(name, { tag })}
                          onUsePrice={(cost, source) => updateDraft(name, { cost, source })}
                          onRemoveSource={() => updateDraft(name, { source: null })}
                        />
                      ) : (
                        <button type="button" className="btn btn-secondary" onClick={() => setPricing(name)}>Find supermarket price</button>
                      )}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
          <div className="card space-y-3">
            <h3 className="font-bold">{recipes.length} recipes to review</h3>
            <p className="text-sm">Confirm quantities in the matched unit. Enter 0 to intentionally omit a line. For cups, ladles, and weight-to-volume changes, use a measured conversion.</p>
            {payload.map((recipe, index) => {
              const changeRecipe = fields => revise(() => setRecipes(recipes.map((entry, i) => i === index ? { ...entry, ...fields } : entry)));
              return (
                <details key={index} className="rounded border p-3">
                  <summary className="cursor-pointer font-medium">
                    {recipe.name} · {recipe.category} · {recipe.lines.filter(line => line.quantity === '' || (!line.unit && Number(line.quantity) !== 0)).length} quantities to confirm
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <label>
                      <input type="checkbox" checked={recipe.prep} onChange={event => changeRecipe({ prep: event.target.checked })} /> Batch preparation
                    </label>
                    {recipe.prep && (
                      <>
                        <label>Measured batch yield
                          <input className="input" type="number" min="0" step="any" value={recipe.yield} onChange={event => changeRecipe({ yield: event.target.value })} />
                        </label>
                        <label>Yield unit
                          <input className="input" value={recipe.unit} placeholder="e.g. g, ml, portion" onChange={event => changeRecipe({ unit: event.target.value })} />
                        </label>
                      </>
                    )}
                  </div>
                  {recipe.lines.map(line => (
                    <label key={line.field} className="mt-2 grid items-center gap-1 sm:grid-cols-2">
                      <span>
                        {line.name} <span className="text-sm text-gray-500">({line.original || 'amount unspecified'})</span>
                        {options.has(line.source) && (
                          <span className="block text-xs text-gray-500">
                            Matched to {line.source.startsWith('prep:') ? 'Prep: ' : ''}{options.get(line.source).name}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="any"
                          value={line.quantity}
                          onChange={event => revise(() => setQuantities({
                            ...quantities, [line.field]: { source: line.source, unit: line.unit, value: event.target.value },
                          }))}
                        />
                        <span className="min-w-12 text-sm">{line.unit || 'Set unit'}</span>
                      </span>
                    </label>
                  ))}
                </details>
              );
            })}
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => review('preview')}>Preview costs</button>
          {summary && !saved && (
            <button type="button" className="btn btn-primary ml-2" onClick={() => review('save')}>Import reviewed recipes</button>
          )}
        </fieldset>
      )}
      {busy && <p role="status">Working…</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {summary && (
        <div className="card space-y-2">
          <h3 className="font-bold">{saved ? 'Import complete' : 'Ingredient cost preview'}</h3>
          <ul className="divide-y">
            {summary.map((row, index) => (
              <li key={index} className="py-2">
                {row.name} · {row.category} · {row.existing ? 'Already exists · skipped' : row.prep
                  ? `${formatPeso(row.total)} per batch · ${formatPeso(row.costPerUnit, 4)} per ${row.unit}`
                  : `${formatPeso(row.total)} per product`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

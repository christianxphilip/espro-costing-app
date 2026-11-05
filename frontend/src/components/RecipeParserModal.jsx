import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CostSummary from './CostSummary';
import { ingredientsAPI, expensesAPI, aiAPI, itemsAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function RecipeParserModal({ onSave, onCancel }) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState(30);
  const [targetFoodCostPercentInStore, setTargetFoodCostPercentInStore] = useState('');
  const [targetFoodCostPercentEvent, setTargetFoodCostPercentEvent] = useState('');
  const [feesPercent, setFeesPercent] = useState(6.48);
  const [recipeText, setRecipeText] = useState('');
  const [parsedIngredients, setParsedIngredients] = useState([]);
  
  const [ingredientLibrary, setIngredientLibrary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  
  const [currentOperatingExpense, setCurrentOperatingExpense] = useState(0);
  const [currentOperatingExpenseInStore, setCurrentOperatingExpenseInStore] = useState(0);
  const [currentOperatingExpenseEvent, setCurrentOperatingExpenseEvent] = useState(0);

  // For inline library selection per parsed line
  const [activeSelectIndex, setActiveSelectIndex] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');

  useEffect(() => {
    loadIngredientLibrary();
    loadCurrentOperatingExpense();
  }, []);

  const loadIngredientLibrary = async () => {
    try {
      const response = await ingredientsAPI.getAll({ active: 'true' });
      setIngredientLibrary(response.data.data);
    } catch (err) {
      console.error('Error loading ingredient library:', err);
    }
  };

  const loadCurrentOperatingExpense = async () => {
    try {
      const response = await expensesAPI.calculatePerItem();
      const data = response.data.data;
      setCurrentOperatingExpense(data.operatingExpensePerItem || 0);
      setCurrentOperatingExpenseInStore(data.inStore?.operatingExpensePerItem || data.operatingExpensePerItem || 0);
      setCurrentOperatingExpenseEvent(data.event?.operatingExpensePerItem || 0);
    } catch (err) {
      console.error('Error loading operating expense:', err);
    }
  };

  const handleParse = async () => {
    if (!recipeText.trim()) {
      setError('Please paste or type a recipe first');
      return;
    }
    setError('');
    setParsing(true);
    try {
      const response = await aiAPI.parseRecipe({ recipeText });
      if (response.data && response.data.success) {
        setParsedIngredients(response.data.data.map(ing => ({
          ...ing,
          // Guarantee numeric types
          quantity: Number(ing.quantity) || 1,
          costPerUnit: Number(ing.costPerUnit) || 0,
        })));
      } else {
        throw new Error('Failed to parse recipe');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while parsing recipe. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const updateIngredientLine = (index, field, value) => {
    setParsedIngredients(prev => prev.map((ing, i) => {
      if (i === index) {
        const updated = { ...ing, [field]: value };
        // If they change cost or quantity, ensure they are numbers
        if (field === 'quantity') updated.quantity = Number(value) || 0;
        if (field === 'costPerUnit') updated.costPerUnit = Number(value) || 0;
        return updated;
      }
      return ing;
    }));
  };

  const handleSelectLibraryIngredient = (index, libIng) => {
    setParsedIngredients(prev => prev.map((ing, i) => {
      if (i === index) {
        return {
          ...ing,
          matchedName: libIng.name,
          libraryIngredientId: libIng._id,
          unit: libIng.unit,
          costPerUnit: libIng.costPerUnit,
        };
      }
      return ing;
    }));
    setActiveSelectIndex(null);
    setLibrarySearch('');
  };

  const handleMakeCustom = (index) => {
    setParsedIngredients(prev => prev.map((ing, i) => {
      if (i === index) {
        return {
          ...ing,
          libraryIngredientId: null,
        };
      }
      return ing;
    }));
    setActiveSelectIndex(null);
    setLibrarySearch('');
  };

  const removeIngredientLine = (index) => {
    setParsedIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addIngredientLine = () => {
    setParsedIngredients(prev => [
      ...prev,
      {
        recipeLine: 'Custom Line',
        matchedName: 'New Ingredient',
        libraryIngredientId: null,
        quantity: 1,
        unit: 'pc',
        costPerUnit: 0,
      }
    ]);
  };

  // Cost calculations matching ItemForm
  const calculateCosts = () => {
    const ingredientCost = parsedIngredients.reduce(
      (sum, ing) => sum + (Number(ing.quantity || 0) * Number(ing.costPerUnit || 0)), 0
    );

    const inStoreOpex = currentOperatingExpenseInStore;
    const eventOpex = currentOperatingExpenseEvent;

    const inStoreTarget = targetFoodCostPercentInStore !== '' ? Number(targetFoodCostPercentInStore) : Number(targetFoodCostPercent);
    const eventTarget = targetFoodCostPercentEvent !== '' ? Number(targetFoodCostPercentEvent) : Number(targetFoodCostPercent);

    const inStoreCogs = ingredientCost + inStoreOpex;
    const eventCogs = ingredientCost + eventOpex;

    const feesMultiplier = 1 + (Number(feesPercent || 0) / 100);
    const inStorePrice = inStoreTarget > 0 ? (ingredientCost / (inStoreTarget / 100)) * feesMultiplier : 0;
    const eventPrice = eventTarget > 0 ? (ingredientCost / (eventTarget / 100)) * feesMultiplier : 0;

    return {
      ingredientCost,
      operatingExpense: inStoreOpex,
      operatingExpenseInStore: inStoreOpex,
      operatingExpenseEvent: eventOpex,
      cogs: inStoreCogs,
      cogsInStore: inStoreCogs,
      cogsEvent: eventCogs,
      suggestedPrice: inStorePrice,
      suggestedPriceInStore: inStorePrice,
      suggestedPriceEvent: eventPrice,
      targetFoodCostPercent,
      targetFoodCostPercentInStore: targetFoodCostPercentInStore !== '' ? Number(targetFoodCostPercentInStore) : null,
      targetFoodCostPercentEvent: targetFoodCostPercentEvent !== '' ? Number(targetFoodCostPercentEvent) : null,
      feesPercent,
      isPriceLocked: false,
      lockedPrice: null,
    };
  };

  const preview = calculateCosts();

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim() || !category.trim()) {
      setError('Item Name and Category are required');
      return;
    }
    if (parsedIngredients.length === 0) {
      setError('Please add or parse at least one ingredient');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: itemName.trim(),
        category: category.trim(),
        targetFoodCostPercent: Number(targetFoodCostPercent),
        targetFoodCostPercentInStore: targetFoodCostPercentInStore !== '' ? Number(targetFoodCostPercentInStore) : null,
        targetFoodCostPercentEvent: targetFoodCostPercentEvent !== '' ? Number(targetFoodCostPercentEvent) : null,
        feesPercent: Number(feesPercent),
        ingredients: parsedIngredients.map(ing => ({
          name: ing.matchedName,
          quantity: ing.quantity,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit,
        })),
        isActive: true,
      };

      const response = await itemsAPI.create(payload);
      if (response.data && response.data.success) {
        onSave();
      } else {
        throw new Error('Failed to create item');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred while saving item');
    } finally {
      setLoading(false);
    }
  };

  // Library search filtering for dropdown
  const filteredLibrary = ingredientLibrary.filter(ing => 
    ing.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
    ing.category.toLowerCase().includes(librarySearch.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50 rounded-t-xl">
          <div>
            <h2 className="text-2xl font-bold text-orange-950 flex items-center gap-2">
              ✨ Add Menu Item from Recipe
            </h2>
            <p className="text-sm text-orange-800">Paste your raw recipe and map ingredients to create an instant costing sheets.</p>
          </div>
          <button onClick={onCancel} className="text-orange-900 hover:text-orange-950 text-xl font-bold p-2 hover:bg-orange-100 rounded-full transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Form details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Item Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Spanish Latte"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Coffee"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="label">Target FC (%)</label>
                  <input
                    type="number"
                    value={targetFoodCostPercent}
                    onChange={(e) => setTargetFoodCostPercent(e.target.value)}
                    className="input"
                    step="0.1"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">Fees (%)</label>
                  <input
                    type="number"
                    value={feesPercent}
                    onChange={(e) => setFeesPercent(e.target.value)}
                    className="input"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">🏪 In-Store Target %</label>
                  <input
                    type="number"
                    placeholder="Uses default"
                    value={targetFoodCostPercentInStore}
                    onChange={(e) => setTargetFoodCostPercentInStore(e.target.value)}
                    className="input"
                    step="0.1"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="label">🎪 Event Target %</label>
                  <input
                    type="number"
                    placeholder="Uses default"
                    value={targetFoodCostPercentEvent}
                    onChange={(e) => setTargetFoodCostPercentEvent(e.target.value)}
                    className="input"
                    step="0.1"
                    min="1"
                    max="100"
                  />
                </div>
              </div>

              {/* Paste Text Area */}
              <div>
                <label className="label">Paste Raw Recipe Text</label>
                <textarea
                  value={recipeText}
                  onChange={(e) => setRecipeText(e.target.value)}
                  placeholder="Paste recipe instructions or ingredient list here. e.g.&#10;Spanish Latte:&#10;- 2 shots espresso&#10;- 150ml milk&#10;- 30ml condensed milk"
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Separate each ingredient on a new line. Quantities and units will be automatically extracted.
                  </p>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={parsing}
                    className="btn btn-primary text-sm bg-orange-600 hover:bg-orange-700 flex items-center gap-1"
                  >
                    {parsing ? '✨ Parsing...' : '✨ Parse Recipe'}
                  </button>
                </div>
              </div>

              {/* Parsed ingredients review section */}
              {parsedIngredients.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Identify Ingredients ({parsedIngredients.length})</h3>
                    <button
                      type="button"
                      onClick={addIngredientLine}
                      className="text-xs text-orange-600 hover:text-orange-800 font-semibold"
                    >
                      + Add Row Manually
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                          <th className="py-2 px-3">Raw Recipe Line</th>
                          <th className="py-2 px-3">Mapping / Name</th>
                          <th className="py-2 px-3 w-16">Qty</th>
                          <th className="py-2 px-3 w-16">Unit</th>
                          <th className="py-2 px-3 w-24">Cost/Unit</th>
                          <th className="py-2 px-3 w-20 text-right">Total</th>
                          <th className="py-2 px-3 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedIngredients.map((ing, index) => {
                          const isMapped = !!ing.libraryIngredientId;
                          const totalLineCost = Number(ing.quantity || 0) * Number(ing.costPerUnit || 0);
                          
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                              {/* Raw Line */}
                              <td className="py-3 px-3 text-xs text-gray-500 max-w-[150px] truncate" title={ing.recipeLine}>
                                {ing.recipeLine}
                              </td>

                              {/* Mapping Selector */}
                              <td className="py-2 px-3 relative">
                                {activeSelectIndex === index ? (
                                  <div className="absolute left-0 top-0 w-72 bg-white shadow-xl border border-gray-200 rounded-lg p-2 z-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <input
                                        type="text"
                                        placeholder="Search library..."
                                        value={librarySearch}
                                        onChange={(e) => setLibrarySearch(e.target.value)}
                                        className="input text-xs w-full"
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSelectIndex(null);
                                          setLibrarySearch('');
                                        }}
                                        className="text-gray-400 hover:text-gray-600 font-bold"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                      <button
                                        type="button"
                                        onClick={() => handleMakeCustom(index)}
                                        className="w-full text-left px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                      >
                                        Use Custom (Not in Library)
                                      </button>
                                      {filteredLibrary.map(lib => (
                                        <button
                                          key={lib._id}
                                          type="button"
                                          onClick={() => handleSelectLibraryIngredient(index, lib)}
                                          className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                                        >
                                          <div className="font-semibold">{lib.name}</div>
                                          <div className="text-[10px] text-gray-500">{formatPeso(lib.costPerUnit)}/{lib.unit} • {lib.category}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={ing.matchedName}
                                      onChange={(e) => updateIngredientLine(index, 'matchedName', e.target.value)}
                                      className="input py-1 px-2 text-xs font-semibold"
                                      placeholder="Ingredient name"
                                    />
                                    <div className="flex items-center gap-2">
                                      {isMapped ? (
                                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-200 flex items-center gap-1 select-none">
                                          📚 Library matched
                                        </span>
                                      ) : (
                                        <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center gap-1 select-none">
                                          ✏️ Custom ingredient
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSelectIndex(index);
                                          setLibrarySearch('');
                                        }}
                                        className="text-[10px] text-blue-600 hover:underline"
                                      >
                                        {isMapped ? 'Change mapping' : 'Map to Library'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={ing.quantity}
                                  onChange={(e) => updateIngredientLine(index, 'quantity', e.target.value)}
                                  className="input py-1 px-2 text-xs w-16"
                                  step="0.01"
                                  min="0"
                                />
                              </td>

                              {/* Unit */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={ing.unit}
                                  onChange={(e) => updateIngredientLine(index, 'unit', e.target.value)}
                                  className="input py-1 px-2 text-xs w-16"
                                />
                              </td>

                              {/* Cost per unit */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={ing.costPerUnit}
                                  onChange={(e) => updateIngredientLine(index, 'costPerUnit', e.target.value)}
                                  className="input py-1 px-2 text-xs w-20"
                                  step="0.001"
                                  min="0"
                                  disabled={isMapped} // Disable manual edit if mapped to library to preserve integrity
                                  title={isMapped ? 'Unmap or edit in Library to change cost' : 'Edit cost per unit'}
                                />
                              </td>

                              {/* Total Cost */}
                              <td className="py-3 px-3 text-right font-semibold text-gray-700">
                                {formatPeso(totalLineCost)}
                              </td>

                              {/* Actions */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeIngredientLine(index)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                  title="Remove line"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Pricing Preview */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Costing Preview</h3>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <CostSummary item={preview} />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveItem}
                  disabled={loading || parsedIngredients.length === 0}
                  className="btn btn-primary w-full bg-orange-600 hover:bg-orange-700 py-3 flex items-center justify-center gap-2"
                >
                  {loading ? 'Creating Item...' : '💾 Save & Create Menu Item'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default RecipeParserModal;

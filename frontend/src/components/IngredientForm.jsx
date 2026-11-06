import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ingredientsAPI, aiAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';
import RetailerPrice from './RetailerPrice';

function IngredientForm({ ingredient, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    costPerUnit: 0,
    retailerSource: null,
    supplier: '',
    notes: '',
    isPrep: false,
    prepIngredients: [],
    totalOutput: 0,
  });
  
  const [ingredientLibrary, setIngredientLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  
  // Recipe parsing states
  const [recipePasteText, setRecipePasteText] = useState('');
  const [showRecipePasteArea, setShowRecipePasteArea] = useState(false);
  const [parsingRecipe, setParsingRecipe] = useState(false);
  
  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name || '',
        category: ingredient.category || '',
        unit: ingredient.unit || '',
        costPerUnit: ingredient.costPerUnit || 0,
        retailerSource: ingredient.retailerSource || null,
        supplier: ingredient.supplier || '',
        notes: ingredient.notes || '',
        isPrep: ingredient.isPrep || false,
        prepIngredients: ingredient.prepIngredients || [],
        totalOutput: ingredient.totalOutput || 0,
      });
    }
    loadIngredientLibrary();
  }, [ingredient]);
  
  const loadIngredientLibrary = async () => {
    try {
      const response = await ingredientsAPI.getAll({ active: 'true' });
      // Exclude current ingredient being edited to prevent circular references
      const filtered = response.data.data.filter(ing => !ingredient || ing._id !== ingredient._id);
      setIngredientLibrary(filtered);
    } catch (error) {
      console.error('Error loading ingredient library:', error);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      retailerSource: name === 'unit' && prev.retailerSource
        ? { ...prev.retailerSource, pricedQuantity: '' }
        : prev.retailerSource,
    }));
  };
  
  const handlePrepToggle = (e) => {
    const checked = e.target.checked;
    setFormData(prev => ({
      ...prev,
      isPrep: checked,
      unit: checked && !prev.unit ? 'g' : prev.unit,
      totalOutput: checked && prev.totalOutput === 0 ? 1000 : prev.totalOutput,
    }));
  };
  
  const addPrepIngredient = () => {
    setFormData(prev => ({
      ...prev,
      prepIngredients: [...prev.prepIngredients, { name: '', quantity: 0, unit: 'g', costPerUnit: 0 }],
    }));
    setShowLibrary(false);
  };
  
  const addFromLibrary = (libIng) => {
    setFormData(prev => ({
      ...prev,
      prepIngredients: [...prev.prepIngredients, {
        ingredientId: libIng._id,
        name: libIng.name,
        quantity: 1,
        unit: libIng.unit,
        costPerUnit: libIng.costPerUnit,
      }],
    }));
    setShowLibrary(false);
  };
  
  const updatePrepIngredient = (index, field, value) => {
    setFormData(prev => {
      const updatedPrepIngredients = prev.prepIngredients.map((ing, i) => {
        if (i !== index) return ing;
        
        let newIng = { ...ing, [field]: value };
        
        // Auto convert tbsp / tsp to g
        if (field === 'unit') {
          const lowerUnit = value.trim().toLowerCase();
          if (lowerUnit === 'tsp' || lowerUnit === 'teaspoon' || lowerUnit === 'teaspoons') {
            newIng.quantity = (Number(newIng.quantity) || 0) * 5;
            newIng.unit = 'g';
          } else if (lowerUnit === 'tbsp' || lowerUnit === 'tablespoon' || lowerUnit === 'tablespoons' || lowerUnit === 'tb') {
            newIng.quantity = (Number(newIng.quantity) || 0) * 15;
            newIng.unit = 'g';
          }
        }
        
        return newIng;
      });
      
      return {
        ...prev,
        prepIngredients: updatedPrepIngredients
      };
    });
  };
  
  const removePrepIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      prepIngredients: prev.prepIngredients.filter((_, i) => i !== index),
    }));
  };
  
  const totalPrepCost = formData.prepIngredients.reduce(
    (sum, ing) => sum + (Number(ing.quantity || 0) * Number(ing.costPerUnit || 0)), 
    0
  );
  
  const computedCostPerUnit = formData.totalOutput > 0 ? (totalPrepCost / formData.totalOutput) : 0;
  
  const handleParseSubRecipe = async () => {
    if (!recipePasteText.trim()) return;
    setParsingRecipe(true);
    try {
      const response = await aiAPI.parseRecipe({ recipeText: recipePasteText });
      if (response.data && response.data.success) {
        const parsed = response.data.data.map(ing => ({
          ingredientId: ing.libraryIngredientId || null,
          name: ing.matchedName,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit,
          costPerUnit: Number(ing.costPerUnit) || 0,
        }));
        
        setFormData(prev => ({
          ...prev,
          prepIngredients: [...prev.prepIngredients, ...parsed]
        }));
        
        setShowRecipePasteArea(false);
        setRecipePasteText('');
      } else {
        alert('Failed to parse recipe');
      }
    } catch (error) {
      console.error(error);
      alert('Error parsing recipe: ' + (error.response?.data?.message || error.message));
    } finally {
      setParsingRecipe(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      costPerUnit: formData.isPrep ? computedCostPerUnit : Number(formData.costPerUnit),
      totalOutput: formData.isPrep ? Number(formData.totalOutput) : 0,
      prepIngredients: formData.isPrep ? formData.prepIngredients : [],
    };
    onSave(submitData);
  };
  
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
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">
          {ingredient ? 'Edit Ingredient' : 'Add New Ingredient'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
            <input
              type="checkbox"
              id="isPrep"
              name="isPrep"
              checked={formData.isPrep}
              onChange={handlePrepToggle}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isPrep" className="text-sm font-semibold text-gray-800 cursor-pointer">
              This is a Prep Ingredient (Combination of other ingredients / Sub-recipe)
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Ingredient Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                required
                placeholder="e.g., Espresso, Vanilla Sweet Cream, Strawberry Jam"
              />
            </div>
            
            <div>
              <label className="label">Category *</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
                required
                placeholder="e.g., Coffee, Dairy, Prep"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Base Unit *</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="input"
                required
                placeholder="e.g., g, ml, pc"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.isPrep ? 'Usually grams (g) or milliliters (ml) for yield output.' : 'e.g. g, ml, pc, shots.'}
              </p>
            </div>
            
            {!formData.isPrep ? (
              <div>
                <label className="label">Cost per Unit (₱) *</label>
                <input
                  type="number"
                  name="costPerUnit"
                  value={formData.costPerUnit}
                  onChange={handleChange}
                  className="input"
                  step="any"
                  min="0"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="label">Total Yield Output ({formData.unit || 'g'}) *</label>
                <input
                  type="number"
                  name="totalOutput"
                  value={formData.totalOutput}
                  onChange={handleChange}
                  className="input"
                  step="0.01"
                  min="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The total yield weight or volume of this prepared recipe.
                </p>
              </div>
            )}
          </div>
          
          {!formData.isPrep && (
            <RetailerPrice
              source={formData.retailerSource}
              unit={formData.unit}
              onChange={(retailerSource) => setFormData(prev => ({ ...prev, retailerSource }))}
              onUsePrice={(costPerUnit) => setFormData(prev => ({ ...prev, costPerUnit }))}
            />
          )}

          {formData.isPrep && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Recipe Ingredients</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipePasteArea(!showRecipePasteArea);
                      setShowLibrary(false);
                    }}
                    className="btn bg-orange-600 text-white hover:bg-orange-700 active:scale-95 text-xs px-3 py-1"
                  >
                    ✨ Paste Recipe
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLibrary(!showLibrary);
                      setShowRecipePasteArea(false);
                    }}
                    className="btn btn-primary text-xs px-3 py-1"
                  >
                    📚 Add from Library
                  </button>
                  <button
                    type="button"
                    onClick={addPrepIngredient}
                    className="btn btn-secondary text-xs px-3 py-1"
                  >
                    + Add Custom
                  </button>
                </div>
              </div>

              {showRecipePasteArea && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-orange-950">Paste raw sub-recipe list:</span>
                    <button 
                      type="button"
                      onClick={() => {
                        setShowRecipePasteArea(false);
                        setRecipePasteText('');
                      }}
                      className="text-orange-900 hover:text-orange-950 text-xs font-semibold"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  <textarea
                    placeholder="Paste sub-recipe ingredients here. e.g.&#10;150 ml whole milk&#10;30 ml condensed milk"
                    value={recipePasteText}
                    onChange={(e) => setRecipePasteText(e.target.value)}
                    className="w-full h-24 p-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleParseSubRecipe}
                    disabled={parsingRecipe || !recipePasteText.trim()}
                    className="btn btn-primary text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                  >
                    {parsingRecipe ? 'Parsing...' : '✨ Parse & Add Ingredients'}
                  </button>
                </div>
              )}
              
              {showLibrary && ingredientLibrary.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-blue-900">Select Library Ingredient:</h4>
                    <button
                      type="button; button"
                      onClick={() => {
                        setShowLibrary(false);
                        setLibrarySearch('');
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or category..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="input w-full text-sm mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredLibrary.map(ing => (
                      <button
                        key={ing._id}
                        type="button"
                        onClick={() => addFromLibrary(ing)}
                        className="text-left p-2 bg-white rounded border hover:bg-blue-100 transition-colors text-xs"
                      >
                        <div className="font-semibold text-gray-800">{ing.name}</div>
                        <div className="text-gray-500">{formatPeso(ing.costPerUnit)} / {ing.unit}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.prepIngredients.length > 0 ? (
                <div className="space-y-3">
                  <div className="hidden sm:flex gap-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="flex-1">Ingredient Name</div>
                    <div className="w-20">Qty</div>
                    <div className="w-16">Unit</div>
                    <div className="w-24">Cost/Unit</div>
                    <div className="w-24 text-right">Total Cost</div>
                    <div className="w-8"></div>
                  </div>
                  {formData.prepIngredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 items-center bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        value={ingredient.name}
                        onChange={(e) => updatePrepIngredient(index, 'name', e.target.value)}
                        className="input flex-1 min-w-[120px] text-sm py-1.5"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ingredient.quantity}
                        onChange={(e) => updatePrepIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="input w-16 sm:w-20 text-sm py-1.5"
                        step="0.01"
                        min="0"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => updatePrepIngredient(index, 'unit', e.target.value)}
                        className="input w-12 sm:w-16 text-sm py-1.5"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={ingredient.costPerUnit}
                        onChange={(e) => updatePrepIngredient(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                        className="input w-20 sm:w-24 text-sm py-1.5"
                        step="0.0001"
                        min="0"
                        required
                      />
                      <div className="w-20 sm:w-24 text-right text-sm font-semibold text-gray-700">
                        {formatPeso((ingredient.quantity || 0) * (ingredient.costPerUnit || 0))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrepIngredient(index)}
                        className="text-red-500 hover:text-red-700 w-8 text-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-2">
                    <div className="text-sm text-gray-600">
                      Recipe cost summary:
                    </div>
                    <div className="bg-white border rounded-lg p-3 shadow-sm grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-medium w-full sm:w-72">
                      <div className="text-gray-500">Total Recipe Cost:</div>
                      <div className="text-right text-gray-800">{formatPeso(totalPrepCost)}</div>
                      
                      <div className="text-gray-500">Yield Output:</div>
                      <div className="text-right text-gray-800">{formData.totalOutput} {formData.unit || 'g'}</div>
                      
                      <div className="text-primary-600 font-bold border-t pt-1 mt-1">Cost per {formData.unit || 'g'}:</div>
                      <div className="text-right text-primary-600 font-bold border-t pt-1 mt-1">
                        {formatPeso(computedCostPerUnit)} / {formData.unit || 'g'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No ingredients added yet. Build your prep recipe by adding ingredients.
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier (Optional)</label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Home Brewed / In-house"
              />
            </div>
            
            <div>
              <label className="label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input"
                rows="2"
                placeholder="Storage life, preparation time, etc..."
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {ingredient ? 'Update Ingredient' : 'Add Ingredient'}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

export default IngredientForm;



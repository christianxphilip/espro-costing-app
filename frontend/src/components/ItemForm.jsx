import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import CostSummary from './CostSummary';
import { ingredientsAPI, expensesAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function ItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    targetFoodCostPercent: 30,
    targetFoodCostPercentInStore: null,
    targetFoodCostPercentEvent: null,
    feesPercent: 6.48,
    isActive: true,
    hidePriceInStore: false,
    hidePriceEvent: false,
    lockedPrice: null,
    isPriceLocked: false,
    ingredients: [],
  });
  const [ingredientLibrary, setIngredientLibrary] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [currentOperatingExpense, setCurrentOperatingExpense] = useState(0);
  const [currentOperatingExpenseInStore, setCurrentOperatingExpenseInStore] = useState(0);
  const [currentOperatingExpenseEvent, setCurrentOperatingExpenseEvent] = useState(0);
  
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        targetFoodCostPercent: item.targetFoodCostPercent || 30,
        targetFoodCostPercentInStore: item.targetFoodCostPercentInStore !== undefined ? item.targetFoodCostPercentInStore : null,
        targetFoodCostPercentEvent: item.targetFoodCostPercentEvent !== undefined ? item.targetFoodCostPercentEvent : null,
        feesPercent: item.feesPercent !== undefined ? item.feesPercent : 6.48,
        isActive: item.isActive !== undefined ? item.isActive : true,
        hidePriceInStore: item.hidePriceInStore || false,
        hidePriceEvent: item.hidePriceEvent || false,
        lockedPrice: item.lockedPrice || null,
        isPriceLocked: item.isPriceLocked || false,
        ingredients: item.ingredients || [],
      });
    }
    loadIngredientLibrary();
    loadCurrentOperatingExpense();
  }, [item]);
  
  const loadIngredientLibrary = async () => {
    try {
      const response = await ingredientsAPI.getAll({ active: 'true' });
      setIngredientLibrary(response.data.data);
    } catch (error) {
      console.error('Error loading ingredient library:', error);
    }
  };
  
  const loadCurrentOperatingExpense = async () => {
    try {
      const response = await expensesAPI.calculatePerItem();
      console.log('Operating expense calculation:', response.data.data);
      const data = response.data.data;
      setCurrentOperatingExpense(data.operatingExpensePerItem || 0);
      // Get context-specific operating expenses
      setCurrentOperatingExpenseInStore(data.inStore?.operatingExpensePerItem || data.operatingExpensePerItem || 0);
      setCurrentOperatingExpenseEvent(data.event?.operatingExpensePerItem || 0);
    } catch (error) {
      console.error('Error loading operating expense:', error);
      console.error('Error details:', error.response?.data || error.message);
      setCurrentOperatingExpense(0);
      setCurrentOperatingExpenseInStore(0);
      setCurrentOperatingExpenseEvent(0);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (value === '' ? null : value)
    }));
  };
  
  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: 0, unit: 'unit', costPerUnit: 0 }],
    }));
    setShowLibrary(false);
  };
  
  const addFromLibrary = (libraryIngredient) => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        name: libraryIngredient.name,
        quantity: 1,
        unit: libraryIngredient.unit,
        costPerUnit: libraryIngredient.costPerUnit,
      }],
    }));
    setShowLibrary(false);
  };
  
  const updateIngredient = (index, field, value) => {
    setFormData(prev => {
      const updatedIngredients = prev.ingredients.map((ing, i) => {
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
        ingredients: updatedIngredients
      };
    });
  };
  
  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  // Calculate preview costs for both contexts
  const calculatePreview = () => {
    const ingredientCost = formData.ingredients.reduce(
      (sum, ing) => sum + (Number(ing.quantity) * Number(ing.costPerUnit)), 0
    );
    
    // Get operating expenses - prefer context-specific if available
    // For existing items, use stored values; for new items, use calculated values from API
    const inStoreOpex = item?.operatingExpenseInStore !== undefined && item?.operatingExpenseInStore !== null
      ? item.operatingExpenseInStore
      : (item?.operatingExpense !== undefined && item?.operatingExpense !== null
        ? item.operatingExpense
        : currentOperatingExpenseInStore);
    const eventOpex = item?.operatingExpenseEvent !== undefined && item?.operatingExpenseEvent !== null
      ? item.operatingExpenseEvent
      : currentOperatingExpenseEvent;
    
    // Get context-specific target food cost percentages (fallback to default)
    const inStoreTarget = formData.targetFoodCostPercentInStore !== null && formData.targetFoodCostPercentInStore !== undefined 
      ? Number(formData.targetFoodCostPercentInStore) 
      : Number(formData.targetFoodCostPercent);
    const eventTarget = formData.targetFoodCostPercentEvent !== null && formData.targetFoodCostPercentEvent !== undefined 
      ? Number(formData.targetFoodCostPercentEvent) 
      : Number(formData.targetFoodCostPercent);
    
    // Calculate for both contexts
    const inStoreCogs = ingredientCost + inStoreOpex;
    const eventCogs = ingredientCost + eventOpex;
    
    // New formula: (Ingredient Cost / Target Food Cost %) * (1 + Fees %)
    const feesMultiplier = 1 + (Number(formData.feesPercent || 0) / 100);
    const inStorePrice = inStoreTarget > 0 ? (ingredientCost / (inStoreTarget / 100)) * feesMultiplier : 0;
    const eventPrice = eventTarget > 0 ? (ingredientCost / (eventTarget / 100)) * feesMultiplier : 0;
    
    return {
      ingredientCost,
      operatingExpense: inStoreOpex, // Default to in-store for backward compatibility
      operatingExpenseInStore: inStoreOpex,
      operatingExpenseEvent: eventOpex,
      cogs: inStoreCogs,
      cogsInStore: inStoreCogs,
      cogsEvent: eventCogs,
      suggestedPrice: inStorePrice,
      suggestedPriceInStore: inStorePrice,
      suggestedPriceEvent: eventPrice,
      targetFoodCostPercent: formData.targetFoodCostPercent,
      targetFoodCostPercentInStore: inStoreTarget,
      targetFoodCostPercentEvent: eventTarget,
      feesPercent: formData.feesPercent,
      lockedPrice: formData.lockedPrice,
      isPriceLocked: formData.isPriceLocked,
    };
  };
  
  const preview = calculatePreview();
  
  // Filter ingredient library based on search
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
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {item && item._id ? 'Edit Item' : item ? 'Duplicate Item' : 'Add New Item'}
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Item Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                
                <div>
                  <label className="label">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Target Food Cost (%)</label>
                  <input
                    type="number"
                    name="targetFoodCostPercent"
                    value={formData.targetFoodCostPercent}
                    onChange={handleChange}
                    className="input"
                    step="0.1"
                    min="1"
                    max="100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Industry standard is 25% - 35%. Used to calculate Suggested Selling Price.
                  </p>
                </div>

                <div>
                  <label className="label">Fees (%)</label>
                  <input
                    type="number"
                    name="feesPercent"
                    value={formData.feesPercent}
                    onChange={handleChange}
                    className="input"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Platform or transaction fees added to the base price.
                  </p>
                </div>
                
                <div>
                  <label className="label">
                    Override Selling Price
                    <span className="text-xs text-gray-400 ml-1">(optional)</span>
                  </label>
                  <input
                    type="number"
                    name="lockedPrice"
                    value={formData.lockedPrice === null ? '' : formData.lockedPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newLockedPrice = val === '' ? null : Number(val);
                      
                      setFormData(prev => {
                        const newState = { 
                          ...prev, 
                          lockedPrice: newLockedPrice,
                          isPriceLocked: val !== '' 
                        };
                        
                        if (newLockedPrice !== null && newLockedPrice > 0) {
                          const ingredientCost = prev.ingredients.reduce(
                            (sum, ing) => sum + (Number(ing.quantity) * Number(ing.costPerUnit)), 0
                          );
                          
                          if (ingredientCost > 0) {
                            const feesMultiplier = 1 + (Number(prev.feesPercent || 0) / 100);
                            const basePrice = newLockedPrice / feesMultiplier;
                            const newTargetFC = (ingredientCost / basePrice) * 100;
                            
                            newState.targetFoodCostPercent = Number(newTargetFC.toFixed(1));
                            // Optional: clear specific context targets so they follow the new global target
                            newState.targetFoodCostPercentInStore = null;
                            newState.targetFoodCostPercentEvent = null;
                          }
                        }
                        
                        return newState;
                      });
                    }}
                    className="input"
                    step="0.01"
                    min="0"
                    placeholder="Bypass computed price"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If set, this exact price will be used, ignoring the calculations.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      🏪 Target Food Cost - In-Store (%)
                      <span className="text-xs text-gray-400 ml-1">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="targetFoodCostPercentInStore"
                      value={formData.targetFoodCostPercentInStore === null ? '' : formData.targetFoodCostPercentInStore}
                      onChange={handleChange}
                      className="input"
                      step="0.1"
                      min="1"
                      max="100"
                      placeholder="Uses default if empty"
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      🎪 Target Food Cost - Event (%)
                      <span className="text-xs text-gray-400 ml-1">(optional)</span>
                    </label>
                    <input
                      type="number"
                      name="targetFoodCostPercentEvent"
                      value={formData.targetFoodCostPercentEvent === null ? '' : formData.targetFoodCostPercentEvent}
                      onChange={handleChange}
                      className="input"
                      step="0.1"
                      min="1"
                      max="100"
                      placeholder="Uses default if empty"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active (Available for sale in your café)
                  </label>
                </div>
                
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Price Visibility</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="hidePriceInStore"
                      checked={formData.hidePriceInStore}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      🏪 Hide In-Store Price
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="hidePriceEvent"
                      checked={formData.hidePriceEvent}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      🎪 Hide Event Price
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Hidden prices won't be shown in the items table
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="label mb-0">Ingredients</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowLibrary(!showLibrary)}
                      className="btn btn-primary text-sm"
                    >
                      📚 From Library
                    </button>
                    <button
                      type="button"
                      onClick={addIngredient}
                      className="btn btn-secondary text-sm"
                    >
                      + Add Custom
                    </button>
                  </div>
                </div>
                
                {showLibrary && ingredientLibrary.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-blue-900">Select from Library:</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLibrary(false);
                          setLibrarySearch('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✕ Close
                      </button>
                    </div>
                    
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="🔍 Search ingredients by name or category..."
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        className="input w-full text-sm"
                        autoFocus
                      />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto">
                      {filteredLibrary.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {filteredLibrary.map(ing => (
                            <button
                              key={ing._id}
                              type="button"
                              onClick={() => {
                                addFromLibrary(ing);
                                setLibrarySearch('');
                              }}
                              className="text-left p-2 bg-white rounded hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <div className="text-sm font-medium text-gray-900">{ing.name}</div>
                              <div className="text-xs text-gray-600">
                                {formatPeso(ing.costPerUnit)}/{ing.unit} • {ing.category}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No ingredients found matching "{librarySearch}"
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-blue-700">
                      Showing {filteredLibrary.length} of {ingredientLibrary.length} ingredients
                    </div>
                  </div>
                )}
                
                {formData.ingredients.length > 0 && (
                  <div className="hidden sm:flex gap-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    <div className="flex-1">Ingredient Name</div>
                    <div className="w-20">Qty</div>
                    <div className="w-16">Unit</div>
                    <div className="w-24">Cost/Unit</div>
                    <div className="w-24 text-right">Total Cost</div>
                    <div className="w-8"></div>
                  </div>
                )}
                <div className="space-y-3">
                  {formData.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Name"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        className="input flex-1 min-w-[120px]"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        className="input w-16 sm:w-20"
                        step="0.01"
                        min="0"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="input w-12 sm:w-16"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cost"
                        value={ingredient.costPerUnit}
                        onChange={(e) => updateIngredient(index, 'costPerUnit', e.target.value)}
                        className="input w-20 sm:w-24"
                        step="0.01"
                        min="0"
                        required
                      />
                      <div className="w-20 sm:w-24 px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 text-right flex items-center justify-end h-[38px] select-none" title="Total ingredient cost (Qty x Cost/Unit)">
                        {formatPeso(Number(ingredient.quantity || 0) * Number(ingredient.costPerUnit || 0))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 hover:text-red-800 w-8 flex items-center justify-center h-[38px] hover:bg-red-50 rounded transition-colors"
                        title="Remove ingredient"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Cost Preview</h3>
              
              {currentOperatingExpenseInStore === 0 && currentOperatingExpenseEvent === 0 && !item?._id && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-xs text-yellow-800">
                    ⚠️ <strong>No operating expenses configured.</strong>
                    <br />
                    Go to Expenses page to add rent, utilities, etc., and configure expected daily sales in Settings.
                  </p>
                </div>
              )}
              
              <CostSummary item={preview} />
              
              <div className="flex flex-col gap-2 pt-4">
                <button type="submit" className="btn btn-primary w-full">
                  {item && item._id ? 'Update Item' : 'Create Item'}
                </button>
                <button type="button" onClick={onCancel} className="btn btn-secondary w-full">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export default ItemForm;


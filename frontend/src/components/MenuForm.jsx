import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { menusAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function MenuForm({ menu, onSave, onCancel }) {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Categories, 3: Add items
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    context: 'in-store',
    description: '',
    menuCategories: [], // Categories for organizing items in the menu
    items: [], // Items organized by category
  });
  const [availableItems, setAvailableItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryForItems, setSelectedCategoryForItems] = useState('');

  useEffect(() => {
    loadAvailableItems();
    if (menu) {
      // Use menuCategories from menu if available, otherwise extract from items
      const categories = menu.menuCategories && menu.menuCategories.length > 0
        ? menu.menuCategories
        : [...new Set(menu.items?.map(mi => mi.category || 'Other') || [])];
      setFormData({
        name: menu.name || '',
        category: menu.category || '',
        context: menu.context || 'in-store',
        description: menu.description || '',
        menuCategories: categories,
        items: menu.items?.map((mi, index) => ({
          itemId: mi.item?._id || mi.item,
          name: mi.item?.name || '',
          category: mi.category || 'Other',
          order: mi.order !== undefined ? mi.order : index,
          multiplier: mi.multiplier !== undefined && mi.multiplier !== null ? mi.multiplier : 1,
          priceOverride: mi.priceOverride !== undefined && mi.priceOverride !== null ? mi.priceOverride : null,
          calculatedProfitMargin: mi.calculatedProfitMargin !== undefined && mi.calculatedProfitMargin !== null ? mi.calculatedProfitMargin : null,
          recipe: Array.isArray(mi.recipe)
            ? mi.recipe.map(r => {
              // Handle both old format (strings) and new format (objects)
              if (typeof r === 'string') {
                // Old format: find matching ingredient from item to get quantity/unit
                return { name: r, quantity: null, unit: null };
              }
              return { name: r.name || '', quantity: r.quantity || 0, unit: r.unit || '' };
            })
            : [],
          recipeGuide: mi.recipeGuide || '',
        })) || [],
      });
      if (categories.length > 0) {
        setSelectedCategoryForItems(categories[0]);
        setStep(3); // If editing and has categories, go to step 3
      } else if (menu.name) {
        setStep(2); // If editing but no categories, go to step 2
      }
    }
  }, [menu]);

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      const response = await menusAPI.getAvailableItems();
      setAvailableItems(response.data.data);
    } catch (error) {
      console.error('Error loading available items:', error);
      alert('Failed to load available items');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !formData.menuCategories.includes(newCategoryName.trim())) {
      setFormData(prev => ({
        ...prev,
        menuCategories: [...prev.menuCategories, newCategoryName.trim()],
      }));
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (categoryToRemove) => {
    setFormData(prev => ({
      ...prev,
      menuCategories: prev.menuCategories.filter(cat => cat !== categoryToRemove),
      items: prev.items.filter(item => item.category !== categoryToRemove),
    }));
    if (selectedCategoryForItems === categoryToRemove && formData.menuCategories.length > 1) {
      setSelectedCategoryForItems(formData.menuCategories.find(cat => cat !== categoryToRemove) || '');
    }
  };

  const handleItemToggle = (item) => {
    if (!selectedCategoryForItems) {
      alert('Please select a category first');
      return;
    }

    setFormData(prev => {
      const itemId = item._id;
      const isSelected = prev.items.some(i => i.itemId === itemId && i.category === selectedCategoryForItems);

      if (isSelected) {
        // Remove ALL variants of this item from selected category
        return {
          ...prev,
          items: prev.items.filter(i => !(i.itemId === itemId && i.category === selectedCategoryForItems)),
        };
      } else {
        // Add item to selected category
        // Find max order in this category to append at end
        const categoryItems = prev.items.filter(i => i.category === selectedCategoryForItems);
        const maxOrder = categoryItems.reduce((max, i) => Math.max(max, i.order || 0), -1);

        return {
          ...prev,
          items: [
            ...prev.items,
            {
              itemId: itemId,
              name: item.name,
              category: selectedCategoryForItems,
              order: maxOrder + 1,
              multiplier: 1,
              priceOverride: null,
              recipe: [],
              recipeGuide: '',
            },
          ],
        };
      }
    });
  };

  const handleAddPlatter = (item, category) => {
    setFormData(prev => {
      // Find the order of the existing items of this type to keep them together (or just append)
      // Actually, order is per item group usually, but here we just append to list
      // The grouping logic in render will handle display
      const categoryItems = prev.items.filter(i => i.category === category);
      const maxOrder = categoryItems.reduce((max, i) => Math.max(max, i.order || 0), -1);

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            itemId: item._id || item.itemId,
            name: item.name,
            category: category,
            order: maxOrder + 1, // Append to end, sorting will handle grouping if we sort by order then ID? 
            // Actually, we should probably copy the order of the first variant if we want them to stay together in a "list" view that isn't grouped
            // But our render logic will group by ID, so order matters for the GROUP.
            // Let's just use the same order as the first variant if it exists
            multiplier: '', // Start empty to prompt input
            priceOverride: null,
            recipe: [],
            recipeGuide: '',
          },
        ],
      };
    });
  };

  const handleRemoveVariant = (indexToRemove) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, index) => index !== indexToRemove);
      return { ...prev, items: newItems };
    });
  };

  const handleItemReorder = (itemId, category, direction) => {
    setFormData(prev => {
      // Get items in the same category, sorted by order
      const categoryItems = prev.items
        .filter(item => item.category === category)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const itemIndex = categoryItems.findIndex(item => item.itemId === itemId);
      if (itemIndex === -1) return prev;

      const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (newIndex < 0 || newIndex >= categoryItems.length) return prev;

      // Swap order values
      const newItems = prev.items.map(item => {
        if (item.itemId === categoryItems[itemIndex].itemId) {
          return { ...item, order: categoryItems[newIndex].order };
        }
        if (item.itemId === categoryItems[newIndex].itemId) {
          return { ...item, order: categoryItems[itemIndex].order };
        }
        return item;
      });

      return { ...prev, items: newItems };
    });
  };

  // Group selected items by category
  const itemsByCategory = {};
  formData.items.forEach(item => {
    const cat = item.category;
    if (!itemsByCategory[cat]) {
      itemsByCategory[cat] = [];
    }
    itemsByCategory[cat].push(item);
  });

  // Sort items within each category by order
  Object.keys(itemsByCategory).forEach(cat => {
    itemsByCategory[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.context) {
        alert('Please fill in menu name and select context');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.menuCategories.length === 0) {
        alert('Please add at least one category');
        return;
      }
      setSelectedCategoryForItems(formData.menuCategories[0]);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Allow menus with no items - categories can exist without items
    // Validation: at least categories must exist
    if (formData.menuCategories.length === 0) {
      alert('Please add at least one category');
      return;
    }

    // Calculate profit margins for all items with price overrides before saving
    const itemsWithCalculatedMargins = formData.items.map(selectedItem => {
      const item = availableItems.find(i => i._id === selectedItem.itemId);
      if (!item || !selectedItem.priceOverride || selectedItem.priceOverride === null) {
        // Still return the item with recipe, even if no price override
        return {
          ...selectedItem,
          recipe: Array.isArray(selectedItem.recipe) ? selectedItem.recipe : [],
          recipeGuide: selectedItem.recipeGuide || '',
        };
      }

      const contextData = formData.context === 'event' ? item.event : item.inStore;
      const ingredientCost = contextData?.ingredientCost || 0;
      const operatingExpense = contextData?.operatingExpense || 0;

      let calculatedMargin = null;
      if (selectedItem.priceOverride !== null && selectedItem.priceOverride !== undefined) {
        const multiplier = selectedItem.multiplier || 1;
        // Only multiply ingredients, add OpEx once
        const totalCogs = (ingredientCost * multiplier) + operatingExpense;

        if (totalCogs > 0) {
          const profit = selectedItem.priceOverride - totalCogs;
          calculatedMargin = (profit / totalCogs) * 100;
        }
      }

      return {
        ...selectedItem,
        calculatedProfitMargin: calculatedMargin,
        recipe: Array.isArray(selectedItem.recipe) ? selectedItem.recipe : [],
        recipeGuide: selectedItem.recipeGuide || '',
      };
    });

    const dataToSave = {
      ...formData,
      items: itemsWithCalculatedMargins,
    };

    onSave(dataToSave);
  };

  const filteredAvailableItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItemIdsForCategory = new Set(
    formData.items
      .filter(i => i.category === selectedCategoryForItems)
      .map(i => i.itemId)
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
            {menu && menu._id ? 'Edit Menu' : 'Create New Menu'}
          </h2>

          {/* Step Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Basic Info</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Categories</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  3
                </div>
                <span className="ml-2 font-medium">Add Items</span>
              </div>
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Menu Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                    required
                    placeholder="e.g., Spring Menu, Event Menu"
                  />
                </div>

                <div>
                  <label className="label">Context</label>
                  <select
                    name="context"
                    value={formData.context}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="in-store">🏪 In-Store</option>
                    <option value="event">🎪 Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Menu Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="input"
                  required
                  placeholder="e.g., Breakfast, Lunch, Beverages"
                />
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input"
                  rows="3"
                  placeholder="Brief description of this menu..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="button" onClick={handleNext} className="btn btn-primary flex-1">
                  Next: Add Categories →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Add Categories */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="label">Menu Categories</label>
                <p className="text-xs text-gray-500 mb-3">
                  Create categories to organize items in your menu (e.g., "Coffee Based", "Rice Meals")
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    className="input flex-1"
                    placeholder="Enter category name (e.g., Coffee Based)"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn btn-primary"
                    disabled={!newCategoryName.trim()}
                  >
                    + Add Category
                  </button>
                </div>

                {formData.menuCategories.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.menuCategories.map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-gray-200"
                      >
                        <span className="font-medium text-gray-900">{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleBack} className="btn btn-secondary flex-1">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-primary flex-1"
                  disabled={formData.menuCategories.length === 0}
                >
                  Next: Select Items →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Add Items */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selector */}
              <div>
                <label className="label">Select Category to Add Items</label>
                <select
                  value={selectedCategoryForItems}
                  onChange={(e) => setSelectedCategoryForItems(e.target.value)}
                  className="input mb-4"
                >
                  {formData.menuCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mb-4">
                  Selected items will be added to: <strong>{selectedCategoryForItems}</strong>
                  {itemsByCategory[selectedCategoryForItems] && (
                    <span> ({itemsByCategory[selectedCategoryForItems].length} items)</span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Available Items */}
                <div>
                  <label className="label">Available Items</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Only active and locked items are available
                  </p>
                  <input
                    type="text"
                    placeholder="🔍 Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input mb-3"
                  />
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                    {loading ? (
                      <div className="text-center py-8 text-gray-500">Loading items...</div>
                    ) : filteredAvailableItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No items available. Make sure you have active or locked items.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredAvailableItems.map((item) => {
                          const isSelected = selectedItemIdsForCategory.has(item._id);
                          const price = formData.context === 'event'
                            ? (item.event?.suggestedPrice || item.suggestedPrice || 0)
                            : (item.inStore?.suggestedPrice || item.suggestedPrice || 0);

                          return (
                            <button
                              key={item._id}
                              type="button"
                              onClick={() => handleItemToggle(item)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                  <div className="text-xs text-gray-600">
                                    {formatPeso(price)} • {item.category}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="text-xs text-blue-600 font-medium">✓ Selected</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Items by Category */}
                <div>
                  <label className="label">Menu Items by Category</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Review and organize items in each category. You can add multiple price options (e.g. Platter) for each item.
                  </p>
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-gray-50">
                    {formData.menuCategories.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No categories added yet. Go back to add categories.
                      </div>
                    ) : formData.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No items selected. Select items from the left.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {formData.menuCategories.map(category => {
                          const categoryItems = itemsByCategory[category] || [];
                          if (categoryItems.length === 0) return null;

                          return (
                            <div key={category} className="border-2 border-gray-300 rounded-lg p-3 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-gray-800">{category}</h4>
                                <span className="text-xs text-gray-500">{categoryItems.length} variant(s)</span>
                              </div>

                              <div className="space-y-4">
                                {(() => {
                                  // Group items by itemId to render them together
                                  const uniqueItemIds = [...new Set(categoryItems.map(i => i.itemId))];

                                  return uniqueItemIds.map(itemId => {
                                    // Get all variants for this item
                                    const variants = categoryItems.filter(i => i.itemId === itemId);
                                    if (variants.length === 0) return null;

                                    const item = availableItems.find(i => i._id === itemId);
                                    if (!item) return null;

                                    // Get context-specific data
                                    const contextData = formData.context === 'event' ? item.event : item.inStore;
                                    const baseIngredientCost = contextData?.ingredientCost || 0;
                                    const baseOperatingExpense = contextData?.operatingExpense || 0;
                                    const baseProfitMargin = contextData?.profitMargin || item.profitMargin || 30;
                                    const baseCogs = contextData?.cogs || 0;

                                    return (
                                      <div key={itemId} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                                        {/* Group Header */}
                                        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
                                          <div>
                                            <div className="font-bold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">Base COGS: {formatPeso(baseCogs)}</div>
                                            {baseOperatingExpense > 0 && (
                                              <div className="text-xs text-purple-600">OpEx: {formatPeso(baseOperatingExpense)}</div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleItemReorder(itemId, category, 'up')}
                                              className="text-gray-400 hover:text-gray-600"
                                              title="Move Up"
                                            >
                                              ↑
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleItemReorder(itemId, category, 'down')}
                                              className="text-gray-400 hover:text-gray-600 mr-2"
                                              title="Move Down"
                                            >
                                              ↓
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleAddPlatter(item, category)}
                                              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors font-medium"
                                            >
                                              + Add Price Option
                                            </button>
                                          </div>
                                        </div>

                                        {/* Variants Table */}
                                        <div className="p-0">
                                          <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                              <tr className="text-gray-500 border-b border-gray-200">
                                                <th className="text-left py-2 px-3 font-medium w-20">Qty/Mult</th>
                                                <th className="text-left py-2 px-3 font-medium">Menu Price</th>
                                                <th className="text-left py-2 px-3 font-medium">Margin</th>
                                                <th className="text-right py-2 px-3 font-medium w-10"></th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                              {variants.map((variant, vIndex) => {
                                                // Find the actual index in formData.items to update correctly
                                                const realIndex = formData.items.indexOf(variant);

                                                const itemMultiplier = variant.multiplier !== undefined && variant.multiplier !== null ? variant.multiplier : 1;
                                                
                                                // Calculate COGS using new logic: multiply ingredient cost, add OpEx once
                                                const itemTotalCogs = (baseIngredientCost * itemMultiplier) + baseOperatingExpense;
                                                
                                                // Calculate default price based on new COGS logic
                                                const defaultPrice = itemTotalCogs * (1 + (baseProfitMargin / 100));

                                                const calculatedMargin = variant.priceOverride !== null && variant.priceOverride !== undefined && itemTotalCogs > 0
                                                  ? ((variant.priceOverride - itemTotalCogs) / itemTotalCogs) * 100
                                                  : null;

                                                return (
                                                  <tr key={vIndex} className="group hover:bg-blue-50 transition-colors">
                                                    <td className="py-2 px-3 align-middle">
                                                      <input
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        value={variant.multiplier !== undefined && variant.multiplier !== null ? variant.multiplier : 1}
                                                        onChange={(e) => {
                                                          const val = e.target.value;
                                                          if (val === '') {
                                                            setFormData(prev => {
                                                              const newItems = [...prev.items];
                                                              newItems[realIndex] = { ...newItems[realIndex], multiplier: '' };
                                                              return { ...prev, items: newItems };
                                                            });
                                                            return;
                                                          }
                                                          const num = parseFloat(val);
                                                          const valid = num < 1 ? 1 : num;
                                                          setFormData(prev => {
                                                            const newItems = [...prev.items];
                                                            newItems[realIndex] = { ...newItems[realIndex], multiplier: valid };
                                                            return { ...prev, items: newItems };
                                                          });
                                                        }}
                                                        onBlur={() => {
                                                          if (variant.multiplier === '' || variant.multiplier === null || variant.multiplier === undefined) {
                                                            setFormData(prev => {
                                                              const newItems = [...prev.items];
                                                              newItems[realIndex] = { ...newItems[realIndex], multiplier: 1 };
                                                              return { ...prev, items: newItems };
                                                            });
                                                          }
                                                        }}
                                                        className="w-14 border border-gray-300 rounded px-1 py-1 text-center"
                                                      />
                                                    </td>
                                                    <td className="py-2 px-3 align-middle">
                                                      <div className="flex flex-col">
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          min="0"
                                                          value={variant.priceOverride !== null && variant.priceOverride !== undefined ? variant.priceOverride : ''}
                                                          onChange={(e) => {
                                                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                            setFormData(prev => {
                                                              const newItems = [...prev.items];
                                                              newItems[realIndex] = { ...newItems[realIndex], priceOverride: val };
                                                              return { ...prev, items: newItems };
                                                            });
                                                          }}
                                                          placeholder={formatPeso(defaultPrice)}
                                                          className="w-28 border border-gray-300 rounded px-2 py-1"
                                                        />
                                                        <span className="text-[10px] text-gray-400 mt-0.5">
                                                          Def: {formatPeso(defaultPrice)}
                                                        </span>
                                                        {baseOperatingExpense > 0 && (
                                                          <span className="text-[10px] text-purple-500 mt-0.5">
                                                            OpEx: {formatPeso(baseOperatingExpense)}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="py-2 px-3 align-middle">
                                                      {calculatedMargin !== null ? (
                                                        <span className={`font-medium px-2 py-0.5 rounded text-xs ${calculatedMargin < 0 ? 'bg-red-100 text-red-700' :
                                                          calculatedMargin < 30 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                          }`}>
                                                          {calculatedMargin.toFixed(0)}%
                                                        </span>
                                                      ) : (
                                                        <span className="text-gray-300">-</span>
                                                      )}
                                                    </td>
                                                    <td className="py-2 px-3 align-middle text-right">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveVariant(realIndex)}
                                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                                                        title="Remove this option"
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
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleBack} className="btn btn-secondary flex-1">
                  ← Back
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {menu && menu._id ? 'Update Menu' : 'Create Menu'}
                </button>
                <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default MenuForm;

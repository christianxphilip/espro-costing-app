import React, { useState, useEffect } from 'react';
import ItemTable from '../components/ItemTable';
import ItemForm from '../components/ItemForm';
import AISuggestions from '../components/AISuggestions';
import RecipeParserModal from '../components/RecipeParserModal';
import { itemsAPI, aiAPI } from '../services/api';

function ItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRecipeParser, setShowRecipeParser] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [priceView, setPriceView] = useState('both'); // 'both', 'in-store', 'event'
  const [viewStatus, setViewStatus] = useState('active'); // 'active', 'archived', 'all'
  
  useEffect(() => {
    loadItems();
  }, [viewStatus]);
  
  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await itemsAPI.getAll({ status: viewStatus });
      setItems(response.data.data);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };
  
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };
  
  const handleDuplicate = (item) => {
    // Create a copy without _id (so it creates a new item)
    const duplicatedItem = {
      name: `${item.name} - Copy`,
      category: item.category,
      ingredients: item.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        costPerUnit: ing.costPerUnit,
      })),
      targetFoodCostPercent: item.targetFoodCostPercent,
      targetFoodCostPercentInStore: item.targetFoodCostPercentInStore,
      targetFoodCostPercentEvent: item.targetFoodCostPercentEvent,
      feesPercent: item.feesPercent,
      isActive: item.isActive,
      // Don't copy: _id, operatingExpense (auto-calculated), aiSuggestedPrice, aiReasoning
    };
    setEditingItem(duplicatedItem);
    setShowForm(true);
  };
  
  const handleSave = async (formData) => {
    try {
      // Check if it's an update (has _id) or create (no _id)
      if (editingItem && editingItem._id) {
        await itemsAPI.update(editingItem._id, formData);
      } else {
        await itemsAPI.create(formData);
      }
      
      setShowForm(false);
      setEditingItem(null);
      await loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item');
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this item?')) return;
    
    try {
      await itemsAPI.delete(id);
      await loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };
  
  const handleArchive = async (item) => {
    const action = item.isArchived ? 'restore' : 'archive';
    if (!confirm(`Are you sure you want to ${action} this item?`)) return;
    
    try {
      await itemsAPI.archive(item._id);
      await loadItems();
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
      alert(`Failed to ${action} item`);
    }
  };
  
  const handleAISuggest = async (item) => {
    try {
      setSelectedItem(item);
      const response = await aiAPI.suggest(item._id);
      setAiSuggestion(response.data.data);
      await loadItems(); // Reload to get updated AI price
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      alert('Failed to get AI suggestion');
    }
  };
  
  const handleLockPrice = async (item) => {
    try {
      await itemsAPI.lockPrice(item._id);
      await loadItems(); // Reload to get updated lock status
    } catch (error) {
      console.error('Error locking/unlocking price:', error);
      alert('Failed to lock/unlock price');
    }
  };
  
  const handleBulkLock = async (itemIds, lock) => {
    try {
      await itemsAPI.bulkLockPrice(itemIds, lock);
      await loadItems(); // Reload to get updated lock status
    } catch (error) {
      console.error('Error bulk locking/unlocking prices:', error);
      alert('Failed to bulk lock/unlock prices');
    }
  };
  
  const handleBulkArchive = async (itemIds, archive) => {
    if (!confirm(`Are you sure you want to ${archive ? 'archive' : 'restore'} the selected items?`)) return;
    try {
      await itemsAPI.bulkArchive(itemIds, archive);
      await loadItems();
    } catch (error) {
      console.error(`Error bulk ${archive ? 'archiving' : 'restoring'} items:`, error);
      alert(`Failed to ${archive ? 'archive' : 'restore'} items`);
    }
  };
  
  const handleTogglePriceVisibility = async (item, context) => {
    try {
      const updateData = {};
      if (context === 'in-store') {
        updateData.hidePriceInStore = !item.hidePriceInStore;
      } else if (context === 'event') {
        updateData.hidePriceEvent = !item.hidePriceEvent;
      }
      await itemsAPI.update(item._id, updateData);
      await loadItems(); // Reload to get updated visibility status
    } catch (error) {
      console.error('Error toggling price visibility:', error);
      alert('Failed to toggle price visibility');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading items...</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Items</h1>
            <p className="text-gray-600 mt-2">Manage your café menu items and pricing</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRecipeParser(true)}
              className="btn bg-orange-600 text-white hover:bg-orange-700 active:scale-95 flex items-center gap-1"
            >
              ✨ Add from Recipe
            </button>
            <button onClick={handleAdd} className="btn btn-primary">
              + Add Item
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Status View Toggle */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewStatus('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewStatus === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setViewStatus('archived')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewStatus === 'archived'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
              <button
                onClick={() => setViewStatus('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Price View Toggle */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">Price View:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPriceView('both')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                priceView === 'both'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => setPriceView('in-store')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                priceView === 'in-store'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏪 In-Store Only
            </button>
            <button
              onClick={() => setPriceView('event')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                priceView === 'event'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎪 Event Only
            </button>
          </div>
        </div>
        </div>
      </div>
      
      <div className="card">
        <ItemTable
          items={items}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onAISuggest={handleAISuggest}
          onDuplicate={handleDuplicate}
          onLockPrice={handleLockPrice}
          onBulkLock={handleBulkLock}
          onBulkArchive={handleBulkArchive}
          onTogglePriceVisibility={handleTogglePriceVisibility}
          priceView={priceView}
          viewStatus={viewStatus}
        />
      </div>
      
      {showForm && (
        <ItemForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
      
      {showRecipeParser && (
        <RecipeParserModal
          onSave={async () => {
            setShowRecipeParser(false);
            await loadItems();
          }}
          onCancel={() => setShowRecipeParser(false)}
        />
      )}
      
      {aiSuggestion && (
        <AISuggestions
          item={selectedItem}
          suggestion={aiSuggestion}
          onClose={() => {
            setAiSuggestion(null);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

export default ItemsPage;


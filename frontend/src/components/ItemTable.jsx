import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatPeso } from '../utils/formatNumber';

function ItemTable({ items, onEdit, onDelete, onArchive, onAISuggest, onDuplicate, onLockPrice, onBulkLock, onBulkArchive, onTogglePriceVisibility, priceView = 'both', viewStatus = 'active' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  const getTextColor = (fcPercent) => {
    if (fcPercent === 0) return 'text-gray-500';
    if (fcPercent > 50) {
      return 'text-red-600 font-semibold';
    } else if (fcPercent > 40 && fcPercent <= 50) {
      return 'text-yellow-600 font-semibold';
    } else {
      return 'text-green-600 font-semibold';
    }
  };

  const getTargetFC = (item) => {
    if (priceView === 'in-store') {
      return item.targetFoodCostPercentInStore || item.targetFoodCostPercent;
    }
    if (priceView === 'event') {
      return item.targetFoodCostPercentEvent || item.targetFoodCostPercent;
    }
    return item.targetFoodCostPercent;
  };
  
  // Get unique categories
  const categories = ['all', ...new Set(items.map(item => item.category))];
  
  // Filter items
  let filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  // Sort items
  filteredItems = [...filteredItems].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle nested values
    if (sortField === 'price') {
      aVal = a.isPriceLocked ? a.lockedPrice : a.suggestedPrice;
      bVal = b.isPriceLocked ? b.lockedPrice : b.suggestedPrice;
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕</span>;
    return sortDirection === 'asc' ? <span>↑</span> : <span>↓</span>;
  };
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredItems.map(item => item._id)));
    } else {
      setSelectedItems(new Set());
    }
  };
  
  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };
  
  const handleBulkLock = async () => {
    const itemIds = Array.from(selectedItems);
    await onBulkLock(itemIds, true);
    setSelectedItems(new Set());
  };
  
  const handleBulkUnlock = async () => {
    const itemIds = Array.from(selectedItems);
    await onBulkLock(itemIds, false);
    setSelectedItems(new Set());
  };
  
  const handleBulkArchive = async (archive) => {
    const itemIds = Array.from(selectedItems);
    await onBulkArchive(itemIds, archive);
    setSelectedItems(new Set());
  };
  
  const selectedCount = selectedItems.size;
  const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input md:w-48"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>
      
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkLock}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              🔒 Lock Selected
            </button>
            <button
              onClick={handleBulkUnlock}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 border border-blue-600 rounded"
            >
              🔓 Unlock Selected
            </button>
            {viewStatus !== 'archived' && (
              <button
                onClick={() => handleBulkArchive(true)}
                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded"
              >
                📥 Archive Selected
              </button>
            )}
            {viewStatus !== 'active' && (
              <button
                onClick={() => handleBulkArchive(false)}
                className="px-3 py-1 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded"
              >
                📤 Restore Selected
              </button>
            )}
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  title="Select All"
                />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Item <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  Category <SortIcon field="category" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalIngredientCost')}
              >
                <div className="flex items-center justify-end gap-1">
                  Ingredient Cost <SortIcon field="totalIngredientCost" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('targetFoodCostPercent')}
              >
                <div className="flex items-center justify-end gap-1">
                  Target Food Cost <SortIcon field="targetFoodCostPercent" />
                </div>
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Price (In-Store / Event) <SortIcon field="price" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.map((item, index) => (
              <motion.tr
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`hover:bg-gray-50 ${selectedItems.has(item._id) ? 'bg-blue-50' : ''} ${item.isArchived ? 'opacity-50 grayscale' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item._id)}
                    onChange={() => handleSelectItem(item._id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    {item.name}
                    {item.isArchived && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Archived</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{item.ingredients?.length || 0} ingredients</div>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                    {item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {formatPeso(item.totalIngredientCost || 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={getTextColor(getTargetFC(item))}>
                    {getTargetFC(item)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div>
                    <div className="space-y-1">
                      {/* Show In-Store price if view is 'both' or 'in-store' */}
                      {(priceView === 'both' || priceView === 'in-store') && (
                        !item.hidePriceInStore ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">🏪 </span>
                              <span className={`font-bold ${
                                item.isPriceLocked && item.lockedPrice === (item.inStore?.suggestedPrice || item.suggestedPrice || 0)
                                  ? 'text-blue-600'
                                  : item.isPriceLocked
                                  ? 'text-gray-600 line-through'
                                  : 'text-blue-600'
                              }`}>
                                {item.isPriceLocked && (
                                  <span className="text-xs mr-1">🔒</span>
                                )}
                                {formatPeso(item.inStore?.suggestedPrice || item.suggestedPrice || 0)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePriceVisibility(item, 'in-store');
                              }}
                              className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                              title="Hide In-Store Price"
                            >
                              👁️
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-400 italic">🏪 Hidden</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePriceVisibility(item, 'in-store');
                              }}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                              title="Show In-Store Price"
                            >
                              👁️‍🗨️
                            </button>
                          </div>
                        )
                      )}
                      
                      {/* Show Event price if view is 'both' or 'event' */}
                      {(priceView === 'both' || priceView === 'event') && (
                        !item.hidePriceEvent ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">🎪 </span>
                              <span className={`font-bold no-underline ${
                                item.isPriceLocked && item.lockedPrice === (item.event?.suggestedPrice || item.suggestedPrice || 0)
                                  ? 'text-orange-600'
                                  : item.isPriceLocked
                                  ? 'text-gray-600 line-through'
                                  : 'text-orange-600'
                              }`}>
                                {item.isPriceLocked && (
                                  <span className="text-xs mr-1">🔒</span>
                                )}
                                {formatPeso(item.event?.suggestedPrice || item.suggestedPrice || 0)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePriceVisibility(item, 'event');
                              }}
                              className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                              title="Hide Event Price"
                            >
                              👁️
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-400 italic">🎪 Hidden</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePriceVisibility(item, 'event');
                              }}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                              title="Show Event Price"
                            >
                              👁️‍🗨️
                            </button>
                          </div>
                        )
                      )}
                      
                      {/* Show message if all prices are hidden and view is 'both' */}
                      {priceView === 'both' && (item.hidePriceInStore && item.hidePriceEvent) && (
                        <div className="text-xs text-gray-400 italic text-right">
                          All prices hidden
                        </div>
                      )}
                      
                      {/* Show message if current view has no visible prices */}
                      {((priceView === 'in-store' && item.hidePriceInStore) || (priceView === 'event' && item.hidePriceEvent)) && (
                        <div className="text-xs text-gray-400 italic text-right">
                          Price hidden
                        </div>
                      )}
                    </div>
                    {item.isPriceLocked && item.lockedPrice && (
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        Locked at: {formatPeso(item.lockedPrice)}
                      </div>
                    )}
                    {item.aiSuggestedPrice && (
                      <div className="text-xs text-primary-600 mt-1">
                        AI: {formatPeso(item.aiSuggestedPrice)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onLockPrice(item)}
                      className={`text-sm font-medium ${
                        item.isPriceLocked 
                          ? 'text-blue-600 hover:text-blue-800' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={item.isPriceLocked ? 'Unlock Price' : 'Lock Current Price'}
                    >
                      {item.isPriceLocked ? '🔒' : '🔓'}
                    </button>
                    <button
                      onClick={() => onAISuggest(item)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      title="Get AI Suggestion"
                    >
                      🤖
                    </button>
                    <button
                      onClick={() => onDuplicate(item)}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      title="Duplicate Item"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onArchive(item)}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      {item.isArchived ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      onClick={() => onDelete(item._id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No items found
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemTable;


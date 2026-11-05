import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import IngredientForm from '../components/IngredientForm';
import { ingredientsAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    loadIngredients();
    loadCategories();
  }, []);
  
  const loadIngredients = async () => {
    try {
      setLoading(true);
      const response = await ingredientsAPI.getAll();
      setIngredients(response.data.data);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      alert('Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategories = async () => {
    try {
      const response = await ingredientsAPI.getCategories();
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };
  
  const handleAdd = () => {
    setEditingIngredient(null);
    setShowForm(true);
  };
  
  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setShowForm(true);
  };
  
  const handleSave = async (formData) => {
    try {
      if (editingIngredient) {
        await ingredientsAPI.update(editingIngredient._id, formData);
      } else {
        await ingredientsAPI.create(formData);
      }
      
      setShowForm(false);
      setEditingIngredient(null);
      await loadIngredients();
      await loadCategories();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert(error.response?.data?.message || 'Failed to save ingredient');
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    
    try {
      await ingredientsAPI.delete(id);
      await loadIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Failed to delete ingredient');
    }
  };
  
  const handleToggleActive = async (ingredient) => {
    try {
      await ingredientsAPI.update(ingredient._id, {
        isActive: !ingredient.isActive,
      });
      await loadIngredients();
    } catch (error) {
      console.error('Error toggling ingredient:', error);
      alert('Failed to update ingredient');
    }
  };
  
  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ing.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ingredients...</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ingredients Library</h1>
          <p className="text-gray-600 mt-2">Manage your reusable ingredient catalog</p>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          + Add Ingredient
        </button>
      </div>
      
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input flex-1"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input md:w-48"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cost per Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIngredients.map((ingredient, index) => (
                <motion.tr
                  key={ingredient._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 ${!ingredient.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium text-gray-900">{ingredient.name}</div>
                      {ingredient.isPrep && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 rounded-full">
                          🍳 Prep
                        </span>
                      )}
                    </div>
                    {ingredient.isPrep && ingredient.prepIngredients && ingredient.prepIngredients.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 max-w-sm">
                        <span className="font-medium text-gray-400">Recipe:</span>{' '}
                        {ingredient.prepIngredients.map(sub => `${sub.name} (${sub.quantity}${sub.unit})`).join(', ')}
                      </div>
                    )}
                    {ingredient.notes && (
                      <div className="text-xs text-gray-400 mt-0.5">{ingredient.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {ingredient.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatPeso(ingredient.costPerUnit || 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {ingredient.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {ingredient.supplier || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(ingredient)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ingredient.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ingredient.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(ingredient)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient._id)}
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
          
          {filteredIngredients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {ingredients.length === 0 
                ? 'No ingredients yet. Add your first ingredient!'
                : 'No ingredients match your filters'
              }
            </div>
          )}
        </div>
      </div>
      
      <div className="card bg-blue-50 border-2 border-blue-200">
        <h3 className="font-bold text-lg mb-2">💡 About Ingredients Library</h3>
        <p className="text-sm text-gray-700 mb-2">
          Create a master list of ingredients here, then reuse them when creating items.
          This ensures consistency and makes it easy to update costs across all items.
        </p>
        <p className="text-sm text-gray-600">
          <strong>Tip:</strong> When you update an ingredient's cost here, you can manually update your items to reflect the new costs.
        </p>
      </div>
      
      {showForm && (
        <IngredientForm
          ingredient={editingIngredient}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingIngredient(null);
          }}
        />
      )}
    </div>
  );
}

export default IngredientsPage;


import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MenuForm from '../components/MenuForm';
import MenuView from '../components/MenuView';
import { menusAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function MenusPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [viewingMenu, setViewingMenu] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [contextFilter, setContextFilter] = useState('all');

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      setLoading(true);
      const response = await menusAPI.getAll();
      setMenus(response.data.data);
    } catch (error) {
      console.error('Error loading menus:', error);
      alert('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingMenu(null);
    setShowForm(true);
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setShowForm(true);
  };

  const handleView = (menu) => {
    setViewingMenu(menu);
  };

  const handleSave = async (formData) => {
    try {
      if (editingMenu && editingMenu._id) {
        await menusAPI.update(editingMenu._id, formData);
      } else {
        await menusAPI.create(formData);
      }

      setShowForm(false);
      setEditingMenu(null);
      await loadMenus();
    } catch (error) {
      console.error('Error saving menu:', error);
      alert(error.response?.data?.message || 'Failed to save menu');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this menu?')) return;

    try {
      await menusAPI.delete(id);
      await loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      alert('Failed to delete menu');
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(menus.map(menu => menu.category))];

  // Filter menus
  let filteredMenus = menus.filter(menu => {
    const matchesCategory = categoryFilter === 'all' || menu.category === categoryFilter;
    const matchesContext = contextFilter === 'all' || menu.context === contextFilter;
    return matchesCategory && matchesContext;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading menus...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Menus</h1>
            <p className="text-gray-600 mt-2">Create and manage menus for in-store and events</p>
          </div>
          <button onClick={handleAdd} className="btn btn-primary">
            + Create Menu
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
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
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filter by Context:</label>
            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value)}
              className="input md:w-48"
            >
              <option value="all">All Contexts</option>
              <option value="in-store">🏪 In-Store</option>
              <option value="event">🎪 Event</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Menu Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Context</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Items Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMenus.map((menu, index) => (
                <motion.tr
                  key={menu._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 ${!menu.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{menu.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      {menu.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      menu.context === 'event'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {menu.context === 'event' ? '🎪 Event' : '🏪 In-Store'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {menu.items?.length || 0} items
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {menu.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      menu.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {menu.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleView(menu)}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                        title="View Menu"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleEdit(menu)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(menu._id)}
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

          {filteredMenus.length === 0 && menus.length > 0 && (
            <div className="text-center py-12 text-gray-500">
              No menus match the selected filters
            </div>
          )}
          {menus.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No menus yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <MenuForm
          menu={editingMenu}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingMenu(null);
          }}
        />
      )}

      {viewingMenu && (
        <MenuView
          menu={viewingMenu}
          onClose={() => setViewingMenu(null)}
        />
      )}
    </div>
  );
}

export default MenusPage;


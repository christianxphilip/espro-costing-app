import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ExpenseForm from '../components/ExpenseForm';
import { expensesAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  useEffect(() => {
    loadExpenses();
    loadStats();
  }, []);
  
  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await expensesAPI.getAll();
      setExpenses(response.data.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      alert('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    try {
      const response = await expensesAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  const handleAdd = () => {
    setEditingExpense(null);
    setShowForm(true);
  };
  
  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };
  
  const handleSave = async (formData) => {
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense._id, formData);
      } else {
        await expensesAPI.create(formData);
      }
      
      setShowForm(false);
      setEditingExpense(null);
      await loadExpenses();
      await loadStats();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will recalculate all item costs.')) return;
    
    try {
      await expensesAPI.delete(id);
      await loadExpenses();
      await loadStats();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };
  
  const handleToggleActive = async (expense) => {
    try {
      await expensesAPI.update(expense._id, {
        isActive: !expense.isActive,
      });
      await loadExpenses();
      await loadStats();
    } catch (error) {
      console.error('Error toggling expense:', error);
      alert('Failed to update expense');
    }
  };
  
  const handleRecalculate = async () => {
    try {
      await expensesAPI.recalculate();
      alert('All item costs have been recalculated!');
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('Failed to recalculate expenses');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading expenses...</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operating Expenses</h1>
          <p className="text-gray-600 mt-2">Manage expenses that are allocated to items</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRecalculate} className="btn btn-secondary">
            🔄 Recalculate All
          </button>
          <button onClick={handleAdd} className="btn btn-primary">
            + Add Expense
          </button>
        </div>
      </div>
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <p className="text-sm text-gray-600 mb-1">Total Daily</p>
            <p className="text-2xl font-bold text-blue-600">{formatPeso(stats.totalDaily || 0)}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <p className="text-sm text-gray-600 mb-1">Total Monthly</p>
            <p className="text-2xl font-bold text-green-600">{formatPeso(stats.totalMonthly || 0)}</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <p className="text-sm text-gray-600 mb-1">Total Yearly</p>
            <p className="text-2xl font-bold text-primary-600">{formatPeso(stats.totalYearly || 0)}</p>
          </motion.div>
        </div>
      )}
      
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Context</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Allocation</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.map((expense, index) => (
                <motion.tr
                  key={expense._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`hover:bg-gray-50 ${!expense.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{expense.name}</div>
                    {expense.notes && (
                      <div className="text-xs text-gray-500">{expense.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      expense.context === 'event' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {expense.context === 'event' ? 'Event' : 'In-Store'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatPeso(expense.amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 capitalize">
                    {expense.frequency}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {expense.allocationType === 'per-item' && 'Equal Split'}
                    {expense.allocationType === 'by-category' && 'By Category'}
                    {expense.allocationType === 'by-percentage' && 'By Percentage'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(expense)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        expense.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {expense.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense._id)}
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
          
          {expenses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No operating expenses yet. Add one to get started!
            </div>
          )}
        </div>
      </div>
      
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}

export default ExpensesPage;


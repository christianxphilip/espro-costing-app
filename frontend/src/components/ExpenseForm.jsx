import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function ExpenseForm({ expense, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    frequency: 'monthly',
    category: '',
    context: 'in-store',
    allocationType: 'standard',
    notes: '',
  });
  
  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name || '',
        amount: expense.amount || 0,
        frequency: expense.frequency || 'monthly',
        category: expense.category || '',
        context: expense.context || 'in-store',
        allocationType: expense.allocationType || 'per-item',
        notes: expense.notes || '',
      });
    }
  }, [expense]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6">
          {expense ? 'Edit Operating Expense' : 'Add Operating Expense'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Expense Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
              placeholder="e.g., Rent, Utilities, Labor"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₱)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="label">Frequency</label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
                <option value="event">Event (Time-based)</option>
              </select>
            </div>
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
              <option value="in-store">In-Store</option>
              <option value="event">Event (Pop-up, Markets, etc.)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              💡 Select where this expense applies. This determines which items get this cost allocated.
            </p>
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
              placeholder="e.g., Fixed Costs, Utilities, Labor"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 All expenses are divided by your global expected daily sales (set in Settings)
            </p>
          </div>
          
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows="3"
              placeholder="Additional details about this expense..."
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1">
              {expense ? 'Update Expense' : 'Add Expense'}
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

export default ExpenseForm;


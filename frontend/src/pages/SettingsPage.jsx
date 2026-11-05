import React, { useState, useEffect } from 'react';
import { settingsAPI, expensesAPI } from '../services/api';
import { formatPeso, formatCurrency } from '../utils/formatNumber';

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    expectedDailySales: 100,
    expectedDailySalesInStore: 100,
    expectedDailySalesEvent: 50,
    eventDurationDays: 1,
    businessName: 'My Café',
    currency: 'PHP',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.get();
      setSettings(response.data.data);
      const data = response.data.data;
      setFormData({
        expectedDailySales: data.expectedDailySales || 100,
        expectedDailySalesInStore: data.expectedDailySalesInStore || data.expectedDailySales || 100,
        expectedDailySalesEvent: data.expectedDailySalesEvent || 50,
        eventDurationDays: data.eventDurationDays || 1,
        businessName: data.businessName || 'My Café',
        currency: data.currency || 'PHP',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await settingsAPI.update(formData);
      alert('Settings saved successfully! Item costs have been recalculated.');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleRecalculate = async () => {
    if (!confirm('This will recalculate all item costs based on current settings. Continue?')) return;
    
    try {
      await expensesAPI.recalculate();
      alert('All item costs have been recalculated!');
    } catch (error) {
      console.error('Error recalculating:', error);
      alert('Failed to recalculate costs');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }
  
  // Calculate cost per item preview
  const calculatePreview = () => {
    const dailySales = parseFloat(formData.expectedDailySales) || 100;
    // This is just a preview calculation
    return {
      sales: formatCurrency(dailySales, 0),
      // These are example values for display
      exampleExpense: formatPeso(1000),
      costPerItem: formatPeso(1000 / dailySales),
    };
  };
  
  const preview = calculatePreview();
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure global settings for your café</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-6">General Settings</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Business Name</label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="label">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="PHP">PHP (₱)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-bold text-lg mb-4">Cost Allocation</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      Expected Daily Sales - In-Store 
                      <span className="text-primary-600 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="expectedDailySalesInStore"
                      value={formData.expectedDailySalesInStore}
                      onChange={handleChange}
                      className="input"
                      min="1"
                      step="1"
                      required
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      💡 How many total items you expect to sell per day in your store
                    </p>
                  </div>
                  
                  <div>
                    <label className="label">
                      Expected Daily Sales - Events 
                      <span className="text-primary-600 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="expectedDailySalesEvent"
                      value={formData.expectedDailySalesEvent}
                      onChange={handleChange}
                      className="input"
                      min="1"
                      step="1"
                      required
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      💡 How many total items you expect to sell per day at events (pop-ups, markets, etc.)
                    </p>
                  </div>
                  
                  <div>
                    <label className="label">
                      Event Duration (Days)
                      <span className="text-primary-600 ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      name="eventDurationDays"
                      value={formData.eventDurationDays}
                      onChange={handleChange}
                      className="input"
                      min="1"
                      step="1"
                      required
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      💡 How many days your events typically last. This affects how one-time event expenses are allocated to items.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">How This Works:</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Operating expenses are divided by expected daily sales to get the cost per item sold.
                    </p>
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Different contexts, different costs:</strong> Since events and in-store operations have different expenses and sales volumes, you can set separate expected daily sales for each context. This allows the same item (like an Americano) to have different prices for in-store vs events.
                    </p>
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Event Duration:</strong> One-time event expenses (like booth setup fees) are spread across the event duration. For example, a ₱{3000 * formData.eventDurationDays} one-time expense for a {formData.eventDurationDays}-day event = ₱{(3000 * formData.eventDurationDays / formData.eventDurationDays).toFixed(0)} per day, then divided by daily sales.
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Example (In-Store):</strong> If in-store daily expenses = ₱{preview.exampleExpense} 
                      and expected daily sales = {formData.expectedDailySalesInStore} items, 
                      then each item gets ₱{(1000 / formData.expectedDailySalesInStore).toFixed(2)} in overhead costs.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      <strong>Example (Event):</strong> If event one-time expense = ₱{3000 * formData.eventDurationDays} for {formData.eventDurationDays} day(s),
                      daily sales = {formData.expectedDailySalesEvent} items/day,
                      then per item = ₱{(3000 / formData.eventDurationDays / formData.expectedDailySalesEvent).toFixed(2)} per day.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button 
                  type="button"
                  onClick={handleRecalculate}
                  className="btn btn-secondary flex-1"
                >
                  🔄 Recalculate Costs
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Info Panel */}
        <div className="space-y-6">
          <div className="card bg-primary-50 border-2 border-primary-200">
            <h3 className="font-bold text-lg mb-3">💡 Tip</h3>
            <p className="text-sm text-gray-700 mb-2">
              Set your expected daily sales based on your average total sales per day.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Example:</strong> If you sell 50 coffees + 30 pastries + 20 drinks per day, 
              set this to <strong>100 items</strong>.
            </p>
          </div>
          
          <div className="card bg-yellow-50 border-2 border-yellow-200">
            <h3 className="font-bold text-lg mb-3">⚠️ Important</h3>
            <p className="text-sm text-gray-700 mb-2">
              Changing expected daily sales will automatically recalculate all item costs.
            </p>
            <p className="text-sm text-gray-700">
              Review your item prices after making changes!
            </p>
          </div>
          
          <div className="card">
            <h3 className="font-bold text-lg mb-3">📊 Current Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Sales (In-Store):</span>
                <span className="font-medium">{settings?.expectedDailySalesInStore || settings?.expectedDailySales || 100} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Sales (Events):</span>
                <span className="font-medium">{settings?.expectedDailySalesEvent || 50} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Event Duration:</span>
                <span className="font-medium">{settings?.eventDurationDays || 1} day(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Business:</span>
                <span className="font-medium">{settings?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-medium">{settings?.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;


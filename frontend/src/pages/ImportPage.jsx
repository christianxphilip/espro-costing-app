import React, { useState } from 'react';
import ImportUploader from '../components/ImportUploader';
import { importAPI, expensesAPI, ingredientsAPI } from '../services/api';

function ImportPage() {
  const [activeTab, setActiveTab] = useState('items'); // items, expenses, ingredients
  const [parsedItems, setParsedItems] = useState([]);
  const [parsedExpenses, setParsedExpenses] = useState([]);
  const [parsedIngredients, setParsedIngredients] = useState([]);
  
  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await importAPI.upload(formData);
      setParsedItems(response.data.data);
      alert(`Successfully parsed ${response.data.data.length} items!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please check the format.');
    }
  };
  
  const handleSave = async (items) => {
    try {
      const response = await importAPI.save(items);
      alert(`Successfully saved ${response.data.data.length} items to database!`);
      setParsedItems([]);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save items to database.');
    }
  };
  
  const handleExport = async () => {
    try {
      const response = await importAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cafe-items-export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export items.');
    }
  };
  
  const handleDownloadTemplate = async () => {
    try {
      let response, filename;
      
      if (activeTab === 'items') {
        response = await importAPI.getTemplate();
        filename = 'cafe-items-template.xlsx';
      } else if (activeTab === 'expenses') {
        response = await importAPI.getExpensesTemplate();
        filename = 'expenses-template.xlsx';
      } else if (activeTab === 'ingredients') {
        response = await importAPI.getIngredientsTemplate();
        filename = 'ingredients-template.xlsx';
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Template download error:', error);
      alert('Failed to download template.');
    }
  };
  
  const handleUploadExpenses = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await importAPI.uploadExpenses(formData);
      setParsedExpenses(response.data.data);
      alert(`Successfully parsed ${response.data.data.length} expenses!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please check the format.');
    }
  };
  
  const handleSaveExpenses = async (expenses) => {
    try {
      const response = await importAPI.saveExpenses(expenses);
      alert(`Successfully saved ${response.data.data.length} expenses!`);
      setParsedExpenses([]);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save expenses to database.');
    }
  };
  
  const handleExportExpenses = async () => {
    try {
      const response = await importAPI.exportExpenses();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'expenses-export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export expenses.');
    }
  };
  
  const handleUploadIngredients = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await importAPI.uploadIngredients(formData);
      setParsedIngredients(response.data.data);
      alert(`Successfully parsed ${response.data.data.length} ingredients!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please check the format.');
    }
  };
  
  const handleSaveIngredients = async (ingredients) => {
    try {
      const response = await importAPI.saveIngredients(ingredients);
      alert(`Successfully saved ${response.data.data.length} ingredients!`);
      setParsedIngredients([]);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save ingredients to database.');
    }
  };
  
  const handleExportIngredients = async () => {
    try {
      const response = await importAPI.exportIngredients();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ingredients-export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export ingredients.');
    }
  };
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import & Export</h1>
        <p className="text-gray-600 mt-2">Bulk import/export items, expenses, and ingredients</p>
      </div>
      
      {/* Tabs */}
      <div className="mb-6 flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'items'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📦 Items
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          💰 Expenses
        </button>
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'ingredients'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          📚 Ingredients
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <button onClick={handleDownloadTemplate} className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">📄</div>
            <h3 className="font-bold text-lg mb-2">Download Template</h3>
            <p className="text-sm text-gray-600">Get Excel template with sample data</p>
          </div>
        </button>
        
        <button 
          onClick={activeTab === 'items' ? handleExport : activeTab === 'expenses' ? handleExportExpenses : handleExportIngredients} 
          className="card hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="text-center">
            <div className="text-4xl mb-3">💾</div>
            <h3 className="font-bold text-lg mb-2">
              Export {activeTab === 'items' ? 'Items' : activeTab === 'expenses' ? 'Expenses' : 'Ingredients'}
            </h3>
            <p className="text-sm text-gray-600">Download all data to Excel</p>
          </div>
        </button>
        
        <div className="card bg-primary-50 border-2 border-primary-200">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-lg mb-2">Expected Format</h3>
            <p className="text-sm text-gray-700">
              {activeTab === 'items' && 'Item Name, Category, Expected Daily Sales, Profit Margin, Ingredients'}
              {activeTab === 'expenses' && 'Name, Amount, Frequency, Category, Allocation Type'}
              {activeTab === 'ingredients' && 'Name, Category, Unit, Cost Per Unit, Supplier'}
            </p>
          </div>
        </div>
      </div>
      
      {activeTab === 'items' && (
        <ImportUploader
          onUpload={handleUpload}
          onSave={handleSave}
          parsedItems={parsedItems}
        />
      )}
      
      {activeTab === 'expenses' && (
        <ImportUploader
          onUpload={handleUploadExpenses}
          onSave={handleSaveExpenses}
          parsedItems={parsedExpenses}
        />
      )}
      
      {activeTab === 'ingredients' && (
        <ImportUploader
          onUpload={handleUploadIngredients}
          onSave={handleSaveIngredients}
          parsedItems={parsedIngredients}
        />
      )}
    </div>
  );
}

export default ImportPage;


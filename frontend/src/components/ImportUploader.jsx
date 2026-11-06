import React, { useState } from 'react';
import { motion } from 'framer-motion';

function ImportUploader({ onUpload, onSave, parsedItems = [], previewLabel = 'Items', renderPreview, saveDisabled = false }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
    e.target.value = '';
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      await onUpload(file);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(parsedItems);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Upload Excel/CSV File</h3>
        
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            const droppedFile = event.dataTransfer.files[0];
            if (!loading && droppedFile) setFile(droppedFile);
          }}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            disabled={loading}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Click to select a file or drag and drop'}
            </p>
            <p className="text-sm text-gray-500">Excel (.xlsx, .xls) or CSV files</p>
          </label>
        </div>
        
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Upload & Parse'}
          </button>
        </div>
      </div>
      
      {parsedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Parsed {previewLabel} ({parsedItems.length})</h3>
            <button
              onClick={handleSave}
              disabled={loading || saveDisabled}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save All to Database'}
            </button>
          </div>
          
          {renderPreview ? renderPreview(loading) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Ingredients</th>
                  <th className="px-3 py-2 text-right">Op. Expense</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">{item.category}</td>
                    <td className="px-3 py-2 text-right">{item.ingredients?.length || 0}</td>
                    <td className="px-3 py-2 text-right">₱{item.operatingExpense || 0}</td>
                    <td className="px-3 py-2 text-right">{item.profitMargin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default ImportUploader;


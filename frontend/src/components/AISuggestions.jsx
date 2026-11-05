import React from 'react';
import { motion } from 'framer-motion';
import { formatPeso } from '../utils/formatNumber';

function AISuggestions({ item, suggestion, onClose }) {
  if (!suggestion) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Pricing Suggestion</h2>
            <p className="text-gray-600 mt-1">for {item?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 mb-1">Formula-Based Price</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPeso(suggestion.formulaPrice || 0)}
              </p>
            </div>
            
            <div className="p-4 bg-primary-50 rounded-lg border-2 border-primary-200">
              <p className="text-sm text-primary-900 mb-1">AI Suggested Price</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatPeso(suggestion.aiSuggestedPrice || 0)}
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Reasoning</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              {suggestion.reasoning || 'No reasoning provided'}
            </p>
          </div>
          
          {suggestion.source && (
            <div className="text-xs text-gray-500 text-center">
              Source: {suggestion.source}
            </div>
          )}
          
          <button onClick={onClose} className="btn btn-primary w-full mt-4">
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default AISuggestions;


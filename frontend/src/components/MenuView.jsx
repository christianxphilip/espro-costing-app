import React from 'react';
import { motion } from 'framer-motion';
import { menusAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function MenuView({ menu, onClose }) {
  if (!menu) return null;

  const [showProfitMargin, setShowProfitMargin] = React.useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadRecipePDF = async () => {
    try {
      const response = await menusAPI.generateRecipePDF(menu._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${menu.name.replace(/[^a-z0-9]/gi, '_')}-recipe.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating recipe PDF:', error);
      alert('Failed to generate recipe PDF');
    }
  };

  const contextPrice = (item) => {
    if (menu.context === 'event') {
      return item.event?.suggestedPrice || item.suggestedPrice || 0;
    } else {
      return item.inStore?.suggestedPrice || item.suggestedPrice || 0;
    }
  };

  // Group items by menu category (not item category)
  const itemsByCategory = {};
  menu.items?.forEach((menuItem) => {
    if (!menuItem.item) return;
    // Use the category assigned in the menu, not the item's category
    const category = menuItem.category || 'Other';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(menuItem);
  });

  // Sort categories and items within categories
  const categories = Object.keys(itemsByCategory).sort();
  categories.forEach(cat => {
    itemsByCategory[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Calculate grid columns based on category count (max 4)
  // Responsive grid: 1 col on mobile, 2 on tablet, 3-4 on desktop
  const gridCols = Math.min(categories.length, 4);
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[gridCols] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <>
      {/* Scrollbar and Print Styles */}
      <style>{`
        /* Custom scrollbar styles for webkit browsers (Chrome, Safari, Edge) */
        .menu-scrollable::-webkit-scrollbar {
          width: 8px;
        }
        @media (min-width: 640px) {
          .menu-scrollable::-webkit-scrollbar {
            width: 12px;
          }
        }
        .menu-scrollable::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .menu-scrollable::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 4px;
          border: 1px solid #f1f5f9;
        }
        @media (min-width: 640px) {
          .menu-scrollable::-webkit-scrollbar-thumb {
            border: 2px solid #f1f5f9;
          }
        }
        .menu-scrollable::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        
        /* Firefox scrollbar */
        .menu-scrollable {
          scrollbar-width: thin;
        }
        @media (min-width: 640px) {
          .menu-scrollable {
            scrollbar-width: auto;
          }
        }
        .menu-scrollable {
          scrollbar-color: #94a3b8 #f1f5f9;
        }
        
        /* Better touch scrolling on mobile */
        .menu-scrollable {
          -webkit-overflow-scrolling: touch;
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-menu, .printable-menu * {
            visibility: visible;
          }
          .printable-menu {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 0;
            box-shadow: none;
            border: none;
            max-height: none;
            overflow: visible;
          }
          .printable-menu > div {
            padding: 1.5cm;
          }
          .no-print {
            display: none !important;
          }
          .printable-menu .profit-margin,
          .printable-menu .default-price,
          .printable-menu .cross-context-price,
          .printable-menu .price-override-note {
            display: none !important;
          }
          .printable-menu h2 {
            font-size: 2rem;
            margin-bottom: 0.5cm;
          }
          .printable-menu h3 {
            font-size: 1.5rem;
            page-break-after: avoid;
            break-after: avoid;
          }
          .printable-menu .grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 1.5cm !important;
          }
          @media print {
            .printable-menu .grid {
              grid-template-columns: repeat(var(--print-cols, 4), 1fr) !important;
            }
          }
          .printable-menu .grid > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .printable-menu .space-y-2 > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-0 sm:p-2 z-50 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-w-7xl sm:my-4 sm:max-h-[calc(100vh-2rem)] flex flex-col printable-menu"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 flex-shrink-0 border-b border-gray-200">
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-2 gap-3 relative">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words pr-8 sm:pr-0">{menu.name}</h2>
                <div className="flex flex-wrap items-center gap-2 no-print">
                  <button
                    onClick={() => setShowProfitMargin(!showProfitMargin)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${showProfitMargin
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    title={showProfitMargin ? 'Hide profit margins' : 'Show profit margins'}
                  >
                    <span className="hidden sm:inline">{showProfitMargin ? '👁️ Hide Details' : '👁️ Show Details'}</span>
                    <span className="sm:hidden">{showProfitMargin ? '👁️ Hide' : '👁️ Show'}</span>
                  </button>
                  <button
                    onClick={handleDownloadRecipePDF}
                    className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">📄 Recipe PDF</span>
                    <span className="sm:hidden">📄 PDF</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">🖨️ Print Menu</span>
                    <span className="sm:hidden">🖨️ Print</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="absolute top-0 right-0 sm:relative sm:top-0 sm:right-0 text-gray-400 hover:text-gray-600 text-2xl sm:text-xl"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <span className="px-2 sm:px-3 py-1 rounded-full font-medium bg-purple-100 text-purple-800 whitespace-nowrap">
                  {menu.category}
                </span>
                <span className={`px-2 sm:px-3 py-1 rounded-full font-medium whitespace-nowrap ${menu.context === 'event'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
                  }`}>
                  {menu.context === 'event' ? '🎪 Event Menu' : '🏪 In-Store Menu'}
                </span>
                <span className="no-print">{menu.items?.length || 0} items</span>
              </div>
              {menu.description && (
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-600">{menu.description}</p>
              )}
            </div>
          </div>

          {/* Menu Items - Scrollable Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-3 sm:py-4 menu-scrollable min-h-0">
            {categories.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-400 text-sm sm:text-base">
                No items in this menu
              </div>
            ) : (
              <div className={`grid ${gridColsClass} gap-4 sm:gap-6 print:grid-cols-4`}>
                {categories.map((category, catIndex) => (
                  <div key={category} className="print:break-inside-avoid">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-3 border-b-2 border-gray-200 pb-1 sm:pb-2 print:break-after-avoid">
                      {category}
                    </h3>
                    <div className="space-y-3 sm:space-y-4 print:space-y-4">
                      {(() => {
                        // Group items by itemId to render them together
                        const uniqueItemIds = [...new Set(itemsByCategory[category].map(mi => mi.item?._id || mi.item))];

                        return uniqueItemIds.map(itemId => {
                          const variants = itemsByCategory[category].filter(mi => (mi.item?._id || mi.item) === itemId);
                          if (variants.length === 0) return null;

                          const firstVariant = variants[0];
                          const item = firstVariant.item;
                          if (!item) return null;

                          return (
                            <div
                              key={itemId}
                              className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100 print:break-inside-avoid"
                            >
                              {/* Item Header */}
                              <div className="p-2 sm:p-3 bg-gray-100 border-b border-gray-200">
                                <div className="font-bold text-sm sm:text-base text-gray-900 break-words">{item.name}</div>
                                {item.ingredients && item.ingredients.length > 0 && (
                                  <div className="text-[10px] sm:text-xs text-gray-600 mt-1 line-clamp-2">
                                    {item.ingredients.map(ing => ing.name).join(', ')}
                                  </div>
                                )}
                              </div>

                              {/* Variants List */}
                              <div className="divide-y divide-gray-100">
                                {variants.map((variant, vIndex) => {
                                  const multiplier = variant.multiplier || 1;
                                  
                                  const contextData = menu.context === 'event' ? item.event : item.inStore;
                                  const ingredientCost = contextData?.ingredientCost || 0;
                                  const operatingExpense = contextData?.operatingExpense || 0;
                                  const profitMargin = contextData?.profitMargin || item.profitMargin || 30;

                                  // Calculate COGS using new logic: multiply ingredient cost, add OpEx once
                                  const totalCogs = (ingredientCost * multiplier) + operatingExpense;
                                  
                                  // Calculate default price based on new COGS logic
                                  const defaultPrice = totalCogs * (1 + (profitMargin / 100));
                                  
                                  const displayPrice = variant.priceOverride !== null && variant.priceOverride !== undefined
                                    ? variant.priceOverride
                                    : defaultPrice;

                                  const calculatedMargin = variant.calculatedProfitMargin !== null && variant.calculatedProfitMargin !== undefined
                                    ? variant.calculatedProfitMargin
                                    : (variant.priceOverride !== null && variant.priceOverride !== undefined && totalCogs > 0
                                      ? ((variant.priceOverride - totalCogs) / totalCogs) * 100
                                      : null);

                                  return (
                                    <div key={vIndex} className="p-2 sm:p-3 flex items-center justify-between hover:bg-white transition-colors gap-2">
                                      <div className="text-xs sm:text-sm text-gray-700 flex-1 min-w-0">
                                        <div className="font-medium">
                                          {multiplier === 1 ? 'Single Order' : `Platter (${multiplier}x)`}
                                        </div>
                                        {showProfitMargin && operatingExpense > 0 && (
                                          <div className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5">
                                            OpEx: {formatPeso(operatingExpense)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="font-bold text-sm sm:text-base text-primary-600 whitespace-nowrap">
                                          {formatPeso(displayPrice)}
                                        </div>
                                        {showProfitMargin && calculatedMargin !== null && (
                                          <div className="text-[9px] sm:text-[10px] profit-margin no-print">
                                            <span className={`font-medium ${calculatedMargin < 0 ? 'text-red-600' :
                                              calculatedMargin < 15 ? 'text-yellow-600' :
                                                'text-green-600'
                                              }`}>
                                              {calculatedMargin.toFixed(1)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 flex-shrink-0 border-t border-gray-200 no-print">
            <button
              onClick={onClose}
              className="btn btn-secondary w-full text-sm sm:text-base py-2 sm:py-2.5"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default MenuView;


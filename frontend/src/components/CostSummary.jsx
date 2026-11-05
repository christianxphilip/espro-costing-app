import React from 'react';
import { formatPeso } from '../utils/formatNumber';

function CostSummary({ item }) {
  if (!item) return null;
  
  const { ingredientCost = 0, cogs = 0, suggestedPrice = 0, aiSuggestedPrice, targetFoodCostPercent = 0, feesPercent = 0 } = item;
  
  // Get final selling prices (either locked custom price or suggested price)
  const finalPriceInStore = item.isPriceLocked && item.lockedPrice ? item.lockedPrice : (item.suggestedPriceInStore || suggestedPrice);
  const finalPriceEvent = item.isPriceLocked && item.lockedPrice ? item.lockedPrice : (item.suggestedPriceEvent || suggestedPrice);
  const finalPrice = item.isPriceLocked && item.lockedPrice ? item.lockedPrice : suggestedPrice;
  
  const feesMultiplier = 1 + (feesPercent / 100);
  
  // Calculate Net Revenue (Selling Price without fees)
  const netRevenueInStore = finalPriceInStore / feesMultiplier;
  const netRevenueEvent = finalPriceEvent / feesMultiplier;
  const netRevenue = finalPrice / feesMultiplier;
  
  // Calculate Gross Profit: Net Revenue - Ingredient Cost
  const profitInStore = netRevenueInStore - ingredientCost;
  const profitEvent = netRevenueEvent - ingredientCost;
  const profit = netRevenue - ingredientCost;
  
  // Actual Food Cost is calculated against the net revenue they actually receive
  const actualFoodCostPercentInStore = netRevenueInStore > 0 ? ((ingredientCost / netRevenueInStore) * 100) : 0;
  const actualFoodCostPercentEvent = netRevenueEvent > 0 ? ((ingredientCost / netRevenueEvent) * 100) : 0;
  const actualFoodCostPercent = netRevenue > 0 ? ((ingredientCost / netRevenue) * 100) : 0;
  
  // Use In-Store as the primary display profit if dual context exists, else default
  const displayProfit = (item.targetFoodCostPercentInStore !== undefined || item.targetFoodCostPercentEvent !== undefined) ? profitInStore : profit;
  const displayFCPercent = (item.targetFoodCostPercentInStore !== undefined || item.targetFoodCostPercentEvent !== undefined) ? actualFoodCostPercentInStore : actualFoodCostPercent;
  const displayTargetFC = item.targetFoodCostPercentInStore || targetFoodCostPercent;
  
  // Determine profit color and background based on actual food cost percentage
  const getProfitStyle = () => {
    if (displayProfit < 0 || displayFCPercent > 50) {
      // Negative profit (loss) or food cost over 50% - Red
      return {
        bg: 'bg-red-100',
        text: 'text-red-900',
        badge: 'bg-red-500 text-white',
        statusText: displayProfit < 0 ? 'LOSS' : 'CRITICAL COST',
        icon: '📉'
      };
    } else if (displayFCPercent > 40 && displayFCPercent <= 50) {
      // Warning food cost (40% to 50%) - Yellow
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-900',
        badge: 'bg-yellow-500 text-white',
        statusText: 'WARNING MARGIN',
        icon: '⚠️'
      };
    } else {
      // Good food cost (at or below 40%) - Green
      return {
        bg: 'bg-green-100',
        text: 'text-green-900',
        badge: 'bg-green-500 text-white',
        statusText: 'GOOD MARGIN',
        icon: '✅'
      };
    }
  };
  
  const profitStyle = getProfitStyle();
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
        <span className="text-sm font-medium text-blue-900">Ingredient Cost</span>
        <span className="text-lg font-bold text-blue-600">{formatPeso(ingredientCost)}</span>
      </div>
      
      {(item.targetFoodCostPercentInStore !== undefined || item.targetFoodCostPercentEvent !== undefined) ? (
        <>
          <div className="p-3 bg-indigo-50 rounded-lg space-y-2">
            <div className="text-sm font-medium text-indigo-900 mb-2">Selling Price {item.isPriceLocked && '🔒'}</div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                🏪 In-Store
                {item.targetFoodCostPercentInStore !== undefined && item.targetFoodCostPercentInStore !== null && !item.isPriceLocked && (
                  <span className="ml-1 text-gray-500">
                    ({item.targetFoodCostPercentInStore}% Target {feesPercent > 0 ? `+ ${feesPercent}% Fees` : ''})
                  </span>
                )}
              </span>
              <span className="text-lg font-bold text-blue-600">{formatPeso(finalPriceInStore)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">
                🎪 Event
                {item.targetFoodCostPercentEvent !== undefined && item.targetFoodCostPercentEvent !== null && !item.isPriceLocked && (
                  <span className="ml-1 text-gray-500">
                    ({item.targetFoodCostPercentEvent}% Target {feesPercent > 0 ? `+ ${feesPercent}% Fees` : ''})
                  </span>
                )}
              </span>
              <span className="text-lg font-bold text-orange-600">{formatPeso(finalPriceEvent)}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
            <span className="text-sm font-medium text-indigo-900">
              Selling Price {item.isPriceLocked && '🔒'}
              {!item.isPriceLocked && feesPercent > 0 && <span className="ml-1 text-xs text-gray-500 font-normal">(incl. {feesPercent}% Fees)</span>}
            </span>
            <span className="text-lg font-bold text-indigo-600">{formatPeso(finalPrice)}</span>
          </div>
        </>
      )}
      
      {/* Profit Display with Dynamic Color */}
      <div className={`flex justify-between items-center p-4 ${profitStyle.bg} rounded-lg border-2 border-current`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{profitStyle.icon}</span>
          <div>
            <div className={`text-sm font-medium ${profitStyle.text}`}>
              Gross Profit <span className="text-xs font-normal opacity-75">(Net of fees)</span>
            </div>
            <div className="text-xs opacity-75">Target FC: {displayTargetFC}% | Actual FC: {displayFCPercent.toFixed(1)}%</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${profitStyle.text}`}>
            {formatPeso(displayProfit)}
          </div>
          <div className={`text-xs px-2 py-1 rounded ${profitStyle.badge} inline-block mt-1`}>
            {profitStyle.statusText}
          </div>
        </div>
      </div>
      
      {aiSuggestedPrice && (
        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg border-2 border-primary-200">
          <span className="text-sm font-medium text-primary-900">AI Suggested Price</span>
          <span className="text-lg font-bold text-primary-600">{formatPeso(aiSuggestedPrice)}</span>
        </div>
      )}

      {/* Computations Section */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-bold text-gray-700 mb-3">Computations</h4>
        <div className="space-y-3 text-xs font-mono text-gray-600">
          <div className="mb-2 text-gray-800 bg-white p-2 border border-gray-200 rounded">
            <strong>Formula:</strong> (Ingredient Cost / Target FC %) * (1 + Fees %)
          </div>
          
          <div className="flex justify-between border-b border-gray-200 pb-1">
            <span>Ingredient Cost</span>
            <span>{formatPeso(ingredientCost)}</span>
          </div>
          
          {(item.operatingExpenseInStore !== undefined || item.operatingExpenseEvent !== undefined) ? (
            <>
              {/* In-Store */}
              <div className="pt-1">
                <div className="font-bold text-blue-700 mb-1 flex items-center gap-1">🏪 In-Store Calculation</div>
                <div className="flex justify-between pl-4">
                  <span>Target Food Cost</span>
                  <span>{item.targetFoodCostPercentInStore || targetFoodCostPercent}%</span>
                </div>
                <div className="flex justify-between pl-4 border-b border-gray-200 pb-1">
                  <span>Fees</span>
                  <span>{feesPercent}%</span>
                </div>
                <div className="bg-white p-2 rounded mt-1 border border-gray-100">
                  ({formatPeso(ingredientCost)} / {((item.targetFoodCostPercentInStore || targetFoodCostPercent) / 100).toFixed(2)}) * {(1 + feesPercent / 100).toFixed(4)} = <strong className="text-blue-600">{formatPeso(item.suggestedPriceInStore || suggestedPrice)}</strong>
                </div>
              </div>
              
              {/* Event */}
              <div className="pt-1">
                <div className="font-bold text-orange-700 mb-1 flex items-center gap-1">🎪 Event Calculation</div>
                <div className="flex justify-between pl-4">
                  <span>Target Food Cost</span>
                  <span>{item.targetFoodCostPercentEvent || targetFoodCostPercent}%</span>
                </div>
                <div className="flex justify-between pl-4 border-b border-gray-200 pb-1">
                  <span>Fees</span>
                  <span>{feesPercent}%</span>
                </div>
                <div className="bg-white p-2 rounded mt-1 border border-gray-100">
                  ({formatPeso(ingredientCost)} / {((item.targetFoodCostPercentEvent || targetFoodCostPercent) / 100).toFixed(2)}) * {(1 + feesPercent / 100).toFixed(4)} = <strong className="text-orange-600">{formatPeso(item.suggestedPriceEvent || suggestedPrice)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="pt-1">
              <div className="flex justify-between">
                <span>Target Food Cost</span>
                <span>{targetFoodCostPercent}%</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span>Fees</span>
                <span>{feesPercent}%</span>
              </div>
              <div className="bg-white p-2 rounded mt-2 border border-gray-100">
                ({formatPeso(ingredientCost)} / {(targetFoodCostPercent / 100).toFixed(2)}) * {(1 + feesPercent / 100).toFixed(4)} = <strong className="text-indigo-600">{formatPeso(suggestedPrice)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CostSummary;


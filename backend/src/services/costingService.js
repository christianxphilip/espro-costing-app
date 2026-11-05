/**
 * Calculate total ingredient cost for an item
 * @param {Array} ingredients - Array of ingredients with quantity and costPerUnit
 * @returns {Number} Total ingredient cost
 */
const calculateIngredientCost = (ingredients) => {
  if (!ingredients || !Array.isArray(ingredients)) {
    return 0;
  }
  
  return ingredients.reduce((total, ingredient) => {
    return total + (ingredient.quantity * ingredient.costPerUnit);
  }, 0);
};

/**
 * Calculate Cost of Goods Sold (COGS)
 * @param {Number} ingredientCost - Total cost of ingredients
 * @param {Number} operatingExpense - Operating expense allocation
 * @returns {Number} COGS
 */
const calculateCOGS = (ingredientCost, operatingExpense) => {
  return ingredientCost + (operatingExpense || 0);
};

/**
 * Calculate suggested selling price
 * @param {Number} ingredientCost - Total cost of ingredients
 * @param {Number} targetFoodCostPercent - Target food cost percentage
 * @param {Number} feesPercent - Fees percentage
 * @returns {Number} Suggested selling price
 */
const calculateSuggestedPrice = (ingredientCost, targetFoodCostPercent, feesPercent = 0) => {
  const target = targetFoodCostPercent || 30;
  if (target === 0) return 0;
  const basePrice = ingredientCost / (target / 100);
  return basePrice * (1 + (feesPercent / 100));
};

/**
 * Calculate all costs for an item
 * @param {Object} item - Item with ingredients, operatingExpense, and targetFoodCostPercent
 * @param {String} context - Optional: 'in-store' or 'event'. If not provided, uses default operatingExpense
 * @returns {Object} Object containing all calculated costs
 */
const calculateAllCosts = (item, context = null) => {
  const ingredientCost = calculateIngredientCost(item.ingredients);
  
  let operatingExpense;
  let targetFoodCostPercent;
  
  if (context === 'in-store') {
    operatingExpense = item.operatingExpenseInStore || 0;
    targetFoodCostPercent = item.targetFoodCostPercentInStore !== null && item.targetFoodCostPercentInStore !== undefined 
      ? item.targetFoodCostPercentInStore 
      : item.targetFoodCostPercent;
  } else if (context === 'event') {
    operatingExpense = item.operatingExpenseEvent || 0;
    targetFoodCostPercent = item.targetFoodCostPercentEvent !== null && item.targetFoodCostPercentEvent !== undefined 
      ? item.targetFoodCostPercentEvent 
      : item.targetFoodCostPercent;
  } else {
    operatingExpense = item.operatingExpense || 0;
    targetFoodCostPercent = item.targetFoodCostPercent;
  }
  
  const cogs = calculateCOGS(ingredientCost, operatingExpense);
  const suggestedPrice = calculateSuggestedPrice(ingredientCost, targetFoodCostPercent, item.feesPercent || 0);
  
  const result = {
    ingredientCost: Number(ingredientCost.toFixed(2)),
    cogs: Number(cogs.toFixed(2)),
    suggestedPrice: Number(suggestedPrice.toFixed(2)),
    targetFoodCostPercent: targetFoodCostPercent,
  };
  
  // If context is specified, also return context-specific values
  if (context) {
    result.context = context;
    result.operatingExpense = operatingExpense;
  }
  
  return result;
};

/**
 * Calculate all costs for an item for both contexts
 * @param {Object} item - Item with ingredients, operatingExpense, and targetFoodCostPercent
 * @returns {Object} Object containing all calculated costs for both contexts
 */
const calculateAllCostsForAllContexts = (item) => {
  const ingredientCost = calculateIngredientCost(item.ingredients);
  
  // Get context-specific target food cost percents (fallback to default if not set)
  const inStoreTarget = item.targetFoodCostPercentInStore !== null && item.targetFoodCostPercentInStore !== undefined 
    ? item.targetFoodCostPercentInStore 
    : item.targetFoodCostPercent;
  const eventTarget = item.targetFoodCostPercentEvent !== null && item.targetFoodCostPercentEvent !== undefined 
    ? item.targetFoodCostPercentEvent 
    : item.targetFoodCostPercent;
  
  const feesPercent = item.feesPercent || 0;
  
  const inStoreCosts = {
    context: 'in-store',
    ingredientCost: Number(ingredientCost.toFixed(2)),
    operatingExpense: Number((item.operatingExpenseInStore || 0).toFixed(2)),
    cogs: Number(calculateCOGS(ingredientCost, item.operatingExpenseInStore || 0).toFixed(2)),
    targetFoodCostPercent: inStoreTarget,
  };
  inStoreCosts.suggestedPrice = Number(calculateSuggestedPrice(ingredientCost, inStoreTarget, feesPercent).toFixed(2));
  
  const eventCosts = {
    context: 'event',
    ingredientCost: Number(ingredientCost.toFixed(2)),
    operatingExpense: Number((item.operatingExpenseEvent || 0).toFixed(2)),
    cogs: Number(calculateCOGS(ingredientCost, item.operatingExpenseEvent || 0).toFixed(2)),
    targetFoodCostPercent: eventTarget,
  };
  eventCosts.suggestedPrice = Number(calculateSuggestedPrice(ingredientCost, eventTarget, feesPercent).toFixed(2));
  
  return {
    inStore: inStoreCosts,
    event: eventCosts,
  };
};

module.exports = {
  calculateIngredientCost,
  calculateCOGS,
  calculateSuggestedPrice,
  calculateAllCosts,
  calculateAllCostsForAllContexts,
};

/**
 * Calculate Financial Milestones (Macro Financial Planner)
 * @param {Number} totalMonthlyOverhead - Calculated total monthly operating expenses
 * @param {Number|String} targetFoodCostPercent - Target food cost percentage (0-99)
 * @param {Number|String} averageTicket - Average customer ticket size
 * @param {Number|String} profitGoal - Target monthly profit goal
 * @returns {Object} Calculated milestones
 */
const calculateFinancialMilestones = (totalMonthlyOverhead, targetFoodCostPercent, averageTicket, profitGoal) => {
  // Explicit data cast enforcement
  const foodCost = parseFloat(targetFoodCostPercent) || 0;
  const ticket = parseFloat(averageTicket) || 0;
  const targetProfit = parseFloat(profitGoal) || 0;
  const overhead = parseFloat(totalMonthlyOverhead) || 0;

  // Division-by-Zero Protection & Bounds Check
  if (foodCost >= 100) {
    return {
      monthlyBreakEvenSales: 0,
      monthlyBreakEvenCustomers: 0,
      dailyBreakEvenSales: 0,
      dailyBreakEvenCustomers: 0,
      monthlyTargetSales: 0,
      monthlyTargetCustomers: 0,
      dailyTargetSales: 0,
      dailyTargetCustomers: 0,
      grossMarginPercent: 0,
      overhead,
      isFallback: true
    };
  }

  const grossMarginPercent = (100 - foodCost) / 100;
  
  // Break-even (Overhead / Gross Margin)
  const monthlyBreakEvenSales = overhead / grossMarginPercent;
  // Use Math.ceil for customer targets
  const monthlyBreakEvenCustomers = ticket > 0 ? Math.ceil(monthlyBreakEvenSales / ticket) : 0;
  
  // Target ( (Overhead + Profit) / Gross Margin )
  const monthlyTargetSales = (overhead + targetProfit) / grossMarginPercent;
  const monthlyTargetCustomers = ticket > 0 ? Math.ceil(monthlyTargetSales / ticket) : 0;
  
  // Daily conversions (using 30 days standard month)
  const dailyBreakEvenSales = monthlyBreakEvenSales / 30;
  const dailyBreakEvenCustomers = ticket > 0 ? Math.ceil(dailyBreakEvenSales / ticket) : 0;
  const dailyTargetSales = monthlyTargetSales / 30;
  const dailyTargetCustomers = ticket > 0 ? Math.ceil(dailyTargetSales / ticket) : 0;

  return {
    monthlyBreakEvenSales: Number(monthlyBreakEvenSales.toFixed(2)),
    monthlyBreakEvenCustomers,
    dailyBreakEvenSales: Number(dailyBreakEvenSales.toFixed(2)),
    dailyBreakEvenCustomers,
    monthlyTargetSales: Number(monthlyTargetSales.toFixed(2)),
    monthlyTargetCustomers,
    dailyTargetSales: Number(dailyTargetSales.toFixed(2)),
    dailyTargetCustomers,
    grossMarginPercent: Number((grossMarginPercent * 100).toFixed(2)),
    overhead,
    isFallback: false
  };
};

module.exports.calculateFinancialMilestones = calculateFinancialMilestones;


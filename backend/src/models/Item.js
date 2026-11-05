const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
});

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    ingredients: [ingredientSchema],
    operatingExpense: {
      type: Number,
      default: 0,
      min: 0,
    },
    operatingExpenseInStore: {
      type: Number,
      default: 0,
      min: 0,
    },
    operatingExpenseEvent: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetFoodCostPercent: {
      type: Number,
      default: 30,
      min: 1,
      max: 100,
    },
    targetFoodCostPercentInStore: {
      type: Number,
      default: null,
    },
    targetFoodCostPercentEvent: {
      type: Number,
      default: null,
    },
    lockedPrice: {
      type: Number,
      default: null,
    },
    isPriceLocked: {
      type: Boolean,
      default: false,
    },
    aiSuggestedPrice: {
      type: Number,
      default: null,
    },
    aiReasoning: {
      type: String,
      default: '',
    },
    expectedDailySales: {
      type: Number,
      default: 1,
      min: 0,
    },
    expectedDailySalesInStore: {
      type: Number,
      default: 1,
      min: 0,
    },
    expectedDailySalesEvent: {
      type: Number,
      default: 1,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hidePriceInStore: {
      type: Boolean,
      default: false,
    },
    hidePriceEvent: {
      type: Boolean,
      default: false,
    },
    feesPercent: {
      type: Number,
      default: 6.48,
      min: 0,
      max: 100,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for total ingredient cost
itemSchema.virtual('totalIngredientCost').get(function () {
  return this.ingredients.reduce(
    (total, ingredient) => total + ingredient.quantity * ingredient.costPerUnit,
    0
  );
});

// Virtual for COGS
itemSchema.virtual('cogs').get(function () {
  return this.totalIngredientCost + this.operatingExpense;
});

// Virtual for COGS by context
itemSchema.virtual('cogsInStore').get(function () {
  return this.totalIngredientCost + (this.operatingExpenseInStore || 0);
});

itemSchema.virtual('cogsEvent').get(function () {
  return this.totalIngredientCost + (this.operatingExpenseEvent || 0);
});

// Virtual for suggested selling price (Food Cost / Target Food Cost % * (1 + Fees %))
itemSchema.virtual('suggestedPrice').get(function () {
  const target = this.targetFoodCostPercent || 30;
  const fees = this.feesPercent || 0;
  if (target === 0) return 0;
  const basePrice = this.totalIngredientCost / (target / 100);
  return basePrice * (1 + (fees / 100));
});

// Virtual for suggested selling price by context
itemSchema.virtual('suggestedPriceInStore').get(function () {
  const target = this.targetFoodCostPercentInStore !== null && this.targetFoodCostPercentInStore !== undefined 
    ? this.targetFoodCostPercentInStore 
    : (this.targetFoodCostPercent || 30);
  const fees = this.feesPercent || 0;
  if (target === 0) return 0;
  const basePrice = this.totalIngredientCost / (target / 100);
  return basePrice * (1 + (fees / 100));
});

itemSchema.virtual('suggestedPriceEvent').get(function () {
  const target = this.targetFoodCostPercentEvent !== null && this.targetFoodCostPercentEvent !== undefined 
    ? this.targetFoodCostPercentEvent 
    : (this.targetFoodCostPercent || 30);
  const fees = this.feesPercent || 0;
  if (target === 0) return 0;
  const basePrice = this.totalIngredientCost / (target / 100);
  return basePrice * (1 + (fees / 100));
});

// Ensure virtuals are included in JSON
itemSchema.set('toJSON', { virtuals: true });
itemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Item', itemSchema);


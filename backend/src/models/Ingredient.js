const mongoose = require('mongoose');

const prepIngredientSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
});

const retailerSourceSchema = new mongoose.Schema({
  retailer: { type: String, enum: ['landers', 'snr', 'sm'], required: true },
  productUrl: { type: String, required: true },
  pricedQuantity: { type: Number, required: true, min: 0 },
}, { _id: false });

const ingredientSchema = new mongoose.Schema(
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
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    retailerSource: {
      type: retailerSourceSchema,
      default: null,
    },
    supplier: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrep: {
      type: Boolean,
      default: false,
    },
    prepIngredients: {
      type: [prepIngredientSchema],
      default: [],
    },
    totalOutput: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster searches
ingredientSchema.index({ name: 1, category: 1 });

module.exports = mongoose.model('Ingredient', ingredientSchema);



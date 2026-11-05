const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema(
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
      default: 'General',
    },
    context: {
      type: String,
      enum: ['in-store', 'event'],
      required: true,
      default: 'in-store',
    },
    description: {
      type: String,
      default: '',
    },
    menuCategories: {
      type: [String],
      default: [],
    },
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: true,
        },
        category: {
          type: String,
          required: true,
          trim: true,
        },
        order: {
          type: Number,
          default: 0,
        },
        multiplier: {
          type: Number,
          default: 1,
          min: 1,
        },
        priceOverride: {
          type: Number,
          default: null,
          min: 0,
        },
        calculatedProfitMargin: {
          type: Number,
          default: null,
        },
        recipe: [
          {
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
          },
        ],
        recipeGuide: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Populate items when querying
menuSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'items.item',
    select: 'name category ingredients profitMargin operatingExpenseInStore operatingExpenseEvent profitMarginInStore profitMarginEvent',
  });
  next();
});

module.exports = mongoose.model('Menu', menuSchema);


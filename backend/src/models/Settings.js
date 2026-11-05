const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // There should only be one settings document
    _id: {
      type: String,
      default: 'global-settings',
    },
    expectedDailySales: {
      type: Number,
      default: 100,
      min: 1,
    },
    expectedDailySalesInStore: {
      type: Number,
      default: 100,
      min: 1,
    },
    expectedDailySalesEvent: {
      type: Number,
      default: 50,
      min: 1,
    },
    eventDurationDays: {
      type: Number,
      default: 1,
      min: 1,
    },
    businessName: {
      type: String,
      default: 'My Café',
    },
    currency: {
      type: String,
      default: 'PHP',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);


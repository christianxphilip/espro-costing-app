const mongoose = require('mongoose');

const operatingExpenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'one-time', 'event'],
      default: 'monthly',
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: String,
      enum: ['in-store', 'event'],
      default: 'in-store',
      required: true,
    },
    allocationType: {
      type: String,
      enum: ['standard'],
      default: 'standard',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
    },
    // Event-specific fields (only used when frequency is 'event')
    eventStartDate: {
      type: Date,
      default: null,
    },
    eventDurationDays: {
      type: Number,
      default: null,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Method to convert expense to daily amount
operatingExpenseSchema.methods.getDailyAmount = function (currentDate = null) {
  // Use provided date or today's date
  const today = currentDate || new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for date comparison
  
  const multipliers = {
    daily: 1,
    weekly: 1 / 7,
    monthly: 1 / 30,
    yearly: 1 / 365,
    'one-time': 0,
    event: 0, // Will be calculated separately
  };
  
  // Handle event expenses
  if (this.frequency === 'event') {
    // If event fields are not set, return 0
    if (!this.eventStartDate || !this.eventDurationDays) {
      return 0;
    }
    
    const startDate = new Date(this.eventStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + this.eventDurationDays - 1);
    endDate.setHours(23, 59, 59, 999);
    
    // Only return daily amount if today is within the event period
    if (today >= startDate && today <= endDate) {
      // Daily amount = total expense / duration days
      return this.amount / this.eventDurationDays;
    }
    
    // Event is not active today
    return 0;
  }
  
  return this.amount * (multipliers[this.frequency] || 0);
};

// Method to check if event is currently active
operatingExpenseSchema.methods.isEventActive = function (currentDate = null) {
  if (this.frequency !== 'event') {
    return false;
  }
  
  if (!this.eventStartDate || !this.eventDurationDays) {
    return false;
  }
  
  const today = currentDate || new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(this.eventStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + this.eventDurationDays - 1);
  endDate.setHours(23, 59, 59, 999);
  
  return today >= startDate && today <= endDate;
};

module.exports = mongoose.model('OperatingExpense', operatingExpenseSchema);


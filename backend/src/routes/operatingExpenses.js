const express = require('express');
const router = express.Router();
const OperatingExpense = require('../models/OperatingExpense');
const Item = require('../models/Item');
const Settings = require('../models/Settings');
const costingService = require('../services/costingService');

// @route   GET /api/expenses
// @desc    Get all operating expenses
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const expenses = await OperatingExpense.find().sort({ createdAt: -1 });
    
    // Calculate total daily expense
    const totalDaily = expenses
      .filter(exp => exp.isActive)
      .reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    
    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
      totalDaily: Number(totalDaily.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/expenses/calculate-per-item
// @desc    Calculate what the operating expense would be per item
// @access  Public
router.get('/calculate-per-item', async (req, res, next) => {
  try {
    const { context } = req.query; // Optional: 'in-store' or 'event'
    const expenses = await OperatingExpense.find({ isActive: true });
    let settings = await Settings.findById('global-settings');
    
    // Create default settings if not exists
    if (!settings) {
      settings = await Settings.create({
        _id: 'global-settings',
        expectedDailySales: 100,
        expectedDailySalesInStore: 100,
        expectedDailySalesEvent: 50,
        businessName: 'My Café',
        currency: 'PHP',
      });
    }
    
    // Filter expenses by context if specified
    let filteredExpenses = expenses;
    if (context === 'in-store' || context === 'event') {
      filteredExpenses = expenses.filter(exp => exp.context === context);
    }
    
    // Get expected daily sales and event duration based on context
    const globalDailySales = settings.expectedDailySales || 100;
    const inStoreDailySales = settings.expectedDailySalesInStore || globalDailySales;
    const eventDailySales = settings.expectedDailySalesEvent || 50;
    const eventDurationDays = settings.eventDurationDays || 1;
    const dailySales = context === 'event' ? eventDailySales : (context === 'in-store' ? inStoreDailySales : globalDailySales);
    
    // Separate recurring, event frequency, and one-time expenses
    const recurringExpenses = filteredExpenses.filter(exp => 
      exp.frequency !== 'one-time' && exp.frequency !== 'event'
    );
    const eventFreqExpenses = filteredExpenses.filter(exp => exp.frequency === 'event');
    const oneTimeExpenses = filteredExpenses.filter(exp => exp.frequency === 'one-time');
    
    // Calculate total daily operating expenses
    const totalDailyRecurring = recurringExpenses.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const totalDailyEventFreq = eventFreqExpenses.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const totalDaily = totalDailyRecurring + totalDailyEventFreq;
    
    // Calculate one-time expense per item
    const totalOneTimeExpense = oneTimeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const oneTimeCostPerItem = totalOneTimeExpense / dailySales;
    
    // Calculate recurring expense per item
    const recurringCostPerItem = totalDaily / dailySales;
    
    // Total cost per item
    const costPerItem = recurringCostPerItem + oneTimeCostPerItem;
    
    // Calculate for both contexts if no context specified
    let inStoreData = null;
    let eventData = null;
    
    if (!context) {
      // In-store calculation (default to 'in-store' for backward compatibility)
      const inStoreExpenses = expenses.filter(exp => (!exp.context || exp.context === 'in-store') && exp.isActive);
      const inStoreRecurring = inStoreExpenses.filter(exp => exp.frequency !== 'one-time' && exp.frequency !== 'event');
      const inStoreEventFreq = inStoreExpenses.filter(exp => exp.frequency === 'event');
      const inStoreOneTime = inStoreExpenses.filter(exp => exp.frequency === 'one-time');
      const inStoreDaily = inStoreRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0) + 
                          inStoreEventFreq.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
      const inStoreOneTimeTotal = inStoreOneTime.reduce((sum, exp) => sum + exp.amount, 0);
      const inStoreCost = (inStoreDaily / inStoreDailySales) + (inStoreOneTimeTotal / inStoreDailySales);
      
      // Event calculation
      const eventExpenses = expenses.filter(exp => exp.context === 'event' && exp.isActive);
      const eventRecurring = eventExpenses.filter(exp => exp.frequency !== 'one-time' && exp.frequency !== 'event');
      const eventEventFreq = eventExpenses.filter(exp => exp.frequency === 'event');
      const eventOneTime = eventExpenses.filter(exp => exp.frequency === 'one-time');
      const eventDaily = eventRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0) + 
                        eventEventFreq.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
      const eventOneTimeTotal = eventOneTime.reduce((sum, exp) => sum + exp.amount, 0);
      // One-time expenses are spread across event duration
      const eventOneTimePerDay = eventOneTimeTotal / eventDurationDays;
      const eventCost = (eventDaily / eventDailySales) + (eventOneTimePerDay / eventDailySales);
      
      inStoreData = {
        operatingExpensePerItem: Number(inStoreCost.toFixed(2)),
        recurringDailyExpense: Number(inStoreRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0).toFixed(2)),
        expectedDailySales: inStoreDailySales,
      };
      
      eventData = {
        operatingExpensePerItem: Number(eventCost.toFixed(2)),
        recurringDailyExpense: Number(eventRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0).toFixed(2)),
        expectedDailySales: eventDailySales,
        eventDurationDays: eventDurationDays,
      };
    }
    
    res.json({
      success: true,
      data: {
        operatingExpensePerItem: Number(costPerItem.toFixed(2)),
        recurringDailyExpense: Number(totalDailyRecurring.toFixed(2)),
        eventDailyExpense: Number(totalDailyEventFreq.toFixed(2)),
        totalOneTimeExpense: Number(totalOneTimeExpense.toFixed(2)),
        recurringCostPerItem: Number(recurringCostPerItem.toFixed(2)),
        oneTimeCostPerItem: Number(oneTimeCostPerItem.toFixed(2)),
        expectedDailySales: dailySales,
        hasExpenses: expenses.length > 0,
        context: context || 'all',
        inStore: inStoreData,
        event: eventData,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/expenses/financial-planner
// @desc    Calculate macro financial milestones
// @access  Public
router.get('/financial-planner', async (req, res, next) => {
  try {
    const { targetFoodCostPercent, averageTicket, profitGoal } = req.query;
    
    // Fetch all active operating expenses
    const expenses = await OperatingExpense.find({ isActive: true });
    
    // Static non-recurring bypass: filter out 'one-time' and 'event'
    const recurringExpenses = expenses.filter(exp => exp.frequency !== 'one-time' && exp.frequency !== 'event');
    
    // Frequency transformation safety: getDailyAmount handles the conversions, then multiply by 30 for monthly overhead
    const totalDailyOverhead = recurringExpenses.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const totalMonthlyOverhead = totalDailyOverhead * 30;
    
    // Process through the Milestone Engine
    const milestones = costingService.calculateFinancialMilestones(
      totalMonthlyOverhead,
      targetFoodCostPercent,
      averageTicket,
      profitGoal
    );
    
    res.json({
      success: true,
      data: milestones
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single operating expense
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const expense = await OperatingExpense.findById(req.params.id);
    
    if (!expense) {
      res.status(404);
      throw new Error('Operating expense not found');
    }
    
    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/expenses
// @desc    Create new operating expense
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, amount, frequency, category, context, allocationType, notes, eventStartDate, eventDurationDays } = req.body;
    
    if (!name || amount === undefined || !category) {
      res.status(400);
      throw new Error('Please provide name, amount, and category');
    }
    
    // Validate context
    if (context && !['in-store', 'event'].includes(context)) {
      res.status(400);
      throw new Error('Context must be either "in-store" or "event"');
    }
    
    // Validate event fields if frequency is 'event'
    if (frequency === 'event') {
      if (!eventStartDate || !eventDurationDays) {
        res.status(400);
        throw new Error('Event expenses require eventStartDate and eventDurationDays');
      }
      if (eventDurationDays < 1) {
        res.status(400);
        throw new Error('Event duration must be at least 1 day');
      }
    }
    
    const expenseData = {
      name,
      amount,
      frequency: frequency || 'monthly',
      category,
      context: context || 'in-store',
      allocationType: allocationType || 'standard',
      notes: notes || '',
    };
    
    // Add event-specific fields only if frequency is 'event'
    if (frequency === 'event') {
      expenseData.eventStartDate = new Date(eventStartDate);
      expenseData.eventDurationDays = eventDurationDays;
    }
    
    const expense = await OperatingExpense.create(expenseData);
    
    // Recalculate all items with new expense allocation
    await recalculateItemExpenses();
    
    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update operating expense
// @access  Public
router.put('/:id', async (req, res, next) => {
  try {
    let expense = await OperatingExpense.findById(req.params.id);
    
    if (!expense) {
      res.status(404);
      throw new Error('Operating expense not found');
    }
    
    const { name, amount, frequency, category, context, allocationType, isActive, notes, eventStartDate, eventDurationDays } = req.body;
    
    if (name !== undefined) expense.name = name;
    if (amount !== undefined) expense.amount = amount;
    if (context !== undefined) {
      if (!['in-store', 'event'].includes(context)) {
        res.status(400);
        throw new Error('Context must be either "in-store" or "event"');
      }
      expense.context = context;
    }
    if (frequency !== undefined) {
      expense.frequency = frequency;
      // If changing to/from event, handle event fields
      if (frequency === 'event') {
        if (eventStartDate !== undefined) expense.eventStartDate = new Date(eventStartDate);
        if (eventDurationDays !== undefined) {
          if (eventDurationDays < 1) {
            res.status(400);
            throw new Error('Event duration must be at least 1 day');
          }
          expense.eventDurationDays = eventDurationDays;
        }
        // Validate event fields are set
        if (!expense.eventStartDate || !expense.eventDurationDays) {
          res.status(400);
          throw new Error('Event expenses require eventStartDate and eventDurationDays');
        }
      } else {
        // Clear event fields if not an event
        expense.eventStartDate = null;
        expense.eventDurationDays = null;
      }
    } else {
      // If frequency is already 'event', allow updating event fields
      if (expense.frequency === 'event') {
        if (eventStartDate !== undefined) expense.eventStartDate = new Date(eventStartDate);
        if (eventDurationDays !== undefined) {
          if (eventDurationDays < 1) {
            res.status(400);
            throw new Error('Event duration must be at least 1 day');
          }
          expense.eventDurationDays = eventDurationDays;
        }
      }
    }
    if (category !== undefined) expense.category = category;
    if (allocationType !== undefined) expense.allocationType = allocationType;
    if (isActive !== undefined) expense.isActive = isActive;
    if (notes !== undefined) expense.notes = notes;
    
    await expense.save();
    
    // Recalculate all items with updated expense allocation
    await recalculateItemExpenses();
    
    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete operating expense
// @access  Public
router.delete('/:id', async (req, res, next) => {
  try {
    const expense = await OperatingExpense.findById(req.params.id);
    
    if (!expense) {
      res.status(404);
      throw new Error('Operating expense not found');
    }
    
    await expense.deleteOne();
    
    // Recalculate all items without this expense
    await recalculateItemExpenses();
    
    res.json({
      success: true,
      message: 'Operating expense deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/expenses/recalculate
// @desc    Manually trigger expense recalculation for all items
// @access  Public
router.post('/recalculate', async (req, res, next) => {
  try {
    await recalculateItemExpenses();
    
    res.json({
      success: true,
      message: 'Operating expenses recalculated for all items',
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/expenses/stats/summary
// @desc    Get expense statistics
// @access  Public
router.get('/stats/summary', async (req, res, next) => {
  try {
    const expenses = await OperatingExpense.find({ isActive: true });
    
    const totalDaily = expenses.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const totalMonthly = totalDaily * 30;
    const totalYearly = totalDaily * 365;
    
    // Group by category
    const byCategory = {};
    expenses.forEach(exp => {
      if (!byCategory[exp.category]) {
        byCategory[exp.category] = 0;
      }
      byCategory[exp.category] += exp.getDailyAmount();
    });
    
    res.json({
      success: true,
      data: {
        totalExpenses: expenses.length,
        totalDaily: Number(totalDaily.toFixed(2)),
        totalMonthly: Number(totalMonthly.toFixed(2)),
        totalYearly: Number(totalYearly.toFixed(2)),
        byCategory: Object.keys(byCategory).map(cat => ({
          category: cat,
          dailyAmount: Number(byCategory[cat].toFixed(2)),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to recalculate operating expenses for all items
 * Separates calculations for in-store and event contexts
 */
async function recalculateItemExpenses() {
  try {
    const expenses = await OperatingExpense.find({ isActive: true });
    const items = await Item.find({ isActive: true }); // Only active items
    const settings = await Settings.findById('global-settings');
    
    if (items.length === 0) {
      return;
    }
    
    // Get expected daily sales and event duration from settings (support both old and new format)
    const globalDailySales = settings?.expectedDailySales || 100;
    const inStoreDailySales = settings?.expectedDailySalesInStore || settings?.expectedDailySales || 100;
    const eventDailySales = settings?.expectedDailySalesEvent || 50;
    const eventDurationDays = settings?.eventDurationDays || 1;
    
    // Separate expenses by context (default to 'in-store' for backward compatibility)
    const inStoreExpenses = expenses.filter(exp => !exp.context || exp.context === 'in-store');
    const eventExpenses = expenses.filter(exp => exp.context === 'event');
    
    // Separate recurring, event frequency expenses, and one-time expenses for in-store
    const inStoreRecurring = inStoreExpenses.filter(exp => 
      exp.frequency !== 'one-time' && exp.frequency !== 'event'
    );
    const inStoreEventFreq = inStoreExpenses.filter(exp => exp.frequency === 'event');
    const inStoreOneTime = inStoreExpenses.filter(exp => exp.frequency === 'one-time');
    
    // Separate recurring, event frequency expenses, and one-time expenses for event context
    const eventRecurring = eventExpenses.filter(exp => 
      exp.frequency !== 'one-time' && exp.frequency !== 'event'
    );
    const eventEventFreq = eventExpenses.filter(exp => exp.frequency === 'event');
    const eventOneTime = eventExpenses.filter(exp => exp.frequency === 'one-time');
    
    // Calculate IN-STORE daily operating expenses
    const inStoreDailyRecurring = inStoreRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const inStoreDailyEventFreq = inStoreEventFreq.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const inStoreTotalDaily = inStoreDailyRecurring + inStoreDailyEventFreq;
    const inStoreTotalOneTime = inStoreOneTime.reduce((sum, exp) => sum + exp.amount, 0);
    const inStoreOneTimePerItem = inStoreTotalOneTime / inStoreDailySales;
    const inStoreRecurringPerItem = inStoreTotalDaily / inStoreDailySales;
    const inStoreCostPerItem = inStoreRecurringPerItem + inStoreOneTimePerItem;
    
    // Calculate EVENT daily operating expenses
    // Recurring expenses are already daily, so divide by daily sales
    const eventDailyRecurring = eventRecurring.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const eventDailyEventFreq = eventEventFreq.reduce((sum, exp) => sum + exp.getDailyAmount(), 0);
    const eventTotalDaily = eventDailyRecurring + eventDailyEventFreq;
    
    // One-time expenses: spread across event duration days, then divide by daily sales per day
    // Formula: Total one-time expense ÷ Event duration days ÷ Expected daily sales per day
    const eventTotalOneTime = eventOneTime.reduce((sum, exp) => sum + exp.amount, 0);
    const eventOneTimePerDay = eventTotalOneTime / eventDurationDays;
    const eventOneTimePerItem = eventOneTimePerDay / eventDailySales;
    
    // Recurring expenses per item (daily expenses divided by daily sales)
    const eventRecurringPerItem = eventTotalDaily / eventDailySales;
    
    // Total cost per item = recurring + one-time
    const eventCostPerItem = eventRecurringPerItem + eventOneTimePerItem;
    
    // Update each active item with context-specific costs
    for (const item of items) {
      item.operatingExpenseInStore = Number(inStoreCostPerItem.toFixed(2));
      item.operatingExpenseEvent = Number(eventCostPerItem.toFixed(2));
      // Keep legacy field for backward compatibility
      item.operatingExpense = Number(inStoreCostPerItem.toFixed(2));
      await item.save();
    }
    
    console.log(`Recalculated expenses for ${items.length} active items`);
    console.log(`IN-STORE:`);
    console.log(`  Total recurring daily: ₱${inStoreDailyRecurring.toFixed(2)}`);
    console.log(`  Total one-time: ₱${inStoreTotalOneTime.toFixed(2)}`);
    console.log(`  Expected daily sales: ${inStoreDailySales}`);
    console.log(`  Cost per item: ₱${inStoreCostPerItem.toFixed(2)}`);
    console.log(`EVENT:`);
    console.log(`  Total recurring daily: ₱${eventDailyRecurring.toFixed(2)}`);
    console.log(`  Total one-time: ₱${eventTotalOneTime.toFixed(2)}`);
    console.log(`  Event duration: ${eventDurationDays} day(s)`);
    console.log(`  Expected daily sales: ${eventDailySales}`);
    console.log(`  One-time cost per item (spread over ${eventDurationDays} days): ₱${eventOneTimePerItem.toFixed(2)}`);
    console.log(`  Recurring cost per item: ₱${eventRecurringPerItem.toFixed(2)}`);
    console.log(`  Total cost per item: ₱${eventCostPerItem.toFixed(2)}`);
  } catch (error) {
    console.error('Error recalculating expenses:', error);
    throw error;
  }
}

// Export both the router and the helper function
module.exports = router;
module.exports.recalculateItemExpenses = recalculateItemExpenses;


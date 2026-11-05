const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { recalculateItemExpenses } = require('./operatingExpenses');

// @route   GET /api/settings
// @desc    Get global settings
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    let settings = await Settings.findById('global-settings');
    
    // Create default settings if not exists
    if (!settings) {
      settings = await Settings.create({
        _id: 'global-settings',
        expectedDailySales: 100,
        expectedDailySalesInStore: 100,
        expectedDailySalesEvent: 50,
        eventDurationDays: 1,
        businessName: 'My Café',
        currency: 'PHP',
      });
    }
    
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/settings
// @desc    Update global settings
// @access  Public
router.put('/', async (req, res, next) => {
  try {
    const { expectedDailySales, expectedDailySalesInStore, expectedDailySalesEvent, eventDurationDays, businessName, currency } = req.body;
    
    let settings = await Settings.findById('global-settings');
    
    if (!settings) {
      // Create if doesn't exist
      settings = await Settings.create({
        _id: 'global-settings',
        expectedDailySales: expectedDailySales || 100,
        expectedDailySalesInStore: expectedDailySalesInStore || expectedDailySales || 100,
        expectedDailySalesEvent: expectedDailySalesEvent || 50,
        eventDurationDays: eventDurationDays || 1,
        businessName: businessName || 'My Café',
        currency: currency || 'PHP',
      });
    } else {
      // Update existing
      if (expectedDailySales !== undefined) settings.expectedDailySales = expectedDailySales;
      if (expectedDailySalesInStore !== undefined) settings.expectedDailySalesInStore = expectedDailySalesInStore;
      if (expectedDailySalesEvent !== undefined) settings.expectedDailySalesEvent = expectedDailySalesEvent;
      if (eventDurationDays !== undefined) settings.eventDurationDays = eventDurationDays;
      if (businessName !== undefined) settings.businessName = businessName;
      if (currency !== undefined) settings.currency = currency;
      
      await settings.save();
    }
    
    // If any expectedDailySales or eventDurationDays changed, recalculate all item expenses
    if (expectedDailySales !== undefined || expectedDailySalesInStore !== undefined || expectedDailySalesEvent !== undefined || eventDurationDays !== undefined) {
      await recalculateItemExpenses();
    }
    
    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


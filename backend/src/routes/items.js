const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { calculateAllCosts, calculateAllCostsForAllContexts } = require('../services/costingService');
const { recalculateItemExpenses } = require('./operatingExpenses');

// @route   GET /api/items
// @desc    Get all items
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { context, status } = req.query; // Optional: 'in-store' or 'event'
    
    // Default to only showing active items unless specified
    const query = {};
    if (status === 'archived') {
      query.isArchived = true;
    } else if (status !== 'all') {
      query.isArchived = false;
    }

    const items = await Item.find(query).sort({ createdAt: -1 });
    
    // Calculate costs for each item
    const itemsWithCosts = items.map(item => {
      const itemJson = item.toJSON();
      
      // If context is specified, return context-specific costs
      if (context === 'in-store' || context === 'event') {
        const costs = calculateAllCosts(item, context);
        return {
          ...itemJson,
          ...costs,
        };
      }
      
      // Otherwise, return costs for both contexts
      const allCosts = calculateAllCostsForAllContexts(item);
      return {
        ...itemJson,
        ...allCosts,
        // Include default/legacy values for backward compatibility
        ingredientCost: allCosts.inStore.ingredientCost,
        operatingExpense: itemJson.operatingExpense || itemJson.operatingExpenseInStore || 0,
        cogs: allCosts.inStore.cogs,
        suggestedPrice: allCosts.inStore.suggestedPrice,
      };
    });
    
    res.json({
      success: true,
      count: items.length,
      data: itemsWithCosts,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/items/:id
// @desc    Get single item by ID
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { context } = req.query; // Optional: 'in-store' or 'event'
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    const itemJson = item.toJSON();
    
    // If context is specified, return context-specific costs
    if (context === 'in-store' || context === 'event') {
      const costs = calculateAllCosts(item, context);
      return res.json({
        success: true,
        data: {
          ...itemJson,
          ...costs,
        },
      });
    }
    
    // Otherwise, return costs for both contexts
    const allCosts = calculateAllCostsForAllContexts(item);
    res.json({
      success: true,
      data: {
        ...itemJson,
        ...allCosts,
        // Include default/legacy values for backward compatibility
        ingredientCost: allCosts.inStore.ingredientCost,
        operatingExpense: itemJson.operatingExpense || itemJson.operatingExpenseInStore || 0,
        cogs: allCosts.inStore.cogs,
        suggestedPrice: allCosts.inStore.suggestedPrice,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/items/bulk-lock-price
// @desc    Bulk lock/unlock item prices
// @access  Public
router.post('/bulk-lock-price', async (req, res, next) => {
  try {
    const { itemIds, lock } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of item IDs');
    }
    
    const items = await Item.find({ _id: { $in: itemIds } });
    
    if (items.length === 0) {
      res.status(404);
      throw new Error('No items found');
    }
    
    const updatedItems = [];
    
    for (const item of items) {
      const costs = calculateAllCosts(item);
      
      if (lock) {
        // Lock at current suggested price
        item.isPriceLocked = true;
        item.lockedPrice = costs.suggestedPrice;
      } else {
        // Unlock
        item.isPriceLocked = false;
        item.lockedPrice = null;
      }
      
      await item.save();
      updatedItems.push({
        ...item.toJSON(),
        ...costs,
      });
    }
    
    res.json({
      success: true,
      data: updatedItems,
      message: `${updatedItems.length} item(s) ${lock ? 'locked' : 'unlocked'} successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/items/bulk-archive
// @desc    Bulk archive/restore items
// @access  Public
router.post('/bulk-archive', async (req, res, next) => {
  try {
    const { itemIds, archive } = req.body;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of item IDs');
    }
    
    const items = await Item.find({ _id: { $in: itemIds } });
    
    if (items.length === 0) {
      res.status(404);
      throw new Error('No items found');
    }
    
    const updatedItems = [];
    let needsRecalculation = false;
    
    for (const item of items) {
      // If we are changing state
      if (item.isArchived !== archive) {
        item.isArchived = archive;
        
        if (archive && item.isActive) {
          item.isActive = false;
          needsRecalculation = true;
        } else if (!archive && !item.isActive) {
          // restored items don't auto-activate, but we could trigger recalc just in case
          needsRecalculation = true;
        }
        
        await item.save();
      }
      
      updatedItems.push(item);
    }
    
    if (needsRecalculation) {
      await recalculateItemExpenses();
    }
    
    res.json({
      success: true,
      data: updatedItems,
      message: `${updatedItems.length} item(s) ${archive ? 'archived' : 'restored'} successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/items
// @desc    Create new item
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, category, ingredients, targetFoodCostPercent, targetFoodCostPercentInStore, targetFoodCostPercentEvent, feesPercent, isActive, hidePriceInStore, hidePriceEvent } = req.body;
    
    // Validation
    if (!name || !category) {
      res.status(400);
      throw new Error('Please provide name and category');
    }
    
    const item = await Item.create({
      name,
      category,
      ingredients: ingredients || [],
      operatingExpense: 0, // Will be calculated automatically
      targetFoodCostPercent: targetFoodCostPercent !== undefined ? targetFoodCostPercent : 30,
      targetFoodCostPercentInStore: targetFoodCostPercentInStore !== undefined ? targetFoodCostPercentInStore : null,
      targetFoodCostPercentEvent: targetFoodCostPercentEvent !== undefined ? targetFoodCostPercentEvent : null,
      feesPercent: feesPercent !== undefined ? feesPercent : 6.48,
      isActive: isActive !== undefined ? isActive : true,
      isArchived: false,
      hidePriceInStore: hidePriceInStore !== undefined ? hidePriceInStore : false,
      hidePriceEvent: hidePriceEvent !== undefined ? hidePriceEvent : false,
    });
    
    // Recalculate operating expenses for all items (including this new one)
    await recalculateItemExpenses();
    
    // Fetch the updated item with the calculated operating expense
    const updatedItem = await Item.findById(item._id);
    const costs = calculateAllCosts(updatedItem);
    
    res.status(201).json({
      success: true,
      data: {
        ...updatedItem.toJSON(),
        ...costs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Public
router.put('/:id', async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    const { name, category, ingredients, targetFoodCostPercent, targetFoodCostPercentInStore, targetFoodCostPercentEvent, feesPercent, aiSuggestedPrice, aiReasoning, isActive, lockedPrice, isPriceLocked, hidePriceInStore, hidePriceEvent } = req.body;
    
    // Track if isActive status changed
    const wasActiveChanged = isActive !== undefined && isActive !== item.isActive;
    
    // Update fields
    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (ingredients !== undefined) item.ingredients = ingredients;
    if (targetFoodCostPercent !== undefined) item.targetFoodCostPercent = targetFoodCostPercent;
    if (targetFoodCostPercentInStore !== undefined) item.targetFoodCostPercentInStore = targetFoodCostPercentInStore;
    if (targetFoodCostPercentEvent !== undefined) item.targetFoodCostPercentEvent = targetFoodCostPercentEvent;
    if (feesPercent !== undefined) item.feesPercent = feesPercent;
    if (aiSuggestedPrice !== undefined) item.aiSuggestedPrice = aiSuggestedPrice;
    if (aiReasoning !== undefined) item.aiReasoning = aiReasoning;
    if (isActive !== undefined) item.isActive = isActive;
    if (lockedPrice !== undefined) item.lockedPrice = lockedPrice;
    if (isPriceLocked !== undefined) item.isPriceLocked = isPriceLocked;
    if (hidePriceInStore !== undefined) item.hidePriceInStore = hidePriceInStore;
    if (hidePriceEvent !== undefined) item.hidePriceEvent = hidePriceEvent;
    
    await item.save();
    
    // If item's active status changed, recalculate expenses for all items
    if (wasActiveChanged) {
      await recalculateItemExpenses();
      // Fetch updated item after recalculation
      item = await Item.findById(req.params.id);
    }
    
    const costs = calculateAllCosts(item);
    
    res.json({
      success: true,
      data: {
        ...item.toJSON(),
        ...costs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/items/:id/lock-price
// @desc    Lock/unlock item price
// @access  Public
router.post('/:id/lock-price', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    const costs = calculateAllCosts(item);
    
    // Toggle lock state
    if (item.isPriceLocked) {
      // Unlock
      item.isPriceLocked = false;
      item.lockedPrice = null;
    } else {
      // Lock at current suggested price
      item.isPriceLocked = true;
      item.lockedPrice = costs.suggestedPrice;
    }
    
    await item.save();
    
    res.json({
      success: true,
      data: {
        ...item.toJSON(),
        ...costs,
      },
      message: item.isPriceLocked ? 'Price locked successfully' : 'Price unlocked successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/items/:id/archive
// @desc    Toggle item archive status
// @access  Public
router.post('/:id/archive', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    item.isArchived = !item.isArchived;
    await item.save();
    
    // If we're archiving, it might affect overhead calculation if it was active
    if (item.isArchived && item.isActive) {
      item.isActive = false;
      await item.save();
      await recalculateItemExpenses();
    } else if (!item.isArchived && !item.isActive) {
      // Optional: don't automatically make it active again, let user decide.
      // But we can trigger recalculation just in case.
      await recalculateItemExpenses();
    }
    
    res.json({
      success: true,
      data: item,
      message: item.isArchived ? 'Item archived successfully' : 'Item restored successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Public
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    const wasActive = item.isActive;
    await item.deleteOne();
    
    // If the deleted item was active, recalculate expenses for remaining items
    if (wasActive) {
      await recalculateItemExpenses();
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/items/stats/summary
// @desc    Get summary statistics
// @access  Public
router.get('/stats/summary', async (req, res, next) => {
  try {
    const items = await Item.find();
    
    let totalCost = 0;
    let totalSuggestedPrice = 0;
    let totalTargetFoodCost = 0;
    
    items.forEach(item => {
      const costs = calculateAllCosts(item);
      totalCost += costs.cogs;
      totalSuggestedPrice += costs.suggestedPrice;
      totalTargetFoodCost += item.targetFoodCostPercent || 30;
    });
    
    const averageTargetFoodCost = items.length > 0 ? (totalTargetFoodCost / items.length).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        totalItems: items.length,
        totalCost: Number(totalCost.toFixed(2)),
        totalSuggestedPrice: Number(totalSuggestedPrice.toFixed(2)),
        avgTargetFoodCost: Number(averageTargetFoodCost),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


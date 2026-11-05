const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Menu = require('../models/Menu');
const Item = require('../models/Item');
const { calculateAllCostsForAllContexts } = require('../services/costingService');

// @route   GET /api/menus
// @desc    Get all menus
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const menus = await Menu.find().sort({ createdAt: -1 });

    // Calculate prices for menu items
    const menusWithPrices = menus.map(menu => {
      const menuObj = menu.toObject();

      // Ensure menuCategories is included (for backward compatibility, extract from items if not present)
      if (!menuObj.menuCategories || menuObj.menuCategories.length === 0) {
        menuObj.menuCategories = [...new Set(menu.items.map(mi => mi.category || 'Other'))];
      }

      const itemsWithPrices = menu.items.map(menuItem => {
        if (!menuItem.item) return menuItem;

        const item = menuItem.item;
        const costs = calculateAllCostsForAllContexts(item);

        // Calculate profit margin if price override exists
        let calculatedMargin = null;
        if (menuItem.priceOverride !== null && menuItem.priceOverride !== undefined) {
          const contextData = menuObj.context === 'event' ? costs.event : costs.inStore;
          const ingredientCost = contextData.ingredientCost || 0;
          const operatingExpense = contextData.operatingExpense || 0;
          const multiplier = menuItem.multiplier || 1;

          // Only multiply ingredients, add OpEx once
          const totalCogs = (ingredientCost * multiplier) + operatingExpense;

          if (totalCogs > 0) {
            const profit = menuItem.priceOverride - totalCogs;
            calculatedMargin = (profit / totalCogs) * 100;
          }
        }

        return {
          ...menuItem.toObject(),
          calculatedProfitMargin: calculatedMargin !== null ? calculatedMargin : menuItem.calculatedProfitMargin,
          item: {
            ...item.toObject(),
            ...costs,
          },
        };
      });

      return {
        ...menuObj,
        items: itemsWithPrices,
      };
    });

    res.json({
      success: true,
      count: menus.length,
      data: menusWithPrices,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/menus/available-items
// @desc    Get available items for menu (active or locked items only)
// @access  Public
router.get('/available-items', async (req, res, next) => {
  try {
    // Get only active items or locked items
    const items = await Item.find({
      $or: [
        { isActive: true },
        { isPriceLocked: true }
      ]
    }).sort({ name: 1 });

    // Calculate costs for each item
    const itemsWithCosts = items.map(item => {
      const itemJson = item.toJSON();

      // Ensure we're using the actual stored values, not defaults
      const inStoreOpex = itemJson.operatingExpenseInStore !== undefined && itemJson.operatingExpenseInStore !== null
        ? itemJson.operatingExpenseInStore
        : (itemJson.operatingExpense || 0);
      const eventOpex = itemJson.operatingExpenseEvent !== undefined && itemJson.operatingExpenseEvent !== null
        ? itemJson.operatingExpenseEvent
        : 0;

      // Create item with correct operating expenses for calculation
      const itemWithOpex = {
        ...itemJson,
        operatingExpenseInStore: inStoreOpex,
        operatingExpenseEvent: eventOpex,
      };

      const costs = calculateAllCostsForAllContexts(itemWithOpex);

      // Flatten the structure to match frontend expectations
      return {
        ...itemJson,
        ...costs,
        // Include flattened context-specific fields - use calculated values from costs
        operatingExpenseInStore: costs.inStore.operatingExpense,
        operatingExpenseEvent: costs.event.operatingExpense,
        cogsInStore: costs.inStore.cogs,
        cogsEvent: costs.event.cogs,
        suggestedPriceInStore: costs.inStore.suggestedPrice,
        suggestedPriceEvent: costs.event.suggestedPrice,
        profitMarginInStore: costs.inStore.profitMargin,
        profitMarginEvent: costs.event.profitMargin,
        // Legacy fields for backward compatibility
        ingredientCost: costs.inStore.ingredientCost,
        operatingExpense: inStoreOpex,
        cogs: costs.inStore.cogs,
        suggestedPrice: costs.inStore.suggestedPrice,
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

// @route   GET /api/menus/:id
// @desc    Get single menu by ID
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404);
      throw new Error('Menu not found');
    }

    const menuObj = menu.toObject();

    // Ensure menuCategories is included (for backward compatibility, extract from items if not present)
    if (!menuObj.menuCategories || menuObj.menuCategories.length === 0) {
      menuObj.menuCategories = [...new Set(menu.items.map(mi => mi.category || 'Other'))];
    }

    // Calculate prices for menu items
    const itemsWithPrices = menu.items.map(menuItem => {
      if (!menuItem.item) return menuItem;

      const item = menuItem.item;
      const costs = calculateAllCostsForAllContexts(item);

      // Calculate profit margin if price override exists
      let calculatedMargin = null;
      if (menuItem.priceOverride !== null && menuItem.priceOverride !== undefined) {
        const contextData = menuObj.context === 'event' ? costs.event : costs.inStore;
        const ingredientCost = contextData.ingredientCost || 0;
        const operatingExpense = contextData.operatingExpense || 0;
        const multiplier = menuItem.multiplier || 1;
        
        // Only multiply ingredients, add OpEx once
        const totalCogs = (ingredientCost * multiplier) + operatingExpense;

        if (totalCogs > 0) {
          const profit = menuItem.priceOverride - totalCogs;
          calculatedMargin = (profit / totalCogs) * 100;
        }
      }

      return {
        ...menuItem.toObject(),
        calculatedProfitMargin: calculatedMargin !== null ? calculatedMargin : menuItem.calculatedProfitMargin,
        item: {
          ...item.toObject(),
          ...costs,
        },
      };
    });

    res.json({
      success: true,
      data: {
        ...menuObj,
        items: itemsWithPrices,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/menus
// @desc    Create new menu
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, category, context, description, menuCategories, items } = req.body;

    if (!name || !context || !category) {
      res.status(400);
      throw new Error('Please provide name, category, and context');
    }

    if (!menuCategories || !Array.isArray(menuCategories) || menuCategories.length === 0) {
      res.status(400);
      throw new Error('Please provide at least one menu category');
    }

    if (!items || !Array.isArray(items)) {
      res.status(400);
      throw new Error('Items must be an array (can be empty)');
    }

    // Only validate items if the array is not empty
    if (items.length > 0) {
      // Validate that all item IDs exist and are active or locked
      const itemIds = items.map(item => item.itemId || item.item);
      const uniqueItemIds = [...new Set(itemIds)];
      const existingItems = await Item.find({
        _id: { $in: uniqueItemIds },
        $or: [
          { isActive: true },
          { isPriceLocked: true }
        ]
      });

      if (existingItems.length !== uniqueItemIds.length) {
        res.status(400);
        throw new Error('One or more items not found or are not active/locked');
      }
    }

    // Format items for schema
    const formattedItems = items.map((item, index) => ({
      item: item.itemId || item.item,
      category: item.category || 'Other',
      order: item.order !== undefined ? item.order : index,
      multiplier: item.multiplier !== undefined && item.multiplier !== null ? Number(item.multiplier) : 1,
      priceOverride: item.priceOverride !== undefined && item.priceOverride !== null ? Number(item.priceOverride) : null,
      calculatedProfitMargin: item.calculatedProfitMargin !== undefined && item.calculatedProfitMargin !== null ? Number(item.calculatedProfitMargin) : null,
      recipe: Array.isArray(item.recipe)
        ? item.recipe.map(r => {
          // Handle both old format (strings) and new format (objects)
          if (typeof r === 'string') {
            return { name: r, quantity: 0, unit: '' };
          }
          return {
            name: r.name || '',
            quantity: typeof r.quantity === 'number' ? r.quantity : 0,
            unit: r.unit || '',
          };
        }).filter(r => r.name && r.name.trim().length > 0)
        : [],
      recipeGuide: item.recipeGuide || '',
    }));

    const menu = await Menu.create({
      name,
      category: category || 'General',
      context,
      description: description || '',
      menuCategories: menuCategories || [],
      items: formattedItems,
    });

    // Populate items and calculate prices
    await menu.populate('items.item');
    const menuObj = menu.toObject();

    // Ensure menuCategories is included
    if (!menuObj.menuCategories || menuObj.menuCategories.length === 0) {
      menuObj.menuCategories = [...new Set(menu.items.map(mi => mi.category || 'Other'))];
    }

    const itemsWithPrices = menu.items.map(menuItem => {
      if (!menuItem.item) return menuItem;

      const item = menuItem.item;
      const costs = calculateAllCostsForAllContexts(item);

      // Calculate profit margin if price override exists
      let calculatedMargin = null;
      if (menuItem.priceOverride !== null && menuItem.priceOverride !== undefined) {
        const contextData = menuObj.context === 'event' ? costs.event : costs.inStore;
        const ingredientCost = contextData.ingredientCost || 0;
        const operatingExpense = contextData.operatingExpense || 0;
        const multiplier = menuItem.multiplier || 1;

        // Only multiply ingredients, add OpEx once
        const totalCogs = (ingredientCost * multiplier) + operatingExpense;

        if (totalCogs > 0) {
          const profit = menuItem.priceOverride - totalCogs;
          calculatedMargin = (profit / totalCogs) * 100;
        }
      }

      return {
        ...menuItem.toObject(),
        calculatedProfitMargin: calculatedMargin !== null ? calculatedMargin : menuItem.calculatedProfitMargin,
        item: {
          ...item.toObject(),
          ...costs,
        },
      };
    });

    res.status(201).json({
      success: true,
      data: {
        ...menuObj,
        items: itemsWithPrices,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/menus/:id
// @desc    Update menu
// @access  Public
router.put('/:id', async (req, res, next) => {
  try {
    let menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404);
      throw new Error('Menu not found');
    }

    const { name, category, context, description, menuCategories, items, isActive } = req.body;

    if (name !== undefined) menu.name = name;
    if (category !== undefined) menu.category = category;
    if (context !== undefined) menu.context = context;
    if (description !== undefined) menu.description = description;
    if (isActive !== undefined) menu.isActive = isActive;

    if (menuCategories !== undefined) {
      if (!Array.isArray(menuCategories) || menuCategories.length === 0) {
        res.status(400);
        throw new Error('Menu must have at least one category');
      }
      menu.menuCategories = menuCategories;
    }

    if (items !== undefined) {
      if (!Array.isArray(items)) {
        res.status(400);
        throw new Error('Items must be an array');
      }

      // Only validate items if the array is not empty
      if (items.length > 0) {
        // Validate that all item IDs exist and are active or locked
        const itemIds = items.map(item => item.itemId || item.item);
        const uniqueItemIds = [...new Set(itemIds)];
        const existingItems = await Item.find({
          _id: { $in: uniqueItemIds },
          $or: [
            { isActive: true },
            { isPriceLocked: true }
          ]
        });

        if (existingItems.length !== uniqueItemIds.length) {
          res.status(400);
          throw new Error('One or more items not found or are not active/locked');
        }
      }

      // Format items for schema (can be empty array)
      menu.items = items.map((item, index) => ({
        item: item.itemId || item.item,
        category: item.category || 'Other',
        order: item.order !== undefined ? item.order : index,
        multiplier: item.multiplier !== undefined && item.multiplier !== null ? Number(item.multiplier) : 1,
        priceOverride: item.priceOverride !== undefined && item.priceOverride !== null ? Number(item.priceOverride) : null,
        calculatedProfitMargin: item.calculatedProfitMargin !== undefined && item.calculatedProfitMargin !== null ? Number(item.calculatedProfitMargin) : null,
        recipe: Array.isArray(item.recipe)
          ? item.recipe.map(r => {
            // Handle both old format (strings) and new format (objects)
            if (typeof r === 'string') {
              return { name: r, quantity: 0, unit: '' };
            }
            return {
              name: r.name || '',
              quantity: typeof r.quantity === 'number' ? r.quantity : 0,
              unit: r.unit || '',
            };
          }).filter(r => r.name && r.name.trim().length > 0)
          : [],
        recipeGuide: item.recipeGuide || '',
      }));
    }

    await menu.save();

    // Populate items and calculate prices
    await menu.populate('items.item');
    const itemsWithPrices = menu.items.map(menuItem => {
      if (!menuItem.item) return menuItem;

      const item = menuItem.item;
      const costs = calculateAllCostsForAllContexts(item);

      return {
        ...menuItem.toObject(),
        item: {
          ...item.toObject(),
          ...costs,
        },
      };
    });

    res.json({
      success: true,
      data: {
        ...menu.toObject(),
        items: itemsWithPrices,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/menus/:id
// @desc    Delete menu
// @access  Public
router.delete('/:id', async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404);
      throw new Error('Menu not found');
    }

    await menu.deleteOne();

    res.json({
      success: true,
      message: 'Menu deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/menus/:id/recipe-pdf
// @desc    Generate recipe PDF for menu (no amounts, just ingredient names for staff)
// @access  Public
router.get('/:id/recipe-pdf', async (req, res, next) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      res.status(404);
      throw new Error('Menu not found');
    }

    await menu.populate('items.item');

    // Group items by menu category
    const itemsByCategory = {};
    menu.items?.forEach((menuItem) => {
      if (!menuItem.item) return;
      const category = menuItem.category || 'Other';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(menuItem);
    });

    const categories = Object.keys(itemsByCategory).sort();

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${menu.name.replace(/[^a-z0-9]/gi, '_')}-recipe.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(menu.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('gray').text(`${menu.category} • ${menu.context === 'event' ? 'Event Menu' : 'In-Store Menu'}`, { align: 'center' });
    if (menu.description) {
      doc.moveDown(0.5);
      doc.fontSize(10).text(menu.description, { align: 'center' });
    }
    doc.moveDown(1);
    doc.fillColor('black');

    // Recipes by category
    // A4 page dimensions: 595.28 x 841.89 points
    const pageHeight = 841.89;
    const margin = 50;
    const bottomMargin = 80; // Space to leave at bottom before adding new page

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredHeight = 50) => {
      if (doc.y + requiredHeight > (pageHeight - margin - bottomMargin)) {
        doc.addPage();
        return true;
      }
      return false;
    };

    categories.forEach((category, catIndex) => {
      // Add new page for each category except the first
      if (catIndex > 0) {
        doc.addPage();
      }

      // Category header
      doc.fontSize(18).font('Helvetica-Bold').text(category, { underline: true });
      doc.moveDown(0.5);

      // Items in category
      const categoryItems = itemsByCategory[category].sort((a, b) => (a.order || 0) - (b.order || 0));

      categoryItems.forEach((menuItem, itemIndex) => {
        if (!menuItem.item) return;

        const item = menuItem.item;

        // Build recipe with amounts
        // Use custom recipe if it exists (with amounts), otherwise fallback to item ingredients
        let recipeLines = [];

        if (menuItem.recipe && menuItem.recipe.length > 0) {
          // Custom recipe: use the recipe objects with their custom amounts
          recipeLines = menuItem.recipe.map(r => {
            // Handle both old format (strings) and new format (objects)
            if (typeof r === 'string') {
              // Old format: try to find matching ingredient from item
              const matchingIngredient = item.ingredients?.find(
                ing => ing.name.toLowerCase().trim() === r.toLowerCase().trim()
              );
              if (matchingIngredient) {
                return {
                  name: matchingIngredient.name,
                  quantity: matchingIngredient.quantity,
                  unit: matchingIngredient.unit,
                };
              }
              return { name: r, quantity: null, unit: null };
            }
            // New format: use the recipe object directly with custom amounts
            return {
              name: r.name || '',
              quantity: r.quantity || null,
              unit: r.unit || null,
            };
          }).filter(ing => ing.name && ing.name.trim().length > 0);
        } else if (item.ingredients && item.ingredients.length > 0) {
          // Fallback: use all item ingredients with their amounts
          recipeLines = item.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          }));
        }

        // Format recipe lines for display
        const formattedRecipe = recipeLines.map(ing => {
          if (ing.quantity !== null && ing.quantity !== undefined && ing.unit) {
            return `${ing.name} - ${ing.quantity} ${ing.unit}`;
          } else if (ing.quantity !== null && ing.quantity !== undefined) {
            return `${ing.name} - ${ing.quantity}`;
          }
          return ing.name;
        });

        // Estimate space needed: item name (~20pt) + recipe lines (~12pt each) + spacing (~15pt)
        const estimatedHeight = 20 + (formattedRecipe.length > 0 ? formattedRecipe.length * 12 : 12) + 15;

        // Check if we need a new page before adding this item
        const needsNewPage = checkPageBreak(estimatedHeight);
        if (needsNewPage) {
          // Re-add category header if we're continuing on a new page
          if (itemIndex > 0) {
            doc.fontSize(18).font('Helvetica-Bold').text(category, { underline: true });
            doc.moveDown(0.5);
          }
        }

        // Item name
        doc.fontSize(14).font('Helvetica-Bold').text(item.name);
        doc.moveDown(0.3);

        // Recipe ingredients with amounts
        if (formattedRecipe.length > 0) {
          doc.fontSize(11).font('Helvetica').fillColor('gray');
          formattedRecipe.forEach((ingredientLine) => {
            // Check page break before each line - if we need a new page, re-add item name
            if (checkPageBreak(12)) {
              doc.fontSize(14).font('Helvetica-Bold').text(item.name + ' (continued)', { indent: 0 });
              doc.moveDown(0.3);
            }
            doc.text(`• ${ingredientLine}`, { indent: 20 });
          });
        } else {
          if (checkPageBreak(12)) {
            doc.fontSize(14).font('Helvetica-Bold').text(item.name, { indent: 0 });
            doc.moveDown(0.3);
          }
          doc.fontSize(10).font('Helvetica').fillColor('gray').text('No recipe specified', { indent: 20 });
        }

        // Recipe guide/instructions
        if (menuItem.recipeGuide && menuItem.recipeGuide.trim().length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Instructions:', { indent: 20 });
          doc.moveDown(0.2);
          doc.fontSize(10).font('Helvetica').fillColor('gray');

          // Split guide into lines and add each line, checking for page breaks
          const guideLines = menuItem.recipeGuide.split('\n').filter(line => line.trim().length > 0);
          guideLines.forEach((line) => {
            if (checkPageBreak(12)) {
              doc.fontSize(14).font('Helvetica-Bold').text(item.name + ' (continued)', { indent: 0 });
              doc.moveDown(0.3);
              doc.fontSize(10).font('Helvetica-Bold').fillColor('black').text('Instructions:', { indent: 20 });
              doc.moveDown(0.2);
            }
            doc.text(line.trim(), { indent: 30 });
          });
        }

        doc.fillColor('black');
        doc.moveDown(0.8);
      });
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;

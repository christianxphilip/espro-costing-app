const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const Item = require('../models/Item');
const { fetchRetailerQuote, normalizeSource, searchRetailerProducts } = require('../services/retailerPricing');

router.post('/retailer-search', async (req, res, next) => {
  try {
    const data = await searchRetailerProducts(req.body.query, req.body.tag);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/retailer-quote', async (req, res, next) => {
  try {
    const { retailer, productUrl } = req.body;
    const data = await fetchRetailerQuote(retailer, productUrl);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/ingredients
// @desc    Get all ingredients
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { category, search, active } = req.query;
    
    const query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const ingredients = await Ingredient.find(query).sort({ name: 1 });
    
    res.json({
      success: true,
      count: ingredients.length,
      data: ingredients,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/ingredients/categories
// @desc    Get all unique categories
// @access  Public
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Ingredient.distinct('category');
    
    res.json({
      success: true,
      count: categories.length,
      data: categories.sort(),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/ingredients/:id
// @desc    Get single ingredient
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      throw new Error('Ingredient not found');
    }
    
    res.json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to recursively cascade ingredient changes to items and other prep ingredients
async function cascadeIngredientChanges(ingredientId, oldName, newName, newCost) {
  // 1. Update prep ingredients that use this ingredient
  const prepIngredients = await Ingredient.find({
    isPrep: true,
    $or: [
      { "prepIngredients.ingredientId": ingredientId },
      { "prepIngredients.name": oldName }
    ]
  });
  
  for (const prep of prepIngredients) {
    let changed = false;
    for (const sub of prep.prepIngredients) {
      const idMatch = sub.ingredientId && sub.ingredientId.toString() === ingredientId.toString();
      const nameMatch = sub.name === oldName;
      
      if (idMatch || nameMatch) {
        sub.name = newName;
        sub.costPerUnit = newCost;
        if (!sub.ingredientId) {
          sub.ingredientId = ingredientId;
        }
        changed = true;
      }
    }
    
    if (changed) {
      const totalCost = prep.prepIngredients.reduce(
        (sum, sub) => sum + (Number(sub.quantity || 0) * Number(sub.costPerUnit || 0)),
        0
      );
      const oldPrepCost = prep.costPerUnit;
      const oldPrepName = prep.name;
      
      prep.costPerUnit = prep.totalOutput > 0 ? (totalCost / prep.totalOutput) : 0;
      await prep.save();
      
      // Cascading update recursively!
      await cascadeIngredientChanges(prep._id, oldPrepName, prep.name, prep.costPerUnit);
    }
  }
  
  // 2. Update items that use this ingredient (by name)
  const items = await Item.find({ "ingredients.name": oldName });
  for (const item of items) {
    let changed = false;
    for (const ing of item.ingredients) {
      if (ing.name === oldName) {
        ing.name = newName;
        ing.costPerUnit = newCost;
        changed = true;
      }
    }
    if (changed) {
      await item.save();
    }
  }
}

// @route   POST /api/ingredients
// @desc    Create new ingredient
// @access  Public
router.post('/', async (req, res, next) => {
  try {
    const { name, category, unit, costPerUnit, supplier, notes, isPrep, prepIngredients, totalOutput } = req.body;
    
    if (isPrep) {
      if (!name || !category || !unit || totalOutput === undefined || totalOutput <= 0) {
        res.status(400);
        throw new Error('Please provide name, category, unit, and positive total output for prep ingredients');
      }
      if (!prepIngredients || !Array.isArray(prepIngredients) || prepIngredients.length === 0) {
        res.status(400);
        throw new Error('Please provide sub-ingredients for prep ingredients');
      }
    } else {
      if (!name || !category || !unit || costPerUnit === undefined) {
        res.status(400);
        throw new Error('Please provide name, category, unit, and cost per unit');
      }
    }
    
    // Check if ingredient already exists
    const existing = await Ingredient.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      category: { $regex: new RegExp(`^${category}$`, 'i') }
    });
    
    if (existing) {
      res.status(400);
      throw new Error('An ingredient with this name and category already exists');
    }
    
    let calculatedCostPerUnit = costPerUnit;
    if (isPrep) {
      const totalCost = prepIngredients.reduce((sum, ing) => {
        return sum + (Number(ing.quantity || 0) * Number(ing.costPerUnit || 0));
      }, 0);
      calculatedCostPerUnit = totalCost / Number(totalOutput);
    }
    
    const ingredient = await Ingredient.create({
      name,
      category,
      unit,
      costPerUnit: calculatedCostPerUnit,
      retailerSource: isPrep ? null : normalizeSource(req.body.retailerSource),
      retailerSearchTag: isPrep ? '' : req.body.retailerSearchTag,
      supplier: supplier || '',
      notes: notes || '',
      isPrep: !!isPrep,
      prepIngredients: isPrep ? prepIngredients : [],
      totalOutput: isPrep ? Number(totalOutput) : 0,
    });
    
    res.status(201).json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/ingredients/:id
// @desc    Update ingredient
// @access  Public
router.put('/:id', async (req, res, next) => {
  try {
    let ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      throw new Error('Ingredient not found');
    }
    
    const { name, category, unit, costPerUnit, supplier, notes, isActive, isPrep, prepIngredients, totalOutput } = req.body;
    
    let oldName = ingredient.name;
    let oldCost = ingredient.costPerUnit;
    
    if (name !== undefined) ingredient.name = name;
    if (category !== undefined) ingredient.category = category;
    if (unit !== undefined) ingredient.unit = unit;
    if (supplier !== undefined) ingredient.supplier = supplier;
    if (notes !== undefined) ingredient.notes = notes;
    if (isActive !== undefined) ingredient.isActive = isActive;
    
    if (isPrep !== undefined) ingredient.isPrep = isPrep;
    if (prepIngredients !== undefined) ingredient.prepIngredients = prepIngredients;
    if (totalOutput !== undefined) ingredient.totalOutput = totalOutput;
    
    // Recalculate cost if it is a prep ingredient
    if (ingredient.isPrep) {
      ingredient.retailerSource = null;
      ingredient.retailerSearchTag = '';
      const outputVal = ingredient.totalOutput;
      const totalCost = ingredient.prepIngredients.reduce((sum, ing) => {
        return sum + (Number(ing.quantity || 0) * Number(ing.costPerUnit || 0));
      }, 0);
      ingredient.costPerUnit = outputVal > 0 ? (totalCost / outputVal) : 0;
    } else {
      if (costPerUnit !== undefined) ingredient.costPerUnit = costPerUnit;
      if (req.body.retailerSource !== undefined) {
        ingredient.retailerSource = normalizeSource(req.body.retailerSource);
      }
      if (req.body.retailerSearchTag !== undefined) {
        ingredient.retailerSearchTag = req.body.retailerSearchTag;
      }
      // If converting from prep to standard, clear prep fields
      if (isPrep === false) {
        ingredient.prepIngredients = [];
        ingredient.totalOutput = 0;
      }
    }
    
    await ingredient.save();
    
    // Cascade updates to other prep ingredients and items if name or cost changed
    if (oldName !== ingredient.name || oldCost !== ingredient.costPerUnit) {
      await cascadeIngredientChanges(ingredient._id, oldName, ingredient.name, ingredient.costPerUnit);
    }
    
    res.json({
      success: true,
      data: ingredient,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/ingredients/:id
// @desc    Delete ingredient
// @access  Public
router.delete('/:id', async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      res.status(404);
      throw new Error('Ingredient not found');
    }
    
    await ingredient.deleteOne();
    
    res.json({
      success: true,
      message: 'Ingredient deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ingredients/bulk
// @desc    Bulk create ingredients
// @access  Public
router.post('/bulk', async (req, res, next) => {
  try {
    const { ingredients } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      res.status(400);
      throw new Error('Please provide an array of ingredients');
    }
    
    const created = [];
    const errors = [];
    
    for (const ing of ingredients) {
      try {
        // Check if exists
        const existing = await Ingredient.findOne({
          name: { $regex: new RegExp(`^${ing.name}$`, 'i') },
          category: { $regex: new RegExp(`^${ing.category}$`, 'i') }
        });
        
        if (existing) {
          errors.push({ name: ing.name, error: 'Already exists' });
          continue;
        }
        
        const ingredient = await Ingredient.create(ing);
        created.push(ingredient);
      } catch (error) {
        errors.push({ name: ing.name, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Created ${created.length} ingredients`,
      data: created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ingredients/migrate-units
// @desc    Standardize units in ingredients and items (one-time migration)
// @access  Public
router.post('/migrate-units', async (req, res, next) => {
  try {
    const unitMappings = {
      'grams': 'g',
      'gram': 'g',
      'Grams': 'g',
      'Gram': 'g',
      'per piece': 'pc',
      'Per Piece': 'pc',
      'piece': 'pc',
      'Piece': 'pc',
      'pieces': 'pcs',
      'Pieces': 'pcs',
      'milliliters': 'ml',
      'milliliter': 'ml',
      'Milliliters': 'ml',
      'Milliliter': 'ml',
      'liters': 'L',
      'liter': 'L',
      'Liters': 'L',
      'Liter': 'L',
      'kilograms': 'kg',
      'kilogram': 'kg',
      'Kilograms': 'kg',
      'Kilogram': 'kg',
    };

    let ingredientsUpdated = 0;
    let itemsUpdated = 0;
    let ingredientsInItemsUpdated = 0;

    // Update master ingredients
    const ingredients = await Ingredient.find();
    for (const ingredient of ingredients) {
      if (unitMappings[ingredient.unit]) {
        ingredient.unit = unitMappings[ingredient.unit];
        await ingredient.save();
        ingredientsUpdated++;
      }
    }

    // Update ingredients in items
    const items = await Item.find();
    for (const item of items) {
      let itemChanged = false;
      for (const ing of item.ingredients) {
        if (unitMappings[ing.unit]) {
          ing.unit = unitMappings[ing.unit];
          ingredientsInItemsUpdated++;
          itemChanged = true;
        }
      }
      if (itemChanged) {
        await item.save();
        itemsUpdated++;
      }
    }

    res.json({
      success: true,
      message: 'Units standardized successfully',
      data: {
        masterIngredientsUpdated: ingredientsUpdated,
        itemsUpdated: itemsUpdated,
        ingredientsInItemsUpdated: ingredientsInItemsUpdated,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


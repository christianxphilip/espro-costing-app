const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');
const { getAISuggestion, getPricingInsights, parseRecipeText } = require('../services/aiService');
const { calculateAllCosts } = require('../services/costingService');

// @route   POST /api/ai/suggest/:id
// @desc    Get AI pricing suggestion for an item
// @access  Public
router.post('/suggest/:id', async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      res.status(404);
      throw new Error('Item not found');
    }
    
    // Calculate current costs
    const costs = calculateAllCosts(item);
    
    // Get AI suggestion
    const aiSuggestion = await getAISuggestion({
      name: item.name,
      category: item.category,
      cogs: costs.cogs,
      profitMargin: item.profitMargin,
      suggestedPrice: costs.suggestedPrice,
    });
    
    // Update item with AI suggestion
    item.aiSuggestedPrice = aiSuggestion.suggestedPrice;
    item.aiReasoning = aiSuggestion.reasoning;
    await item.save();
    
    res.json({
      success: true,
      data: {
        itemId: item._id,
        itemName: item.name,
        formulaPrice: costs.suggestedPrice,
        aiSuggestedPrice: aiSuggestion.suggestedPrice,
        reasoning: aiSuggestion.reasoning,
        source: aiSuggestion.source,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/ai/insights
// @desc    Get pricing insights for all items
// @access  Public
router.get('/insights', async (req, res, next) => {
  try {
    const items = await Item.find();
    
    if (items.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: ['No items found. Add items to get pricing insights.'],
          recommendations: [],
          totalItems: 0,
          avgMargin: 0,
        },
      });
    }
    
    const insights = getPricingInsights(items);
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/ai/parse-recipe
// @desc    Parse raw recipe and map to ingredients
// @access  Public
router.post('/parse-recipe', async (req, res, next) => {
  try {
    const { recipeText } = req.body;
    
    if (!recipeText) {
      res.status(400);
      throw new Error('Please provide recipeText');
    }
    
    // Fetch active ingredients from the library
    const ingredients = await Ingredient.find({ isActive: true });
    
    // Parse the recipe
    const parsedIngredients = await parseRecipeText(recipeText, ingredients);
    
    res.json({
      success: true,
      data: parsedIngredients,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;


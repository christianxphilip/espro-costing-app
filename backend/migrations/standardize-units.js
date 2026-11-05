/**
 * Migration Script: Standardize Units
 * 
 * This script standardizes ingredient units across the database:
 * - grams → g
 * - per piece → pc
 * - milliliters → ml
 * etc.
 * 
 * Run: node migrations/standardize-units.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas inline for the migration
const ingredientSchema = new mongoose.Schema({
  name: String,
  category: String,
  unit: String,
  costPerUnit: Number,
  supplier: String,
  notes: String,
  isActive: Boolean,
}, { timestamps: true });

const itemSchema = new mongoose.Schema({
  name: String,
  category: String,
  ingredients: [{
    name: String,
    quantity: Number,
    unit: String,
    costPerUnit: Number,
  }],
  operatingExpense: Number,
  profitMargin: Number,
  aiSuggestedPrice: Number,
  aiReasoning: String,
  expectedDailySales: Number,
  isActive: Boolean,
}, { timestamps: true });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);
const Item = mongoose.model('Item', itemSchema);

// Unit mappings
const unitMappings = {
  'grams': 'g',
  'gram': 'g',
  'Grams': 'g',
  'Gram': 'g',
  'GRAMS': 'g',
  'G': 'g',
  'per piece': 'pc',
  'Per Piece': 'pc',
  'piece': 'pc',
  'Piece': 'pc',
  'PIECE': 'pc',
  'pieces': 'pcs',
  'Pieces': 'pcs',
  'PIECES': 'pcs',
  'milliliters': 'ml',
  'milliliter': 'ml',
  'Milliliters': 'ml',
  'Milliliter': 'ml',
  'MILLILITERS': 'ml',
  'ML': 'ml',
  'liters': 'L',
  'liter': 'L',
  'Liters': 'L',
  'Liter': 'L',
  'LITERS': 'L',
  'kilograms': 'kg',
  'kilogram': 'kg',
  'Kilograms': 'kg',
  'Kilogram': 'kg',
  'KILOGRAMS': 'kg',
  'unit': 'unit',
  'Unit': 'unit',
  'UNIT': 'unit',
};

async function standardizeUnits() {
  try {
    // Connect to MongoDB
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/cafe-costing';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    let ingredientsUpdated = 0;
    let itemsUpdated = 0;
    let ingredientsInItemsUpdated = 0;

    // Update master ingredients
    console.log('📦 Updating master ingredients...');
    const ingredients = await Ingredient.find();
    console.log(`   Found ${ingredients.length} ingredients`);
    
    for (const ingredient of ingredients) {
      const oldUnit = ingredient.unit;
      if (unitMappings[ingredient.unit]) {
        ingredient.unit = unitMappings[ingredient.unit];
        await ingredient.save();
        ingredientsUpdated++;
        console.log(`   ✓ ${ingredient.name}: "${oldUnit}" → "${ingredient.unit}"`);
      }
    }

    console.log(`   Updated: ${ingredientsUpdated} ingredients\n`);

    // Update ingredients in items
    console.log('🍰 Updating ingredients in menu items...');
    const items = await Item.find();
    console.log(`   Found ${items.length} items`);
    
    for (const item of items) {
      let itemChanged = false;
      for (const ing of item.ingredients) {
        const oldUnit = ing.unit;
        if (unitMappings[ing.unit]) {
          ing.unit = unitMappings[ing.unit];
          ingredientsInItemsUpdated++;
          itemChanged = true;
          console.log(`   ✓ ${item.name} → ${ing.name}: "${oldUnit}" → "${ing.unit}"`);
        }
      }
      if (itemChanged) {
        await item.save();
        itemsUpdated++;
      }
    }

    console.log(`   Updated: ${itemsUpdated} items (${ingredientsInItemsUpdated} ingredients)\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('✨ MIGRATION COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`📦 Master Ingredients Updated: ${ingredientsUpdated}`);
    console.log(`🍰 Items Updated: ${itemsUpdated}`);
    console.log(`🔧 Total Ingredient Entries Updated: ${ingredientsInItemsUpdated}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the migration
standardizeUnits();


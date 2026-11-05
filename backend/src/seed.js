const mongoose = require('mongoose');
require('dotenv').config();

const Ingredient = require('./models/Ingredient');
const Item = require('./models/Item');
const OperatingExpense = require('./models/OperatingExpense');
const Menu = require('./models/Menu');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cafe-costing';

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      Ingredient.deleteMany({}),
      Item.deleteMany({}),
      OperatingExpense.deleteMany({}),
      Menu.deleteMany({})
    ]);

    // 1. Seed Operating Expenses
    console.log('Seeding Operating Expenses...');
    const expenses = await OperatingExpense.insertMany([
      {
        name: 'Store Rent',
        amount: 25000,
        frequency: 'monthly',
        category: 'Rent',
        context: 'in-store',
        notes: 'Monthly physical cafe location rent'
      },
      {
        name: 'Electricity & Water',
        amount: 8000,
        frequency: 'monthly',
        category: 'Utilities',
        context: 'in-store',
        notes: 'Power and water utilities'
      },
      {
        name: 'Staff Payroll',
        amount: 35000,
        frequency: 'monthly',
        category: 'Labor',
        context: 'in-store',
        notes: 'Barista salaries'
      },
      {
        name: 'POS & Wifi Tech',
        amount: 3000,
        frequency: 'monthly',
        category: 'Software & Tech',
        context: 'in-store',
        notes: 'POS system subscription and internet connection'
      }
    ]);

    // 2. Seed Ingredients
    console.log('Seeding Master Ingredients...');
    const ingredients = await Ingredient.insertMany([
      { name: 'Espresso Beans (Dark Roast)', category: 'Coffee', unit: 'shots', costPerUnit: 12.0, supplier: 'Local Coffee Roasters' },
      { name: 'Whole Milk', category: 'Dairy', unit: 'ml', costPerUnit: 0.06, supplier: 'Fresh Dairy Co.' },
      { name: 'Oat Milk', category: 'Dairy', unit: 'ml', costPerUnit: 0.10, supplier: 'OatCo' },
      { name: 'Vanilla Syrup', category: 'Sweetener & Flavor', unit: 'ml', costPerUnit: 0.15, supplier: 'Syrup Craft' },
      { name: 'Caramel Syrup', category: 'Sweetener & Flavor', unit: 'ml', costPerUnit: 0.15, supplier: 'Syrup Craft' },
      { name: 'Matcha Powder', category: 'Tea & Powder', unit: 'grams', costPerUnit: 2.50, supplier: 'Kyoto Imports' },
      { name: '12oz Hot Cup & Lid', category: 'Packaging', unit: 'pc', costPerUnit: 6.00, supplier: 'EcoPack Supplies' },
      { name: '16oz Cold Cup & Lid', category: 'Packaging', unit: 'pc', costPerUnit: 8.00, supplier: 'EcoPack Supplies' },
      { name: 'Butter Croissant Dough', category: 'Bakery', unit: 'pc', costPerUnit: 25.00, supplier: 'Artisan Bakery' }
    ]);

    // 3. Seed Items
    console.log('Seeding Café Menu Items...');
    const items = await Item.insertMany([
      {
        name: 'Espresso Double Shot',
        category: 'Coffee',
        targetFoodCostPercent: 25,
        expectedDailySalesInStore: 30,
        ingredients: [
          { name: 'Espresso Beans (Dark Roast)', quantity: 2, unit: 'shots', costPerUnit: 12.0 },
          { name: '12oz Hot Cup & Lid', quantity: 1, unit: 'pc', costPerUnit: 6.0 }
        ]
      },
      {
        name: 'Caffe Latte (12oz)',
        category: 'Coffee',
        targetFoodCostPercent: 30,
        expectedDailySalesInStore: 45,
        ingredients: [
          { name: 'Espresso Beans (Dark Roast)', quantity: 2, unit: 'shots', costPerUnit: 12.0 },
          { name: 'Whole Milk', quantity: 200, unit: 'ml', costPerUnit: 0.06 },
          { name: '12oz Hot Cup & Lid', quantity: 1, unit: 'pc', costPerUnit: 6.0 }
        ]
      },
      {
        name: 'Iced Vanilla Latte (16oz)',
        category: 'Iced Drinks',
        targetFoodCostPercent: 30,
        expectedDailySalesInStore: 40,
        ingredients: [
          { name: 'Espresso Beans (Dark Roast)', quantity: 2, unit: 'shots', costPerUnit: 12.0 },
          { name: 'Whole Milk', quantity: 200, unit: 'ml', costPerUnit: 0.06 },
          { name: 'Vanilla Syrup', quantity: 30, unit: 'ml', costPerUnit: 0.15 },
          { name: '16oz Cold Cup & Lid', quantity: 1, unit: 'pc', costPerUnit: 8.0 }
        ]
      },
      {
        name: 'Iced Matcha Latte (16oz)',
        category: 'Iced Drinks',
        targetFoodCostPercent: 35,
        expectedDailySalesInStore: 25,
        ingredients: [
          { name: 'Matcha Powder', quantity: 6, unit: 'grams', costPerUnit: 2.50 },
          { name: 'Oat Milk', quantity: 220, unit: 'ml', costPerUnit: 0.10 },
          { name: '16oz Cold Cup & Lid', quantity: 1, unit: 'pc', costPerUnit: 8.0 }
        ]
      },
      {
        name: 'Freshly Baked Butter Croissant',
        category: 'Pastries',
        targetFoodCostPercent: 40,
        expectedDailySalesInStore: 20,
        ingredients: [
          { name: 'Butter Croissant Dough', quantity: 1, unit: 'pc', costPerUnit: 25.0 }
        ]
      }
    ]);

    // 4. Seed Menu / Event
    console.log('Seeding Master Menu...');
    await Menu.create({
      name: 'Main Café Menu',
      category: 'In-Store Daily',
      context: 'in-store',
      description: 'Standard daily menu for in-store customers',
      menuCategories: ['Coffee', 'Iced Drinks', 'Pastries'],
      items: items.map((item, idx) => ({
        item: item._id,
        category: item.category,
        order: idx,
        multiplier: 1
      }))
    });

    console.log('✅ Database successfully populated with sample café data!');
    console.log(`Summary:
  - Expenses: ${expenses.length}
  - Ingredients: ${ingredients.length}
  - Items: ${items.length}
  - Menus: 1`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

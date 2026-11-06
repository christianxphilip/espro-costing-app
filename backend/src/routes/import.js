const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const Item = require('../models/Item');
const { detectRecipeWorkbook, parseRecipeWorkbook, planRecipeImport, saveRecipeImport } = require('../services/recipeImport');
const { recalculateItemExpenses } = require('./operatingExpenses');
const { calculateAllCosts } = require('../services/costingService');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
});

const recipeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
router.post('/recipes/upload', recipeUpload.single('file'), (req, res) => {
  try {
    if (!req.file || !/\.(xlsx|xls|csv)$/i.test(req.file.originalname)) {
      return res.status(400).json({ message: 'Upload an Excel or CSV recipe workbook.' });
    }
    res.json({ data: parseRecipeWorkbook(req.file.buffer) });
  } catch (error) {
    res.status(400).json({ message: error.statusCode ? error.message : 'Could not read the recipe workbook.' });
  }
});

router.post('/recipes/sheet', async (req, res, next) => {
  let sheet;
  try {
    sheet = new URL(req.body.url);
  } catch {
    return res.status(400).json({ message: 'Paste a Google Sheets link.' });
  }
  const match = sheet.pathname.match(/^\/spreadsheets\/d\/([\w-]+)(?:\/|$)/);
  if (sheet.origin !== 'https://docs.google.com' || !match) {
    return res.status(400).json({ message: 'Paste a Google Sheets link.' });
  }

  let exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`);
  let buffer;
  try {
    const signal = AbortSignal.timeout(12000);
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(exportUrl, { redirect: 'manual', size: 5 * 1024 * 1024, signal });
      if (response.ok && response.headers.get('content-type')?.includes('spreadsheetml')) {
        buffer = await response.buffer();
        break;
      }
      const location = response.headers.get('location');
      if (response.status < 300 || response.status >= 400 || !location) break;
      const destination = new URL(location, exportUrl);
      if (destination.protocol !== 'https:' || destination.port || destination.username || destination.password
        || !destination.hostname.endsWith('.googleusercontent.com')) break;
      exportUrl = destination;
    }
  } catch {
    // A restricted sheet or unavailable export can still be uploaded as a file.
  }
  if (!buffer) {
    return res.status(422).json({ message: 'Could not download this Google Sheet. Download it as Excel and upload the file here.' });
  }
  try {
    res.json({ data: parseRecipeWorkbook(buffer) });
  } catch (error) {
    next(error);
  }
});

for (const action of ['preview', 'save']) {
  router.post(`/recipes/${action}`, async (req, res, next) => {
    try {
      const { summary, writes } = await planRecipeImport(req.body.recipes, req.body.additions);
      if (action === 'save') {
        if (JSON.stringify(req.body.summary) !== JSON.stringify(summary)) {
          return res.status(409).json({ message: 'The costing changed. Preview the recipes again before saving.' });
        }
        await saveRecipeImport(writes);
        await recalculateItemExpenses();
      }
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  });
}

// @route   POST /api/import/upload
// @desc    Upload and parse Excel/CSV file
// @access  Public
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a file');
    }

    const filePath = req.file.path;
    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } finally {
      fs.unlinkSync(filePath);
    }

    const recipes = detectRecipeWorkbook(workbook);
    if (recipes) {
      return res.json({ success: true, format: 'recipes', data: recipes });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      res.status(400);
      throw new Error('File is empty or invalid format');
    }

    // Parse and validate data
    const parsedItems = [];
    const errors = [];

    data.forEach((row, index) => {
      try {
        // Parse ingredients from multiple columns
        const ingredients = [];
        let ingredientIndex = 1;
        
        while (row[`Ingredient ${ingredientIndex} Name`]) {
          const ingredient = {
            name: row[`Ingredient ${ingredientIndex} Name`],
            quantity: parseFloat(row[`Ingredient ${ingredientIndex} Qty`] || 0),
            unit: row[`Ingredient ${ingredientIndex} Unit`] || 'unit',
            costPerUnit: parseFloat(row[`Ingredient ${ingredientIndex} Cost`] || 0),
          };
          
          if (ingredient.name) {
            ingredients.push(ingredient);
          }
          ingredientIndex++;
        }

        const item = {
          name: row['Item Name'] || row['Name'] || `Item ${index + 1}`,
          category: row['Category'] || 'Uncategorized',
          ingredients,
          operatingExpense: parseFloat(row['Operating Expense'] || 0),
          targetFoodCostPercent: parseFloat(row['Target Food Cost %'] || row['Profit Margin'] || 30),
        };

        parsedItems.push(item);
      } catch (error) {
        errors.push({
          row: index + 1,
          error: error.message,
        });
      }
    });

    res.json({
      success: true,
      message: `Parsed ${parsedItems.length} items successfully`,
      data: parsedItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/import/save
// @desc    Save imported items to database
// @access  Public
router.post('/save', async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400);
      throw new Error('No items provided');
    }

    const savedItems = await Item.insertMany(items);

    res.json({
      success: true,
      message: `Saved ${savedItems.length} items successfully`,
      data: savedItems,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import/export
// @desc    Export all items to Excel
// @access  Public
router.get('/export', async (req, res, next) => {
  try {
    const items = await Item.find();

    if (items.length === 0) {
      res.status(404);
      throw new Error('No items found to export');
    }

    // Prepare data for Excel
    const excelData = [];

    items.forEach(item => {
      const costs = calculateAllCosts(item);
      const baseRow = {
        'Item Name': item.name,
        'Category': item.category,
        'Operating Expense': item.operatingExpense,
        'Target Food Cost %': item.targetFoodCostPercent,
        'Total Ingredient Cost': costs.ingredientCost,
        'COGS': costs.cogs,
        'Suggested Price': costs.suggestedPrice,
        'AI Suggested Price': item.aiSuggestedPrice || '',
        'AI Reasoning': item.aiReasoning || '',
      };

      // Add ingredients to the row
      item.ingredients.forEach((ingredient, index) => {
        baseRow[`Ingredient ${index + 1} Name`] = ingredient.name;
        baseRow[`Ingredient ${index + 1} Qty`] = ingredient.quantity;
        baseRow[`Ingredient ${index + 1} Unit`] = ingredient.unit;
        baseRow[`Ingredient ${index + 1} Cost`] = ingredient.costPerUnit;
      });

      excelData.push(baseRow);
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=cafe-items-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import/template
// @desc    Download Excel template
// @access  Public
router.get('/template', (req, res) => {
  const templateData = [
    {
      'Item Name': 'Cappuccino',
      'Category': 'Coffee',
      'Operating Expense': 15,
      'Target Food Cost %': 30,
      'Ingredient 1 Name': 'Espresso',
      'Ingredient 1 Qty': 2,
      'Ingredient 1 Unit': 'shots',
      'Ingredient 1 Cost': 10,
      'Ingredient 2 Name': 'Milk',
      'Ingredient 2 Qty': 150,
      'Ingredient 2 Unit': 'ml',
      'Ingredient 2 Cost': 0.05,
      'Ingredient 3 Name': 'Cup',
      'Ingredient 3 Qty': 1,
      'Ingredient 3 Unit': 'pc',
      'Ingredient 3 Cost': 5,
    },
    {
      'Item Name': 'Chocolate Cake',
      'Category': 'Pastry',
      'Operating Expense': 20,
      'Target Food Cost %': 30,
      'Ingredient 1 Name': 'Cake Base',
      'Ingredient 1 Qty': 1,
      'Ingredient 1 Unit': 'slice',
      'Ingredient 1 Cost': 25,
      'Ingredient 2 Name': 'Chocolate Frosting',
      'Ingredient 2 Qty': 30,
      'Ingredient 2 Unit': 'g',
      'Ingredient 2 Cost': 0.8,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=cafe-items-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  res.send(buffer);
});

module.exports = router;


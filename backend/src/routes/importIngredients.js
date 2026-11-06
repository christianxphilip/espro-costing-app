const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { detectRecipeWorkbook } = require('../services/recipeImport');
const Ingredient = require('../models/Ingredient');

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

// @route   POST /api/import-ingredients/upload
// @desc    Upload and parse ingredients Excel/CSV file
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
    const parsedIngredients = [];
    const errors = [];

    data.forEach((row, index) => {
      try {
        // Standardize units
        let unit = row['Unit'] || 'unit';
        const unitMappings = {
          'grams': 'g', 'gram': 'g', 'Grams': 'g', 'Gram': 'g',
          'per piece': 'pc', 'Per Piece': 'pc', 'piece': 'pc', 'Piece': 'pc',
          'pieces': 'pcs', 'Pieces': 'pcs',
          'milliliters': 'ml', 'milliliter': 'ml', 'Milliliters': 'ml', 'Milliliter': 'ml',
          'liters': 'L', 'liter': 'L', 'Liters': 'L', 'Liter': 'L',
          'kilograms': 'kg', 'kilogram': 'kg', 'Kilograms': 'kg', 'Kilogram': 'kg',
        };
        if (unitMappings[unit]) {
          unit = unitMappings[unit];
        }
        
        const ingredient = {
          name: row['Name'] || row['Ingredient Name'] || `Ingredient ${index + 1}`,
          category: row['Category'] || 'General',
          unit: unit,
          costPerUnit: parseFloat(row['Cost Per Unit'] || row['Cost'] || 0),
          supplier: row['Supplier'] || '',
          notes: row['Notes'] || '',
          isActive: row['Status'] ? row['Status'].toLowerCase() === 'active' : true,
        };

        parsedIngredients.push(ingredient);
      } catch (error) {
        errors.push({
          row: index + 1,
          error: error.message,
        });
      }
    });

    res.json({
      success: true,
      message: `Parsed ${parsedIngredients.length} ingredients successfully`,
      data: parsedIngredients,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import-ingredients/export
// @desc    Export all ingredients to Excel
// @access  Public
router.get('/export', async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find();

    if (ingredients.length === 0) {
      res.status(404);
      throw new Error('No ingredients found to export');
    }

    // Prepare data for Excel
    const excelData = ingredients.map(ingredient => ({
      'Name': ingredient.name,
      'Category': ingredient.category,
      'Unit': ingredient.unit,
      'Cost Per Unit': ingredient.costPerUnit,
      'Supplier': ingredient.supplier || '',
      'Notes': ingredient.notes || '',
      'Status': ingredient.isActive ? 'Active' : 'Inactive',
      'Created': ingredient.createdAt ? new Date(ingredient.createdAt).toLocaleDateString() : '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ingredients');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=ingredients-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/import-ingredients/save
// @desc    Save imported ingredients to database
// @access  Public
router.post('/save', async (req, res, next) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      res.status(400);
      throw new Error('No ingredients provided');
    }

    const savedIngredients = await Ingredient.insertMany(ingredients);

    res.json({
      success: true,
      message: `Saved ${savedIngredients.length} ingredients successfully`,
      data: savedIngredients,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import-ingredients/template
// @desc    Download ingredients template
// @access  Public
router.get('/template', (req, res) => {
  const templateData = [
    {
      'Name': 'Espresso Beans',
      'Category': 'Coffee',
      'Unit': 'g',
      'Cost Per Unit': 2.5,
      'Supplier': 'Local Coffee Roasters',
      'Notes': 'Premium arabica blend',
    },
    {
      'Name': 'Whole Milk',
      'Category': 'Dairy',
      'Unit': 'ml',
      'Cost Per Unit': 0.05,
      'Supplier': 'Fresh Dairy Co.',
      'Notes': '3.5% fat content',
    },
    {
      'Name': 'Sugar',
      'Category': 'Sweetener',
      'Unit': 'g',
      'Cost Per Unit': 0.02,
      'Supplier': 'Sweet Suppliers',
      'Notes': 'White refined sugar',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=ingredients-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  res.send(buffer);
});

module.exports = router;


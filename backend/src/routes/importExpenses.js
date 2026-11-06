const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { detectRecipeWorkbook } = require('../services/recipeImport');
const OperatingExpense = require('../models/OperatingExpense');

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

// @route   POST /api/import-expenses/upload
// @desc    Upload and parse expenses Excel/CSV file
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
    const parsedExpenses = [];
    const errors = [];

    data.forEach((row, index) => {
      try {
        const expense = {
          name: row['Name'] || row['Expense Name'] || `Expense ${index + 1}`,
          amount: parseFloat(row['Amount'] || 0),
          frequency: (row['Frequency'] || 'monthly').toLowerCase(),
          category: row['Category'] || 'General',
          allocationType: 'standard', // Always use standard allocation
          notes: row['Notes'] || '',
          isActive: row['Status'] ? row['Status'].toLowerCase() === 'active' : true,
        };

        // Validate frequency
        const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly', 'one-time'];
        if (!validFrequencies.includes(expense.frequency)) {
          expense.frequency = 'monthly';
        }

        parsedExpenses.push(expense);
      } catch (error) {
        errors.push({
          row: index + 1,
          error: error.message,
        });
      }
    });

    res.json({
      success: true,
      message: `Parsed ${parsedExpenses.length} expenses successfully`,
      data: parsedExpenses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import-expenses/export
// @desc    Export all expenses to Excel
// @access  Public
router.get('/export', async (req, res, next) => {
  try {
    const expenses = await OperatingExpense.find();

    if (expenses.length === 0) {
      res.status(404);
      throw new Error('No expenses found to export');
    }

    // Prepare data for Excel
    const excelData = expenses.map(expense => ({
      'Name': expense.name,
      'Amount': expense.amount,
      'Frequency': expense.frequency,
      'Category': expense.category,
      'Allocation Type': expense.allocationType.replace(/-/g, ' '),
      'Notes': expense.notes || '',
      'Status': expense.isActive ? 'Active' : 'Inactive',
      'Created': expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=operating-expenses-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/import-expenses/save
// @desc    Save imported expenses to database
// @access  Public
router.post('/save', async (req, res, next) => {
  try {
    const { expenses } = req.body;

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      res.status(400);
      throw new Error('No expenses provided');
    }

    const savedExpenses = await OperatingExpense.insertMany(expenses);

    res.json({
      success: true,
      message: `Saved ${savedExpenses.length} expenses successfully`,
      data: savedExpenses,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/import-expenses/template
// @desc    Download expenses template
// @access  Public
router.get('/template', (req, res) => {
  const templateData = [
    {
      'Name': 'Monthly Rent',
      'Amount': 30000,
      'Frequency': 'monthly',
      'Category': 'Fixed Costs',
      'Allocation Type': 'by sales volume',
      'Notes': 'Shop rental payment',
    },
    {
      'Name': 'Espresso Machine Maintenance',
      'Amount': 5000,
      'Frequency': 'monthly',
      'Category': 'Coffee',
      'Allocation Type': 'by category',
      'Notes': 'Monthly servicing',
    },
    {
      'Name': 'General Utilities',
      'Amount': 8000,
      'Frequency': 'monthly',
      'Category': 'Utilities',
      'Allocation Type': 'by sales volume',
      'Notes': 'Electricity and water',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=expenses-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  res.send(buffer);
});

module.exports = router;


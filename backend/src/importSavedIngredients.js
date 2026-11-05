const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();

const Ingredient = require('./models/Ingredient');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cafe-costing';

async function importIngredients() {
  try {
    const filePath = process.env.EXCEL_FILE || '/app/ingredients-export.xlsx';
    console.log('Reading:', filePath);
    const wb = xlsx.readFile(filePath);
    const sheetData = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    console.log(`Found ${sheetData.length} ingredients in Excel file.`);

    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    let inserted = 0;
    let updated = 0;

    for (const row of sheetData) {
      const name = row['Name'] || row['name'];
      if (!name) continue;

      const category = row['Category'] || row['category'] || 'General';
      const unit = row['Unit'] || row['unit'] || 'pc';
      const costPerUnit = parseFloat(row['Cost Per Unit'] || row['costPerUnit'] || 0);
      const supplier = row['Supplier'] || row['supplier'] || '';
      const notes = row['Notes'] || row['notes'] || '';
      const isActive = (row['Status'] || row['status']) !== 'Inactive';

      const res = await Ingredient.updateOne(
        { name: name.trim() },
        {
          $set: {
            category: category.trim(),
            unit: unit.trim(),
            costPerUnit,
            supplier: supplier.trim(),
            notes: notes ? String(notes).trim() : '',
            isActive
          }
        },
        { upsert: true }
      );

      if (res.upsertedCount > 0) inserted++;
      else updated++;
    }

    console.log(`✅ Import finished! Inserted: ${inserted}, Updated: ${updated}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importIngredients();

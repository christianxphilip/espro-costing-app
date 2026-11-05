# 📚 Ingredients Library Guide

## What is the Ingredients Library?

The Ingredients Library is a master catalog of all ingredients you use in your café. Instead of manually typing ingredient details every time you create a menu item, you can:

1. **Create ingredients once** in the library
2. **Reuse them** across multiple items
3. **Update costs** in one place

---

## How to Use It

### Step 1: Add Ingredients to Your Library

1. Go to **Ingredients** page
2. Click **+ Add Ingredient**
3. Fill in details:
   - **Name**: e.g., "Espresso", "Whole Milk", "Sugar"
   - **Category**: e.g., "Coffee", "Dairy", "Sweetener"
   - **Unit**: e.g., "shots", "ml", "grams"
   - **Cost per Unit**: e.g., ₱10.00
   - **Supplier** (optional): Where you buy it from
   - **Notes** (optional): Any additional info

4. Click **Add Ingredient**

### Step 2: Use Ingredients When Creating Items

1. Go to **Items** page
2. Click **+ Add Item**
3. In the Ingredients section, click **📚 From Library**
4. Select ingredients from your library
5. Adjust quantities as needed
6. Save your item!

### Step 3: Updating Costs

When supplier prices change:
1. Go to **Ingredients** page
2. Find the ingredient
3. Click **Edit**
4. Update the **Cost per Unit**
5. Your items will use the new cost when you create or edit them

---

## Example Workflow

### Adding Coffee Ingredients

```
Ingredient: Espresso
Category: Coffee
Unit: shots
Cost per Unit: ₱10.00
Supplier: Local Coffee Roasters
```

```
Ingredient: Whole Milk
Category: Dairy
Unit: ml
Cost per Unit: ₱0.05
Supplier: Fresh Dairy Co.
```

```
Ingredient: Cup (12oz)
Category: Packaging
Unit: pieces
Cost per Unit: ₱5.00
Supplier: Packaging Supplies
```

### Creating a Cappuccino

1. Create item "Cappuccino"
2. Click **📚 From Library**
3. Select "Espresso" (set qty to 2 shots)
4. Select "Whole Milk" (set qty to 150 ml)
5. Select "Cup (12oz)" (set qty to 1 piece)
6. Set profit margin: 40%
7. Save!

The system automatically calculates:
- Ingredient Cost: (2 × ₱10) + (150 × ₱0.05) + (1 × ₱5) = ₱32.50
- Plus operating expenses
- Suggested price with 40% margin

---

## Tips & Best Practices

### 1. Consistent Naming
Use clear, consistent names:
- ✅ "Whole Milk", "Skim Milk", "Almond Milk"
- ❌ "milk 1", "milk2", "MILK"

### 2. Organize by Category
Group similar ingredients:
- Coffee (Espresso, Americano, Cold Brew)
- Dairy (Whole Milk, Skim Milk, Cream)
- Sweeteners (Sugar, Honey, Syrup)
- Packaging (Cups, Lids, Sleeves)

### 3. Use Standard Units
Stick to units you actually measure:
- Liquids: ml or liters
- Solids: grams or kg
- Coffee: shots or grams
- Packaging: pieces (pc)

### 4. Keep Costs Updated
Update costs regularly when:
- Supplier prices change
- You switch suppliers
- Buying in bulk (recalculate per-unit cost)

### 5. Mark Inactive Items
Instead of deleting, mark ingredients as **Inactive** when:
- Seasonal items (not currently available)
- Testing new suppliers
- Temporarily out of stock

---

## Custom vs Library Ingredients

### When to Use Library
✅ Common ingredients used in multiple items
✅ Ingredients with changing costs
✅ Ingredients you buy regularly

### When to Add Custom
✅ One-time special ingredients
✅ Testing new recipes
✅ Seasonal/limited items

You can always add custom ingredients directly when creating an item!

---

## Import/Export Ingredients

### Bulk Import
1. Prepare Excel with columns:
   - Name, Category, Unit, Cost per Unit, Supplier, Notes
2. Go to **Import/Export** page
3. Upload your file
4. Review and save

### Export for Review
1. Click **Export** button
2. Review your ingredient list in Excel
3. Update costs offline
4. Re-import updated file

---

## Frequently Asked Questions

**Q: Can I edit an ingredient after adding it to items?**  
A: Yes! Edit the ingredient in the library. New items will use the updated cost. Existing items keep their current cost until you edit them.

**Q: What happens if I delete an ingredient used in items?**  
A: Existing items won't be affected - they store ingredient data independently. But you won't be able to add it from the library anymore.

**Q: Can I have the same ingredient name in different categories?**  
A: Yes! You can have "Sugar" in "Granulated" category and "Sugar" in "Liquid" category.

**Q: How do I handle price changes?**  
A: Update the ingredient cost in the library, then optionally edit existing items to recalculate with new prices.

---

## Integration with Other Features

### With Items
- Select ingredients when creating menu items
- Quantities are adjustable per item
- Each item maintains its ingredient list

### With Operating Expenses
- Ingredient costs + Operating expenses = COGS
- Both affect final pricing suggestions

### With Import/Export
- Import bulk ingredients from Excel
- Export ingredient catalog for review
- Keep supplier lists updated

---

## Start Building Your Library!

Begin with your most common ingredients:
1. Coffee/espresso
2. Milk varieties
3. Syrups and sweeteners
4. Packaging (cups, lids)
5. Pastry ingredients (if applicable)

Then expand as needed!

Happy ingredient management! ☕


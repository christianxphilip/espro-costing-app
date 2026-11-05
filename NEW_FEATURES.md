# 🎉 New Features - Sales-Based Allocation & Import/Export

## 🚀 Major Improvements

### 1. **Smart Sales-Volume-Based Expense Allocation** ✨

**Problem Solved:** Operating expenses are now allocated based on actual/expected sales volume, not just item count!

#### How It Works

Instead of dividing expenses by total items (including inactive ones), the system now uses **Expected Daily Sales** to allocate expenses proportionally.

**Example:**
```
Monthly Rent: ₱30,000 (₱1,000/day)
Allocation Type: By Sales Volume

Items:
- Cappuccino: 50 expected daily sales
- Latte: 30 expected daily sales  
- Cake: 5 expected daily sales
Total: 85 daily sales

Allocation:
- Cappuccino: ₱1,000 × (50/85) = ₱588.24 per day
- Latte: ₱1,000 × (30/85) = ₱352.94 per day
- Cake: ₱1,000 × (5/85) = ₱58.82 per day
```

**Much more realistic!** Your best-selling items bear more of the overhead cost.

---

### 2. **Three Allocation Types**

#### a) By Sales Volume (NEW - Recommended!) 🌟
- **Formula:** Expense × (Item's Daily Sales / Total Daily Sales)
- **Best for:** All general overhead (rent, utilities, staff)
- **Benefit:** Fair allocation based on actual business volume

#### b) Per-Item (Equal Split)
- **Formula:** Expense ÷ Number of Active Items
- **Best for:** Basic overhead when sales data isn't available
- **Note:** Now only counts ACTIVE items

#### c) By-Category
- **Formula:** Expense ÷ Number of Items in Category
- **Best for:** Category-specific costs (e.g., coffee machine for coffee items)
- **Benefit:** Targeted allocation

---

### 3. **Active/Inactive Item Management**

#### New Fields in Items:
- **`isActive`**: Mark items as active (selling) or inactive (not selling)
- **`expectedDailySales`**: How many you expect to sell per day

#### Benefits:
- ✅ Only active items get expense allocation
- ✅ Inactive items (testing, seasonal) don't distort calculations
- ✅ Better cost accuracy for items you actually sell

#### Example:
```
You have 1000 items in database:
- 5 are active and selling daily
- 995 are inactive (testing, discontinued, seasonal)

OLD WAY: Rent ÷ 1000 = ₱1 per item (wrong!)
NEW WAY: Rent ÷ 5 active items = ₱200 per item (correct!)
```

---

### 4. **Import/Export for Everything** 📊

Now you can bulk import/export:
- ✅ **Items** (with expected daily sales)
- ✅ **Operating Expenses** (NEW!)
- ✅ **Ingredients** (NEW!)

#### Import/Export Page with Tabs:
- 📦 Items Tab
- 💰 Expenses Tab
- 📚 Ingredients Tab

Each tab has:
- Download Template button
- Export Data button
- Upload & Parse functionality

---

## 📝 How to Use

### Step 1: Set Up Your Items

When creating/editing an item:

1. **Fill in basic info**: Name, Category, Ingredients
2. **Expected Daily Sales**: Enter realistic daily sales estimate
   - Example: Cappuccino = 50 per day
   - Example: Seasonal drink = 3 per day
3. **Mark as Active**: Check the "Active" box if currently selling
4. **Save!**

### Step 2: Add Operating Expenses

1. Go to **Expenses** page
2. Click **+ Add Expense**
3. Fill in details:
   - **Name**: e.g., "Monthly Rent"
   - **Amount**: ₱30,000
   - **Frequency**: Monthly
   - **Category**: Fixed Costs
   - **Allocation Type**: **By Sales Volume** (recommended!)
4. Save - expenses automatically allocate!

### Step 3: Review Allocations

The system automatically:
- ✅ Calculates total daily sales volume
- ✅ Allocates expenses proportionally
- ✅ Updates all item costs
- ✅ Recalculates suggested prices

---

## 💡 Real-World Example

### Your Café:
```
Operating Expenses:
├── Rent: ₱30,000/month (₱1,000/day) - By Sales Volume
├── Utilities: ₱9,000/month (₱300/day) - By Sales Volume
├── Coffee Machine: ₱6,000/month (₱200/day) - By Category (Coffee)
└── Staff: ₱45,000/month (₱1,500/day) - By Sales Volume

Active Items:
├── Cappuccino (Coffee): 50 daily sales
├── Latte (Coffee): 30 daily sales
├── Americano (Coffee): 20 daily sales
├── Chocolate Cake (Pastry): 5 daily sales
└── Croissant (Pastry): 10 daily sales

Total Daily Sales: 115
```

### Cappuccino Allocation:
```
1. Sales Volume Expenses (Rent + Utilities + Staff):
   Total: ₱1,000 + ₱300 + ₱1,500 = ₱2,800/day
   Cappuccino share: ₱2,800 × (50/115) = ₱1,217.39

2. Category Expense (Coffee Machine):
   Total coffee sales: 50 + 30 + 20 = 100
   Cappuccino share: ₱200 × (50/100) = ₱100

3. Total Operating Expense: ₱1,217.39 + ₱100 = ₱1,317.39

4. Per cup: ₱1,317.39 ÷ 50 = ₱26.35 per cappuccino
```

**Much more accurate than dividing by item count!**

---

## 📁 Import/Export Features

### Import Expenses
**Template columns:**
- Name, Amount, Frequency, Category, Allocation Type, Notes

**Example:**
| Name | Amount | Frequency | Category | Allocation Type | Notes |
|------|---------|-----------|----------|----------------|-------|
| Monthly Rent | 30000 | monthly | Fixed Costs | by sales volume | Shop rental |
| Coffee Machine | 6000 | monthly | Coffee | by category | Monthly lease |

### Import Ingredients
**Template columns:**
- Name, Category, Unit, Cost Per Unit, Supplier, Notes

**Example:**
| Name | Category | Unit | Cost Per Unit | Supplier | Notes |
|------|----------|------|---------------|----------|-------|
| Espresso Beans | Coffee | grams | 0.50 | Local Roasters | Premium blend |
| Whole Milk | Dairy | ml | 0.05 | Fresh Dairy | 3.5% fat |

### Import Items
**Now includes:**
- Expected Daily Sales column
- Active/Inactive status

---

## 🎯 Benefits Summary

### For Accuracy:
- ✅ Realistic cost allocation based on sales volume
- ✅ Only active items counted
- ✅ Better pricing decisions

### For Efficiency:
- ✅ Bulk import expenses
- ✅ Bulk import ingredients
- ✅ Bulk import items with sales estimates
- ✅ Export everything for review

### For Management:
- ✅ Track expected vs actual sales
- ✅ Identify high-volume vs low-volume items
- ✅ Make data-driven decisions
- ✅ Accurate per-item costs

---

## 🔄 Migration Guide

If you have existing data:

1. **Update Items:**
   - Edit each item
   - Set "Expected Daily Sales" (start with 1 if unsure)
   - Mark as "Active" if currently selling

2. **Update Expenses:**
   - Edit each expense
   - Change allocation type to "By Sales Volume"
   - System automatically recalculates

3. **Review Results:**
   - Check dashboard for new insights
   - Verify item costs make sense
   - Adjust sales estimates as needed

---

## 📚 API Changes

### New Endpoints:
```
POST   /api/import-expenses/upload
GET    /api/import-expenses/export
GET    /api/import-expenses/template

POST   /api/import-ingredients/upload
GET    /api/import-ingredients/export
GET    /api/import-ingredients/template
```

### Updated Models:
```javascript
// Item Model
{
  ...existing fields,
  expectedDailySales: Number (default: 1),
  isActive: Boolean (default: true)
}

// OperatingExpense Model
{
  ...existing fields,
  allocationType: 'by-sales-volume' | 'per-item' | 'by-category'
  // default changed to 'by-sales-volume'
}
```

---

## 🚀 Ready to Use!

Restart your application:
```bash
docker-compose down
./start.sh
```

Then:
1. Update your items with expected daily sales
2. Mark items as active/inactive
3. Set expenses to use "By Sales Volume" allocation
4. Start getting accurate costs!

**Your café costing is now production-ready with real-world accuracy!** ☕

---

## 📞 Questions?

See:
- **README.md** - Full documentation
- **INGREDIENTS_GUIDE.md** - Ingredients usage
- **CHANGELOG.md** - All recent changes


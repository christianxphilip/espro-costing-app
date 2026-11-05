# Bulk Price Lock & Price Tracking Guide

## ✅ Fixed Issues

### 1. API Route Order
**Problem**: `/bulk-lock-price` was being caught by `/:id` route  
**Solution**: Moved bulk-lock-price route BEFORE all `:id` param routes

**Route Order Now**:
```javascript
1. POST /api/items/bulk-lock-price  ✓ (specific route first)
2. POST /api/items                  ✓
3. PUT  /api/items/:id              ✓
4. POST /api/items/:id/lock-price   ✓ (param routes after)
5. DELETE /api/items/:id            ✓
```

### 2. Enhanced Price Display
**Problem**: Couldn't easily see price changes after expenses update  
**Solution**: Enhanced locked price display with detailed comparison

---

## 📊 New Price Display Features

### When Price is Locked

```
🔒 ₱65.00                    ← Your current shop price (blue)
New: ₱78.00 ↑                ← Updated price after cost change (orange = increase)
+₱13.00 (20.0%)              ← Difference and percentage (gray)
```

### Visual Indicators

| Scenario | Display | Meaning |
|----------|---------|---------|
| **Cost Increased** | 🔒 ₱65.00<br/>New: ₱78.00 ↑ (orange)<br/>+₱13.00 (20.0%) | Ingredients or expenses went up |
| **Cost Decreased** | 🔒 ₱120.00<br/>New: ₱110.00 ↓ (green)<br/>-₱10.00 (-8.3%) | Costs went down, potential to increase margin |
| **No Change** | 🔒 ₱65.00<br/>(no "New:" line) | Current price still accurate |

---

## 🎯 Complete Workflow Example

### Scenario: Ingredient Cost Increase

#### Step 1: Lock Current Prices
```
1. Go to Items page
2. Filter by Category: "Coffee"
3. Click "Select All" checkbox
4. Click "🔒 Lock Selected"
Result: All coffee items locked at current prices
```

#### Step 2: Update Costs
```
1. Go to Ingredients page
2. Update "Espresso Beans" from ₱2/g to ₱2.40/g (20% increase)
3. Save
Result: System auto-recalculates all item costs
```

#### Step 3: Review Impact
```
Go back to Items page, see:

Cappuccino
🔒 ₱65.00              ← Still selling at this price
New: ₱73.80 ↑          ← Should be this price now
+₱8.80 (13.5%)         ← ₱8.80 less profit per cup!

Latte
🔒 ₱70.00
New: ₱79.20 ↑
+₱9.20 (13.1%)

Americano
🔒 ₱55.00
New: ₱61.60 ↑
+₱6.60 (12.0%)
```

#### Step 4: Make Decisions
**Option A**: Increase prices immediately
```
1. Select items that need price update
2. Click "🔓 Unlock Selected"
3. New prices apply automatically
```

**Option B**: Gradual price increase
```
1. Keep prices locked for now
2. Absorb cost increase temporarily
3. Unlock gradually over 2 weeks
```

**Option C**: Optimize margins
```
1. Keep high-volume items locked (Americano)
2. Unlock premium items (Latte, Cappuccino)
3. Maintain competitive advantage on popular items
```

---

## 💡 Use Cases

### 1. Supplier Price Change Notification
```
Scenario: Milk supplier announces 15% increase next month

Action Plan:
1. Lock ALL current prices today
2. Wait for price change
3. Review impact across all items
4. Decide which prices to update
```

### 2. Seasonal Cost Fluctuations
```
Scenario: Strawberries are in season (cheap now, expensive later)

Current (May - Strawberry Season):
🔒 ₱85.00 (locked promotional price)
New: ₱75.00 ↓ (costs are low)
-₱10.00 (-11.8%) (great margins!)

Later (December - Off Season):
🔒 ₱85.00 (still locked at promo price)
New: ₱120.00 ↑ (costs increased)
+₱35.00 (41.2%) (losing money!)

Action: Unlock and update to ₱120 or discontinue temporarily
```

### 3. Competitive Pricing Strategy
```
Lock prices to match competitor, track if sustainable:

Your Iced Latte:
🔒 ₱75.00 (locked to match Starbucks)
New: ₱82.50 ↑
+₱7.50 (10.0%) (losing ₱7.50 per cup to stay competitive)

Decision: Worth it if volume increases by >10%
```

### 4. Operating Expense Changes
```
Scenario: Rent increases from ₱30k to ₱35k/month

After Expense Update:
- All items show orange arrows ↑
- Operating expense per item: ₱28 → ₱35
- Review which items can absorb cost
- Unlock and adjust prices accordingly
```

---

## 🎨 Color Legend

| Color | Meaning | When You See It |
|-------|---------|-----------------|
| 🔵 **Blue** | Locked price | Your current shop price |
| 🟠 **Orange ↑** | Price increase needed | Costs went up |
| 🟢 **Green ↓** | Price decrease possible | Costs went down (or increase margin!) |
| ⚫ **Gray** | Difference details | Amount and percentage change |

---

## 🚀 Quick Actions

### Lock All Items Before Cost Change
```
1. Items page → Click header checkbox
2. "🔒 Lock Selected"
3. All current prices preserved
```

### Review Items Needing Updates
```
1. Sort by "Price" column
2. Look for orange ↑ indicators
3. Select items with big increases
4. Decide on price strategy
```

### Unlock Items with Cost Decreases
```
1. Look for green ↓ indicators
2. Option A: Lower prices (competitive advantage)
3. Option B: Keep price, increase margins
```

---

## 📈 Analytics You Can Now Track

### Cost Impact Analysis
```
After locking and expense update, you can see:
- Total potential revenue loss if prices stay locked
- Which categories are most affected
- Items with biggest cost increases
- Margin compression across menu
```

### Example Report (Manual):
```
Category: Coffee Drinks
Items Locked: 8
Average Price Increase Needed: +15.2%
Total Margin Impact: -₱1,240/day (if prices stay locked)

Action: Need to unlock and update or absorb ₱37,200/month loss
```

---

## 🎯 Best Practices

### 1. Lock Before Major Changes
- Before supplier negotiations
- Before seasonal transitions
- Before rent/utility increases
- Before ingredient price updates

### 2. Review Regularly
- Check locked items weekly
- Look for orange ↑ indicators
- Prioritize high-volume items
- Consider margin targets

### 3. Strategic Unlocking
- Unlock loss leaders last (keep competitive)
- Unlock premium items first (elastic demand)
- Unlock gradually (avoid sticker shock)

### 4. Use Bulk Operations
- Lock entire categories at once
- Unlock similar items together
- Filter + Select All = powerful combo

---

## 🔧 Technical Notes

### API Endpoint
```javascript
POST /api/items/bulk-lock-price

Body: {
  itemIds: ["id1", "id2", "id3"],
  lock: true  // or false to unlock
}

Response: {
  success: true,
  message: "5 item(s) locked successfully",
  data: [... updated items with new calculations ...]
}
```

### Price Calculation
When locked:
- `lockedPrice`: Your shop price (doesn't change)
- `suggestedPrice`: Calculated from current COGS + margin
- Display shows both + difference

### Auto-Recalculation
Prices recalculate automatically when:
- Operating expenses change
- Item ingredients change
- Ingredient costs change
- Settings (expected daily sales) change

---

## 📝 Summary

**Fixed**:
1. ✅ API route order issue (bulk-lock-price now works)
2. ✅ Enhanced price display with detailed tracking

**New Capabilities**:
1. ✅ See exact impact of cost changes
2. ✅ Track price differences in real-time
3. ✅ Make informed pricing decisions
4. ✅ Bulk lock/unlock for efficiency

**Key Benefits**:
- 💰 Prevent unexpected margin erosion
- 📊 Track cost impact visually
- ⚡ Fast bulk operations
- 🎯 Strategic price management

---

**Espro Costing App** - Professional Price Management ☕


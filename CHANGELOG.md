# Changelog

## Latest Updates - November 4, 2025

### ✅ Port Changed to 6000
- **Backend API**: Now runs on port 6000 (was 5000)
- **Reason**: Per user request
- **Impact**: All documentation and scripts updated
- **Access**: http://localhost:6000/api

### ✅ New Feature: Ingredients Library Module

A complete ingredients management system has been added!

#### Backend
- **New Model**: `Ingredient.js`
  - Fields: name, category, unit, costPerUnit, supplier, notes, isActive
  - Indexed for fast searches
  
- **New Routes**: `/api/ingredients`
  - GET all ingredients (with filters)
  - GET single ingredient
  - POST create ingredient
  - PUT update ingredient
  - DELETE ingredient
  - POST bulk create
  - GET categories list

#### Frontend
- **New Page**: Ingredients Library (`/ingredients`)
  - Full CRUD interface
  - Search and filter by category
  - Active/inactive status toggle
  - Bulk operations support
  
- **New Component**: `IngredientForm.jsx`
  - Add/edit ingredients
  - Category and supplier fields
  - Notes for additional info

- **Enhanced Component**: `ItemForm.jsx`
  - **"From Library" button**: Select ingredients from your master list
  - Auto-fills name, unit, and cost per unit
  - Still supports custom ingredients
  - Visual library selector with categories

#### Navigation
- New menu item: **Ingredients** (between Items and Expenses)

#### Benefits
✅ Create ingredients once, reuse everywhere
✅ Update costs in one place
✅ Consistency across all items
✅ Faster item creation
✅ Better cost tracking

---

## How to Use

### Option 1: Quick Start
```bash
./start.sh
```

### Option 2: Docker Compose
```bash
docker-compose down
docker-compose up --build
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:6000/api
- Database UI: http://localhost:8081

---

## Recommended Workflow

1. **Set up Operating Expenses** (Rent, Utilities, Labor)
2. **Add Ingredients to Library** (Coffee, Milk, Syrups, etc.)
3. **Create Menu Items** using ingredients from library
4. **Get AI Pricing Suggestions**
5. **Export your pricing data**

---

## Documentation

- **INGREDIENTS_GUIDE.md** - Complete guide to using the ingredients library
- **README.md** - Updated with new features and port info
- **QUICKSTART.md** - Fast start guide
- **HOW_TO_RUN.md** - Detailed running instructions

---

## Technical Details

### API Endpoints Added
```
GET    /api/ingredients              - List all ingredients
GET    /api/ingredients/categories   - Get unique categories
GET    /api/ingredients/:id          - Get single ingredient
POST   /api/ingredients              - Create ingredient
POST   /api/ingredients/bulk         - Bulk create
PUT    /api/ingredients/:id          - Update ingredient
DELETE /api/ingredients/:id          - Delete ingredient
```

### Database Schema
```javascript
{
  name: String (required),
  category: String (required),
  unit: String (required),
  costPerUnit: Number (required),
  supplier: String (optional),
  notes: String (optional),
  isActive: Boolean (default: true),
  timestamps: true
}
```

---

## Files Modified

### Configuration
- `docker-compose.yml` - Updated backend port to 6000
- `start.sh` - Updated .env generation with port 6000
- `backend/.env.example` - Port updated

### Backend
- `backend/src/server.js` - Added ingredients route
- `backend/src/models/Ingredient.js` - New model
- `backend/src/routes/ingredients.js` - New routes

### Frontend
- `frontend/src/App.jsx` - Added Ingredients route and nav link
- `frontend/src/services/api.js` - Added ingredientsAPI
- `frontend/src/components/IngredientForm.jsx` - New component
- `frontend/src/components/ItemForm.jsx` - Enhanced with library selector
- `frontend/src/pages/IngredientsPage.jsx` - New page

### Documentation
- `README.md` - Updated features, port, and API docs
- `QUICKSTART.md` - Updated access URLs
- `HOW_TO_RUN.md` - Updated ports
- `START_HERE.md` - Updated ports
- `ONE_COMMAND.txt` - Updated ports
- `INGREDIENTS_GUIDE.md` - **NEW** Complete guide

---

## Breaking Changes

⚠️ **Port Change**: Backend now runs on 6000 instead of 5000
- Update any external integrations
- Bookmarks may need updating
- Frontend automatically uses correct port

---

## Next Steps

Your app is ready to use! Simply run:
```bash
./start.sh
```

Then visit http://localhost:3000 and start adding ingredients!

Happy café management! ☕


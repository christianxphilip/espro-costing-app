# 🚀 Quick Start Guide

## ⚡ One-Command Start (Recommended)

### Just run this:

```bash
./start.sh
```

**That's literally it!** 🎉

The script automatically:
- Creates environment files
- Builds all containers
- Starts the application

### Access the App
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:5000/api
- 💾 **Mongo Express**: http://localhost:8081 (admin/admin123)

### Stop the App
Press `Ctrl+C` then run:
```bash
docker-compose down
```

---

## Option 2: Manual Setup

### Prerequisites
- Node.js 18+ installed
- MongoDB running locally (or MongoDB Atlas account)

### Step 1: Backend Setup
```bash
cd backend
npm install

# Create .env file with your MongoDB connection
echo "MONGODB_URI=mongodb://localhost:27017/cafe-costing
PORT=5000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development" > .env

npm run dev
```

Backend runs on http://localhost:5000

### Step 2: Frontend Setup (New Terminal)
```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

npm run dev
```

Frontend runs on http://localhost:3000

---

## First Steps in the App

1. **Dashboard**: See overview and statistics
2. **Expenses**: Add operating expenses (Rent, Utilities, Labor, etc.)
   - These will automatically allocate to your items
3. **Items**: Add your café menu items with ingredients
4. **Import/Export**: 
   - Download the template
   - Fill it with your items
   - Import to bulk add items

---

## Example: Adding Your First Item

### Via UI:
1. Go to **Items** page
2. Click **+ Add Item**
3. Fill in:
   - Item Name: "Cappuccino"
   - Category: "Coffee"
   - Profit Margin: 40%
4. Add ingredients:
   - Espresso: 2 shots @ ₱10
   - Milk: 150 ml @ ₱0.05
   - Cup: 1 pc @ ₱5
5. Click **Create Item**
6. Click **🤖** to get AI pricing suggestion

### Via Excel Import:
1. Go to **Import/Export** page
2. Click **Download Template**
3. Fill in your items
4. Upload the file
5. Review and click **Save All to Database**

---

## 💡 Tips

- **Operating Expenses**: Add these first so item costs are automatically calculated
- **AI Suggestions**: Optional - works without API key using formula-based pricing
- **Categories**: Use consistent category names for better organization
- **Profit Margin**: Typical café margins: Coffee (40-60%), Food (30-50%), Pastries (50-70%)

---

## 🆘 Need Help?

See the main [README.md](./README.md) for detailed documentation and troubleshooting.

Happy pricing! ☕


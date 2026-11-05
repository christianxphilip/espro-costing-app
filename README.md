# Café Costing & Pricing Web App

A full-stack web application for managing café items, computing ingredient costs, COGS (Cost of Goods Sold), and generating AI-powered pricing suggestions. Built with Node.js, React, MongoDB, and Docker.

## ⚡ Quick Start

**Run with a single command:**

```bash
./start.sh
```

Then open http://localhost:3000 in your browser! 🎉

> Requires Docker Desktop. The script automatically handles everything.

## 🚀 Features

- **Item Management**: Add, edit, delete, and view café menu items with detailed ingredient tracking
- **Ingredients Library**: Master catalog of reusable ingredients that can be selected when creating items
- **Cost Calculations**: Automatic computation of ingredient costs, COGS, and suggested selling prices
- **Operating Expenses Module**: Manage operational expenses with automatic allocation to items
- **Macro Financial Planner**: Track break-even points, compute customer targets, and forecast monthly profitability based on overheads and targets
- **AI Pricing Suggestions**: Get intelligent pricing recommendations using free AI (Hugging Face)
- **Excel/CSV Import/Export**: Bulk import existing data and export for reporting
- **Dashboard**: Overview with insights, statistics, and pricing recommendations
- **Responsive UI**: Clean, modern design with orange café theme

## 📋 Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Multer** for file uploads
- **XLSX** for Excel processing
- **Hugging Face API** for AI suggestions (free tier)

### Frontend
- **React** 18 with Vite
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Axios** for API calls

### DevOps
- **Docker** & Docker Compose for containerization
- **MongoDB** official Docker image
- **Mongo Express** for database management (optional)

## 🏗️ Project Structure

```
espro-costing-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── models/
│   │   │   ├── Item.js            # Item schema with ingredients
│   │   │   └── OperatingExpense.js # Operating expense schema
│   │   ├── routes/
│   │   │   ├── items.js           # Item CRUD endpoints
│   │   │   ├── import.js          # Import/export endpoints
│   │   │   ├── ai.js              # AI suggestion endpoints
│   │   │   └── operatingExpenses.js # Expense management
│   │   ├── services/
│   │   │   ├── aiService.js       # AI integration
│   │   │   └── costingService.js  # Cost calculations
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Error handling
│   │   └── server.js              # Express app entry
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ItemTable.jsx
│   │   │   ├── ItemForm.jsx
│   │   │   ├── ImportUploader.jsx
│   │   │   ├── AISuggestions.jsx
│   │   │   ├── CostSummary.jsx
│   │   │   └── ExpenseForm.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ItemsPage.jsx
│   │   │   ├── ExpensesPage.jsx
│   │   │   └── ImportPage.jsx
│   │   ├── services/
│   │   │   └── api.js             # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── docker-compose.yml
└── README.md
```

## 🚀 One-Command Quick Start

### Prerequisites
- Docker Desktop installed and running

### Start the Application

**Just run this single command:**

```bash
./start.sh
```

That's it! The script will:
- ✅ Create environment files automatically
- ✅ Build all Docker containers
- ✅ Start MongoDB, Backend, and Frontend
- ✅ Show you where to access the app

**Access the application:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:6000/api
- 💾 Mongo Express: http://localhost:8081 (admin/admin123)

**Stop the application:**
Press `Ctrl+C` in the terminal, then:
```bash
docker-compose down
```

### Alternative: Manual Docker Command

If you prefer to run docker-compose directly:
```bash
# Create .env files first (one-time only)
cat > backend/.env << EOF
MONGODB_URI=mongodb://mongodb:27017/cafe-costing
PORT=6000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development
EOF

cat > frontend/.env << EOF
VITE_API_URL=http://localhost:6000/api
EOF

# Start everything
docker-compose up --build
```

## 💻 Manual Setup (Without Docker)

### Backend Setup

1. **Install MongoDB locally** or use MongoDB Atlas

2. **Install dependencies**
```bash
cd backend
npm install
```

3. **Create .env file**
```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/cafe-costing
PORT=5000
HF_API_KEY=your_huggingface_api_key_optional
NODE_ENV=development
```

4. **Start the backend**
```bash
npm start
# or for development with auto-reload
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

1. **Install dependencies**
```bash
cd frontend
npm install
```

2. **Create .env file**
```bash
touch .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

3. **Start the frontend**
```bash
npm run dev
```

Frontend will run on http://localhost:3000

## 📊 Excel Import Format

Use the provided template or follow this format:

| Item Name | Category | Operating Expense | Profit Margin | Ingredient 1 Name | Ingredient 1 Qty | Ingredient 1 Unit | Ingredient 1 Cost | Ingredient 2 Name | ... |
|-----------|----------|-------------------|---------------|-------------------|------------------|-------------------|-------------------|-------------------|-----|
| Cappuccino | Coffee | 15 | 40 | Espresso | 2 | shots | 10 | Milk | 150 | ml | 0.05 | Cup | 1 | pc | 5 |
| Chocolate Cake | Pastry | 20 | 50 | Cake Base | 1 | slice | 25 | Frosting | 30 | g | 0.8 |

**Download Template**: Click "Download Template" in the Import/Export page

## 🔌 API Endpoints

### Items
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/items/stats/summary` - Get statistics

### Ingredients
- `GET /api/ingredients` - Get all ingredients
- `GET /api/ingredients/:id` - Get single ingredient
- `POST /api/ingredients` - Create ingredient
- `PUT /api/ingredients/:id` - Update ingredient
- `DELETE /api/ingredients/:id` - Delete ingredient
- `POST /api/ingredients/bulk` - Bulk create ingredients
- `GET /api/ingredients/categories` - Get unique categories

### Operating Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/financial-planner` - Calculate macro financial milestones based on active overheads
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `POST /api/expenses/recalculate` - Recalculate all item costs
- `GET /api/expenses/stats/summary` - Get expense statistics

### Import/Export
- `POST /api/import/upload` - Upload Excel/CSV file
- `POST /api/import/save` - Save parsed items to database
- `GET /api/import/export` - Export items to Excel
- `GET /api/import/template` - Download Excel template

### AI Suggestions
- `POST /api/ai/suggest/:id` - Get AI pricing suggestion for item
- `GET /api/ai/insights` - Get pricing insights for all items

## 🤖 AI Integration

The app uses **Hugging Face Inference API** (free tier) for AI-powered pricing suggestions:

1. Sign up at https://huggingface.co/
2. Get your API key from https://huggingface.co/settings/tokens
3. Add to `backend/.env`: `HF_API_KEY=your_key_here`

**Note**: AI will work without an API key using formula-based fallback pricing.

## 📈 Cost Calculation Formulas

```
Ingredient Cost = Σ(quantity × cost per unit)
COGS = Ingredient Cost + Operating Expense
Suggested Price = COGS × (1 + Profit Margin %)
```

## 🎨 Operating Expense Allocation

Three allocation methods:
1. **Per Item**: Expense divided equally among all items
2. **By Category**: Expense divided among items in matching category
3. **By Percentage**: Custom percentage allocation (future feature)

Expenses support different frequencies:
- Daily
- Weekly
- Monthly
- Yearly
- One-time

## 🛠️ Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Build for Production

Frontend:
```bash
cd frontend
npm run build
```

## 🐳 Docker Commands

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v

# Rebuild specific service
docker-compose up --build backend
```

## 🔧 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in `.env`
- For Docker: Make sure MongoDB container is up

### Port Already in Use
- Backend (5000): Change `PORT` in backend `.env`
- Frontend (3000): Change port in `vite.config.js`
- MongoDB (27017): Change port in `docker-compose.yml`

### AI Suggestions Not Working
- Check if `HF_API_KEY` is set (optional)
- App will use formula-based pricing as fallback
- Check Hugging Face API status

### File Upload Issues
- Ensure `uploads/` directory exists in backend
- Check file format (xlsx, xls, csv only)
- Verify column names match template

## 📝 License

ISC

## 👨‍💻 Author

Built for ESPRO - Café Business Management

## 🙏 Acknowledgments

- Hugging Face for free AI API
- MongoDB for database
- Tailwind CSS for styling
- React & Vite for frontend framework

---

For questions or issues, please open an issue in the repository.


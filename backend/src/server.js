require('dotenv').config();
const { timingSafeEqual } = require('node:crypto');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const itemRoutes = require('./routes/items');
const importRoutes = require('./routes/import');
const importExpensesRoutes = require('./routes/importExpenses');
const importIngredientsRoutes = require('./routes/importIngredients');
const aiRoutes = require('./routes/ai');
const expenseRoutes = require('./routes/operatingExpenses');
const ingredientRoutes = require('./routes/ingredients');
const settingsRoutes = require('./routes/settings');
const menuRoutes = require('./routes/menus');

const app = express();

const workerToken = process.env.WORKER_API_TOKEN;
if (process.env.RENDER === 'true' && !workerToken) {
  throw new Error('WORKER_API_TOKEN is required on Render');
}

app.get('/api/health', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'unavailable' });
  }
  res.json({ status: 'OK', message: 'Café Costing API is running' });
});

if (workerToken) {
  const expected = Buffer.from(workerToken);
  app.use('/api', (req, res, next) => {
    const supplied = Buffer.from(req.get('X-Worker-Token') || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/import', importRoutes);
app.use('/api/import-expenses', importExpensesRoutes);
app.use('/api/import-ingredients', importIngredientsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/menus', menuRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

module.exports = app;


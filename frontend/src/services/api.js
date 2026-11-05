import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Items API
export const itemsAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  archive: (id) => api.post(`/items/${id}/archive`),
  getStats: () => api.get('/items/stats/summary'),
  lockPrice: (id) => api.post(`/items/${id}/lock-price`),
  bulkLockPrice: (itemIds, lock) => api.post('/items/bulk-lock-price', { itemIds, lock }),
  bulkArchive: (itemIds, archive) => api.post('/items/bulk-archive', { itemIds, archive }),
};

// Import/Export API
export const importAPI = {
  upload: (formData) => api.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  save: (items) => api.post('/import/save', { items }),
  export: () => api.get('/import/export', { responseType: 'blob' }),
  getTemplate: () => api.get('/import/template', { responseType: 'blob' }),
  
  // Expenses
  uploadExpenses: (formData) => api.post('/import-expenses/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  saveExpenses: (expenses) => api.post('/import-expenses/save', { expenses }),
  exportExpenses: () => api.get('/import-expenses/export', { responseType: 'blob' }),
  getExpensesTemplate: () => api.get('/import-expenses/template', { responseType: 'blob' }),
  
  // Ingredients
  uploadIngredients: (formData) => api.post('/import-ingredients/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  saveIngredients: (ingredients) => api.post('/import-ingredients/save', { ingredients }),
  exportIngredients: () => api.get('/import-ingredients/export', { responseType: 'blob' }),
  getIngredientsTemplate: () => api.get('/import-ingredients/template', { responseType: 'blob' }),
};

// AI API
export const aiAPI = {
  suggest: (id) => api.post(`/ai/suggest/${id}`),
  getInsights: () => api.get('/ai/insights'),
  parseRecipe: (data) => api.post('/ai/parse-recipe', data),
};

// Operating Expenses API
export const expensesAPI = {
  getAll: () => api.get('/expenses'),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  recalculate: () => api.post('/expenses/recalculate'),
  getStats: () => api.get('/expenses/stats/summary'),
  calculatePerItem: () => api.get('/expenses/calculate-per-item'),
  getFinancialMilestones: (params) => api.get('/expenses/financial-planner', { params }),
};

// Ingredients API
export const ingredientsAPI = {
  getAll: (params) => api.get('/ingredients', { params }),
  getById: (id) => api.get(`/ingredients/${id}`),
  create: (data) => api.post('/ingredients', data),
  update: (id, data) => api.put(`/ingredients/${id}`, data),
  delete: (id) => api.delete(`/ingredients/${id}`),
  bulkCreate: (ingredients) => api.post('/ingredients/bulk', { ingredients }),
  getCategories: () => api.get('/ingredients/categories'),
};

// Settings API
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Menus API
export const menusAPI = {
  getAll: () => api.get('/menus'),
  getById: (id) => api.get(`/menus/${id}`),
  getAvailableItems: () => api.get('/menus/available-items'),
  create: (data) => api.post('/menus', data),
  update: (id, data) => api.put(`/menus/${id}`, data),
  delete: (id) => api.delete(`/menus/${id}`),
  generateRecipePDF: (id) => api.get(`/menus/${id}/recipe-pdf`, { responseType: 'blob' }),
};

export default api;


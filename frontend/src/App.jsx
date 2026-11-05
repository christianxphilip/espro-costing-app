import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import ImportPage from './pages/ImportPage';
import ExpensesPage from './pages/ExpensesPage';
import IngredientsPage from './pages/IngredientsPage';
import SettingsPage from './pages/SettingsPage';
import MenusPage from './pages/MenusPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/menus" element={<MenusPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">☕</div>
            <h1 className="text-xl font-bold text-gray-900">Espro Costing</h1>
          </div>
          
          <div className="flex space-x-1">
            <NavLink to="/" active={isActive('/')}>Dashboard</NavLink>
            <NavLink to="/items" active={isActive('/items')}>Items</NavLink>
            <NavLink to="/ingredients" active={isActive('/ingredients')}>Ingredients</NavLink>
            <NavLink to="/expenses" active={isActive('/expenses')}>Expenses</NavLink>
            <NavLink to="/menus" active={isActive('/menus')}>📋 Menus</NavLink>
            <NavLink to="/import" active={isActive('/import')}>Import/Export</NavLink>
            <NavLink to="/settings" active={isActive('/settings')}>⚙️ Settings</NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

export default App;


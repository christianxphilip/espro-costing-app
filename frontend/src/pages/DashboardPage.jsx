import React, { useState, useEffect } from 'react';
import Dashboard from '../components/Dashboard';
import FinancialPlanner from '../components/FinancialPlanner';
import { itemsAPI, aiAPI } from '../services/api';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, insightsRes] = await Promise.all([
        itemsAPI.getStats(),
        aiAPI.getInsights(),
      ]);
      
      setStats(statsRes.data.data);
      setInsights(insightsRes.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your café items and pricing</p>
      </div>
      
      <div className="space-y-8">
        <Dashboard stats={stats} insights={insights} />
        <FinancialPlanner />
      </div>
    </div>
  );
}

export default DashboardPage;


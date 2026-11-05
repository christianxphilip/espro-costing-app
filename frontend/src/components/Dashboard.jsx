import React from 'react';
import { motion } from 'framer-motion';
import { formatPeso } from '../utils/formatNumber';

function Dashboard({ stats, insights }) {
  const cards = [
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: '📦',
      color: 'bg-blue-500',
    },
    {
      title: 'Avg Target Food Cost',
      value: `${stats?.avgTargetFoodCost?.toFixed(1) || 0}%`,
      icon: '📊',
      color: 'bg-green-500',
    },
    {
      title: 'Total COGS',
      value: formatPeso(stats?.totalCost || 0),
      icon: '💰',
      color: 'bg-red-500',
    },
    {
      title: 'Total Revenue (Est.)',
      value: formatPeso(stats?.totalSuggestedPrice || 0),
      icon: '💵',
      color: 'bg-primary-500',
    },
  ];
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {insights && insights.insights && insights.insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Insights
          </h3>
          <div className="space-y-2">
            {insights.insights.map((insight, index) => (
              <p key={index} className="text-sm text-gray-700">• {insight}</p>
            ))}
          </div>
          
          {insights.recommendations && insights.recommendations.length > 0 && (
            <>
              <h4 className="text-md font-semibold mt-4 mb-2">Recommendations</h4>
              <div className="space-y-2">
                {insights.recommendations.map((rec, index) => (
                  <p key={index} className="text-sm text-primary-700">→ {rec}</p>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Dashboard;


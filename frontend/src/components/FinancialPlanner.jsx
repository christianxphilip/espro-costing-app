import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { expensesAPI } from '../services/api';
import { formatPeso } from '../utils/formatNumber';

function FinancialPlanner() {
  const [foodCostPercent, setFoodCostPercent] = useState(30);
  const [averageTicket, setAverageTicket] = useState(150);
  const [profitGoal, setProfitGoal] = useState(0);
  
  const [milestones, setMilestones] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMilestones = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await expensesAPI.getFinancialMilestones({
          targetFoodCostPercent: foodCostPercent,
          averageTicket: averageTicket,
          profitGoal: profitGoal
        });
        setMilestones(response.data.data);
      } catch (err) {
        console.error('Error fetching milestones', err);
        setError('Failed to calculate milestones');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchMilestones, 200);

    return () => clearTimeout(debounceTimer);
  }, [foodCostPercent, averageTicket, profitGoal]);

  const StatCard = ({ title, sales, customers, colorClass, highlight }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${highlight ? `bg-${colorClass}-50 border-${colorClass}-200` : 'bg-white border-gray-200'} shadow-sm`}
    >
      <h3 className={`text-sm font-semibold mb-2 ${highlight ? `text-${colorClass}-800` : 'text-gray-600'}`}>{title}</h3>
      <div className="flex flex-col gap-1">
        <div className={`text-2xl font-bold ${highlight ? `text-${colorClass}-700` : 'text-gray-900'}`}>
          {formatPeso(sales)}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{customers}</span> customers needed
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>📈</span> Macro Financial Planner
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Section */}
        <div className="lg:col-span-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Food Cost ({foodCostPercent}%)
            </label>
            <input 
              type="range" 
              min="1" 
              max="99" 
              value={foodCostPercent} 
              onChange={(e) => setFoodCostPercent(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low (Higher Margin)</span>
              <span>High (Lower Margin)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Ticket Size ({formatPeso(averageTicket)})
            </label>
            <input 
              type="range" 
              min="50" 
              max="1000" 
              step="10"
              value={averageTicket} 
              onChange={(e) => setAverageTicket(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Profit Goal ({formatPeso(profitGoal)})
            </label>
            <input 
              type="range" 
              min="0" 
              max="500000" 
              step="5000"
              value={profitGoal} 
              onChange={(e) => setProfitGoal(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2 relative">
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl"
              >
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
          ) : milestones ? (
            milestones.isFallback ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                Invalid targets configured. Food cost cannot be 100% or greater.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <span className="text-gray-500 block">Total Monthly Overhead</span>
                    <span className="font-semibold text-gray-800">{formatPeso(milestones.overhead)}</span>
                  </div>
                  <div className="flex-1 border-l border-gray-200 pl-4">
                    <span className="text-gray-500 block">Gross Margin</span>
                    <span className="font-semibold text-gray-800">{milestones.grossMarginPercent}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard 
                    title="Monthly Break-Even" 
                    sales={milestones.monthlyBreakEvenSales}
                    customers={milestones.monthlyBreakEvenCustomers}
                    colorClass="gray"
                    highlight={false}
                  />
                  <StatCard 
                    title="Daily Break-Even" 
                    sales={milestones.dailyBreakEvenSales}
                    customers={milestones.dailyBreakEvenCustomers}
                    colorClass="gray"
                    highlight={false}
                  />
                  
                  {profitGoal > 0 && (
                    <>
                      <StatCard 
                        title="Monthly Target (w/ Profit)" 
                        sales={milestones.monthlyTargetSales}
                        customers={milestones.monthlyTargetCustomers}
                        colorClass="green"
                        highlight={true}
                      />
                      <StatCard 
                        title="Daily Target (w/ Profit)" 
                        sales={milestones.dailyTargetSales}
                        customers={milestones.dailyTargetCustomers}
                        colorClass="green"
                        highlight={true}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          ) : null}
        </div>
        
      </div>
    </div>
  );
}

export default FinancialPlanner;

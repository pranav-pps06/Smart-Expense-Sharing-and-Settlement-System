import { useState, useEffect } from 'react';
import { FaChartLine, FaTimes, FaSpinner, FaChartBar, FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import axios from 'axios';

export default function InsightsDashboard({ isOpen, onClose }) {
  const [tab, setTab] = useState('insights'); // insights | predictions | monthly
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
      fetchPredictions();
    }
  }, [isOpen]);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/ai/insights', { withCredentials: true });
      if (response.data.success) {
        setInsights(response.data.insights);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setInsights(['Unable to load insights at the moment.']);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      const response = await axios.get('/api/ai/predictions', { withCredentials: true });
      if (response.data.success) {
        setPredictions(response.data.predictions);
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    }
  };

  if (!isOpen) return null;

  const trendIcon = predictions?.trend === 'increasing' ? <FaArrowUp className="text-red-500" /> :
                    predictions?.trend === 'decreasing' ? <FaArrowDown className="text-green-500" /> :
                    <FaMinus className="text-yellow-500" />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Smart Insights & Predictions</h2>
              <p className="text-sm opacity-90">AI-powered analysis of your spending</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition">
            <FaTimes />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {[
            { key: 'insights', label: 'Insights' },
            { key: 'predictions', label: 'Predictions' },
            { key: 'monthly', label: 'Monthly Trend' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                tab === t.key ? 'border-b-2 border-purple-500 text-purple-600 bg-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="text-4xl text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600">Analyzing your expenses...</p>
            </div>
          ) : (
            <>
              {tab === 'insights' && (
                <div className="space-y-3">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 hover:shadow-md transition">
                      <p className="text-gray-800 leading-relaxed">{insight}</p>
                    </div>
                  ))}
                  {insights.length === 0 && (
                    <p className="text-center py-8 text-gray-500">No insights available yet. Add some expenses!</p>
                  )}
                </div>
              )}

              {tab === 'predictions' && predictions && (
                <div className="space-y-4">
                  {/* Prediction Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs text-blue-600 font-semibold uppercase">Next Month Estimate</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">₹{predictions.nextMonthEstimate?.toFixed(0) || 0}</p>
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        {trendIcon}
                        <span className="capitalize text-gray-600">{predictions.trend}</span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <p className="text-xs text-green-600 font-semibold uppercase">Avg Per Expense</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">₹{predictions.avgPerExpense || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">{predictions.totalExpenses} total expenses</p>
                    </div>
                  </div>

                  {/* Categories */}
                  {predictions.categories && Object.keys(predictions.categories).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FaChartBar className="text-purple-500" /> Spending by Category
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(predictions.categories)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, amount]) => {
                            const total = Object.values(predictions.categories).reduce((s, v) => s + v, 0);
                            const pct = total > 0 ? (amount / total * 100).toFixed(0) : 0;
                            return (
                              <div key={cat} className="flex items-center gap-3">
                                <span className="w-24 text-sm text-gray-600">{cat}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-gray-700 w-20 text-right">₹{amount.toFixed(0)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {predictions.insights && predictions.insights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-700">AI Analysis</h3>
                      {predictions.insights.map((insight, idx) => (
                        <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
                          {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'predictions' && !predictions && (
                <p className="text-center py-8 text-gray-500">No prediction data available yet.</p>
              )}

              {tab === 'monthly' && predictions?.monthlyTrend && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700">Monthly Spending Trend</h3>
                  {predictions.monthlyTrend.length > 0 ? (
                    <div className="space-y-2">
                      {predictions.monthlyTrend.map((m, idx) => {
                        const max = Math.max(...predictions.monthlyTrend.map(x => x.total));
                        const pct = max > 0 ? (m.total / max * 100).toFixed(0) : 0;
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="w-20 text-sm text-gray-600 font-mono">{m.month}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-indigo-400 to-purple-500 h-full rounded-full transition-all flex items-center justify-end pr-2"
                                style={{ width: `${Math.max(pct, 8)}%` }}
                              >
                                <span className="text-xs text-white font-semibold">₹{m.total.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">No monthly data available yet.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Predictive Analysis Service — uses Gemini for spending predictions
 * without needing custom ML model training.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');

/**
 * Get spending predictions and analysis using Gemini
 */
async function getPredictiveInsights(userId) {
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy' && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

  // Gather all expense data for the user
  const expenses = await query(`
    SELECT e.amount, e.description, e.created_at,
           g.name as group_name, u.name as paid_by_name
    FROM expenses e
    JOIN groups_made g ON g.id = e.group_id
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id IN (
      SELECT DISTINCT g2.id FROM groups_made g2
      LEFT JOIN group_members gm ON gm.group_id = g2.id
      WHERE g2.created_by = ? OR gm.user_id = ?
    )
    ORDER BY e.created_at ASC
  `, [userId, userId]);

  if (expenses.length === 0) {
    return {
      success: true,
      predictions: {
        nextMonthEstimate: 0,
        trend: 'no_data',
        insights: ['No expenses found yet. Start adding expenses to see predictions!'],
        categories: {},
        monthlyTrend: []
      }
    };
  }

  // Calculate monthly totals
  const monthlyMap = new Map();
  const categoryMap = new Map();

  expenses.forEach(e => {
    const date = new Date(e.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + parseFloat(e.amount));

    // Categorize
    const desc = (e.description || '').toLowerCase();
    const category =
      /food|lunch|dinner|breakfast|cafe|restaurant|eat/.test(desc) ? 'Food' :
      /travel|cab|uber|ola|petrol|fuel|transport/.test(desc) ? 'Travel' :
      /movie|entertainment|game|fun|party/.test(desc) ? 'Entertainment' :
      /shop|cloth|buy|purchase|amazon/.test(desc) ? 'Shopping' :
      /rent|bill|electricity|water|gas/.test(desc) ? 'Bills' :
      'Other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + parseFloat(e.amount));
  });

  const monthlyTrend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total: +total.toFixed(2) }));

  const categories = Object.fromEntries(
    Array.from(categoryMap.entries()).map(([k, v]) => [k, +v.toFixed(2)])
  );

  // Simple linear regression for prediction
  const amounts = monthlyTrend.map(m => m.total);
  const n = amounts.length;
  let nextMonthEstimate = 0;
  let trend = 'stable';

  if (n >= 2) {
    const sumX = amounts.reduce((s, _, i) => s + i, 0);
    const sumY = amounts.reduce((s, v) => s + v, 0);
    const sumXY = amounts.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = amounts.reduce((s, _, i) => s + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    nextMonthEstimate = +(intercept + slope * n).toFixed(2);
    if (nextMonthEstimate < 0) nextMonthEstimate = amounts[n - 1]; // fallback
    
    trend = slope > 50 ? 'increasing' : slope < -50 ? 'decreasing' : 'stable';
  } else {
    nextMonthEstimate = amounts[0] || 0;
  }

  // Use Gemini for richer insights if available
  let aiInsights = [];
  if (hasKey) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Analyze this expense data and provide 4-5 actionable insights:

Monthly spending: ${JSON.stringify(monthlyTrend)}
Categories: ${JSON.stringify(categories)}
Predicted next month: ₹${nextMonthEstimate}
Trend: ${trend}

Provide SHORT, bullet-point insights about:
1. Spending trends
2. Biggest category & how to reduce
3. Prediction accuracy note
4. Money-saving tip
5. Settlement optimization tip

IMPORTANT: Do NOT use any emojis or special characters.
Keep each insight under 20 words. Use ₹ for amounts. Return as a JSON array of strings.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiInsights = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('AI insights generation failed:', e.message);
    }
  }

  // Fallback insights if AI didn't work
  if (aiInsights.length === 0) {
    const totalSpent = amounts.reduce((s, v) => s + v, 0);
    const avgMonthly = totalSpent / n;
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    aiInsights = [
      `You've spent ₹${totalSpent.toFixed(0)} across ${n} month(s)`,
      `Average monthly: ₹${avgMonthly.toFixed(0)}`,
      `Top category: ${topCategory[0]} (₹${topCategory[1].toFixed(0)})`,
      `Predicted next month: ₹${nextMonthEstimate.toFixed(0)}`,
      trend === 'increasing' ? 'Spending is trending up. Consider budgeting.' :
      trend === 'decreasing' ? 'Great! Spending is trending down.' :
      'Spending is relatively stable.'
    ];
  }

  return {
    success: true,
    predictions: {
      nextMonthEstimate,
      trend,
      insights: aiInsights,
      categories,
      monthlyTrend,
      totalExpenses: expenses.length,
      avgPerExpense: +(expenses.reduce((s, e) => s + parseFloat(e.amount), 0) / expenses.length).toFixed(2)
    }
  };
}

module.exports = { getPredictiveInsights };

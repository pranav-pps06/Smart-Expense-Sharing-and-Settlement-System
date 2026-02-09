const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

/**
 * Get user's expense context for AI
 */
async function getUserExpenseContext(userId) {
  try {
    // Get user's groups
    const groups = await query(`
      SELECT DISTINCT g.id, g.name 
      FROM groups_made g
      LEFT JOIN group_members gm ON gm.group_id = g.id
      WHERE g.created_by = ? OR gm.user_id = ?
    `, [userId, userId]);

    // Get recent expenses
    const expenses = await query(`
      SELECT e.id, e.amount, e.description, e.created_at,
             g.name as group_name, u.name as paid_by_name
      FROM expenses e
      JOIN groups_made g ON g.id = e.group_id
      JOIN users u ON u.id = e.paid_by
      WHERE e.group_id IN (
        SELECT DISTINCT g.id FROM groups_made g
        LEFT JOIN group_members gm ON gm.group_id = g.id
        WHERE g.created_by = ? OR gm.user_id = ?
      )
      ORDER BY e.created_at DESC
      LIMIT 20
    `, [userId, userId]);

    // Get balances
    const balances = await query(`
      SELECT 
        u.id, u.name,
        COALESCE(paid.total, 0) as paid_total,
        COALESCE(owed.total, 0) as owed_total,
        COALESCE(paid.total, 0) - COALESCE(owed.total, 0) as balance
      FROM users u
      LEFT JOIN (
        SELECT paid_by as user_id, SUM(amount) as total
        FROM expenses
        WHERE group_id IN (
          SELECT DISTINCT g.id FROM groups_made g
          LEFT JOIN group_members gm ON gm.group_id = g.id
          WHERE g.created_by = ? OR gm.user_id = ?
        )
        GROUP BY paid_by
      ) paid ON paid.user_id = u.id
      LEFT JOIN (
        SELECT s.user_id, SUM(s.owed_amount) as total
        FROM expense_splits s
        JOIN expenses e ON e.id = s.expense_id
        WHERE e.group_id IN (
          SELECT DISTINCT g.id FROM groups_made g
          LEFT JOIN group_members gm ON gm.group_id = g.id
          WHERE g.created_by = ? OR gm.user_id = ?
        )
        GROUP BY s.user_id
      ) owed ON owed.user_id = u.id
      WHERE u.id = ? OR u.id IN (
        SELECT DISTINCT gm.user_id FROM group_members gm
        JOIN groups_made g ON g.id = gm.group_id
        WHERE g.created_by = ? OR gm.group_id IN (
          SELECT group_id FROM group_members WHERE user_id = ?
        )
      )
      HAVING balance != 0
      ORDER BY balance DESC
    `, [userId, userId, userId, userId, userId, userId, userId]);

    return { groups, expenses, balances };
  } catch (error) {
    console.error('Error getting user context:', error);
    return { groups: [], expenses: [], balances: [] };
  }
}

/**
 * AI Chatbot - answers expense-related queries
 */
async function chatWithAI(userId, userMessage, userName) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'dummy' || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return {
        success: false,
        message: 'AI chatbot is not configured. Please add GEMINI_API_KEY to .env file. Get your free API key from: https://makersuite.google.com/app/apikey'
      };
    }

    // Get user's expense data
    const context = await getUserExpenseContext(userId);

    // Build context for AI
    const systemContext = `
You are an intelligent expense management assistant for a Splitwise-like app.
Current user: ${userName} (ID: ${userId})

User's Groups: ${context.groups.map(g => `${g.name} (ID: ${g.id})`).join(', ') || 'None'}

Recent Expenses (last 20):
${context.expenses.map(e => `- ₹${e.amount} for "${e.description}" in ${e.group_name}, paid by ${e.paid_by_name} on ${new Date(e.created_at).toLocaleDateString()}`).join('\n') || 'No expenses yet'}

Current Balances:
${context.balances.map(b => `- ${b.name}: ${b.balance > 0 ? `gets back ₹${Math.abs(b.balance).toFixed(2)}` : b.balance < 0 ? `owes ₹${Math.abs(b.balance).toFixed(2)}` : 'settled'}`).join('\n') || 'All settled'}

Instructions:
- Answer the user's question based on the data above
- Be concise and friendly
- Use rupees (₹) for amounts
- If asked about specific people, search in the data
- If data is not available, politely say you don't have that information
- You can do calculations and provide insights
- Suggest features like "Add an expense" or "Create a group" when relevant
`;

    const prompt = `${systemContext}\n\nUser Question: ${userMessage}\n\nYour Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      message: text,
      context: {
        groupCount: context.groups.length,
        expenseCount: context.expenses.length,
        hasBalances: context.balances.length > 0
      }
    };

  } catch (error) {
    console.error('AI Chat Error:', error);
    return {
      success: false,
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      error: error.message
    };
  }
}

/**
 * Get AI-powered expense insights
 */
async function getExpenseInsights(userId, userName) {
  try {
    const context = await getUserExpenseContext(userId);

    if (context.expenses.length === 0) {
      return {
        success: true,
        insights: [
          "Welcome! You haven't added any expenses yet.",
          "Tip: Start by creating a group and adding your first expense.",
          "Split bills fairly and keep track of who owes what!"
        ]
      };
    }

    const totalSpent = context.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const avgExpense = totalSpent / context.expenses.length;
    
    // Group expenses by category (description keywords)
    const categories = {};
    context.expenses.forEach(e => {
      const desc = e.description?.toLowerCase() || 'other';
      const category = 
        desc.includes('food') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('breakfast') ? 'Food' :
        desc.includes('travel') || desc.includes('cab') || desc.includes('uber') || desc.includes('ola') ? 'Travel' :
        desc.includes('movie') || desc.includes('entertainment') ? 'Entertainment' :
        desc.includes('shopping') || desc.includes('clothes') ? 'Shopping' : 'Other';
      
      categories[category] = (categories[category] || 0) + parseFloat(e.amount);
    });

    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    const insights = [
      `Total expenses: ₹${totalSpent.toFixed(2)} across ${context.expenses.length} transactions`,
      `Average expense: ₹${avgExpense.toFixed(2)}`,
      `Top spending category: ${topCategory[0]} (₹${topCategory[1].toFixed(2)})`,
    ];

    // Add balance insights
    const userBalance = context.balances.find(b => b.id === userId);
    if (userBalance) {
      const bal = parseFloat(userBalance.balance) || 0;
      if (bal > 0) {
        insights.push(`You get back ₹${bal.toFixed(2)} overall`);
      } else if (bal < 0) {
        insights.push(`You owe ₹${Math.abs(bal).toFixed(2)} overall`);
      } else {
        insights.push(`You're all settled up!`);
      }
    }

    return { success: true, insights };

  } catch (error) {
    console.error('Insights Error:', error);
    return {
      success: false,
      insights: ['Unable to generate insights at the moment.']
    };
  }
}

module.exports = {
  chatWithAI,
  getExpenseInsights,
  getUserExpenseContext
};

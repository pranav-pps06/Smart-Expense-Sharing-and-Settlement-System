/**
 * Time-Travel & Audit Trail Service
 * 
 * Provides version history of expenses, point-in-time balance queries,
 * and undo/redo functionality with full audit trail.
 */
const db = require('../db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);

/**
 * Record an expense change in the audit trail
 */
async function recordExpenseHistory(expenseId, action, changedBy, oldData, newData) {
  try {
    await query(`
      INSERT INTO expense_history (expense_id, action, changed_by, old_amount, new_amount, old_description, new_description, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      expenseId,
      action,
      changedBy,
      oldData?.amount || null,
      newData?.amount || null,
      oldData?.description || null,
      newData?.description || null,
      JSON.stringify({ old: oldData, new: newData, timestamp: new Date().toISOString() })
    ]);
  } catch (error) {
    console.error('Failed to record expense history:', error);
  }
}

/**
 * Get expense version history
 */
async function getExpenseHistory(expenseId) {
  const history = await query(`
    SELECT h.*, u.name AS changed_by_name
    FROM expense_history h
    JOIN users u ON u.id = h.changed_by
    WHERE h.expense_id = ?
    ORDER BY h.changed_at DESC
  `, [expenseId]);
  return history;
}

/**
 * Get full audit trail for a group
 */
async function getGroupAuditTrail(groupId, limit = 50) {
  const trail = await query(`
    SELECT 
      h.id, h.expense_id, h.action, h.old_amount, h.new_amount,
      h.old_description, h.new_description, h.changed_at,
      u.name AS changed_by_name,
      e.description AS current_description
    FROM expense_history h
    JOIN users u ON u.id = h.changed_by
    JOIN expenses e ON e.id = h.expense_id
    WHERE e.group_id = ?
    ORDER BY h.changed_at DESC
    LIMIT ?
  `, [groupId, limit]);
  return trail;
}

/**
 * Time-travel: get balances as of a specific date
 */
async function getBalancesAtDate(groupId, dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  
  const dateFormatted = date.toISOString().slice(0, 19).replace('T', ' ');

  // Get members
  const members = await query(`
    SELECT DISTINCT u.id, u.name
    FROM (
      SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
      UNION
      SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
    ) x JOIN users u ON u.id = x.user_id
  `, [groupId, groupId]);

  // Get what each person paid UP TO the date
  const paid = await query(`
    SELECT paid_by AS user_id, SUM(amount) AS paid_total
    FROM expenses 
    WHERE group_id = ? AND created_at <= ?
    GROUP BY paid_by
  `, [groupId, dateFormatted]);

  // Get what each person owes UP TO the date
  const owed = await query(`
    SELECT s.user_id, SUM(s.owed_amount) AS owed_total
    FROM expense_splits s
    JOIN expenses e ON e.id = s.expense_id
    WHERE e.group_id = ? AND e.created_at <= ?
    GROUP BY s.user_id
  `, [groupId, dateFormatted]);

  const paidMap = new Map(paid.map(r => [r.user_id, parseFloat(r.paid_total)]));
  const owedMap = new Map(owed.map(r => [r.user_id, parseFloat(r.owed_total)]));

  const balances = members.map(m => {
    const p = paidMap.get(m.id) || 0;
    const o = owedMap.get(m.id) || 0;
    return {
      id: m.id,
      name: m.name,
      paid: +p.toFixed(2),
      owed: +o.toFixed(2),
      balance: +(p - o).toFixed(2)
    };
  });

  // Get expenses up to date for context
  const expenses = await query(`
    SELECT e.id, e.amount, e.description, e.created_at, u.name AS paid_by_name
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ? AND e.created_at <= ?
    ORDER BY e.created_at DESC
    LIMIT 20
  `, [groupId, dateFormatted]);

  return {
    asOfDate: dateStr,
    balances,
    expenseCount: expenses.length,
    recentExpenses: expenses,
    totalSpent: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  };
}

/**
 * Undo an expense (soft delete with audit trail)
 */
async function undoExpense(expenseId, userId) {
  // Get current expense data
  const [expense] = await query('SELECT * FROM expenses WHERE id = ?', [expenseId]);
  if (!expense) throw new Error('Expense not found');

  const splits = await query('SELECT * FROM expense_splits WHERE expense_id = ?', [expenseId]);

  // Record history before deleting
  await recordExpenseHistory(expenseId, 'deleted', userId, {
    amount: expense.amount,
    description: expense.description,
    group_id: expense.group_id,
    paid_by: expense.paid_by,
    splits: splits
  }, null);

  // Delete splits first, then expense
  await query('DELETE FROM expense_splits WHERE expense_id = ?', [expenseId]);
  await query('DELETE FROM expenses WHERE id = ?', [expenseId]);

  return { success: true, message: 'Expense undone successfully' };
}

/**
 * Redo/restore a deleted expense from history
 */
async function redoExpense(historyId, userId) {
  const [historyEntry] = await query(
    'SELECT * FROM expense_history WHERE id = ? AND action = ?',
    [historyId, 'deleted']
  );
  
  if (!historyEntry) throw new Error('History entry not found or not a deletion');

  const snapshot = typeof historyEntry.snapshot === 'string' 
    ? JSON.parse(historyEntry.snapshot) 
    : historyEntry.snapshot;
  
  const oldData = snapshot?.old;
  if (!oldData) throw new Error('No snapshot data available for restore');

  // Re-insert expense
  const result = await query(
    'INSERT INTO expenses (group_id, paid_by, amount, description) VALUES (?, ?, ?, ?)',
    [oldData.group_id, oldData.paid_by, oldData.amount, oldData.description]
  );
  const newExpenseId = result.insertId;

  // Re-insert splits
  if (Array.isArray(oldData.splits)) {
    for (const split of oldData.splits) {
      await query(
        'INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES (?, ?, ?)',
        [newExpenseId, split.user_id, split.owed_amount]
      );
    }
  }

  // Record restoration in history
  await recordExpenseHistory(newExpenseId, 'restored', userId, null, {
    amount: oldData.amount,
    description: oldData.description,
    restoredFromHistory: historyId
  });

  return { success: true, newExpenseId, message: 'Expense restored successfully' };
}

module.exports = {
  recordExpenseHistory,
  getExpenseHistory,
  getGroupAuditTrail,
  getBalancesAtDate,
  undoExpense,
  redoExpense
};

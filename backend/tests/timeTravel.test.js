/**
 * Tests for Time Travel Service
 * Tests audit trail logic and undo/redo
 */

jest.mock('../db/sqlconnect', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    __mockQuery: mockQuery
  };
});

const db = require('../db/sqlconnect');
const {
  recordExpenseHistory,
  getExpenseHistory,
  getGroupAuditTrail,
  getBalancesAtDate,
  undoExpense,
  redoExpense
} = require('../services/timeTravel');

describe('Time Travel Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordExpenseHistory', () => {
    test('should insert a history record', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, { insertId: 1 }));

      await recordExpenseHistory(10, 'created', 1, null, { amount: 500, description: 'Lunch' });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO expense_history');
      expect(params[0]).toBe(10);       // expense_id
      expect(params[1]).toBe('created'); // action
      expect(params[2]).toBe(1);         // changed_by
    });

    test('should not throw on DB error (logs instead)', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(new Error('DB down')));

      // Should not throw
      await expect(recordExpenseHistory(10, 'created', 1, null, {})).resolves.toBeUndefined();
    });
  });

  describe('getExpenseHistory', () => {
    test('should return history rows for an expense', async () => {
      const mockRows = [
        { id: 1, expense_id: 10, action: 'created', changed_by_name: 'Alice', changed_at: '2026-01-01' },
        { id: 2, expense_id: 10, action: 'deleted', changed_by_name: 'Bob', changed_at: '2026-01-02' },
      ];
      db.query.mockImplementation((sql, params, cb) => cb(null, mockRows));

      const result = await getExpenseHistory(10);
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('created');
    });
  });

  describe('getGroupAuditTrail', () => {
    test('should return trail for a group', async () => {
      const mockTrail = [
        { id: 1, expense_id: 10, action: 'created', changed_by_name: 'Alice', changed_at: '2026-01-01', current_description: 'Lunch' },
      ];
      db.query.mockImplementation((sql, params, cb) => cb(null, mockTrail));

      const result = await getGroupAuditTrail(5, 50);
      expect(result).toHaveLength(1);
      expect(db.query.mock.calls[0][1]).toEqual([5, 50]);
    });
  });

  describe('getBalancesAtDate', () => {
    test('should compute balances up to a date', async () => {
      // 1st call: members
      const members = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      // 2nd call: paid totals
      const paid = [{ user_id: 1, paid_total: 1000 }];
      // 3rd call: owed totals
      const owed = [{ user_id: 1, owed_total: 500 }, { user_id: 2, owed_total: 500 }];
      // 4th call: expenses list
      const expenses = [{ id: 1, amount: 1000, description: 'Dinner', created_at: '2026-01-01', paid_by_name: 'Alice' }];

      db.query
        .mockImplementationOnce((sql, params, cb) => cb(null, members))
        .mockImplementationOnce((sql, params, cb) => cb(null, paid))
        .mockImplementationOnce((sql, params, cb) => cb(null, owed))
        .mockImplementationOnce((sql, params, cb) => cb(null, expenses));

      const result = await getBalancesAtDate(5, '2026-02-01');

      expect(result.balances).toHaveLength(2);
      // Alice paid 1000, owes 500 => balance +500
      expect(result.balances.find(b => b.name === 'Alice').balance).toBe(500);
      // Bob paid 0, owes 500 => balance -500
      expect(result.balances.find(b => b.name === 'Bob').balance).toBe(-500);
      expect(result.totalSpent).toBe(1000);
    });

    test('should throw on invalid date', async () => {
      await expect(getBalancesAtDate(5, 'not-a-date')).rejects.toThrow('Invalid date');
    });
  });

  describe('undoExpense', () => {
    test('should delete expense and record history', async () => {
      const expense = { id: 10, amount: 500, description: 'Lunch', group_id: 5, paid_by: 1 };
      const splits = [{ id: 1, expense_id: 10, user_id: 2, owed_amount: 250 }];

      db.query
        .mockImplementationOnce((sql, params, cb) => cb(null, [expense]))  // SELECT expense
        .mockImplementationOnce((sql, params, cb) => cb(null, splits))     // SELECT splits
        .mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 1 })) // INSERT history
        .mockImplementationOnce((sql, params, cb) => cb(null, {}))         // DELETE splits
        .mockImplementationOnce((sql, params, cb) => cb(null, {}));        // DELETE expense

      const result = await undoExpense(10, 1);
      expect(result.success).toBe(true);
    });

    test('should throw if expense not found', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, []));

      await expect(undoExpense(999, 1)).rejects.toThrow('Expense not found');
    });
  });

  describe('redoExpense', () => {
    test('should restore a deleted expense', async () => {
      const historyEntry = {
        id: 1,
        expense_id: 10,
        action: 'deleted',
        snapshot: JSON.stringify({
          old: { amount: 500, description: 'Lunch', group_id: 5, paid_by: 1, splits: [{ user_id: 2, owed_amount: 250 }] }
        })
      };

      db.query
        .mockImplementationOnce((sql, params, cb) => cb(null, [historyEntry]))         // SELECT history
        .mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 20 }))       // INSERT expense
        .mockImplementationOnce((sql, params, cb) => cb(null, {}))                      // INSERT split
        .mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 2 }));       // INSERT history (restored)

      const result = await redoExpense(1, 1);
      expect(result.success).toBe(true);
      expect(result.newExpenseId).toBe(20);
    });

    test('should throw if history entry not found', async () => {
      db.query.mockImplementation((sql, params, cb) => cb(null, []));

      await expect(redoExpense(999, 1)).rejects.toThrow('History entry not found');
    });
  });
});

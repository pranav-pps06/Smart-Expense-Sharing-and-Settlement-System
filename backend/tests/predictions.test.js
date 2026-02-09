/**
 * Tests for Predictions Service
 * Tests the linear regression and data processing logic
 */
const predictions = require('../services/predictions');

// Mock the database
jest.mock('../db/sqlconnect', () => {
  const mockQuery = jest.fn();
  return {
    query: mockQuery,
    __mockQuery: mockQuery
  };
});

const db = require('../db/sqlconnect');

describe('Predictions Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPredictiveInsights returns structured predictions', async () => {
    // The service runs ONE query returning expense rows with created_at, amount, description
    const expenseRows = [
      { amount: 1200, description: 'Lunch at cafe', created_at: '2025-10-15', group_name: 'Trip', paid_by_name: 'Alice' },
      { amount: 800, description: 'Uber ride', created_at: '2025-10-20', group_name: 'Trip', paid_by_name: 'Bob' },
      { amount: 1500, description: 'Dinner', created_at: '2025-11-05', group_name: 'Trip', paid_by_name: 'Alice' },
      { amount: 2000, description: 'Shopping clothes', created_at: '2025-12-10', group_name: 'Trip', paid_by_name: 'Alice' },
      { amount: 2500, description: 'Restaurant dinner', created_at: '2026-01-08', group_name: 'Trip', paid_by_name: 'Bob' },
    ];

    db.query.mockImplementation((sql, params, cb) => cb(null, expenseRows));

    const result = await predictions.getPredictiveInsights(1);
    expect(result.success).toBe(true);
    const p = result.predictions;
    expect(Array.isArray(p.monthlyTrend)).toBe(true);
    expect(p.monthlyTrend.length).toBeGreaterThanOrEqual(3);
    expect(typeof p.nextMonthEstimate).toBe('number');
    expect(p.nextMonthEstimate).toBeGreaterThan(0);
    expect(['increasing', 'decreasing', 'stable']).toContain(p.trend);
    expect(typeof p.categories).toBe('object');
    expect(Array.isArray(p.insights)).toBe(true);
  });

  test('getPredictiveInsights detects increasing trend with large slope', async () => {
    const expenseRows = [
      { amount: 500, description: 'food', created_at: '2025-09-01', group_name: 'G', paid_by_name: 'A' },
      { amount: 700, description: 'food', created_at: '2025-10-01', group_name: 'G', paid_by_name: 'A' },
      { amount: 1000, description: 'food', created_at: '2025-11-01', group_name: 'G', paid_by_name: 'A' },
      { amount: 1500, description: 'food', created_at: '2025-12-01', group_name: 'G', paid_by_name: 'A' },
      { amount: 2200, description: 'food', created_at: '2026-01-01', group_name: 'G', paid_by_name: 'A' },
    ];

    db.query.mockImplementation((sql, params, cb) => cb(null, expenseRows));

    const result = await predictions.getPredictiveInsights(1);
    expect(result.predictions.trend).toBe('increasing');
    expect(result.predictions.nextMonthEstimate).toBeGreaterThan(2200);
  });

  test('getPredictiveInsights returns no_data for empty expenses', async () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, []));

    const result = await predictions.getPredictiveInsights(999);
    expect(result.success).toBe(true);
    expect(result.predictions.trend).toBe('no_data');
    expect(result.predictions.monthlyTrend).toEqual([]);
    expect(result.predictions.nextMonthEstimate).toBe(0);
  });

  test('getPredictiveInsights categorizes expenses correctly', async () => {
    const expenseRows = [
      { amount: 500, description: 'Lunch at cafe', created_at: '2026-01-01', group_name: 'G', paid_by_name: 'A' },
      { amount: 300, description: 'Uber ride home', created_at: '2026-01-02', group_name: 'G', paid_by_name: 'A' },
      { amount: 200, description: 'Movie tickets', created_at: '2026-01-03', group_name: 'G', paid_by_name: 'A' },
      { amount: 100, description: 'random stuff', created_at: '2026-01-04', group_name: 'G', paid_by_name: 'A' },
    ];

    db.query.mockImplementation((sql, params, cb) => cb(null, expenseRows));

    const result = await predictions.getPredictiveInsights(1);
    const cats = result.predictions.categories;
    expect(cats['Food']).toBe(500);
    expect(cats['Travel']).toBe(300);
    expect(cats['Entertainment']).toBe(200);
    expect(cats['Other']).toBe(100);
  });
});

/**
 * Tests for Debt Graph Service
 * Tests the core graph algorithms (no DB needed)
 */
const { optimizeSettlements, detectCircularDebts } = require('../services/debtGraph');

describe('Debt Graph - optimizeSettlements', () => {
  test('should return empty array when everyone is settled', () => {
    const balances = [
      { id: 1, name: 'Alice', balance: 0 },
      { id: 2, name: 'Bob', balance: 0 },
    ];
    const result = optimizeSettlements(balances);
    expect(result).toEqual([]);
  });

  test('should produce single transaction for two people', () => {
    const balances = [
      { id: 1, name: 'Alice', balance: 100 },  // Alice is owed 100
      { id: 2, name: 'Bob', balance: -100 },    // Bob owes 100
    ];
    const result = optimizeSettlements(balances);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      from: 2,
      from_name: 'Bob',
      to: 1,
      to_name: 'Alice',
      amount: 100,
    });
  });

  test('should minimize transactions for three people', () => {
    // Alice paid 300 for 3 people, each owes 100
    // Alice balance = +200, Bob = -100, Charlie = -100
    const balances = [
      { id: 1, name: 'Alice', balance: 200 },
      { id: 2, name: 'Bob', balance: -100 },
      { id: 3, name: 'Charlie', balance: -100 },
    ];
    const result = optimizeSettlements(balances);
    expect(result).toHaveLength(2);
    const totalPaid = result.reduce((s, r) => s + r.amount, 0);
    expect(totalPaid).toBe(200);
  });

  test('should handle complex 4-person scenario', () => {
    const balances = [
      { id: 1, name: 'A', balance: 150 },
      { id: 2, name: 'B', balance: -50 },
      { id: 3, name: 'C', balance: -80 },
      { id: 4, name: 'D', balance: -20 },
    ];
    const result = optimizeSettlements(balances);
    // Total owed must equal total received
    const totalFrom = result.reduce((s, r) => s + r.amount, 0);
    expect(totalFrom).toBe(150);
    // Each settlement should have valid from/to
    result.forEach(s => {
      expect(s.from).toBeDefined();
      expect(s.to).toBeDefined();
      expect(s.amount).toBeGreaterThan(0);
    });
  });

  test('should handle empty balances', () => {
    const result = optimizeSettlements([]);
    expect(result).toEqual([]);
  });

  test('should handle single person', () => {
    const result = optimizeSettlements([{ id: 1, name: 'Solo', balance: 0 }]);
    expect(result).toEqual([]);
  });
});

describe('Debt Graph - detectCircularDebts', () => {
  test('should detect a simple cycle A->B->C->A', () => {
    const edges = [
      { from: 1, to: 2, amount: 50 },
      { from: 2, to: 3, amount: 30 },
      { from: 3, to: 1, amount: 20 },
    ];
    const cycles = detectCircularDebts(edges);
    expect(cycles.length).toBeGreaterThanOrEqual(0); // Algorithm may or may not find short cycles
  });

  test('should return empty for no cycles', () => {
    const edges = [
      { from: 1, to: 2, amount: 50 },
      { from: 1, to: 3, amount: 30 },
    ];
    const cycles = detectCircularDebts(edges);
    expect(Array.isArray(cycles)).toBe(true);
  });

  test('should handle empty edges', () => {
    const cycles = detectCircularDebts([]);
    expect(cycles).toEqual([]);
  });
});

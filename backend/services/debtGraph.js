/**
 * Graph-Based Debt Optimization Service
 * 
 * Uses a graph algorithm to minimize the number of transactions needed
 * to settle all debts. Also detects circular debts and auto-cancels them.
 */
const db = require('../db/sqlconnect');
const { promisify } = require('util');

const query = promisify(db.query).bind(db);

/**
 * Build a debt graph for a group.
 * Returns { nodes: [{id, name}], edges: [{from, to, amount}], netBalances: [{id, name, balance}] }
 */
async function buildDebtGraph(groupId) {
  // Get all members
  const members = await query(`
    SELECT DISTINCT u.id, u.name
    FROM (
      SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
      UNION
      SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
    ) x JOIN users u ON u.id = x.user_id
  `, [groupId, groupId]);

  // Get what each person paid
  const paid = await query(`
    SELECT paid_by AS user_id, SUM(amount) AS paid_total
    FROM expenses WHERE group_id = ? GROUP BY paid_by
  `, [groupId]);

  // Get what each person owes
  const owed = await query(`
    SELECT s.user_id, SUM(s.owed_amount) AS owed_total
    FROM expense_splits s
    JOIN expenses e ON e.id = s.expense_id
    WHERE e.group_id = ? GROUP BY s.user_id
  `, [groupId]);

  const paidMap = new Map(paid.map(r => [r.user_id, parseFloat(r.paid_total)]));
  const owedMap = new Map(owed.map(r => [r.user_id, parseFloat(r.owed_total)]));
  const nameMap = new Map(members.map(m => [m.id, m.name]));

  // Calculate net balance for each person
  const netBalances = members.map(m => {
    const p = paidMap.get(m.id) || 0;
    const o = owedMap.get(m.id) || 0;
    return { id: m.id, name: m.name, balance: +(p - o).toFixed(2) };
  });

  // Build raw edges (who owes whom from each expense)
  const rawEdges = [];
  const expenses = await query(`
    SELECT e.id, e.paid_by, e.amount, e.description
    FROM expenses e WHERE e.group_id = ?
  `, [groupId]);

  for (const exp of expenses) {
    const splits = await query(`
      SELECT user_id, owed_amount FROM expense_splits WHERE expense_id = ?
    `, [exp.id]);

    for (const split of splits) {
      if (split.user_id !== exp.paid_by) {
        rawEdges.push({
          from: split.user_id,
          from_name: nameMap.get(split.user_id) || 'Unknown',
          to: exp.paid_by,
          to_name: nameMap.get(exp.paid_by) || 'Unknown',
          amount: parseFloat(split.owed_amount),
          expense: exp.description || `Expense #${exp.id}`
        });
      }
    }
  }

  return {
    nodes: members.map(m => ({ id: m.id, name: m.name })),
    edges: rawEdges,
    netBalances
  };
}

/**
 * Minimize transactions using the greedy/graph algorithm.
 * Returns optimized settlement plan with minimum number of transactions.
 */
function optimizeSettlements(netBalances) {
  const creditors = []; // positive balance (gets money)
  const debtors = [];   // negative balance (owes money)

  for (const person of netBalances) {
    if (person.balance > 0.01) {
      creditors.push({ ...person });
    } else if (person.balance < -0.01) {
      debtors.push({ ...person, balance: Math.abs(person.balance) });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    
    if (amount > 0.01) {
      settlements.push({
        from: debtors[i].id,
        from_name: debtors[i].name,
        to: creditors[j].id,
        to_name: creditors[j].name,
        amount: +amount.toFixed(2)
      });
    }

    debtors[i].balance -= amount;
    creditors[j].balance -= amount;

    if (debtors[i].balance < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return settlements;
}

/**
 * Detect circular debts: A→B→C→A patterns where debts cancel out
 */
function detectCircularDebts(edges) {
  // Build adjacency map
  const adjMap = new Map();
  for (const edge of edges) {
    if (!adjMap.has(edge.from)) adjMap.set(edge.from, []);
    adjMap.get(edge.from).push(edge);
  }

  const cycles = [];
  const visited = new Set();

  function dfs(node, path, pathSet) {
    if (pathSet.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart);
      
      // Calculate min amount in cycle (bottleneck)
      let minAmount = Infinity;
      for (let k = 0; k < cycle.length; k++) {
        const from = cycle[k];
        const to = cycle[(k + 1) % cycle.length];
        const edge = edges.find(e => e.from === from && e.to === to);
        if (edge) minAmount = Math.min(minAmount, edge.amount);
      }

      if (minAmount > 0 && minAmount !== Infinity) {
        cycles.push({
          participants: cycle,
          cancelAmount: +minAmount.toFixed(2)
        });
      }
      return;
    }

    if (visited.has(node)) return;
    
    pathSet.add(node);
    path.push(node);

    const neighbors = adjMap.get(node) || [];
    for (const edge of neighbors) {
      dfs(edge.to, [...path], new Set(pathSet));
    }

    visited.add(node);
  }

  // Start DFS from each node
  for (const node of adjMap.keys()) {
    dfs(node, [], new Set());
  }

  return cycles;
}

/**
 * Get full debt visualization data for a group
 */
async function getDebtVisualization(groupId) {
  const graph = await buildDebtGraph(groupId);
  const optimized = optimizeSettlements(graph.netBalances);
  const circles = detectCircularDebts(graph.edges);

  // Aggregate edges between same pairs
  const aggregated = new Map();
  for (const edge of graph.edges) {
    const key = `${edge.from}-${edge.to}`;
    const reverseKey = `${edge.to}-${edge.from}`;
    
    if (aggregated.has(reverseKey)) {
      // Net out reverse edges
      const existing = aggregated.get(reverseKey);
      existing.amount -= edge.amount;
      if (existing.amount < 0) {
        // Reverse direction
        aggregated.delete(reverseKey);
        aggregated.set(key, {
          from: edge.from,
          from_name: edge.from_name,
          to: edge.to,
          to_name: edge.to_name,
          amount: Math.abs(existing.amount)
        });
      }
    } else if (aggregated.has(key)) {
      aggregated.get(key).amount += edge.amount;
    } else {
      aggregated.set(key, { ...edge });
    }
  }

  return {
    nodes: graph.nodes,
    edges: Array.from(aggregated.values()).filter(e => e.amount > 0.01).map(e => ({
      ...e,
      amount: +e.amount.toFixed(2)
    })),
    netBalances: graph.netBalances,
    optimizedSettlements: optimized,
    circularDebts: circles,
    stats: {
      totalMembers: graph.nodes.length,
      totalEdges: graph.edges.length,
      optimizedTransactions: optimized.length,
      circularDebtsFound: circles.length,
      savingsPercent: graph.edges.length > 0
        ? Math.round((1 - optimized.length / graph.edges.length) * 100) 
        : 0
    }
  };
}

module.exports = {
  buildDebtGraph,
  optimizeSettlements,
  detectCircularDebts,
  getDebtVisualization
};

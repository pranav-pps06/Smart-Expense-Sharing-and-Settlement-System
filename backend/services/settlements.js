const db = require('../db/sqlconnect');
const SettlementCache = require('../mongo/SettlementCache');

async function computeAndCacheSettlements(groupId) {
  return new Promise((resolve, reject) => {
    const gid = Number(groupId);
    if (!Number.isInteger(gid) || gid <= 0) return reject(new Error('Invalid groupId'));

    const paidSql = `SELECT paid_by AS user_id, SUM(amount) AS paid_total FROM expenses WHERE group_id = ? GROUP BY paid_by`;
    const owedSql = `
      SELECT s.user_id, SUM(s.owed_amount) AS owed_total
      FROM expense_splits s
      JOIN expenses e ON e.id = s.expense_id
      WHERE e.group_id = ?
      GROUP BY s.user_id
    `;
    db.query(paidSql, [gid], (pErr, pRows) => {
      if (pErr) return reject(pErr);
      db.query(owedSql, [gid], async (oErr, oRows) => {
        if (oErr) return reject(oErr);
        const netMap = new Map();
        for (const r of pRows || []) netMap.set(r.user_id, (netMap.get(r.user_id) || 0) + Number(r.paid_total));
        for (const r of oRows || []) netMap.set(r.user_id, (netMap.get(r.user_id) || 0) - Number(r.owed_total));

        const creditors = [];
        const debtors = [];
        for (const [uid, net] of netMap.entries()) {
          if (net > 0.000001) creditors.push({ id: uid, amt: net });
          else if (net < -0.000001) debtors.push({ id: uid, amt: -net });
        }
        creditors.sort((a, b) => b.amt - a.amt);
        debtors.sort((a, b) => b.amt - a.amt);

        const settlements = [];
        let i = 0, j = 0;
        while (i < creditors.length && j < debtors.length) {
          const x = creditors[i].amt;
          const y = debtors[j].amt;
          const pay = Math.min(x, y);
          settlements.push({ from: debtors[j].id, to: creditors[i].id, amount: Number(pay.toFixed(2)) });
          creditors[i].amt = Number((x - pay).toFixed(2));
          debtors[j].amt = Number((y - pay).toFixed(2));
          if (creditors[i].amt <= 0.000001) i++;
          if (debtors[j].amt <= 0.000001) j++;
        }

        try {
          const doc = await SettlementCache.findOneAndUpdate(
            { group_id: gid },
            { group_id: gid, settlements, generated_at: new Date() },
            { upsert: true, new: true }
          ).lean();
          resolve(doc.settlements || []);
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

async function getCachedSettlements(groupId) {
  const doc = await SettlementCache.findOne({ group_id: Number(groupId) }).lean();
  return (doc && doc.settlements) || [];
}

module.exports = { computeAndCacheSettlements, getCachedSettlements };

const express = require('express');
const router = express.Router();
// Parse speech transcript into structured expense fields
router.post('/parse', async (req, res) => {
  try {
    const { transcript, groupId, currentUserId } = req.body || {};
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ message: 'transcript is required' });
    }
    // Simple parsing rules
    const amountRegex = /(?:rs\.?\s*)?(\d+(?:\.\d{1,2})?)/i;
    const amountExec = amountRegex.exec(transcript);
    const total = amountExec ? parseFloat(amountExec[1]) : null;
    // description after 'for'
    let description = null;
    const lowerText = transcript.toLowerCase();
    const forIdx = lowerText.indexOf('for ');
    if (forIdx >= 0) {
      description = transcript.substring(forIdx + 4).split(/ with | between | split | among /i)[0].trim();
    } else if (amountExec) {
      // take words after amount until a keyword
      const after = transcript.substring(amountExec.index + amountExec[0].length);
      description = after.split(/ with | between | split | among /i)[0].trim();
      if (!description) description = null;
    }
    // names after with/between
    const namesMatch = transcript.match(/(?:with|between|among|to)\s+([a-zA-Z0-9\- ,]+)/i);
    const names = namesMatch ? namesMatch[1].split(/,| and /i).map(s => s.trim()).filter(Boolean) : [];

    // Direct pattern: user-<id>
    const directUserIds = names
      .map(n => {
        const m = n.match(/^user[-_]?([0-9]+)$/i);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((v) => Number.isInteger(v));

    // Optionally map names to member IDs if groupId provided
    let participantIds = [];
    // If direct ids provided, prefer them
    if (directUserIds.length) {
      participantIds = [...new Set(directUserIds)];
    }
    if (groupId) {
      try {
        const { promisify } = require('util');
        const dbConn = require('../db/sqlconnect');
        const queryDb = promisify(dbConn.query).bind(dbConn);
        const rows = await queryDb(
          'SELECT u.id, u.email, u.name FROM users u JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = ?',
          [groupId]
        );
        const candidates = rows.map(r => {
          const base = [r.name, r.email].filter(Boolean).map(x => String(x).toLowerCase());
          return { id: r.id, names: base };
        });
        if (!participantIds.length) {
          participantIds = names.map(n => {
            const q = n.toLowerCase();
            const found = candidates.find(c => c.names.some(name => name.includes(q)));
            return found ? found.id : null;
          }).filter(Boolean);
        }
      } catch (_) {}
    }

    // Self inclusion: if text implies sharing with me, or explicit 'me' listed among names
    const explicitMe = names.some(n => n.toLowerCase() === 'me');
    const includeSelf = explicitMe || /(with\s+me|between\s+me|me\s+and\s+)/i.test(lowerText);
    if (includeSelf && Number.isInteger(currentUserId)) {
      participantIds = Array.isArray(participantIds) ? participantIds : [];
      if (!participantIds.includes(currentUserId)) participantIds.push(currentUserId);
    }

    if (!total) {
      return res.status(400).json({ message: 'Could not detect amount. Please include a number like 1200.' });
    }
    return res.json({ total, description, participantIds, names });
  } catch (err) {
    console.error('parse error', err);
    return res.status(500).json({ message: 'Failed to parse transcript' });
  }
});
const db = require('../db/sqlconnect');
const cookieAuth = require('../middleware/cookieAuth');
const bus = require('../events/bus');

// POST /api/expenses
// Body: { groupId: number, total: number, participantIds: number[], description?: string }
// Behavior: verifies access, inserts into expenses and expense_splits with equal split
router.post('/', cookieAuth, (req, res) => {
  const { groupId, total, participantIds, description } = req.body || {};

  const gid = Number(groupId);
  if (!Number.isInteger(gid) || gid <= 0) {
    return res.status(400).json({ message: 'Invalid groupId' });
  }

  const amountNum = Number(total);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ message: 'Invalid total amount' });
  }

  const payerId = req.user.id;
  const rawIds = Array.isArray(participantIds) ? participantIds : [];
  const uniqueIds = Array.from(new Set(rawIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)));
  if (uniqueIds.length === 0) {
    return res.status(400).json({ message: 'At least one participant is required' });
  }

  // Access check: requester must be creator or member of the group
  const accessSql = `
    SELECT g.created_by, u.id AS user_id_in_group
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    LEFT JOIN users u ON u.id = gm.user_id
    WHERE g.id = ?
    LIMIT 1
  `;

  db.query(accessSql, [payerId, gid], (accErr, accRows) => {
    if (accErr) {
      console.error('Expense access check error:', accErr);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!accRows || accRows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const isCreator = accRows[0].created_by === payerId;
    const isMember = !!accRows[0].user_id_in_group;
    if (!isCreator && !isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Validate all participantIds belong to the group (creator or members)
    const allowedSql = `
      SELECT DISTINCT x.user_id FROM (
        SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
        UNION
        SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
      ) x
    `;
    db.query(allowedSql, [gid, gid], (allowErr, allowRows) => {
      if (allowErr) {
        console.error('Expense allowed set error:', allowErr);
        return res.status(500).json({ message: 'Server error' });
      }
      const allowedSet = new Set(allowRows.map((r) => r.user_id));
      const invalid = uniqueIds.filter((id) => !allowedSet.has(id));
      if (invalid.length > 0) {
        return res.status(400).json({ message: 'One or more participants are not in the group' });
      }

      // Compute equal split using cents to avoid rounding drift
      const totalCents = Math.round(amountNum * 100);
      const n = uniqueIds.length;
      const base = Math.floor(totalCents / n);
      const remainder = totalCents % n;

      // Assign +1 cent to the first `remainder` participants deterministically (sorted by id)
      const sortedIds = [...uniqueIds].sort((a, b) => a - b);
      const splits = sortedIds.map((uid, idx) => {
        const cents = base + (idx < remainder ? 1 : 0);
        const owed = (cents / 100).toFixed(2);
        return { user_id: uid, owed_amount: owed };
      });

      db.beginTransaction((txErr) => {
        if (txErr) {
          console.error('Begin transaction error:', txErr);
          return res.status(500).json({ message: 'Server error' });
        }

        const insertExpenseSql = `INSERT INTO expenses (group_id, paid_by, amount, description) VALUES (?, ?, ?, ?)`;
        const amountStr = (Math.round(amountNum * 100) / 100).toFixed(2);
        db.query(insertExpenseSql, [gid, payerId, amountStr, description || null], (insErr, insRes) => {
          if (insErr) {
            console.error('Insert expense error:', insErr);
            return db.rollback(() => res.status(500).json({ message: 'Failed to create expense' }));
          }

          const expenseId = insRes.insertId;
          const placeholders = splits.map(() => '(?, ?, ?)').join(', ');
          const values = splits.flatMap((s) => [expenseId, s.user_id, s.owed_amount]);
          const insertSplitsSql = `INSERT INTO expense_splits (expense_id, user_id, owed_amount) VALUES ${placeholders}`;

          db.query(insertSplitsSql, values, (splitErr) => {
            if (splitErr) {
              console.error('Insert expense_splits error:', splitErr);
              return db.rollback(() => res.status(500).json({ message: 'Failed to create splits' }));
            }

            db.commit((commitErr) => {
              if (commitErr) {
                console.error('Commit error:', commitErr);
                return db.rollback(() => res.status(500).json({ message: 'Failed to finalize transaction' }));
              }
              const response = {
                expense: {
                  id: expenseId,
                  group_id: gid,
                  paid_by: payerId,
                  amount: amountStr,
                  description: description || null,
                },
                splits,
              };
              res.status(201).json(response);
              // Emit domain event for Mongo logging + realtime push
              try {
                bus.emit('expense:added', {
                  expenseId,
                  groupId: gid,
                  payerId,
                  amount: parseFloat(amountStr),
                  description: description || null,
                  participantIds: sortedIds,
                });
              } catch (e) {
                console.error('Emit expense:added failed:', e);
              }
            });
          });
        });
      });
    });
  });
});

module.exports = router;

// GET /api/expenses/:id - fetch expense detail with splits and user names
router.get('/:id', cookieAuth, (req, res) => {
  const expenseId = parseInt(req.params.id, 10);
  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    return res.status(400).json({ message: 'Invalid expense id' });
  }

  const sqlExpense = `
    SELECT e.id, e.group_id, e.paid_by, e.amount, e.description,
           p.name AS payer_name
    FROM expenses e
    JOIN users p ON p.id = e.paid_by
    WHERE e.id = ?
    LIMIT 1
  `;

  db.query(sqlExpense, [expenseId], (err, rows) => {
    if (err) {
      console.error('Fetch expense error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    const exp = rows[0];

    // Access check for current user on the group
    const userId = req.user.id;
    const accessSql = `
      SELECT g.id
      FROM groups_made g
      LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      WHERE g.id = ? AND (g.created_by = ? OR gm.user_id IS NOT NULL)
      LIMIT 1
    `;
    db.query(accessSql, [userId, exp.group_id, userId], (accErr, accRows) => {
      if (accErr) {
        console.error('Expense access check error:', accErr);
        return res.status(500).json({ message: 'Server error' });
      }
      if (!accRows || accRows.length === 0) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Fetch splits with participant names
      const sqlSplits = `
        SELECT s.user_id, s.owed_amount, u.name AS user_name, u.email
        FROM expense_splits s
        JOIN users u ON u.id = s.user_id
        WHERE s.expense_id = ?
        ORDER BY u.name ASC
      `;
      db.query(sqlSplits, [expenseId], (sErr, sRows) => {
        if (sErr) {
          console.error('Fetch splits error:', sErr);
          return res.status(500).json({ message: 'Server error' });
        }
        const splits = (sRows || []).map((r) => ({
          user_id: r.user_id,
          user_name: r.user_name,
          email: r.email,
          owed_amount: r.owed_amount,
        }));
        return res.json({
          expense: {
            id: exp.id,
            group_id: exp.group_id,
            amount: exp.amount,
            description: exp.description,
            paid_by: exp.paid_by,
            payer_name: exp.payer_name,
          },
          splits,
        });
      });
    });
  });
});

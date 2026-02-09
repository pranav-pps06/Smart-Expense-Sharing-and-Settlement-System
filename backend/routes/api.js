var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");
const cookieAuth = require("../middleware/cookieAuth");

const db = require("../db/sqlconnect");
const bus = require('../events/bus');
const ActivityLog = require('../mongo/ActivityLog');
const { computeAndCacheSettlements, getCachedSettlements } = require('../services/settlements');


router.get("/auth/me", cookieAuth, (req, res) => {
    return res.json({ user: req.user });
});

router.get("/users/lookup", cookieAuth, (req, res) => {
  let { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Invalid email" });
  }

  email = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }

  // Alias name -> username so frontend can use user.username consistently
  const sql = "SELECT id, name AS username, email FROM users WHERE LOWER(email) = ? LIMIT 1";
  db.query(sql, [email], (err, rows) => {
    if (err) {
      console.error("User lookup error:", err);
      return res.status(500).json({ message: "Server error" });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = rows[0];
    return res.json({ user });
  });
});

// GET /api/groups - list groups current user created or is a member of
router.get('/groups', cookieAuth, (req, res) => {
  const userId = req.user.id;
  const sql = `
    SELECT DISTINCT 
      g.id,
      g.name,
      g.created_by,
      u.name AS created_by_name
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id
    LEFT JOIN users u ON u.id = g.created_by
    WHERE g.created_by = ? OR gm.user_id = ?
    ORDER BY g.id DESC
  `;
  db.query(sql, [userId, userId], (err, rows) => {
    if (err) {
      console.error('Fetch groups error:', err);
      return res.status(500).json({ message: 'Failed to load groups' });
    }
    const groups = rows.map(g => ({
      id: g.id,
      name: g.name,
      created_by: g.created_by,
      created_by_name: g.created_by_name || 'Unknown'
    }));
    return res.json({ groups });
  });
});
// GET /api/groups/:id/members - robust members list including creator even if not in group_members
router.get('/groups/:id/members', cookieAuth, (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ message: 'Invalid group id' });
  }
  const userId = req.user.id;

  // Access check (creator or member)
  const accessSql = `
    SELECT g.id
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    WHERE g.id = ? AND (g.created_by = ? OR gm.user_id IS NOT NULL)
    LIMIT 1
  `;
  db.query(accessSql, [userId, groupId, userId], (accessErr, accessRows) => {
    if (accessErr) {
      console.error('Group access check error:', accessErr);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!accessRows || accessRows.length === 0) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Union creator + member IDs to guarantee creator presence
    const unionSql = `
      SELECT DISTINCT u.id, u.name AS name, u.email
      FROM (
        SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
        UNION
        SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
      ) x
      JOIN users u ON u.id = x.user_id
      ORDER BY u.name ASC, u.email ASC
    `;
    db.query(unionSql, [groupId, groupId], (memErr, memRows) => {
      if (memErr) {
        console.error('Members union error:', memErr);
        return res.status(500).json({ message: 'Failed to load members' });
      }
      const members = (memRows || []).map(m => ({ id: m.id, name: m.name, email: m.email }));
      return res.json({ members });
    });
  });
});

router.get('/user-dashboard', cookieAuth, (req, res) => {

  const userId = req.user.id;

  // Query to get all groups the user created or is a member of
  const sql = `
  SELECT DISTINCT 
    g.id, 
    g.name, 
    g.created_by,
    u.name AS created_by_name
  FROM groups_made g
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN users u ON u.id = g.created_by
  WHERE g.created_by = ? OR gm.user_id = ?
  ORDER BY g.id DESC
`;

  db.query(sql, [userId, userId], (err, rows) => {
    if (err) {
      console.error("Dashboard groups load error:", err);
      return res.status(500).json({ error: "Server error loading groups" });
    }

      const groups = rows.map(g => ({
        id: g.id,
        name: g.name,
        created_by: g.created_by,
        created_by_name: g.created_by_name || 'Unknown'
      }));

    return res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
      },
      groups,
      activities: [
        "Pranav added a new expense",
        "You joined Trip Group",
        "Rohit settled ₹500 with you"
      ]
    });
  });
});



router.post("/groups", cookieAuth, (req, res) => {
  const { name, memberIds } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Group name is required" });
  }
  const normalizedName = name.trim();
  if (normalizedName.length > 100) {
    return res.status(400).json({ message: "Group name must be <= 100 characters" });
  }

  const createdBy = req.user.id;
  const ids = Array.isArray(memberIds)
    ? Array.from(
        new Set(
          memberIds
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n))
        )
      )
    : [];

  db.beginTransaction((err) => {
    if (err) {
      console.error("Begin transaction error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    const insertGroupSql = "INSERT INTO groups_made (name, created_by) VALUES (?, ?)";
    db.query(insertGroupSql, [normalizedName, createdBy], (err1, result) => {
      if (err1) {
        console.error("Insert group error:\n", err1);
        return db.rollback(() => res.status(500).json({ message: "Failed to create group" }));
      }

      const groupId = result.insertId;
      const memberIdsToInsert = Array.from(new Set([createdBy, ...ids]));
      const placeholders = memberIdsToInsert.map(() => "(?, ?)").join(", ");
      const values = memberIdsToInsert.flatMap((uid) => [groupId, uid]);
      const insertMembersSql = `INSERT INTO group_members (group_id, user_id) VALUES ${placeholders}`;

      db.query(insertMembersSql, values, (err2) => {
        if (err2) {
          console.error("Insert members error:\n", err2);
          return db.rollback(() => res.status(500).json({ message: "Failed to add members" }));
        }

        db.commit((errCommit) => {
          if (errCommit) {
            console.error("Commit error:\n", errCommit);
            return db.rollback(() => res.status(500).json({ message: "Failed to finalize transaction" }));
          }
          const payload = {
            group: { id: groupId, name: normalizedName, created_by: createdBy },
            membersAdded: memberIdsToInsert.length
          };
          res.status(201).json(payload);
          // Emit domain event for Mongo logging and realtime notifications
          try {
            bus.emit('group:created', {
              groupId,
              name: normalizedName,
              createdBy,
              memberIds: memberIdsToInsert,
            });
          } catch (e) {
            console.error('Emit group:created failed:', e);
          }
        });
      });
    });
  });
});



module.exports = router;

// GET /api/activity?groupId=12&limit=50
router.get('/activity', cookieAuth, async (req, res) => {
  const groupId = parseInt(req.query.groupId, 10);
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ message: 'Invalid groupId' });
  }
  // Access check: ensure user is creator or member
  const userId = req.user.id;
  const sql = `
    SELECT g.id
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    WHERE g.id = ? AND (g.created_by = ? OR gm.user_id IS NOT NULL)
    LIMIT 1
  `;
  db.query(sql, [userId, groupId, userId], async (err, rows) => {
    if (err) {
      console.error('Activity access check error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    try {
      const logs = await ActivityLog.find({ group_id: groupId })
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit)
        .lean();
      return res.json({ activity: logs });
    } catch (e) {
      console.error('Fetch activity logs error:', e);
      return res.status(500).json({ message: 'Failed to load activity' });
    }
  });
});

// GET /api/recent-activities?limit=50 - latest activity across user's groups
router.get('/recent-activities', cookieAuth, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);

  // Find group ids where user is creator or member
  const groupsSql = `
    SELECT DISTINCT g.id AS group_id
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id
    WHERE g.created_by = ? OR gm.user_id = ?
  `;
  db.query(groupsSql, [userId, userId], async (err, rows) => {
    if (err) {
      console.error('Recent activities groups query error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
    const groupIds = (rows || []).map(r => r.group_id);
    if (groupIds.length === 0) return res.json({ activities: [] });
    try {
      // Include activities where current user is the actor OR a participant
      const logs = await ActivityLog.find({
        group_id: { $in: groupIds },
        $or: [
          { user_id: userId },
          { 'meta.participants': userId },
        ],
      })
        .sort({ timestamp: -1, _id: -1 })
        .limit(limit)
        .lean();
      return res.json({ activities: logs });
    } catch (e) {
      console.error('Fetch recent activities error:', e);
      return res.status(500).json({ message: 'Failed to load recent activities' });
    }
  });
});

// GET /api/settlements/:groupId - returns cached settlements (compute if missing)
router.get('/settlements/:groupId', cookieAuth, async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ message: 'Invalid groupId' });
  }
  const userId = req.user.id;
  const accessSql = `
    SELECT g.id
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    WHERE g.id = ? AND (g.created_by = ? OR gm.user_id IS NOT NULL)
    LIMIT 1
  `;
  db.query(accessSql, [userId, groupId, userId], async (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!rows || rows.length === 0) return res.status(403).json({ message: 'Forbidden' });
    try {
      let settlements = await getCachedSettlements(groupId);
      if (!settlements || settlements.length === 0) {
        settlements = await computeAndCacheSettlements(groupId);
      }
      // Map user ids to names for friendly display
      const usersSql = `
        SELECT DISTINCT u.id, u.name, u.email
        FROM (
          SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
          UNION
          SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
        ) x JOIN users u ON u.id = x.user_id
      `;
      db.query(usersSql, [groupId, groupId], (uErr, uRows) => {
        if (uErr) return res.status(500).json({ message: 'Server error' });
        const nameMap = new Map((uRows || []).map(r => [r.id, r.name || r.email]));
        // Filter to current user's perspective for Settle Up view
        const mine = (settlements || []).filter(s => s.from === userId || s.to === userId);
        const enriched = mine.map(s => ({
          from: s.from,
          to: s.to,
          amount: s.amount,
          from_name: nameMap.get(s.from) || `User ${s.from}`,
          to_name: nameMap.get(s.to) || `User ${s.to}`,
        }));
        return res.json({ settlements: enriched });
      });
    } catch (e) {
      console.error('Get settlements error:', e);
      return res.status(500).json({ message: 'Failed to load settlements' });
    }
  });
});

// GET /api/settlements/:groupId/full - same data; frontend can use to display entire matrix
router.get('/settlements/:groupId/full', cookieAuth, async (req, res) => {
  const groupId = parseInt(req.params.groupId, 10);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return res.status(400).json({ message: 'Invalid groupId' });
  }
  const userId = req.user.id;
  const accessSql = `
    SELECT g.id
    FROM groups_made g
    LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    WHERE g.id = ? AND (g.created_by = ? OR gm.user_id IS NOT NULL)
    LIMIT 1
  `;
  db.query(accessSql, [userId, groupId, userId], async (err, rows) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    if (!rows || rows.length === 0) return res.status(403).json({ message: 'Forbidden' });
    try {
      // Always recompute to ensure fresh data
      let settlements = await getCachedSettlements(groupId);
      if (!settlements || settlements.length === 0) {
        settlements = await computeAndCacheSettlements(groupId);
      }
      const usersSql = `
        SELECT DISTINCT u.id, u.name, u.email
        FROM (
          SELECT g.created_by AS user_id FROM groups_made g WHERE g.id = ?
          UNION
          SELECT gm.user_id FROM group_members gm WHERE gm.group_id = ?
        ) x JOIN users u ON u.id = x.user_id
      `;
      db.query(usersSql, [groupId, groupId], (uErr, uRows) => {
        if (uErr) return res.status(500).json({ message: 'Server error' });
        const nameMap = new Map((uRows || []).map(r => [r.id, r.name || r.email]));
        const enriched = (settlements || []).map(s => ({
          from: s.from,
          to: s.to,
          amount: s.amount,
          from_name: nameMap.get(s.from) || `User ${s.from}`,
          to_name: nameMap.get(s.to) || `User ${s.to}`,
        }));
        return res.json({ settlements: enriched });
      });
    } catch (e) {
      console.error('Get settlements full error:', e);
      return res.status(500).json({ message: 'Failed to load settlements' });
    }
  });
});
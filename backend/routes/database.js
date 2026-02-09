const express = require('express');
const router = express.Router();
const cookieAuth = require('../middleware/cookieAuth');
const db = require('../db/sqlconnect');
const mongoose = require('mongoose');

// MongoDB models
const ActivityLog = require('../mongo/ActivityLog');
const Notification = require('../mongo/Notification');
const SettlementCache = require('../mongo/SettlementCache');
const ReceiptCache = require('../mongo/ReceiptCache');

/**
 * GET /api/database/tables
 * Get list of MySQL tables
 */
router.get('/tables', cookieAuth, (req, res) => {
  db.query('SHOW TABLES', (err, rows) => {
    if (err) {
      console.error('Show tables error:', err);
      return res.status(500).json({ success: false, message: 'Failed to get tables' });
    }
    const tables = rows.map(r => Object.values(r)[0]);
    return res.json({ success: true, tables });
  });
});

/**
 * GET /api/database/table/:name
 * Get table structure and sample data
 */
router.get('/table/:name', cookieAuth, (req, res) => {
  const tableName = req.params.name;
  
  // Whitelist allowed tables for security
  const allowedTables = ['users', 'groups_made', 'group_members', 'expenses', 'expense_splits', 'expense_history'];
  if (!allowedTables.includes(tableName)) {
    return res.status(403).json({ success: false, message: 'Table not accessible' });
  }

  // Get table structure
  db.query(`DESCRIBE ${tableName}`, (descErr, descRows) => {
    if (descErr) {
      console.error('Describe table error:', descErr);
      return res.status(500).json({ success: false, message: 'Failed to describe table' });
    }

    // Get row count
    db.query(`SELECT COUNT(*) as count FROM ${tableName}`, (countErr, countRows) => {
      if (countErr) {
        return res.status(500).json({ success: false, message: 'Failed to count rows' });
      }

      // Get sample data (first 50 rows)
      db.query(`SELECT * FROM ${tableName} LIMIT 50`, (dataErr, dataRows) => {
        if (dataErr) {
          return res.status(500).json({ success: false, message: 'Failed to get data' });
        }

        return res.json({
          success: true,
          table: tableName,
          structure: descRows,
          rowCount: countRows[0].count,
          data: dataRows
        });
      });
    });
  });
});

/**
 * POST /api/database/query
 * Execute a read-only SQL query
 */
router.post('/query', cookieAuth, (req, res) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ success: false, message: 'Query is required' });
  }

  // Security: Only allow SELECT queries
  const trimmedQuery = query.trim().toUpperCase();
  if (!trimmedQuery.startsWith('SELECT')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Only SELECT queries are allowed for security. Use the app UI for modifications.' 
    });
  }

  // Block dangerous patterns
  const dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE'];
  for (const kw of dangerous) {
    if (trimmedQuery.includes(kw)) {
      return res.status(403).json({ success: false, message: `${kw} operations are not allowed` });
    }
  }

  const startTime = Date.now();
  db.query(query, (err, rows, fields) => {
    const executionTime = Date.now() - startTime;
    
    if (err) {
      return res.status(400).json({ 
        success: false, 
        message: err.message,
        sqlState: err.sqlState,
        errno: err.errno
      });
    }

    return res.json({
      success: true,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTime: `${executionTime}ms`,
      columns: fields ? fields.map(f => f.name) : [],
      data: rows
    });
  });
});

/**
 * GET /api/database/mongodb/collections
 * Get list of MongoDB collections
 */
router.get('/mongodb/collections', cookieAuth, async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return res.json({
      success: true,
      collections: collections.map(c => c.name)
    });
  } catch (err) {
    console.error('MongoDB collections error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get collections' });
  }
});

/**
 * GET /api/database/mongodb/collection/:name
 * Get MongoDB collection data
 */
router.get('/mongodb/collection/:name', cookieAuth, async (req, res) => {
  const collectionName = req.params.name;
  
  // Map collection name to model
  const models = {
    'activity_logs': ActivityLog,
    'notifications': Notification,
    'settlement_cache': SettlementCache,
    'receipt_cache': ReceiptCache
  };

  const Model = models[collectionName];
  if (!Model) {
    // Try direct collection access
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const count = await collection.countDocuments();
      const data = await collection.find().limit(50).toArray();
      return res.json({
        success: true,
        collection: collectionName,
        documentCount: count,
        data
      });
    } catch (err) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
  }

  try {
    const count = await Model.countDocuments();
    const data = await Model.find().limit(50).sort({ _id: -1 }).lean();
    
    return res.json({
      success: true,
      collection: collectionName,
      documentCount: count,
      data
    });
  } catch (err) {
    console.error('MongoDB collection error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get collection data' });
  }
});

/**
 * POST /api/database/mongodb/query
 * Execute a MongoDB find query
 */
router.post('/mongodb/query', cookieAuth, async (req, res) => {
  const { collection, filter, limit = 50 } = req.body;
  
  if (!collection) {
    return res.status(400).json({ success: false, message: 'Collection name is required' });
  }

  try {
    const coll = mongoose.connection.db.collection(collection);
    const parsedFilter = filter ? JSON.parse(filter) : {};
    
    const startTime = Date.now();
    const data = await coll.find(parsedFilter).limit(Math.min(limit, 100)).toArray();
    const executionTime = Date.now() - startTime;

    return res.json({
      success: true,
      documentCount: data.length,
      executionTime: `${executionTime}ms`,
      data
    });
  } catch (err) {
    return res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
});

/**
 * GET /api/database/stats
 * Get database statistics
 */
router.get('/stats', cookieAuth, async (req, res) => {
  try {
    // MySQL stats
    const mysqlStats = await new Promise((resolve, reject) => {
      const queries = [
        { key: 'users', sql: 'SELECT COUNT(*) as count FROM users' },
        { key: 'groups', sql: 'SELECT COUNT(*) as count FROM groups_made' },
        { key: 'expenses', sql: 'SELECT COUNT(*) as count FROM expenses' },
        { key: 'splits', sql: 'SELECT COUNT(*) as count FROM expense_splits' },
        { key: 'members', sql: 'SELECT COUNT(*) as count FROM group_members' }
      ];

      const results = {};
      let completed = 0;

      queries.forEach(q => {
        db.query(q.sql, (err, rows) => {
          if (!err && rows[0]) {
            results[q.key] = rows[0].count;
          }
          completed++;
          if (completed === queries.length) {
            resolve(results);
          }
        });
      });
    });

    // MongoDB stats
    const mongoStats = {
      activityLogs: await ActivityLog.countDocuments(),
      notifications: await Notification.countDocuments(),
      settlementCache: await SettlementCache.countDocuments(),
      receiptCache: await ReceiptCache.countDocuments()
    };

    return res.json({
      success: true,
      mysql: mysqlStats,
      mongodb: mongoStats
    });
  } catch (err) {
    console.error('Database stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cookieAuth = require('../middleware/cookieAuth');
const { chatWithAI, getExpenseInsights } = require('../services/aiChatbot');
const { extractExpenseFromReceiptVision } = require('../services/receiptOCR');
const { parseVoiceWithAI, parseVoiceSettlement } = require('../services/voiceProcessor');
const { getDebtVisualization } = require('../services/debtGraph');
const { getBalancesAtDate, getGroupAuditTrail, getExpenseHistory, undoExpense, redoExpense } = require('../services/timeTravel');
const { getPredictiveInsights } = require('../services/predictions');
const db = require('../db/sqlconnect');
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/receipts/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'));
    }
  }
});

// Ensure upload directory exists
const ensureUploadDir = async () => {
  try {
    await fs.mkdir('uploads/receipts', { recursive: true });
  } catch (err) {
    console.error('Error creating upload directory:', err);
  }
};
ensureUploadDir();

/**
 * POST /api/ai/chat
 * AI Chatbot endpoint
 */
router.post('/chat', cookieAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a message' 
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message too long. Please keep it under 500 characters.'
      });
    }

    const userId = req.user.id;
    const userName = req.user.name || req.user.username || 'User';

    const response = await chatWithAI(userId, message.trim(), userName);
    
    return res.json(response);

  } catch (error) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat request'
    });
  }
});

/**
 * GET /api/ai/insights
 * Get AI-powered expense insights
 */
router.get('/insights', cookieAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.name || req.user.username || 'User';

    const insights = await getExpenseInsights(userId, userName);
    
    return res.json(insights);

  } catch (error) {
    console.error('Insights endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate insights'
    });
  }
});

/**
 * POST /api/ai/scan-receipt
 * Upload receipt image and extract expense data
 */
router.post('/scan-receipt', cookieAuth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a receipt image'
      });
    }

    console.log('Processing receipt:', req.file.path);

    // Extract expense data from receipt
    const result = await extractExpenseFromReceiptVision(req.file.path);

    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(err => 
      console.error('Error deleting file:', err)
    );

    if (result.success) {
      return res.json({
        success: true,
        message: 'Receipt processed successfully',
        data: result.data,
        method: result.method || 'ocr'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to extract data from receipt'
      });
    }

  } catch (error) {
    console.error('Receipt scan error:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to process receipt',
      error: error.message
    });
  }
});

/**
 * GET /api/ai/status
 * Check if AI features are configured
 */
router.get('/status', cookieAuth, (req, res) => {
  const hasGeminiKey = process.env.GEMINI_API_KEY && 
                       process.env.GEMINI_API_KEY !== 'dummy' && 
                       process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

  return res.json({
    success: true,
    aiEnabled: hasGeminiKey,
    features: {
      chatbot: hasGeminiKey,
      receiptScanning: hasGeminiKey,
      insights: true,
      voiceParsing: true,
      debtGraph: true,
      timeTravel: true,
      predictions: true,
      subGroups: true
    },
    message: hasGeminiKey 
      ? 'AI features are enabled' 
      : 'AI features disabled. Add GEMINI_API_KEY to enable chatbot and receipt scanning. Get free key: https://makersuite.google.com/app/apikey'
  });
});

/* ===============================
   VOICE-FIRST INTERFACE
   =============================== */

/**
 * POST /api/ai/voice-parse
 * Smart AI-powered voice-to-expense parsing
 */
router.post('/voice-parse', cookieAuth, async (req, res) => {
  try {
    const { transcript, groupId } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ success: false, message: 'Transcript is required' });
    }
    const userId = req.user.id;
    const result = await parseVoiceWithAI(transcript, groupId, userId);
    return res.json(result);
  } catch (error) {
    console.error('Voice parse error:', error);
    return res.status(500).json({ success: false, message: 'Failed to parse voice input' });
  }
});

/**
 * POST /api/ai/voice-settle
 * Parse voice settlement commands
 */
router.post('/voice-settle', cookieAuth, async (req, res) => {
  try {
    const { transcript, groupId } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, message: 'Transcript is required' });
    }
    const result = await parseVoiceSettlement(transcript, groupId, req.user.id);
    return res.json(result);
  } catch (error) {
    console.error('Voice settle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to parse settlement' });
  }
});

/* ===============================
   DEBT GRAPH VISUALIZATION
   =============================== */

/**
 * GET /api/ai/debt-graph/:groupId
 * Get optimized debt graph with circular debt detection
 */
router.get('/debt-graph/:groupId', cookieAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    if (!groupId) return res.status(400).json({ success: false, message: 'Invalid groupId' });
    
    const data = await getDebtVisualization(groupId);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Debt graph error:', error);
    return res.status(500).json({ success: false, message: 'Failed to build debt graph' });
  }
});

/* ===============================
   TIME TRAVEL & AUDIT TRAIL
   =============================== */

/**
 * GET /api/ai/time-travel/:groupId
 * Get balances as of a specific date
 */
router.get('/time-travel/:groupId', cookieAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const { date } = req.query;
    if (!groupId) return res.status(400).json({ success: false, message: 'Invalid groupId' });
    if (!date) return res.status(400).json({ success: false, message: 'Date query param required (YYYY-MM-DD)' });

    const data = await getBalancesAtDate(groupId, date);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Time travel error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to query balances' });
  }
});

/**
 * GET /api/ai/audit-trail/:groupId
 * Get full audit trail for a group
 */
router.get('/audit-trail/:groupId', cookieAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const limit = parseInt(req.query.limit || '50', 10);
    if (!groupId) return res.status(400).json({ success: false, message: 'Invalid groupId' });

    const trail = await getGroupAuditTrail(groupId, limit);
    return res.json({ success: true, trail });
  } catch (error) {
    console.error('Audit trail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load audit trail' });
  }
});

/**
 * GET /api/ai/expense-history/:expenseId
 * Get version history for a specific expense
 */
router.get('/expense-history/:expenseId', cookieAuth, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId, 10);
    if (!expenseId) return res.status(400).json({ success: false, message: 'Invalid expenseId' });

    const history = await getExpenseHistory(expenseId);
    return res.json({ success: true, history });
  } catch (error) {
    console.error('Expense history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load history' });
  }
});

/**
 * POST /api/ai/undo-expense/:expenseId
 * Undo (delete) an expense with audit trail
 */
router.post('/undo-expense/:expenseId', cookieAuth, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.expenseId, 10);
    if (!expenseId) return res.status(400).json({ success: false, message: 'Invalid expenseId' });

    const result = await undoExpense(expenseId, req.user.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Undo expense error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to undo expense' });
  }
});

/**
 * POST /api/ai/redo-expense/:historyId
 * Redo (restore) a deleted expense from history
 */
router.post('/redo-expense/:historyId', cookieAuth, async (req, res) => {
  try {
    const historyId = parseInt(req.params.historyId, 10);
    if (!historyId) return res.status(400).json({ success: false, message: 'Invalid historyId' });

    const result = await redoExpense(historyId, req.user.id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Redo expense error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to redo expense' });
  }
});

/* ===============================
   PREDICTIVE ANALYSIS
   =============================== */

/**
 * GET /api/ai/predictions
 * Get spending predictions and analytics
 */
router.get('/predictions', cookieAuth, async (req, res) => {
  try {
    const result = await getPredictiveInsights(req.user.id);
    return res.json(result);
  } catch (error) {
    console.error('Predictions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate predictions' });
  }
});

/* ===============================
   HIERARCHICAL SUB-GROUPS
   =============================== */

/**
 * POST /api/ai/subgroup
 * Create a sub-group under a parent group
 */
router.post('/subgroup', cookieAuth, async (req, res) => {
  try {
    const { name, parentId, memberIds } = req.body;
    if (!name || !parentId) {
      return res.status(400).json({ success: false, message: 'name and parentId required' });
    }

    const createdBy = req.user.id;

    // Verify parent exists and user has access
    const [parent] = await query(
      'SELECT id, created_by FROM groups_made WHERE id = ?', [parentId]
    );
    if (!parent) return res.status(404).json({ success: false, message: 'Parent group not found' });

    // Create sub-group
    const result = await query(
      'INSERT INTO groups_made (name, created_by, parent_id) VALUES (?, ?, ?)',
      [name.trim(), createdBy, parentId]
    );
    const subGroupId = result.insertId;

    // Add members
    const ids = Array.isArray(memberIds) ? [...new Set([createdBy, ...memberIds])] : [createdBy];
    for (const uid of ids) {
      await query(
        'INSERT IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
        [subGroupId, uid]
      ).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      subGroup: { id: subGroupId, name: name.trim(), parent_id: parentId },
      message: 'Sub-group created'
    });
  } catch (error) {
    console.error('Create subgroup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create sub-group' });
  }
});

/**
 * GET /api/ai/subgroups/:parentId
 * Get sub-groups of a parent group
 */
router.get('/subgroups/:parentId', cookieAuth, async (req, res) => {
  try {
    const parentId = parseInt(req.params.parentId, 10);
    if (!parentId) return res.status(400).json({ success: false, message: 'Invalid parentId' });

    const subGroups = await query(
      'SELECT g.id, g.name, g.created_by, u.name AS created_by_name FROM groups_made g JOIN users u ON u.id = g.created_by WHERE g.parent_id = ?',
      [parentId]
    );

    // Get consolidated balances across all sub-groups
    const allGroupIds = [parentId, ...subGroups.map(s => s.id)];
    const placeholders = allGroupIds.map(() => '?').join(',');

    const consolidated = await query(`
      SELECT u.id, u.name,
        COALESCE(SUM(CASE WHEN e.paid_by = u.id THEN e.amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN es.user_id = u.id THEN es.owed_amount ELSE 0 END), 0) as total_owed
      FROM users u
      LEFT JOIN expenses e ON e.paid_by = u.id AND e.group_id IN (${placeholders})
      LEFT JOIN expense_splits es ON es.user_id = u.id AND es.expense_id IN (
        SELECT id FROM expenses WHERE group_id IN (${placeholders})
      )
      WHERE u.id IN (
        SELECT DISTINCT user_id FROM group_members WHERE group_id IN (${placeholders})
      )
      GROUP BY u.id, u.name
    `, [...allGroupIds, ...allGroupIds, ...allGroupIds]);

    return res.json({
      success: true,
      subGroups,
      consolidatedBalances: consolidated.map(c => ({
        id: c.id,
        name: c.name,
        paid: +parseFloat(c.total_paid).toFixed(2),
        owed: +parseFloat(c.total_owed).toFixed(2),
        balance: +(parseFloat(c.total_paid) - parseFloat(c.total_owed)).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Subgroups error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load sub-groups' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const EmailOtp = require('../mongo/EmailOtp');
const { sendOtpEmail } = require('../services/mailer');
const db = require('../db/sqlconnect');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'heyheyhey';
const ttlMinutes = parseInt(process.env.OTP_TTL_MINUTES || '10', 10);

// POST /api/auth/signup/request-otp
router.post('/signup/request-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required' });
    }
    // Block OTP sending if email already exists (signup is for new users)
    const existsSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    db.query(existsSql, [email], async (chkErr, rows) => {
      if (chkErr) {
        console.error('check existing email error:', chkErr);
        return res.status(500).json({ message: 'Server error' });
      }
      if (rows && rows.length > 0) {
        return res.status(409).json({ message: 'Email already exists. Please sign in.' });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      await EmailOtp.findOneAndUpdate(
        { email, purpose: 'signup' },
        { email, code, purpose: 'signup', expiresAt, createdAt: new Date() },
        { upsert: true }
      );
      try {
        await sendOtpEmail(email, code);
      } catch (e) {
        console.warn('sendOtpEmail failed, continuing:', e?.message);
      }
      return res.json({ message: 'OTP sent' });
    });
  } catch (err) {
    console.error('request-otp error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/signup/verify-otp
router.post('/signup/verify-otp', async (req, res) => {
  try {
    const { email, code, names, password } = req.body || {};
    if (!email || !code || !names || !password) {
      return res.status(400).json({ message: 'email, code, names, password are required' });
    }
    const rec = await EmailOtp.findOne({ email, purpose: 'signup' });
    if (!rec || rec.code !== String(code) || rec.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Create user if not exists
    const checkSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    db.query(checkSql, [email], (chkErr, chkRows) => {
      if (chkErr) {
        console.error('check user error:', chkErr);
        return res.status(500).json({ message: 'Server error' });
      }
      const createUser = () => {
        const insSql = 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)';
        // Hash password before storing
        const passwordHash = bcrypt.hashSync(password, 10);
        db.query(insSql, [names, email, passwordHash], (insErr, insRes) => {
          if (insErr) {
            console.error('create user error:', insErr);
            return res.status(500).json({ message: 'Failed to create user' });
          }
          const userId = insRes.insertId;
          finish(userId);
        });
      };
      const finish = (userId) => {
        // Cleanup OTP
        EmailOtp.deleteMany({ email, purpose: 'signup' }).catch(() => {});
        // Issue auth cookie
        const token = jwt.sign({ id: userId, email, username: names }, JWT_SECRET, { expiresIn: '1h' });
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
          maxAge: 60 * 60 * 1000,
        });
        return res.json({ id: userId, email, name: names });
      };
      if (chkRows && chkRows.length > 0) {
        // User exists; log them in
        return finish(chkRows[0].id);
      }
      return createUser();
    });
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

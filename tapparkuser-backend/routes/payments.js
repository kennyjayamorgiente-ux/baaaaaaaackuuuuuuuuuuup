const express = require('express');
const { body, validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');

const router = express.Router();
const DEMO_TOPUP_ENABLED = process.env.ENABLE_DEMO_TOPUP === 'true';

const topUpValidation = [
  body('amount').isFloat({ min: 10 }).withMessage('Minimum top-up amount is $10'),
  body('paymentMethod').isIn(['card', 'bank_transfer', 'wallet']).withMessage('Valid payment method is required')
];

const paymentMethodFallbackMap = {
  card: 1,
  bank_transfer: 2,
  wallet: 3
};

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const resolvePaymentMethodId = async (paymentMethod) => {
  const method = String(paymentMethod || '').trim().toLowerCase();
  const fallbackId = paymentMethodFallbackMap[method] || 1;

  try {
    const rows = await db.query(
      'SELECT id FROM payment_method WHERE LOWER(method_name) = ? LIMIT 1',
      [method]
    );
    if (rows.length > 0) {
      return rows[0].id;
    }
  } catch (_) {
    // Fall back to known IDs for environments where the lookup table differs.
  }

  return fallbackId;
};

// Get payment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 10);
    const type = req.query.type;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        p.payment_id,
        p.subscription_id,
        p.amount,
        COALESCE(p.payment_type, CASE WHEN p.subscription_id IS NOT NULL THEN 'subscription' ELSE 'manual' END) as payment_type,
        pm.method_name as payment_method,
        p.status,
        COALESCE(p.payment_date, p.created_at) as created_at,
        sub.plan_id,
        sub.user_id,
        plan.plan_name,
        plan.number_of_hours
      FROM payments p
      LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
      LEFT JOIN subscriptions sub ON p.subscription_id = sub.subscription_id
      LEFT JOIN plans plan ON sub.plan_id = plan.plan_id
      WHERE (p.user_id = ? OR sub.user_id = ?)
    `;

    const params = [req.user.user_id, req.user.user_id];

    if (type) {
      query += ' AND p.payment_type = ?';
      params.push(type);
    }

    query += ' ORDER BY COALESCE(p.payment_date, p.created_at) DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const payments = await db.query(query, params);

    const totalCount = await db.query(
      `SELECT COUNT(*) as count
       FROM payments p
       LEFT JOIN subscriptions sub ON p.subscription_id = sub.subscription_id
       WHERE (p.user_id = ? OR sub.user_id = ?)` + (type ? ' AND p.payment_type = ?' : ''),
      type ? [req.user.user_id, req.user.user_id, type] : [req.user.user_id, req.user.user_id]
    );

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Top up wallet (demo mode only)
router.post('/topup', authenticateToken, topUpValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!DEMO_TOPUP_ENABLED) {
      return res.status(501).json({
        success: false,
        message: 'Wallet top-up endpoint is disabled. Enable ENABLE_DEMO_TOPUP=true only for controlled testing.'
      });
    }

    const { amount, paymentMethod } = req.body;
    const numericAmount = Number(amount);
    const paymentMethodId = await resolvePaymentMethodId(paymentMethod);
    const transactionId = `DEMO_TOPUP_${randomUUID()}`;

    await db.transaction([
      {
        sql: 'UPDATE users SET hour_balance = hour_balance + ? WHERE user_id = ?',
        params: [numericAmount, req.user.user_id]
      },
      {
        sql: `
          INSERT INTO payments (user_id, amount, payment_type, payment_method_id, status, payment_date)
          VALUES (?, ?, 'topup', ?, 'completed', NOW())
        `,
        params: [req.user.user_id, numericAmount, paymentMethodId]
      }
    ]);

    const user = await db.query(
      'SELECT hour_balance as balance FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    const paymentRecord = await db.query(
      'SELECT payment_id FROM payments WHERE user_id = ? ORDER BY payment_id DESC LIMIT 1',
      [req.user.user_id]
    );

    if (paymentRecord.length > 0) {
      await logUserActivity(
        req.user.user_id,
        ActionTypes.PAYMENT_TOPUP,
        `Wallet topped up (demo): ${numericAmount} via ${paymentMethod}`,
        paymentRecord[0].payment_id
      );
    }

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        transactionId,
        amount: numericAmount,
        newBalance: user[0].balance
      }
    });
  } catch (error) {
    console.error('Top up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to top up wallet'
    });
  }
});

// Get current balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await db.query(
      'SELECT hour_balance as balance FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: user[0].balance
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance'
    });
  }
});

// Process parking payment
router.post('/parking/:sessionId', authenticateToken, async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Deprecated endpoint. Use /api/parking/end/:sessionId for parking completion and charging.'
  });
});

// Get payment statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const period = parsePositiveInt(req.query.period, 30);

    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_type = 'topup' THEN amount ELSE 0 END) as total_topup,
        SUM(CASE WHEN payment_type = 'parking_fee' THEN amount ELSE 0 END) as total_parking_fees,
        AVG(CASE WHEN payment_type = 'parking_fee' THEN amount ELSE NULL END) as avg_parking_cost
      FROM payments 
      WHERE user_id = ? AND COALESCE(payment_date, created_at) >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.user.user_id, period]);

    const monthlyStats = await db.query(`
      SELECT 
        DATE_FORMAT(COALESCE(payment_date, created_at), '%Y-%m') as month,
        COUNT(*) as payments_count,
        SUM(amount) as total_amount
      FROM payments 
      WHERE user_id = ? AND COALESCE(payment_date, created_at) >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(COALESCE(payment_date, created_at), '%Y-%m')
      ORDER BY month DESC
    `, [req.user.user_id]);

    res.json({
      success: true,
      data: {
        summary: stats[0],
        monthlyBreakdown: monthlyStats
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics'
    });
  }
});

module.exports = router;

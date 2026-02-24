const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');
const { settlePenaltyWithHours } = require('../utils/penaltyHelper');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await db.query(`
      SELECT 
        plan_id,
        plan_name,
        cost,
        number_of_hours,
        description
      FROM plans 
      ORDER BY cost ASC
    `);

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans'
    });
  }
});

// Purchase a subscription plan
router.post('/purchase', authenticateToken, [
  body('plan_id').isInt().withMessage('Plan ID must be a valid integer'),
  body('payment_method_id').isInt().withMessage('Payment method ID must be a valid integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { plan_id, payment_method_id } = req.body;

    // Get plan details
    const plans = await db.query(`
      SELECT plan_id, plan_name, cost, number_of_hours 
      FROM plans 
      WHERE plan_id = ?
    `, [plan_id]);

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found'
      });
    }

    const plan = plans[0];

    // Start transaction
    const results = await db.transaction([
      // Create subscription
      {
        sql: `
          INSERT INTO subscriptions (user_id, plan_id, hours_remaining, hours_used, status)
          VALUES (?, ?, ?, 0, 'active')
        `,
        params: [req.user.user_id, plan_id, plan.number_of_hours]
      },
      // Create payment record
      {
        sql: `
          INSERT INTO payments (user_id, amount, status, payment_date, payment_method_id, subscription_id)
          VALUES (?, ?, 'paid', NOW(), ?, LAST_INSERT_ID())
        `,
        params: [req.user.user_id, plan.cost, payment_method_id]
      }
    ]);

    // Get subscription ID for logging / penalty deduction
    const subscriptionRecord = await db.query(
      'SELECT subscription_id FROM subscriptions WHERE user_id = ? ORDER BY subscription_id DESC LIMIT 1',
      [req.user.user_id]
    );

    let penaltyAdjustment = {
      penaltyAppliedHours: 0,
      hoursAfterPenalty: plan.number_of_hours,
      outstandingPenaltyHours: 0
    };

    if (subscriptionRecord.length > 0) {
      penaltyAdjustment = await settlePenaltyWithHours(
        req.user.user_id,
        plan.number_of_hours,
        subscriptionRecord[0].subscription_id
      );
    }

    // Get updated balance after any penalty deduction
    const updatedBalance = await db.query(`
      SELECT 
        COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
      FROM subscriptions s
      WHERE s.user_id = ? AND s.status = 'active'
    `, [req.user.user_id]);

    // Log subscription purchase
    if (subscriptionRecord.length > 0) {
      await logUserActivity(
        req.user.user_id,
        ActionTypes.SUBSCRIPTION_PURCHASE,
        `Subscription purchased: ${plan.plan_name} - ${plan.number_of_hours} hours for ₱${plan.cost}`,
        subscriptionRecord[0].subscription_id
      );
    }

    res.json({
      success: true,
      message: 'Subscription purchased successfully',
      data: {
        plan_name: plan.plan_name,
        hours_added: plan.number_of_hours,
        hours_after_penalty: penaltyAdjustment.hoursAfterPenalty,
        penalty_deducted_hours: penaltyAdjustment.penaltyAppliedHours,
        outstanding_penalty_hours: penaltyAdjustment.outstandingPenaltyHours,
        cost: plan.cost,
        total_hours_remaining: updatedBalance[0]?.total_hours_remaining || 0
      }
    });

  } catch (error) {
    console.error('Purchase subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to purchase subscription'
    });
  }
});

// Get user's subscription balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    // Get total hours from active subscriptions
    const subscriptionBalance = await db.query(`
      SELECT 
        COALESCE(SUM(s.hours_remaining), 0) as total_hours_remaining,
        COALESCE(SUM(s.hours_used), 0) as total_hours_used,
        COUNT(s.subscription_id) as active_subscriptions
      FROM subscriptions s
      WHERE s.user_id = ? AND s.status = 'active' AND s.hours_remaining > 0
    `, [req.user.user_id]);

    // Get detailed subscription info
    const subscriptionDetails = await db.query(`
      SELECT 
        s.subscription_id,
        s.purchase_date,
        s.hours_remaining,
        s.hours_used,
        p.plan_name,
        p.cost,
        p.number_of_hours
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.user_id = ? AND s.status = 'active'
      ORDER BY s.purchase_date DESC
    `, [req.user.user_id]);

    res.json({
      success: true,
      data: {
        total_hours_remaining: subscriptionBalance[0].total_hours_remaining,
        total_hours_used: subscriptionBalance[0].total_hours_used,
        active_subscriptions: subscriptionBalance[0].active_subscriptions,
        subscriptions: subscriptionDetails
      }
    });
  } catch (error) {
    console.error('Get subscription balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription balance'
    });
  }
});

module.exports = router;

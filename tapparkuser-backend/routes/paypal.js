const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const paypal = require('../config/paypal');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');
const { settlePenaltyWithHours } = require('../utils/penaltyHelper');

const router = express.Router();

// Create PayPal order for subscription plan
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    // Get plan details
    const plans = await db.query(
      'SELECT plan_id, plan_name, cost, number_of_hours FROM plans WHERE plan_id = ?',
      [plan_id]
    );

    if (plans.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const plan = plans[0];

    // Determine callback URLs based on current host
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const forwardedHost = req.headers['x-forwarded-host'];
    const host = forwardedHost || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const returnUrl = `${baseUrl}/api/paypal/success`;
    const cancelUrl = `${baseUrl}/api/paypal/cancel`;

    // Create PayPal order
    const order = await paypal.createOrder(plan.cost, 'USD', { returnUrl, cancelUrl });

    // Store order info in database for tracking
    console.log('🔍 Storing transaction:', {
      user_id: req.user.user_id,
      plan_id: plan_id,
      plan_plan_id: plan.plan_id,
      order_id: order.id,
      cost: plan.cost
    });
    
    await db.query(
      `INSERT INTO paypal_transactions 
       (user_id, plan_id, paypal_order_id, amount, status, created_at) 
       VALUES (?, ?, ?, ?, 'created', NOW())`,
      [req.user.user_id, plan.plan_id, order.id, plan.cost]
    );

    // Get approval URL
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;

    res.json({
      success: true,
      data: {
        orderId: order.id,
        approvalUrl: approvalUrl,
        plan: {
          plan_id: plan.plan_id,
          plan_name: plan.plan_name,
          cost: plan.cost,
          hours: plan.number_of_hours
        }
      }
    });

  } catch (error) {
    console.error('Create PayPal order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order',
      error: error.message
    });
  }
});

// Capture PayPal payment after user approval
router.post('/capture-order', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Get transaction from database
    const transactions = await db.query(
      'SELECT * FROM paypal_transactions WHERE paypal_order_id = ? AND user_id = ?',
      [orderId, req.user.user_id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactions[0];
    
    console.log('🔍 Transaction found:', {
      transaction_id: transaction.id,
      user_id: transaction.user_id,
      plan_id: transaction.plan_id,
      paypal_order_id: transaction.paypal_order_id,
      amount: transaction.amount,
      status: transaction.status
    });

    // Capture the payment
    let captureData;
    try {
      captureData = await paypal.captureOrder(orderId);
    } catch (captureError) {
      // Check if order was already captured (this is actually success)
      if (captureError.response?.data?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
        console.log('✅ Order already captured - payment was successful');
        // Treat this as success since payment was already processed
        captureData = { status: 'COMPLETED', alreadyCaptured: true };
      } else {
        // Re-throw other capture errors
        throw captureError;
      }
    }

    // Check if payment was successful
    if (captureData.status === 'COMPLETED') {
      // Get plan details
      const plans = await db.query(
        'SELECT plan_id, plan_name, cost, number_of_hours FROM plans WHERE plan_id = ?',
        [transaction.plan_id]
      );

      if (plans.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = plans[0];

      // Start transaction to create subscription and update payment
      await db.transaction([
        // Create subscription
        {
          sql: `INSERT INTO subscriptions (user_id, plan_id, hours_remaining, hours_used, status, purchase_date)
                VALUES (?, ?, ?, 0, 'active', NOW())`,
          params: [req.user.user_id, plan.plan_id, plan.number_of_hours]
        },
        // Create payment record
        {
          sql: `INSERT INTO payments (user_id, amount, status, payment_date, payment_method_id, subscription_id, payment_type)
                VALUES (?, ?, 'completed', NOW(), 1, LAST_INSERT_ID(), 'paypal')`,
          params: [req.user.user_id, plan.cost]
        },
        // Update PayPal transaction
        {
          sql: `UPDATE paypal_transactions 
                SET status = 'completed', capture_id = ?, updated_at = NOW() 
                WHERE paypal_order_id = ?`,
          params: [captureData.id, orderId]
        }
      ]);

      // Get the latest subscription id
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

      // Get updated balance after penalty deduction
      const updatedBalance = await db.query(
        `SELECT COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
         FROM subscriptions WHERE user_id = ? AND status = 'active'`,
        [req.user.user_id]
      );

      // Log subscription purchase
      await logUserActivity(
        req.user.user_id,
        ActionTypes.SUBSCRIPTION_PURCHASE,
        `Subscription purchased via PayPal: ${plan.plan_name} - ${plan.number_of_hours} hours for ₱${plan.cost}`,
        subscriptionRecord[0]?.subscription_id || null
      );

      res.json({
        success: true,
        message: penaltyAdjustment.penaltyAppliedHours > 0
          ? `Payment successful! Subscription activated. ${penaltyAdjustment.penaltyAppliedHours.toFixed(2)} hour(s) have been used to settle your outstanding penalty.`
          : 'Payment successful! Subscription activated.',
        data: {
          plan_name: plan.plan_name,
          hours_added: plan.number_of_hours,
          hours_after_penalty: penaltyAdjustment.hoursAfterPenalty,
          penalty_deducted_hours: penaltyAdjustment.penaltyAppliedHours,
          outstanding_penalty_hours: penaltyAdjustment.outstandingPenaltyHours,
          cost: plan.cost,
          total_hours_remaining: updatedBalance[0]?.total_hours_remaining || 0,
          orderId: orderId,
          captureId: captureData.id
        }
      });

    } else {
      // Update transaction status to failed
      await db.query(
        'UPDATE paypal_transactions SET status = ? WHERE paypal_order_id = ?',
        [captureData.status.toLowerCase(), orderId]
      );

      res.status(400).json({
        success: false,
        message: 'Payment was not completed',
        status: captureData.status
      });
    }

  } catch (error) {
    console.error('Capture PayPal order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to capture payment',
      error: error.message
    });
  }
});

// Cancel PayPal order
router.post('/cancel-order', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Update transaction status
    await db.query(
      'UPDATE paypal_transactions SET status = "cancelled", updated_at = NOW() WHERE paypal_order_id = ? AND user_id = ?',
      [orderId, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Payment cancelled'
    });

  } catch (error) {
    console.error('Cancel PayPal order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
});

// Get PayPal transaction status
router.get('/transaction/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const transactions = await db.query(
      `SELECT pt.*, p.plan_name, p.number_of_hours 
       FROM paypal_transactions pt
       LEFT JOIN plans p ON pt.plan_id = p.plan_id
       WHERE pt.paypal_order_id = ? AND pt.user_id = ?`,
      [orderId, req.user.user_id]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transactions[0]
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction'
    });
  }
});

module.exports = router;

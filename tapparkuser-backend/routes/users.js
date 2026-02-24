const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');

const router = express.Router();

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, title, message, type, is_read, data, created_at
      FROM notifications
      WHERE user_id = ?
    `;
    const params = [req.user.user_id];

    if (unreadOnly === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notifications = await db.query(query, params);

    const totalCount = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?' + (unreadOnly === 'true' ? ' AND is_read = FALSE' : ''),
      [req.user.user_id]
    );

    const unreadCount = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount: unreadCount[0].count,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Log notification read
    await logUserActivity(
      req.user.user_id,
      ActionTypes.NOTIFICATION_READ,
      `Notification marked as read`,
      parseInt(id)
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );

    // Log all notifications read
    if (result.affectedRows > 0) {
      await logUserActivity(
        req.user.user_id,
        ActionTypes.NOTIFICATION_READ_ALL,
        `Marked ${result.affectedRows} notifications as read`
      );
    }

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Delete notification
router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Log notification deletion
    await logUserActivity(
      req.user.user_id,
      ActionTypes.NOTIFICATION_DELETE,
      `Notification deleted`,
      parseInt(id)
    );

    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get user basic info
    const user = await db.query(
      'SELECT user_id as id, email, first_name, last_name, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    // Get subscription balance
    const subscriptionBalance = await db.query(`
      SELECT
        COALESCE(SUM(s.hours_remaining), 0) as total_hours_remaining,
        COALESCE(SUM(s.hours_used), 0) as total_hours_used,
        COUNT(s.subscription_id) as active_subscriptions
      FROM subscriptions s
      WHERE s.user_id = ? AND s.status = 'active' AND s.hours_remaining > 0
    `, [req.user.user_id]);

    // Get active parking session
    const activeSession = await db.query(`
      SELECT ps.*, v.plate_number, v.vehicle_type, pl.name as location_name
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.user_id = ? AND ps.status = 'active'
      ORDER BY ps.start_time DESC
      LIMIT 1
    `, [req.user.user_id]);

    // Get recent parking sessions
    const recentSessions = await db.query(`
      SELECT ps.*, v.plate_number, pl.name as location_name
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.user_id = ?
      ORDER BY ps.start_time DESC
      LIMIT 5
    `, [req.user.user_id]);

    // Get vehicle count
    const vehicleCount = await db.query(
      'SELECT COUNT(*) as count FROM vehicles WHERE user_id = ?',
      [req.user.user_id]
    );

    // Get favorite locations count
    const favoriteCount = await db.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [req.user.user_id]
    );

    // Get unread notifications count
    const unreadNotifications = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );

    // Get monthly spending
    const monthlySpending = await db.query(`
      SELECT SUM(total_cost) as total
      FROM parking_sessions 
      WHERE user_id = ? AND status = 'completed' 
      AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [req.user.user_id]);

    res.json({
      success: true,
      data: {
        user: {
          ...user[0],
          balance: subscriptionBalance[0].total_hours_remaining // Add subscription balance to user object
        },
        activeSession: activeSession[0] || null,
        recentSessions,
        stats: {
          vehicleCount: vehicleCount[0].count,
          favoriteCount: favoriteCount[0].count,
          unreadNotifications: unreadNotifications[0].count,
          monthlySpending: monthlySpending[0].total || 0
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Update user profile image
router.put('/profile-image', authenticateToken, [
  body('imageUrl').isURL().withMessage('Valid image URL is required')
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

    const { imageUrl } = req.body;

    await db.query(
      'UPDATE users SET profile_image = ? WHERE user_id = ?',
      [imageUrl, req.user.user_id]
    );

    res.json({
      success: true,
      message: 'Profile image updated successfully'
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile image'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Parking statistics
    const parkingStats = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_sessions,
        SUM(CASE WHEN status = 'completed' THEN total_cost ELSE 0 END) as total_spent,
        AVG(CASE WHEN status = 'completed' THEN duration_minutes ELSE NULL END) as avg_duration_minutes
      FROM parking_sessions 
      WHERE user_id = ? AND start_time >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.user.user_id, parseInt(period)]);

    // Vehicle statistics
    const vehicleStats = await db.query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN vehicle_type = 'car' THEN 1 END) as cars,
        COUNT(CASE WHEN vehicle_type = 'motorcycle' THEN 1 END) as motorcycles,
        COUNT(CASE WHEN vehicle_type = 'bicycle' THEN 1 END) as bicycles,
        COUNT(CASE WHEN vehicle_type = 'ebike' THEN 1 END) as ebikes
      FROM vehicles 
      WHERE user_id = ?
    `, [req.user.user_id]);

    // Payment statistics
    const paymentStats = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_type = 'topup' THEN amount ELSE 0 END) as total_topup,
        SUM(CASE WHEN payment_type = 'parking_fee' THEN amount ELSE 0 END) as total_parking_fees
      FROM payments 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.user.user_id, parseInt(period)]);

    res.json({
      success: true,
      data: {
        parking: parkingStats[0],
        vehicles: vehicleStats[0],
        payments: paymentStats[0]
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Admin: Get all users (admin only)
router.get('/admin/all', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, first_name, last_name, phone, balance, is_verified, created_at
      FROM users
    `;
    const params = [];

    if (search) {
      query += ' WHERE (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await db.query(query, params);

    const totalCount = await db.query(
      'SELECT COUNT(*) as count FROM users' + (search ? ' WHERE (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)' : ''),
      search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

module.exports = router;

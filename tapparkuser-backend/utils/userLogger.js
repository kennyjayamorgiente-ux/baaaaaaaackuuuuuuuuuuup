const db = require('../config/database');

/**
 * Log user activity to user_logs table
 * @param {number} userId - User ID who performed the action
 * @param {string} actionType - Type of action (e.g., 'LOGIN', 'VEHICLE_CREATE', 'PARKING_BOOK')
 * @param {string} description - Detailed description of the action
 * @param {number|null} targetId - ID of the affected entity (e.g., vehicle_id, reservation_id)
 * @param {string|null} changeField - Field that was changed (for update actions)
 */
async function logUserActivity(userId, actionType, description, targetId = null, changeField = null) {
  try {
    await db.query(`
      INSERT INTO user_logs (
        user_id,
        action_type,
        description,
        target_id,
        change_field,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [userId, actionType, description, targetId, changeField]);
  } catch (error) {
    // Log error but don't throw - we don't want logging failures to break the app
    console.error('Error logging user activity:', error);
  }
}

// Common action types
const ActionTypes = {
  // Authentication
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  LOGOUT: 'LOGOUT',
  PROFILE_UPDATE: 'PROFILE_UPDATE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PROFILE_IMAGE_UPDATE: 'PROFILE_IMAGE_UPDATE',
  TERMS_ACCEPTED: 'TERMS_ACCEPTED',
  
  // Vehicles
  VEHICLE_CREATE: 'VEHICLE_CREATE',
  VEHICLE_UPDATE: 'VEHICLE_UPDATE',
  VEHICLE_DELETE: 'VEHICLE_DELETE',
  VEHICLE_SET_DEFAULT: 'VEHICLE_SET_DEFAULT',
  
  // Parking
  PARKING_BOOK: 'PARKING_BOOK',
  PARKING_START: 'PARKING_START',
  PARKING_END: 'PARKING_END',
  PARKING_CANCEL: 'PARKING_CANCEL',
  
  // Payments
  PAYMENT_TOPUP: 'PAYMENT_TOPUP',
  PAYMENT_PARKING_FEE: 'PAYMENT_PARKING_FEE',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  
  // Subscriptions
  SUBSCRIPTION_PURCHASE: 'SUBSCRIPTION_PURCHASE',
  SUBSCRIPTION_RENEW: 'SUBSCRIPTION_RENEW',
  SUBSCRIPTION_CANCEL: 'SUBSCRIPTION_CANCEL',
  
  // Favorites
  FAVORITE_ADD: 'FAVORITE_ADD',
  FAVORITE_REMOVE: 'FAVORITE_REMOVE',
  
  // Notifications
  NOTIFICATION_READ: 'NOTIFICATION_READ',
  NOTIFICATION_DELETE: 'NOTIFICATION_DELETE',
  NOTIFICATION_READ_ALL: 'NOTIFICATION_READ_ALL',
  
  // QR Codes
  QR_GENERATE: 'QR_GENERATE',
  QR_SCAN: 'QR_SCAN',
};

module.exports = {
  logUserActivity,
  ActionTypes
};


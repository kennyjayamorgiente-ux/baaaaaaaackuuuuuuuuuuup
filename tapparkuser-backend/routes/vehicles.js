const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');

const router = express.Router();

// Validation rules
const vehicleValidation = [
  body('plateNumber').trim().isLength({ min: 1 }).withMessage('Plate number is required'),
  body('vehicleType').isIn(['car', 'motorcycle', 'bicycle', 'ebike']).withMessage('Valid vehicle type is required'),
  body('brand').optional().trim().isLength({ min: 1 }).withMessage('Brand cannot be empty'),
  body('model').optional().trim().isLength({ min: 1 }).withMessage('Model cannot be empty'),
  body('color').optional().trim().isLength({ min: 1 }).withMessage('Color cannot be empty')
];

// Simple in-memory cache for vehicles (cache for 5 minutes)
const vehiclesCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to invalidate user's vehicle cache
const invalidateVehicleCache = (userId) => {
  const cacheKey = `vehicles_${userId}`;
  vehiclesCache.delete(cacheKey);
  console.log('🚗 Invalidated vehicle cache for user:', userId);
};

// Get all vehicles for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const cacheKey = `vehicles_${userId}`;
    const now = Date.now();
    
    // Check cache first
    const cachedData = vehiclesCache.get(cacheKey);
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
      console.log('🚗 Serving vehicles from cache for user:', userId);
      return res.json({
        success: true,
        data: {
          vehicles: cachedData.vehicles,
          cached: true
        }
      });
    }
    
    console.log('🚗 Fetching vehicles from database for user:', userId);
    
    // Optimized query with specific fields and better indexing usage
    const vehicles = await db.query(`
      SELECT 
        vehicle_id as id, 
        plate_number, 
        vehicle_type, 
        brand, 
        model, 
        color
      FROM vehicles 
      WHERE user_id = ? 
      ORDER BY vehicle_id ASC
      LIMIT 50
    `, [userId]);

    // Update cache
    vehiclesCache.set(cacheKey, {
      vehicles,
      timestamp: now
    });
    
    // Clean up old cache entries periodically
    if (vehiclesCache.size > 100) {
      const oldestKey = vehiclesCache.keys().next().value;
      vehiclesCache.delete(oldestKey);
    }

    res.json({
      success: true,
      data: {
        vehicles,
        cached: false
      }
    });

  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicles'
    });
  }
});

// Get specific vehicle
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const vehicles = await db.query(`
      SELECT vehicle_id as id, plate_number, vehicle_type, brand, model, color
      FROM vehicles 
      WHERE vehicle_id = ? AND user_id = ?
    `, [id, req.user.user_id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      data: {
        vehicle: vehicles[0]
      }
    });

  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle'
    });
  }
});

// Add new vehicle
router.post('/', authenticateToken, vehicleValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { plateNumber, vehicleType, brand, model, color } = req.body;

    // Check if plate number already exists for this user
    const existingVehicle = await db.query(
      'SELECT vehicle_id FROM vehicles WHERE user_id = ? AND plate_number = ?',
      [req.user.user_id, plateNumber]
    );

    if (existingVehicle.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this plate number already exists'
      });
    }

    // Insert new vehicle
    const result = await db.query(`
      INSERT INTO vehicles (user_id, plate_number, vehicle_type, brand, model, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.user_id, plateNumber, vehicleType, brand, model, color]);

    // Get the created vehicle
    const newVehicle = await db.query(
      'SELECT vehicle_id as id, plate_number, vehicle_type, brand, model, color FROM vehicles WHERE vehicle_id = ?',
      [result.insertId]
    );

    // Log vehicle creation
    await logUserActivity(
      req.user.user_id,
      ActionTypes.VEHICLE_CREATE,
      `Vehicle added: ${plateNumber} (${vehicleType})`,
      result.insertId
    );

    // Invalidate cache for this user
    invalidateVehicleCache(req.user.user_id);

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        vehicle: newVehicle[0]
      }
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add vehicle'
    });
  }
});

// Update vehicle
router.put('/:id', authenticateToken, vehicleValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { plateNumber, vehicleType, brand, model, color } = req.body;

    // Check if vehicle exists and belongs to user
    const existingVehicle = await db.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (existingVehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if plate number already exists for another vehicle of this user
    const duplicateVehicle = await db.query(
      'SELECT vehicle_id FROM vehicles WHERE user_id = ? AND plate_number = ? AND vehicle_id != ?',
      [req.user.user_id, plateNumber, id]
    );

    if (duplicateVehicle.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this plate number already exists'
      });
    }

    // Update vehicle
    await db.query(`
      UPDATE vehicles 
      SET plate_number = ?, vehicle_type = ?, brand = ?, model = ?, color = ?
      WHERE vehicle_id = ? AND user_id = ?
    `, [plateNumber, vehicleType, brand, model, color, id, req.user.user_id]);

    // Get updated vehicle
    const updatedVehicle = await db.query(
      'SELECT vehicle_id as id, plate_number, vehicle_type, brand, model, color FROM vehicles WHERE vehicle_id = ?',
      [id]
    );

    // Log vehicle update
    await logUserActivity(
      req.user.user_id,
      ActionTypes.VEHICLE_UPDATE,
      `Vehicle updated: ${plateNumber} (${vehicleType})`,
      parseInt(id),
      'plate_number, vehicle_type, brand, color'
    );

    // Invalidate cache for this user
    invalidateVehicleCache(req.user.user_id);

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: {
        vehicle: updatedVehicle[0]
      }
    });

  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle'
    });
  }
});

// Delete vehicle
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle exists and belongs to user
    const existingVehicle = await db.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (existingVehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle has any active or reserved parking sessions
    const activeReservations = await db.query(
      'SELECT reservation_id FROM reservations WHERE vehicle_id = ? AND booking_status IN ("active", "reserved")',
      [id]
    );

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with active or reserved parking session. Please end the session first.'
      });
    }

    // Check for completed reservations
    // Note: If the database migration has been run (allow_null_vehicle_id.sql),
    // the foreign key constraint will automatically set vehicle_id to NULL when vehicle is deleted.
    // For now, we'll just verify there are no active/reserved sessions (already checked above)
    // and proceed with deletion. The foreign key with ON DELETE SET NULL will handle completed reservations.

    // Get vehicle info before deletion for logging
    const vehicleInfo = await db.query(
      'SELECT plate_number, vehicle_type FROM vehicles WHERE vehicle_id = ?',
      [id]
    );

    // Delete vehicle
    const deleteResult = await db.query(
      'DELETE FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [id, req.user.user_id]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or could not be deleted'
      });
    }

    // Log vehicle deletion (non-blocking - don't fail if logging fails)
    if (vehicleInfo.length > 0) {
      try {
        await logUserActivity(
          req.user.user_id,
          ActionTypes.VEHICLE_DELETE,
          `Vehicle deleted: ${vehicleInfo[0].plate_number} (${vehicleInfo[0].vehicle_type})`,
          parseInt(id)
        );
      } catch (logError) {
        // Log the error but don't fail the deletion
        console.error('Failed to log vehicle deletion activity:', logError);
      }
    }

    // Invalidate cache for this user
    invalidateVehicleCache(req.user.user_id);

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to delete vehicle';
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Cannot delete vehicle: It is referenced by other records (e.g., parking reservations)';
    } else if (error.message) {
      errorMessage = `Failed to delete vehicle: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Note: Set default vehicle functionality removed since is_default column doesn't exist in database

module.exports = router;

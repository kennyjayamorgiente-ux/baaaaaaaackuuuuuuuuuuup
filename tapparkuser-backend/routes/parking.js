const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, checkBalance, attendantOrAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const {
  emitReservationUpdated,
  emitSpotsUpdated
} = require('../utils/realtime');

const router = express.Router();

// Update parking spot status (for attendant actions)
router.put('/spots/:spotId/status', authenticateToken, attendantOrAdmin, async (req, res) => {
  try {
    const { spotId } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;
    
    console.log(`🔧 Updating regular spot ${spotId} status to '${status}' by user ${userId}`);
    
    // Validate parameters
    if (!spotId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Validate status
    const validStatuses = ['available', 'unavailable', 'maintenance', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    // Check if spot exists
    const spotQuery = `
      SELECT parking_spot_id, spot_number, status, parking_section_id
      FROM parking_spot 
      WHERE parking_spot_id = ?
    `;
    const spotResult = await db.execute(spotQuery, [spotId]);
    
    const spotRows = spotResult.rows || [];
    if (spotRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking spot not found'
      });
    }
    
    const spot = spotRows[0];
    
    // Check if there's an active reservation for this spot
    const existingReservation = await db.execute(`
      SELECT reservation_id, booking_status 
      FROM reservations 
      WHERE parking_spots_id = ? 
        AND booking_status IN ('reserved', 'active')
    `, [spotId]);
    
    const reservationRows = existingReservation.rows || [];
    if (reservationRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status. Spot has an active reservation'
      });
    }
    
    // Update the spot status
    const updateResult = await db.execute(`
      UPDATE parking_spot 
      SET status = ?
      WHERE parking_spot_id = ?
    `, [status, spotId]);
    
    if (updateResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update spot status'
      });
    }
    
    console.log(`✅ Successfully updated regular spot ${spotId} status to '${status}'`);

    const areaRows = await db.query(`
      SELECT psec.parking_area_id as area_id
      FROM parking_spot ps
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      WHERE ps.parking_spot_id = ?
      LIMIT 1
    `, [spotId]);
    const areaId = areaRows[0]?.area_id ? Number(areaRows[0].area_id) : undefined;

    emitSpotsUpdated({
      areaId,
      spotId: Number(spotId),
      status,
      source: 'parking.update-spot-status'
    });
    
    res.json({
      success: true,
      message: `Spot status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Update regular spot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update spot status'
    });
  }
});

// Validation rules
const startParkingValidation = [
  body('vehicleId').isInt().withMessage('Valid vehicle ID is required'),
  body('locationId').isInt().withMessage('Valid location ID is required')
];

// Get all parking locations
router.get('/locations', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    let query = `
      SELECT 
        pa.parking_area_id as id, 
        pa.parking_area_name as name, 
        pa.location as address, 
        NULL as latitude, 
        NULL as longitude, 
        COUNT(ps.parking_spot_id) as total_spots, 
        COUNT(CASE WHEN ps.status = 'available' THEN 1 END) as available_spots, 
        SUM(
          CASE
            WHEN psec.section_mode = 'capacity_only' AND psec.vehicle_type IN ('motorcycle', 'bicycle')
            THEN COALESCE(psec.capacity, 0)
            ELSE 0
          END
        ) as capacity_total_spots,
        SUM(
          CASE
            WHEN psec.section_mode = 'capacity_only' AND psec.vehicle_type IN ('motorcycle', 'bicycle')
            THEN GREATEST(COALESCE(psec.capacity, 0) - COALESCE(psec.parked_count, 0) - COALESCE(psec.reserved_count, 0), 0)
            ELSE 0
          END
        ) as capacity_available_spots,
        50.00 as hourly_rate, 
        500.00 as daily_rate, 
        '24/7' as operating_hours, 
        'Basic parking' as amenities, 
        pa.status as is_active
      FROM parking_area pa
      LEFT JOIN parking_section psec ON pa.parking_area_id = psec.parking_area_id
      LEFT JOIN parking_spot ps ON psec.parking_section_id = ps.parking_section_id
      WHERE pa.status = 'active'
      GROUP BY pa.parking_area_id, pa.parking_area_name, pa.location, pa.status
    `;

    const params = [];

    // Order by name
    query += ' ORDER BY pa.parking_area_name';

    const locations = await db.query(query, params);

    // Parse JSON fields
    const processedLocations = locations.map(location => ({
      ...location,
      operating_hours: location.operating_hours || '24/7',
      amenities: location.amenities || 'Basic parking'
    }));

    res.json({
      success: true,
      data: {
        locations: processedLocations
      }
    });

  } catch (error) {
    console.error('Get parking locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking locations'
    });
  }
});

// Get specific parking location
router.get('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const locations = await db.query(`
      SELECT 
        pa.parking_area_id as id, 
        pa.parking_area_name as name, 
        pa.location as address, 
        NULL as latitude, 
        NULL as longitude, 
        COUNT(ps.parking_spot_id) as total_spots, 
        COUNT(CASE WHEN ps.status = 'free' THEN 1 END) as available_spots, 
        SUM(
          CASE
            WHEN psec.section_mode = 'capacity_only' AND psec.vehicle_type IN ('motorcycle', 'bicycle')
            THEN COALESCE(psec.capacity, 0)
            ELSE 0
          END
        ) as capacity_total_spots,
        SUM(
          CASE
            WHEN psec.section_mode = 'capacity_only' AND psec.vehicle_type IN ('motorcycle', 'bicycle')
            THEN GREATEST(COALESCE(psec.capacity, 0) - COALESCE(psec.parked_count, 0) - COALESCE(psec.reserved_count, 0), 0)
            ELSE 0
          END
        ) as capacity_available_spots,
        50.00 as hourly_rate, 
        500.00 as daily_rate, 
        '24/7' as operating_hours, 
        'Basic parking' as amenities, 
        pa.status as is_active
      FROM parking_area pa
      LEFT JOIN parking_section psec ON pa.parking_area_id = psec.parking_area_id
      LEFT JOIN parking_spot ps ON psec.parking_section_id = ps.parking_section_id
      WHERE pa.parking_area_id = ? AND pa.status = 'active'
      GROUP BY pa.parking_area_id, pa.parking_area_name, pa.location, pa.status
    `, [id]);

    if (locations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking location not found'
      });
    }

    const location = locations[0];
    location.operating_hours = location.operating_hours || '24/7';
    location.amenities = location.amenities || 'Basic parking';

    res.json({
      success: true,
      data: {
        location
      }
    });

  } catch (error) {
    console.error('Get parking location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking location'
    });
  }
});

// Start parking session
router.post('/start', authenticateToken, startParkingValidation, checkBalance(50), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { vehicleId, locationId } = req.body;

    // Verify vehicle belongs to user
    const vehicle = await db.query(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
      [vehicleId, req.user.user_id]
    );

    if (vehicle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Verify location exists and has available spots
    const location = await db.query(`
      SELECT 
        pa.parking_area_id as id, 
        COUNT(CASE WHEN ps.status = 'free' THEN 1 END) as available_spots, 
        50.00 as hourly_rate 
      FROM parking_area pa
      LEFT JOIN parking_section psec ON pa.parking_area_id = psec.parking_area_id
      LEFT JOIN parking_spot ps ON psec.parking_section_id = ps.parking_section_id
      WHERE pa.parking_area_id = ? AND pa.status = 'active'
      GROUP BY pa.parking_area_id
    `, [locationId]);

    if (location.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking location not found'
      });
    }

    if (location[0].available_spots <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No available parking spots'
      });
    }

    // Check if user has active parking session
    const activeSession = await db.query(
      'SELECT reservation_id as id FROM reservations WHERE user_id = ? AND booking_status = "active"',
      [req.user.user_id]
    );

    if (activeSession.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active parking session'
      });
    }

    // Generate QR code
    const qrCodeData = uuidv4();
    const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
      width: parseInt(process.env.QR_CODE_SIZE) || 200,
      margin: parseInt(process.env.QR_CODE_MARGIN) || 2
    });

    // Start transaction
    const results = await db.transaction([
      {
        sql: `
          INSERT INTO parking_sessions 
          (user_id, vehicle_id, location_id, qr_code, start_time, hourly_rate, status)
          VALUES (?, ?, ?, ?, NOW(), ?, 'active')
        `,
        params: [req.user.user_id, vehicleId, locationId, qrCodeData, location[0].hourly_rate]
      },
      {
        sql: `
          UPDATE parking_spot ps
          JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
          JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
          SET ps.status = 'occupied'
          WHERE pa.parking_area_id = ? AND ps.status = 'free'
          LIMIT 1
        `,
        params: [locationId]
      }
    ]);

    const sessionId = results[0].insertId;

    res.status(201).json({
      success: true,
      message: 'Parking session started successfully',
      data: {
        session: {
          id: sessionId,
          qrCode: qrCodeData,
          qrCodeImage,
          startTime: new Date().toISOString(),
          hourlyRate: location[0].hourly_rate
        }
      }
    });

  } catch (error) {
    console.error('Start parking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start parking session'
    });
  }
});

router.post('/end/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get parking session with vehicle type information
    const sessions = await db.query(`
      SELECT 
        r.reservation_id as id,
        r.user_id,
        r.vehicle_id,
        r.parking_spots_id as location_id,
        pa.parking_area_id as area_id,
        r.start_time,
        r.end_time,
        r.booking_status as status,
        pa.parking_area_name as location_name,
        v.vehicle_type,
        vt.vehicle_type_id
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      JOIN vehicle_types vt ON v.vehicle_type = vt.vehicle_type_name
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE r.reservation_id = ? AND r.user_id = ? AND r.booking_status = 'active'
    `, [sessionId, req.user.user_id]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active parking session not found'
      });
    }

    // Get vehicle type deduction rate
    const rateInfo = await db.query(`
      SELECT deduction_rate
      FROM vehicle_type_deduction_rates
      WHERE vehicle_type_id = ? AND is_active = 1
    `, [session.vehicle_type_id]);
    
    if (rateInfo.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Vehicle type rate not found'
      });
    }
    
    const hourlyRate = rateInfo[0].deduction_rate;
    const endTime = new Date();
    const startTime = new Date(session.start_time);
    
    // Calculate raw duration in seconds
    const durationSeconds = Math.floor((endTime - startTime) / 1000);
    
    // Convert to minutes - any partial minute counts as full minute (1 token = 1 minute)
    const billableMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    
    // Calculate rate per minute and total cost
    const ratePerMinute = hourlyRate / 60;
    const totalCost = ratePerMinute * billableMinutes;
    
    // Convert billable minutes to hours for subscription comparison
    const billableHours = billableMinutes / 60;

    // Check user's subscription hours - this is the ONLY payment method
    const subscriptionHours = await db.query(`
      SELECT 
        s.subscription_id,
        s.hours_remaining,
        s.hours_used,
        p.plan_name
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.user_id = ? AND s.status = 'active' AND s.hours_remaining > 0
      ORDER BY s.purchase_date ASC
      LIMIT 1
    `, [req.user.user_id]);

    // Check if user has sufficient subscription hours
    if (subscriptionHours.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription hours available. Please purchase a subscription plan first.'
      });
    }

    // Check if duration exceeds available balance
    const subscriptionHoursRemaining = subscriptionHours[0].hours_remaining;
    const subscriptionMinutesRemaining = subscriptionHoursRemaining * 60;
    const exceedsBalance = billableMinutes > subscriptionMinutesRemaining;
    
    // Calculate penalty in minutes if user exceeds their balance
    let penaltyMinutes = 0;
    if (exceedsBalance) {
      penaltyMinutes = billableMinutes - subscriptionMinutesRemaining;
      console.log(`⚠️ Penalty detected: User has ${subscriptionMinutesRemaining} minutes, used ${billableMinutes} minutes, penalty: ${penaltyMinutes} minutes`);
    }

    // Use subscription hours
    const paymentMethod = 'subscription';
    const subscriptionId = subscriptionHours[0].subscription_id;
    
    // Calculate minutes to deduct (convert back to hours for database)
    const minutesToDeduct = Math.min(billableMinutes, subscriptionMinutesRemaining);
    const hoursToDeduct = minutesToDeduct / 60;

    // Build transaction queries
    const transactionQueries = [
      {
        sql: `
          UPDATE reservations 
          SET end_time = NOW(), booking_status = 'completed'
          WHERE reservation_id = ?
        `,
        params: [sessionId]
      },
      {
        sql: `
          UPDATE subscriptions 
          SET hours_remaining = GREATEST(0, hours_remaining - ?), hours_used = hours_used + ?
          WHERE subscription_id = ?
        `,
        params: [hoursToDeduct, hoursToDeduct, subscriptionId]
      },
      {
        sql: `
          UPDATE parking_spot ps
          JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
          JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
          SET ps.status = 'free'
          WHERE pa.parking_area_id = ? AND ps.status = 'occupied'
          LIMIT 1
        `,
        params: [session.location_id]
      },
      {
        sql: `
          INSERT INTO payments (amount, status, payment_date, payment_method_id, subscription_id)
          VALUES (?, 'paid', NOW(), 1, ?)
        `,
        params: [totalCost, subscriptionId]
      }
    ];

    // Add penalty insertion if penalty exists
    if (penaltyMinutes > 0) {
      transactionQueries.push({
        sql: `
          INSERT INTO penalty (user_id, penalty_time)
          VALUES (?, ?)
        `,
        params: [req.user.user_id, penaltyMinutes / 60] // Store penalty in hours for compatibility
      });
    }

    // Process payment using subscription hours only
    await db.transaction(transactionQueries);

    emitReservationUpdated({
      reservationId: Number(sessionId),
      userId: req.user.user_id,
      areaId: session.area_id ? Number(session.area_id) : undefined,
      spotId: session.location_id ? Number(session.location_id) : undefined,
      status: 'completed',
      source: 'parking.end'
    });
    emitSpotsUpdated({
      areaId: session.area_id ? Number(session.area_id) : undefined,
      spotId: session.location_id ? Number(session.location_id) : undefined,
      reservationId: Number(sessionId),
      status: 'available',
      source: 'parking.end'
    });

    // Prepare response message
    let responseMessage = 'Parking session ended successfully';
    if (penaltyMinutes > 0) {
      const penaltyHoursFormatted = Math.floor(penaltyMinutes / 60);
      const penaltyMinutesFormatted = penaltyMinutes % 60;
      responseMessage = `Parking session ended successfully. You exceeded your remaining balance by ${penaltyHoursFormatted} hour${penaltyHoursFormatted !== 1 ? 's' : ''} ${penaltyMinutesFormatted} minute${penaltyMinutesFormatted !== 1 ? 's' : ''}. This penalty will be deducted from your next subscription plan.`;
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        session: {
          id: sessionId,
          billableMinutes,
          billableHours,
          totalCost,
          endTime: endTime.toISOString(),
          paymentMethod,
          hoursDeducted: hoursToDeduct,
          subscriptionId: subscriptionId,
          penaltyMinutes: penaltyMinutes > 0 ? penaltyMinutes : 0,
          penaltyHours: penaltyMinutes > 0 ? penaltyMinutes / 60 : 0,
          hasPenalty: penaltyMinutes > 0,
          ratePerMinute,
          hourlyRate
        }
      }
    });

  } catch (error) {
    console.error('End parking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end parking session'
    });
  }
});

// Get active parking session
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const sessions = await db.query(`
      SELECT 
        r.reservation_id as id,
        r.user_id,
        r.vehicle_id,
        r.parking_spots_id as location_id,
        r.start_time,
        r.end_time,
        r.booking_status as status,
        v.plate_number, 
        v.vehicle_type, 
        pa.parking_area_name as location_name, 
        pa.location as address
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE r.user_id = ? AND r.booking_status = 'active'
      ORDER BY r.start_time DESC
      LIMIT 1
    `, [req.user.user_id]);

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: {
          session: null
        }
      });
    }

    const session = sessions[0];
    const currentTime = new Date();
    const startTime = new Date(session.start_time);
    const durationMinutes = Math.floor((currentTime - startTime) / (1000 * 60));
    const currentCost = Math.ceil(durationMinutes / 60) * session.hourly_rate;

    res.json({
      success: true,
      data: {
        session: {
          ...session,
          durationMinutes,
          currentCost
        }
      }
    });

  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active session'
    });
  }
});

// Get parking history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const sessions = await db.query(`
      SELECT ps.*, v.plate_number, v.vehicle_type, pl.name as location_name, pl.address
      FROM parking_sessions ps
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.user_id = ?
      ORDER BY ps.start_time DESC
      LIMIT ? OFFSET ?
    `, [req.user.user_id, parseInt(limit), parseInt(offset)]);

    const totalCount = await db.query(
      'SELECT COUNT(*) as count FROM parking_sessions WHERE user_id = ?',
      [req.user.user_id]
    );

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get parking history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking history'
    });
  }
});

module.exports = router;

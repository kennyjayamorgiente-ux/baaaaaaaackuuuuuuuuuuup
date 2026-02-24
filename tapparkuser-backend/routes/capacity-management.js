const express = require('express');
const router = express.Router();

const CAPACITY_SPOT_VEHICLE_TYPES = ['motorcycle', 'bike', 'bicycle'];
const db = require('../config/database');
const { authenticateToken, attendantOrAdmin } = require('../middleware/auth');
const {
  validateParamInt,
  validateBodyInt,
  validateParamPattern,
  validateBodyEnum,
  validateBodyString
} = require('../middleware/validation');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const {
  emitReservationUpdated,
  emitCapacityUpdated
} = require('../utils/realtime');

const DEBUG_CAPACITY = process.env.DEBUG_CAPACITY === 'true';

const ensureCapacitySpotStatusTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS capacity_spot_status (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parking_section_id INT NOT NULL,
      spot_number VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'unavailable',
      updated_by INT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_section_spot (parking_section_id, spot_number),
      INDEX idx_capacity_status_section (parking_section_id),
      INDEX idx_capacity_status_type (status)
    )
  `);
};

const syncSectionUnavailableCount = async (sectionId) => {
  const countResult = await db.execute(
    `SELECT COUNT(*) as unavailable_count
     FROM capacity_spot_status
     WHERE parking_section_id = ? AND status = 'unavailable'`,
    [sectionId]
  );
  const unavailableCount =
    (countResult.rows && countResult.rows[0] && Number(countResult.rows[0].unavailable_count)) || 0;

  await db.execute(
    `UPDATE parking_section
     SET unavailable_count = ?
     WHERE parking_section_id = ?`,
    [unavailableCount, sectionId]
  );

  return unavailableCount;
};

// Get capacity status for all sections in an area
router.get('/areas/:areaId/capacity-status', authenticateToken, validateParamInt('areaId', 'Area ID'), async (req, res) => {
  try {
    const { areaId } = req.params;
    const userId = req.user.user_id;
    
    if (DEBUG_CAPACITY) {
      console.log(`📊 DEBUG: Capacity API called for area ${areaId}, userId: ${userId}`);
      console.log(`📊 DEBUG: This should show if backend is restarted`);
    }
    
    // Validate parameters
    if (!userId || !areaId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get capacity-only sections with accurate capacity counts (regardless of vehicle type)
    const query = `
      SELECT 
        ps.parking_section_id,
        ps.section_name,
        ps.capacity as total_capacity,
        ps.parked_count,
        ps.reserved_count,
        ps.unavailable_count,
        ps.section_mode,
        ps.vehicle_type,
        ps.status,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM reservations r2 
            WHERE r2.parking_section_id = ps.parking_section_id 
            AND r2.user_id = ?
            AND r2.booking_status IN ('reserved', 'active')
          ) THEN 1
          ELSE 0
        END as is_user_booked
      FROM parking_section ps
      WHERE ps.parking_area_id = ? 
        AND ps.section_mode = 'capacity_only'
      ORDER BY ps.section_name
    `;
    
    const result = await db.execute(query, [userId, areaId]);
    const sections = result.rows;
    
    if (DEBUG_CAPACITY) {
      console.log('🔍 Debug - Query result:', sections.length, 'sections found');
      console.log('🔍 Debug - Query:', query);
      console.log('🔍 Debug - Parameters:', [userId, areaId]);
    }
    
    // Calculate real-time capacity using accurate counts
    const capacityStatus = sections.map(section => {
      const totalCapacity = section.total_capacity || 0;
      const parkedCount = section.parked_count || 0;
      const reservedCount = section.reserved_count || 0;
      const unavailableCount = section.unavailable_count || 0;
      const totalUsed = parkedCount + reservedCount + unavailableCount;
      const availableCapacity = Math.max(0, totalCapacity - totalUsed);
      const utilizationRate = totalCapacity > 0 ? 
        (totalUsed / totalCapacity * 100).toFixed(1) : 0;
      
      return {
        sectionId: section.parking_section_id,
        sectionName: section.section_name,
        vehicleType: section.vehicle_type,
        totalCapacity: totalCapacity,
        availableCapacity: availableCapacity,
        parkedCount: parkedCount,
        reservedCount: reservedCount,
        unavailableCount: unavailableCount,
        totalUsed: totalUsed,
        utilizationRate: utilizationRate,
        status: section.status || 'available', // Include section status
        isUserBooked: section.is_user_booked === 1
      };
    });
    
    res.json({
      success: true,
      data: capacityStatus
    });
    
  } catch (error) {
    console.error('Get capacity status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch capacity status'
    });
  }
});

// Reserve capacity in a section
router.post('/sections/:sectionId/reserve', authenticateToken, validateParamInt('sectionId', 'Section ID'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.user_id;
    const { reservationId } = req.body;
    
    console.log(`🎯 Reserving capacity in section ${sectionId} for user ${userId}`);
    
    // Start transaction
    const connection = await db.connection.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if section exists and has capacity
      const [sectionCheck] = await connection.execute(`
        SELECT capacity as total_capacity, section_name, parked_count, reserved_count, vehicle_type, parking_area_id
        FROM parking_section 
        WHERE parking_section_id = ? AND section_mode = 'capacity_only'
      `, [sectionId]);
      
      if (sectionCheck.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Section not found or not capacity-based'
        });
      }
      
      const section = sectionCheck[0];
      const totalUsed = (section.parked_count || 0) + (section.reserved_count || 0);
      const availableCapacity = Math.max(0, (section.total_capacity || 0) - totalUsed);
      
      if (availableCapacity <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'No available capacity in this section'
        });
      }
      
      // For capacity-based sections, we don't need individual parking spots
      // Just create a reservation tied to the section itself
      const { reservationId, vehicleId, spotNumber, areaId } = req.body || {};
      const wantsDetailedReservation = !!(vehicleId && spotNumber);
      let responsePayload = null;
      
      if (wantsDetailedReservation) {
        const [vehicleRows] = await connection.execute(
          `SELECT vehicle_id, plate_number, vehicle_type, brand, color FROM vehicles WHERE vehicle_id = ? AND user_id = ?`,
          [vehicleId, userId]
        );
        if (vehicleRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found for this user'
          });
        }
        const vehicle = vehicleRows[0];
        
        const [conflictRows] = await connection.execute(
          `SELECT reservation_id FROM reservations WHERE parking_section_id = ? AND spot_number = ? AND booking_status IN ('reserved', 'active')`,
          [sectionId, spotNumber]
        );
        if (conflictRows.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Spot is already reserved or active'
          });
        }
        
        const qrKey = uuidv4();
        const qrData = { qr_key: qrKey };
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        
        const [reservationResult] = await connection.execute(`
          INSERT INTO reservations (
            user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number,
            booking_status, time_stamp, start_time, end_time, QR, qr_key
          ) VALUES (?, ?, 0, ?, ?, 'reserved', NOW(), NULL, NULL, ?, ?)
        `, [userId, vehicleId, sectionId, spotNumber, qrCodeDataURL, qrKey]);
        
        await connection.execute(`
          UPDATE parking_section 
          SET reserved_count = reserved_count + 1 
          WHERE parking_section_id = ?
        `, [sectionId]);
        
        const [areaRows] = await connection.execute(
          `SELECT parking_area_name, location FROM parking_area WHERE parking_area_id = ?`,
          [areaId || section.parking_area_id]
        );
        const area = areaRows[0] || {};
        
        responsePayload = {
          success: true,
          message: `Capacity reserved in section ${section.section_name}`,
          data: {
            reservationId: reservationResult.insertId,
            qrCode: qrCodeDataURL,
            qrKey,
            bookingDetails: {
              reservationId: reservationResult.insertId,
              vehiclePlate: vehicle.plate_number,
              vehicleType: vehicle.vehicle_type,
              vehicleBrand: vehicle.brand,
              areaName: area.parking_area_name || section.section_name,
              areaLocation: area.location || '',
              sectionName: section.section_name,
              spotNumber,
              spotType: section.vehicle_type,
              status: 'reserved',
              startTime: null
            }
          }
        };
      } else {
        const [reservationResult] = await connection.execute(`
          INSERT INTO reservations 
          (user_id, parking_spots_id, booking_status, time_stamp, start_time, end_time, QR, qr_key)
          VALUES (?, ?, 'reserved', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), ?, ?)
        `, [userId, sectionId, `CAP-${Date.now()}-${userId}`, `CAP-${Date.now()}-${userId}`]);
        
        await connection.execute(`
          UPDATE parking_section 
          SET reserved_count = reserved_count + 1 
          WHERE parking_section_id = ?
        `, [sectionId]);
        
        responsePayload = {
          success: true,
          message: `Capacity reserved in section ${section.section_name}`,
          data: {
            reservationId: reservationResult.insertId,
            sectionName: section.section_name,
            remainingCapacity: availableCapacity - 1
          }
        };
      }
      
      await connection.commit();

      emitReservationUpdated({
        reservationId: responsePayload?.data?.reservationId,
        userId,
        areaId: Number(section.parking_area_id),
        sectionId: Number(sectionId),
        status: 'reserved',
        source: 'capacity.reserve'
      });
      emitCapacityUpdated({
        areaId: Number(section.parking_area_id),
        sectionId: Number(sectionId),
        status: 'reserved',
        source: 'capacity.reserve'
      });
      res.json(responsePayload);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Reserve capacity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve capacity'
    });
  }
});

// Confirm parking (attendant scans QR - moves from reserved to parked)
router.post('/sections/:sectionId/confirm-parking', authenticateToken, validateParamInt('sectionId', 'Section ID'), validateBodyInt('reservationId', 'Reservation ID'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.user_id;
    const { reservationId } = req.body;
    
    console.log(`✅ Confirming parking in section ${sectionId} for user ${userId}, reservation ${reservationId}`);
    
    // Start transaction
    const connection = await db.connection.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update reservation status to active
      const [updateResult] = await connection.execute(`
        UPDATE reservations 
        SET booking_status = 'active', start_time = NOW()
        WHERE reservation_id = ? AND user_id = ? AND booking_status = 'reserved'
      `, [reservationId, userId]);
      
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Reservation not found or already confirmed'
        });
      }
      
      // Move from reserved_count to parked_count
      await connection.execute(`
        UPDATE parking_section 
        SET 
          reserved_count = reserved_count - 1,
          parked_count = parked_count + 1
        WHERE parking_section_id = ?
      `, [sectionId]);
      
      await connection.commit();

      emitReservationUpdated({
        reservationId: Number(reservationId),
        userId,
        sectionId: Number(sectionId),
        status: 'active',
        source: 'capacity.confirm-parking'
      });
      emitCapacityUpdated({
        sectionId: Number(sectionId),
        status: 'active',
        source: 'capacity.confirm-parking'
      });
      
      res.json({
        success: true,
        message: 'Parking confirmed successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Confirm parking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm parking'
    });
  }
});

// End capacity reservation (when parking ends)
router.post('/sections/:sectionId/end-reservation', authenticateToken, validateParamInt('sectionId', 'Section ID'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`🏁 Ending capacity reservation in section ${sectionId} for user ${userId}`);
    
    // Start transaction
    const connection = await db.connection.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Find and update user's active reservation in this section
      const [updateResult] = await connection.execute(`
        UPDATE reservations 
        SET booking_status = 'completed', end_time = NOW()
        WHERE parking_spots_id = ? AND user_id = ? AND booking_status = 'active'
      `, [sectionId, userId]);
      
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'No active reservation found for this user in this section'
        });
      }
      
      // Decrement parked_count
      await connection.execute(`
        UPDATE parking_section 
        SET parked_count = parked_count - 1
        WHERE parking_section_id = ?
      `, [sectionId]);
      
      await connection.commit();

      emitReservationUpdated({
        userId,
        sectionId: Number(sectionId),
        status: 'completed',
        source: 'capacity.end-reservation'
      });
      emitCapacityUpdated({
        sectionId: Number(sectionId),
        status: 'completed',
        source: 'capacity.end-reservation'
      });
      
      res.json({
        success: true,
        message: 'Capacity reservation ended successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('End capacity reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end capacity reservation'
    });
  }
});

// Get user's active capacity reservations
router.get('/user/capacity-reservations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    console.log(`👤 Getting capacity reservations for user ${userId}`);
    
    // For now, return empty array since we can't properly track capacity without database changes
    res.json({
      success: true,
      data: []
    });
    
  } catch (error) {
    console.error('Get user capacity reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch capacity reservations'
    });
  }
});

// Get parked users for a specific motorcycle section
router.get('/sections/:sectionId/parked-users', authenticateToken, validateParamInt('sectionId', 'Section ID'), async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`👥 Getting parked users for section ${sectionId}, userId: ${userId}`);
    
    // Validate parameters
    if (!userId || !sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get parked users for this section
    const query = `
      SELECT 
        r.reservation_id,
        r.user_id,
        r.start_time,
        r.end_time,
        u.first_name,
        u.last_name,
        v.plate_number,
        v.vehicle_type,
        v.brand,
        v.color,
        ps.section_name
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      JOIN parking_section ps ON r.parking_spots_id = ps.parking_section_id
      WHERE ps.parking_section_id = ? 
        AND r.booking_status = 'active'
        AND ps.section_mode = 'capacity_only'
      ORDER BY r.start_time DESC
    `;
    
    const result = await db.execute(query, [sectionId]);
    const parkedUsers = result.rows;
    
    console.log(`🔍 Found ${parkedUsers.length} parked users in section ${sectionId}`);
    
    // Format the response
    const formattedUsers = parkedUsers.map(user => ({
      reservationId: user.reservation_id,
      userId: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      plateNumber: user.plate_number,
      vehicleType: user.vehicle_type,
      brand: user.brand,
      color: user.color,
      startTime: user.start_time,
      endTime: user.end_time,
      sectionName: user.section_name
    }));
    
    res.json({
      success: true,
      data: {
        sectionId: parseInt(sectionId),
        parkedUsers: formattedUsers,
        totalParked: formattedUsers.length
      }
    });
    
  } catch (error) {
    console.error('Get parked users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parked users'
    });
  }
});

// Get individual motorcycle spots for a specific section
router.get('/sections/:sectionId/spots', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`🏍️ Getting motorcycle spots for section ${sectionId}, userId: ${userId}`);
    
    // Validate parameters
    if (!userId || !sectionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get individual capacity spots for this section (motorcycle/bike).
    // For capacity-only sections, generate virtual spots based on capacity.
    const query = `
      SELECT 
        ps.parking_section_id,
        ps.section_name,
        ps.capacity as total_capacity,
        ps.parked_count,
        ps.reserved_count,
        ps.unavailable_count,
        ps.section_mode,
        ps.vehicle_type
      FROM parking_section ps
      WHERE ps.parking_section_id = ? 
        AND ps.vehicle_type IN (${CAPACITY_SPOT_VEHICLE_TYPES.map(() => '?').join(', ')})
    `;
    
    const sectionResult = await db.execute(query, [sectionId, ...CAPACITY_SPOT_VEHICLE_TYPES]);
    const sectionData = sectionResult.rows[0];
    
    if (!sectionData) {
      return res.status(404).json({
        success: false,
        message: 'Capacity section not found'
      });
    }
    
    console.log(`🏍️ Section ${sectionId}: ${sectionData.section_name}, Capacity: ${sectionData.total_capacity}`);
    
    // Get actual reservations for this section to assign to virtual spots
    // Now using the new parking_section_id column directly
    // Include both real parking spots (parking_spots_id > 0) and virtual spots (parking_spots_id = 0)
    const reservationsQuery = `
      SELECT 
        r.reservation_id,
        r.user_id,
        r.booking_status,
        r.start_time,
        r.end_time,
        u.first_name,
        u.last_name,
        v.plate_number,
        v.brand,
        v.color,
        r.spot_number,
        CASE 
          WHEN r.user_id = ? AND r.booking_status IN ('reserved', 'active') THEN 1
          ELSE 0
        END as is_user_booked
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.parking_section_id = ? 
        AND r.booking_status IN ('reserved', 'active')
        AND (r.parking_spots_id = 0 OR r.parking_spots_id IN (
          SELECT ps.parking_spot_id 
          FROM parking_spot ps 
          WHERE ps.parking_section_id = ?
        ))
      ORDER BY r.start_time
    `;
    
    const reservationsResult = await db.execute(reservationsQuery, [userId, sectionId, sectionId]);
    const reservations = reservationsResult.rows;

    await ensureCapacitySpotStatusTable();
    const manualStatusResult = await db.execute(
      `SELECT spot_number, status
       FROM capacity_spot_status
       WHERE parking_section_id = ?`,
      [sectionId]
    );
    const manualStatuses = new Map(
      (manualStatusResult.rows || []).map(row => [row.spot_number, row.status])
    );
    
    console.log(`📋 Found ${reservations.length} active reservations for section ${sectionId}`);
    console.log(`🔍 Reservations details:`, reservations.map(r => ({
      reservationId: r.reservation_id,
      spotNumber: r.spot_number,
      bookingStatus: r.booking_status,
      userName: `${r.first_name} ${r.last_name}`,
      isUserBooked: r.is_user_booked
    })));
    
    // Generate virtual spots
    const virtualSpots = [];
    const totalCapacity = sectionData.total_capacity || 0;
    
    for (let i = 1; i <= totalCapacity; i++) {
      const spotNumber = `${sectionData.section_name}-${i}`;
      
      // Find reservation for this specific spot number
      const reservation = reservations.find(r => r.spot_number === spotNumber);
      
      // Debug: Check reservation data
      if (reservation) {
        console.log(`🔍 Spot ${spotNumber} has reservation:`, {
          bookingStatus: reservation.booking_status,
          bookingStatusType: typeof reservation.booking_status,
          bookingStatusLength: reservation.booking_status ? reservation.booking_status.length : 'null'
        });
      }
      
      const spot = {
        spotId: `${sectionId}-virtual-${i}`, // Virtual spot ID
        spotNumber: spotNumber,
        spotType: sectionData.vehicle_type || 'motorcycle',
        status: reservation
          ? (reservation.booking_status || 'available')
          : (manualStatuses.get(spotNumber) || 'available'),
        sectionName: sectionData.section_name,
        isUserBooked: reservation ? reservation.is_user_booked === 1 : false,
        reservation: reservation ? {
          reservationId: reservation.reservation_id,
          userId: reservation.user_id,
          userName: `${reservation.first_name} ${reservation.last_name}`,
          plateNumber: reservation.plate_number,
          brand: reservation.brand,
          color: reservation.color,
          startTime: reservation.start_time,
          endTime: reservation.end_time
        } : null
      };
      
      virtualSpots.push(spot);
    }
    
    console.log(`✅ Generated ${virtualSpots.length} virtual spots for section ${sectionId}`);
    
    // Calculate statistics
    const availableSpots = virtualSpots.filter(s => s.status === 'available').length;
    const occupiedSpots = virtualSpots.filter(s => s.status === 'active').length;
    const reservedSpots = virtualSpots.filter(s => s.status === 'reserved').length;
    const unavailableSpots = virtualSpots.filter(s => s.status === 'unavailable').length;
    
    res.json({
      success: true,
      data: {
        sectionId: parseInt(sectionId),
        spots: virtualSpots,
        totalSpots: virtualSpots.length,
        availableSpots: availableSpots,
        occupiedSpots: occupiedSpots,
        reservedSpots: reservedSpots,
        unavailableSpots: unavailableSpots
      }
    });
    
  } catch (error) {
    console.error('Get motorcycle spots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch motorcycle spots'
    });
  }
});

// Assign user to specific motorcycle spot
router.post(
  '/sections/:sectionId/spots/:spotNumber/assign',
  authenticateToken,
  attendantOrAdmin,
  validateParamInt('sectionId', 'Section ID'),
  validateParamPattern('spotNumber', /^[A-Za-z0-9_-]{1,30}$/, 'spot number'),
  validateBodyInt('vehicleId', 'Vehicle ID'),
  async (req, res) => {
  try {
    const { sectionId, spotNumber } = req.params;
    const { vehicleId } = req.body;
    const userId = req.user.user_id;
    
    console.log(`🏍️ Assigning user ${userId} to spot ${spotNumber} in section ${sectionId}`);
    
    // Validate parameters
    if (!userId || !sectionId || !spotNumber || !vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get section details
    const sectionQuery = `
      SELECT 
        ps.parking_section_id,
        ps.section_name,
        ps.capacity as total_capacity,
        ps.parked_count,
        ps.reserved_count,
        ps.section_mode,
        ps.vehicle_type,
        ps.parking_area_id
      FROM parking_section ps
      WHERE ps.parking_section_id = ? 
        AND ps.vehicle_type IN (${CAPACITY_SPOT_VEHICLE_TYPES.map(() => '?').join(', ')})
    `;
    
    const sectionResult = await db.execute(sectionQuery, [sectionId, ...CAPACITY_SPOT_VEHICLE_TYPES]);
    const sectionData = sectionResult.rows[0];
    
    if (!sectionData) {
      return res.status(404).json({
        success: false,
        message: 'Capacity section not found'
      });
    }
    
    // Verify vehicle belongs to user
    const vehicle = await db.execute(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [vehicleId, userId]
    );
    
    if (vehicle.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Check if user has active parking session
    const activeSession = await db.execute(
      'SELECT reservation_id FROM reservations WHERE user_id = ? AND booking_status = "active"',
      [userId]
    );
    
    if (activeSession.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active parking session'
      });
    }
    
    // For capacity-only sections, create a virtual reservation without requiring actual parking_spot
    // Check if there's already a reservation for this virtual spot
    const existingReservation = await db.execute(
      'SELECT reservation_id FROM reservations WHERE parking_section_id = ? AND spot_number = ? AND booking_status IN ("reserved", "active")',
      [sectionId, spotNumber]
    );
    
    if (existingReservation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Spot is already occupied or reserved'
      });
    }
    
    // Generate unique QR key before creating reservation (same as regular parking)
    const qrKey = require('uuid').v4();
    
    console.log('🔍 Motorcycle Booking Debug - Creating reservation:', { 
      sectionId, 
      spotNumber, 
      vehicleId, 
      qrKey,
      userId
    });
    
    // Create reservation for the virtual spot (same as regular parking process)
    // Use dummy parking_spots_id = 0 for capacity-only sections
    let reservationResult;
    try {
      reservationResult = await db.execute(`
        INSERT INTO reservations (
          user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number, 
          time_stamp, start_time, booking_status, QR, qr_key
        ) VALUES (?, ?, 0, ?, ?, NOW(), NULL, 'reserved', '', ?)
      `, [userId, vehicleId, sectionId, spotNumber, qrKey]);
    } catch (insertError) {
      // If qr_key column doesn't exist, add it and retry (same as regular parking)
      if (insertError.message && insertError.message.includes('Unknown column')) {
          try {
          await db.execute(`
            ALTER TABLE reservations 
            ADD COLUMN qr_key VARCHAR(255) UNIQUE NULL AFTER QR
          `);
        } catch (alterError) {
          if (!alterError.message.includes('Duplicate column name')) {
            throw alterError;
          }
        }
        // Retry insert with qr_key
        reservationResult = await db.execute(`
          INSERT INTO reservations (
            user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number, 
            time_stamp, start_time, booking_status, QR, qr_key
          ) VALUES (?, ?, 0, ?, ?, NOW(), NULL, 'reserved', '', ?)
        `, [userId, vehicleId, sectionId, spotNumber, qrKey]);
      } else {
        throw insertError;
      }
    }

    const reservationId = reservationResult.insertId;
    
    // Generate QR code data with only qr_key (same as regular parking)
    // IMPORTANT: Only qr_key is included in the QR code for validation
    const qrData = {
      qr_key: qrKey
    };
    
    
    // Generate QR code as data URL (same as regular parking)
    // The QR code contains only: qr_key
    const QRCode = require('qrcode');
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    
    // Update the reservation with the QR code (same as regular parking)
    await db.execute(
      'UPDATE reservations SET QR = ? WHERE reservation_id = ?',
      [qrCodeDataURL, reservationId]
    );
    
    
    // Reservation is created as reserved (not yet active), so increment reserved_count.
    await db.execute(`
      UPDATE parking_section 
      SET reserved_count = reserved_count + 1
      WHERE parking_section_id = ?
    `, [sectionId]);
    
    // Get vehicle and area details for response (same as regular parking)
    const vehicleDetailsResult = await db.execute(
      'SELECT plate_number, vehicle_type, brand FROM vehicles WHERE vehicle_id = ?',
      [vehicleId]
    );
    
    const areaDetailsResult = await db.execute(
      'SELECT parking_area_name, location FROM parking_area WHERE parking_area_id = ?',
      [sectionData.parking_area_id]
    );

    console.log(`✅ Successfully assigned user ${userId} to virtual spot ${spotNumber} in section ${sectionId}`);
    
    // Safely extract vehicle details
    const vehiclePlate = vehicleDetailsResult[0]?.plate_number || 'Unknown';
    const vehicleType = vehicleDetailsResult[0]?.vehicle_type || 'motorcycle';
    const vehicleBrand = vehicleDetailsResult[0]?.brand || 'Unknown';
    
    // Safely extract area details
    const areaName = areaDetailsResult[0]?.parking_area_name || 'Unknown Area';
    const areaLocation = areaDetailsResult[0]?.location || 'Unknown Location';
    
    console.log('🔍 Debug - Extracted details:', {
      vehiclePlate, vehicleType, vehicleBrand, areaName, areaLocation,
      reservationId, qrKey, spotNumber
    });
    
    // Debug the response data
    const responseData = {
      success: true,
      data: {
        reservationId,
        qrCode: qrCodeDataURL, // Use the actual QR code
        qrKey: qrKey,
        message: 'Parking spot booked successfully',
        bookingDetails: {
          reservationId,
          qrCode: qrCodeDataURL, // Use the actual QR code
          qrKey: qrKey,
          vehiclePlate: vehiclePlate,
          vehicleType: vehicleType,
          vehicleBrand: vehicleBrand,
          areaName: areaName,
          areaLocation: areaLocation,
          spotNumber: spotNumber,
          spotType: sectionData.vehicle_type || 'motorcycle',
          startTime: null, // Will be set when attendant scans QR
          status: 'reserved'
        }
      }
    };
    
    console.log('🔍 Debug response data:', JSON.stringify(responseData, null, 2));
    
    // Return response in exact same format as regular parking
    res.json(responseData);
    
  } catch (error) {
    console.error('Assign motorcycle spot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign parking spot'
    });
  }
});
router.post(
  '/sections/:sectionId/spots/:spotNumber/guest-assign',
  authenticateToken,
  attendantOrAdmin,
  validateParamInt('sectionId', 'Section ID'),
  validateParamPattern('spotNumber', /^[A-Za-z0-9_-]{1,30}$/, 'spot number'),
  validateBodyString('firstName', { label: 'First name', min: 1, max: 50 }),
  validateBodyString('lastName', { label: 'Last name', min: 1, max: 50 }),
  validateBodyString('plateNumber', { label: 'Plate number', min: 2, max: 20, pattern: /^[A-Za-z0-9 -]+$/ }),
  validateBodyString('brand', { label: 'Brand', min: 1, max: 50, optional: true }),
  validateBodyString('model', { label: 'Model', min: 1, max: 50, optional: true }),
  validateBodyString('color', { label: 'Color', min: 1, max: 30, optional: true }),
  async (req, res) => {
  try {
    const { sectionId, spotNumber } = req.params;
    const { firstName, lastName, plateNumber, brand, model, color } = req.body;
    const userId = req.user.user_id;
    
    console.log('🏍️ Motorcycle guest booking request parameters:', {
      sectionId,
      spotNumber,
      firstName,
      lastName,
      plateNumber,
      brand,
      model,
      color,
      userId,
      bodyKeys: Object.keys(req.body)
    });
    
    console.log(`🏍️ Assigning guest ${firstName} ${lastName} to spot ${spotNumber} in section ${sectionId}`);
    
    // Validate parameters
    if (!userId || !sectionId || !spotNumber || !firstName || !lastName || !plateNumber) {
      console.log('❌ Motorcycle guest booking validation failed - missing parameters:', {
        hasUserId: !!userId,
        hasSectionId: !!sectionId,
        hasSpotNumber: !!spotNumber,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasPlateNumber: !!plateNumber
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Get section details
    const sectionQuery = `
      SELECT 
        ps.parking_section_id,
        ps.section_name,
        ps.capacity as total_capacity,
        ps.parked_count,
        ps.reserved_count,
        ps.section_mode,
        ps.vehicle_type
      FROM parking_section ps
      WHERE ps.parking_section_id = ? 
        AND ps.vehicle_type IN (${CAPACITY_SPOT_VEHICLE_TYPES.map(() => '?').join(', ')})
    `;
    
    const sectionResult = await db.execute(sectionQuery, [sectionId, ...CAPACITY_SPOT_VEHICLE_TYPES]);
    const sectionData = sectionResult.rows[0];
    
    if (!sectionData) {
      return res.status(404).json({
        success: false,
        message: 'Capacity section not found'
      });
    }
    
    // Check if spot is already occupied (using reservation_id instead of id)
    const existingReservation = await db.execute(`
      SELECT reservation_id FROM reservations 
      WHERE parking_section_id = ? 
        AND spot_number = ? 
        AND booking_status = 'active'
    `, [sectionId, spotNumber]);
    
    if (existingReservation.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Spot is already occupied'
      });
    }
    
    // Start transaction for guest booking
    const connection = await db.connection.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Create guest user (temporary user with guest identifier) - same as existing system
      const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@tappark.guest`;
      const guestPassword = 'guest_temp_password'; // Temporary password, guest won't login
      const hashedPassword = await bcrypt.hash(guestPassword, 12);
      
      const [guestUserResult] = await connection.execute(
        `INSERT INTO users (email, password, first_name, last_name, user_type_id, hour_balance)
         VALUES (?, ?, ?, ?, 4, 0)`,
        [guestEmail, hashedPassword, firstName, lastName]
      );

      const guestUserId = guestUserResult.insertId;
      console.log(`✅ Guest user created with ID: ${guestUserId}`);

      // Check if vehicle with this plate number already exists
      const existingVehicleResult = await connection.execute(
        'SELECT vehicle_id FROM vehicles WHERE plate_number = ?',
        [plateNumber]
      );

      let vehicleId;
      if (existingVehicleResult && existingVehicleResult[0] && existingVehicleResult[0].length > 0) {
        // Use existing vehicle
        vehicleId = existingVehicleResult[0][0].vehicle_id;
        console.log(`✅ Using existing vehicle with ID: ${vehicleId} for plate: ${plateNumber}`);
      } else {
      // Create new vehicle for guest (vehicles table doesn't have model column)
      const guestVehicleType =
        sectionData.vehicle_type === 'bicycle' ? 'bike' : (sectionData.vehicle_type || 'motorcycle');
      const [vehicleResult] = await connection.execute(
        `INSERT INTO vehicles (user_id, plate_number, vehicle_type, brand, color)
           VALUES (?, ?, ?, ?, ?)`,
        [guestUserId, plateNumber, guestVehicleType, brand || null, color || null]
      );
        vehicleId = vehicleResult.insertId;
        console.log(`✅ Guest vehicle created with ID: ${vehicleId}`);
      }
      
      // Generate QR key for guest booking
      const qrKey = require('uuid').v4();
      
      // Create guest reservation following the same pattern as bookMotorcycleSection
      const [insertResult] = await connection.execute(`
        INSERT INTO reservations (
          user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number,
          time_stamp, start_time, booking_status, QR
        ) VALUES (?, ?, 0, ?, ?, NOW(), NOW(), 'active', '')
      `, [
        guestUserId, // Use guest user ID
        vehicleId,   // Use guest vehicle ID
        sectionId,
        spotNumber
      ]);
      
      console.log(`✅ Guest reservation created with ID: ${insertResult.insertId}`);
      
      const reservationId = insertResult.insertId;
      
      // Insert into guest_bookings table to track who created this guest booking
      const [guestBookingResult] = await connection.execute(
        `INSERT INTO guest_bookings (guest_user_id, vehicle_id, reservation_id, attendant_id)
         VALUES (?, ?, ?, ?)`,
        [guestUserId, vehicleId, reservationId, req.user.user_id]
      );

      console.log(`✅ Guest booking record created with ID: ${guestBookingResult.insertId}`);
      
      // Guest bookings in this flow start immediately as active, so update parked_count.
      await connection.execute(`
        UPDATE parking_section 
        SET parked_count = parked_count + 1 
        WHERE parking_section_id = ?
      `, [sectionId]);
      
      console.log(`✅ Section parked_count incremented for guest booking`);
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ Transaction committed successfully`);
      
      console.log(`✅ Successfully assigned guest ${firstName} ${lastName} to virtual spot ${spotNumber} in section ${sectionId}`);
      
      res.json({
        success: true,
        message: 'Successfully assigned guest to parking spot',
        data: {
          sectionId: parseInt(sectionId),
          spotNumber: spotNumber,
          reservationId: insertResult.insertId,
          sectionName: sectionData.section_name
        }
      });
      
    } catch (error) {
      console.error('❌ Transaction error in guest motorcycle booking:', error);
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('Assign guest motorcycle spot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign guest to parking spot'
    });
  }
});

// Release/unassign capacity spot (supports ending active parking and canceling reserved booking)
router.post(
  '/sections/:sectionId/spots/:spotNumber/release',
  authenticateToken,
  validateParamInt('sectionId', 'Section ID'),
  validateParamPattern('spotNumber', /^[A-Za-z0-9_-]{1,30}$/, 'spot number'),
  async (req, res) => {
  try {
    const { sectionId, spotNumber } = req.params;
    const userId = req.user.user_id;
    const accountType = String(req.user.account_type_name || '').trim().toLowerCase();
    const isAttendant = req.user.user_type_id === 2 || accountType === 'attendant';
    const isAdmin = req.user.user_type_id === 3 || accountType === 'admin';
    const canManageAnyReservation = isAttendant || isAdmin;

    const connection = await db.connection.getConnection();
    let reservation;
    let bookingStatus;
    let resultingStatus;
    try {
      await connection.beginTransaction();

      const [reservationRows] = await connection.execute(
        `SELECT
          r.reservation_id,
          r.user_id,
          r.booking_status,
          u.user_type_id
        FROM reservations r
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE r.parking_section_id = ?
          AND r.spot_number = ?
          AND r.booking_status IN ('active', 'reserved')
        ORDER BY CASE WHEN r.booking_status = 'active' THEN 0 ELSE 1 END, r.reservation_id DESC
        LIMIT 1
        FOR UPDATE`,
        [sectionId, spotNumber]
      );

      reservation = reservationRows[0];
      if (!reservation) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'No active or reserved reservation found for this spot'
        });
      }

      if (!canManageAnyReservation && reservation.user_id !== userId) {
        await connection.rollback();
        return res.status(403).json({
          success: false,
          message: 'You can only manage your own reservation'
        });
      }

      bookingStatus = reservation.booking_status;
      let reservationResult;
      if (bookingStatus === 'active') {
        const [updateReservationResult] = await connection.execute(
          `UPDATE reservations
           SET booking_status = 'completed', end_time = NOW()
           WHERE reservation_id = ?
             AND booking_status = 'active'`,
          [reservation.reservation_id]
        );
        reservationResult = updateReservationResult;
        await connection.execute(
          `UPDATE parking_section
           SET parked_count = GREATEST(parked_count - 1, 0)
           WHERE parking_section_id = ?`,
          [sectionId]
        );
        resultingStatus = 'completed';
      } else {
        const [updateReservationResult] = await connection.execute(
          `UPDATE reservations
           SET booking_status = 'cancelled'
           WHERE reservation_id = ?
             AND booking_status = 'reserved'`,
          [reservation.reservation_id]
        );
        reservationResult = updateReservationResult;
        await connection.execute(
          `UPDATE parking_section
           SET reserved_count = GREATEST(reserved_count - 1, 0)
           WHERE parking_section_id = ?`,
          [sectionId]
        );
        resultingStatus = 'cancelled';
      }

      if (!reservationResult || reservationResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Reservation state changed. Please refresh and try again.'
        });
      }

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

    const isGuestReservation = reservation.user_type_id === 4;
    let successMessage = resultingStatus === 'completed'
      ? 'Successfully ended parking'
      : 'Successfully cancelled booking';
    if ((isAttendant || isAdmin) && isGuestReservation) {
      successMessage = resultingStatus === 'completed'
        ? 'Attendant successfully ended guest parking'
        : 'Attendant successfully cancelled guest booking';
    } else if (isAttendant || isAdmin) {
      successMessage = resultingStatus === 'completed'
        ? 'Attendant successfully ended parking'
        : 'Attendant successfully cancelled booking';
    }

    res.json({
      success: true,
      message: successMessage,
      data: {
        sectionId: parseInt(sectionId),
        spotNumber: spotNumber,
        endedBy: (isAttendant || isAdmin) ? 'attendant' : 'user',
        wasGuestReservation: isGuestReservation,
        previousStatus: bookingStatus,
        currentStatus: resultingStatus
      }
    });
  } catch (error) {
    console.error('Release capacity spot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release parking spot'
    });
  }
});

// Update spot status (for attendant actions)
router.put(
  '/sections/:sectionId/spots/:spotNumber/status',
  authenticateToken,
  attendantOrAdmin,
  validateParamInt('sectionId', 'Section ID'),
  validateParamPattern('spotNumber', /^[A-Za-z0-9_-]{1,30}$/, 'spot number'),
  validateBodyEnum('status', ['available', 'unavailable', 'maintenance'], 'status'),
  async (req, res) => {
  try {
    const { sectionId, spotNumber } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;
    
    console.log(`🔧 Updating spot ${spotNumber} status to '${status}' in section ${sectionId} by user ${userId}`);
    
    // Validate parameters
    if (!sectionId || !spotNumber || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Validate status
    const validStatuses = ['available', 'unavailable', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    // For motorcycle sections, update the virtual spot status
    if (sectionId && spotNumber) {
      // Check if there's an active reservation for this spot
      const existingReservation = await db.execute(`
        SELECT reservation_id, booking_status 
        FROM reservations 
        WHERE parking_section_id = ? 
          AND spot_number = ? 
          AND booking_status IN ('reserved', 'active')
      `, [sectionId, spotNumber]);
      
      if ((existingReservation.rows || []).length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update status. Spot has an active reservation'
        });
      }

      await ensureCapacitySpotStatusTable();

      if (status === 'available') {
        await db.execute(
          `DELETE FROM capacity_spot_status
           WHERE parking_section_id = ? AND spot_number = ?`,
          [sectionId, spotNumber]
        );
      } else {
        await db.execute(
          `INSERT INTO capacity_spot_status (parking_section_id, spot_number, status, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             updated_by = VALUES(updated_by),
             updated_at = CURRENT_TIMESTAMP`,
          [sectionId, spotNumber, status, userId]
        );
      }

      const unavailableCount = await syncSectionUnavailableCount(sectionId);

      console.log(`✅ Successfully updated spot ${spotNumber} status to '${status}' in section ${sectionId}`);

      res.json({
        success: true,
        message: `Spot status updated to ${status}`,
        data: {
          sectionId: parseInt(sectionId),
          spotNumber,
          status,
          unavailableCount
        }
      });
    } else {
      // For regular parking spots (if needed in the future)
      res.status(400).json({
        success: false,
        message: 'Regular spot status update not implemented yet'
      });
    }
    
  } catch (error) {
    console.error('Update spot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update spot status'
    });
  }
});

// Update section status (for attendant actions)
router.put(
  '/sections/:sectionId/status',
  authenticateToken,
  attendantOrAdmin,
  validateParamInt('sectionId', 'Section ID'),
  validateBodyEnum('status', ['available', 'unavailable', 'maintenance'], 'status'),
  async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { status } = req.body;
    const userId = req.user.user_id;
    
    console.log(`🔧 Updating section ${sectionId} status to '${status}' by user ${userId}`);
    
    // Validate parameters
    if (!sectionId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Validate status
    const validStatuses = ['available', 'unavailable', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }
    
    // Check if section exists
    const sectionQuery = `
      SELECT parking_section_id, section_name, status, vehicle_type
      FROM parking_section 
      WHERE parking_section_id = ?
    `;
    const sectionResult = await db.execute(sectionQuery, [sectionId]);
    
    console.log('🔍 Section query result:', sectionResult);
    
    // Handle different database result formats
    const sections = sectionResult.rows || sectionResult || [];
    
    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }
    
    const section = sections[0];
    console.log(`📊 Section ${sectionId} current status: ${section.status}, changing to: ${status}`);
    
    // Update the section status in parking_section table
    const updateResult = await db.execute(`
      UPDATE parking_section 
      SET status = ?
      WHERE parking_section_id = ?
    `, [status, sectionId]);
    
    // Handle different database result formats for update
    const affectedRows = updateResult.affectedRows || (updateResult.rows?.length || 0);
    
    if (affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update section status'
      });
    }
    
    console.log(`✅ Successfully updated section ${sectionId} status to '${status}'`);
    
    res.json({
      success: true,
      message: `Section status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Update section status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update section status'
    });
  }
});

module.exports = router;


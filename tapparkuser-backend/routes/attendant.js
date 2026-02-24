const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  validateParamInt,
  validateBodyInt,
  validateBodyEnum,
  validateBodyString
} = require('../middleware/validation');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const {
  emitReservationUpdated,
  emitSpotsUpdated,
  emitCapacityUpdated
} = require('../utils/realtime');

// Get vehicle types with occupied, vacant, and total capacity
router.get('/vehicle-types', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching vehicle types data...');

    // Query to get vehicle type statistics
    const query = `
      SELECT 
        ps.spot_type as vehicle_type,
        COUNT(*) as total_capacity,
        SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN ps.status = 'available' THEN 1 ELSE 0 END) as vacant,
        SUM(CASE WHEN ps.status = 'reserved' THEN 1 ELSE 0 END) as reserved
      FROM parking_spot ps
      INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE pa.status = 'active'
      GROUP BY ps.spot_type
      ORDER BY 
        CASE ps.spot_type 
          WHEN 'car' THEN 1
          WHEN 'motorcycle' THEN 2
          WHEN 'bike' THEN 3
          ELSE 4
        END
    `;

    const results = await db.query(query);
    
    console.log(`Found ${results.length} vehicle types:`);
    results.forEach(type => {
      console.log(`  - ${type.vehicle_type}: Total: ${type.total_capacity}, Occupied: ${type.occupied}, Vacant: ${type.vacant}, Reserved: ${type.reserved}`);
    });

    // Format the response to match the frontend expectations
    const vehicleTypes = results.map(type => ({
      id: type.vehicle_type,
      name: type.vehicle_type.charAt(0).toUpperCase() + type.vehicle_type.slice(1),
      totalCapacity: parseInt(type.total_capacity),
      occupied: parseInt(type.occupied),
      available: parseInt(type.vacant),
      reserved: parseInt(type.reserved)
    }));

    res.json({
      success: true,
      data: {
        vehicleTypes
      }
    });

  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vehicle types data',
      error: error.message
    });
  }
});

// Get parking slots with detailed information
router.get('/parking-slots', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching parking slots data for attendant:', req.user.user_id);

    // First get the attendant's assigned area
    const attendantQuery = `
      SELECT assigned_area_id
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.user_id = ? AND t.account_type_name = 'Attendant'
    `;

    const attendantResults = await db.query(attendantQuery, [req.user.user_id]);
    
    if (attendantResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendant not found'
      });
    }

    const assignedAreaId = attendantResults[0].assigned_area_id;
    console.log(`📍 Attendant assigned area ID: ${assignedAreaId}`);

    // If no assigned area, return empty slots
    if (!assignedAreaId) {
      console.log('⚠️ Attendant has no assigned area, returning empty slots');
      return res.json({
        success: true,
        data: {
          parkingSlots: []
        }
      });
    }

    // Debug: Check what areas exist
    const areasQuery = `
      SELECT parking_area_id, parking_area_name, location
      FROM parking_area
      WHERE status = 'active'
    `;
    const allAreas = await db.query(areasQuery);
    console.log('🏢 All active areas:', allAreas);
    console.log(`🎯 Looking for area ID: ${assignedAreaId}`);

    const query = `
      SELECT 
        ps.parking_spot_id as id,
        ps.spot_number as slotId,
        ps.spot_type as vehicleType,
        ps.status,
        psec.section_name as section,
        pa.parking_area_name as areaName,
        pa.location
      FROM parking_spot ps
      INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE pa.status = 'active' AND pa.parking_area_id = ?
      ORDER BY 
        CASE ps.spot_type 
          WHEN 'car' THEN 1
          WHEN 'motorcycle' THEN 2
          WHEN 'bike' THEN 3
          ELSE 4
        END,
        psec.section_name, 
        ps.spot_number
    `;

    const results = await db.query(query, [assignedAreaId]);
    
    console.log(`Found ${results.length} parking slots for assigned area ${assignedAreaId}`);

    // Format the response
    const parkingSlots = results.map(slot => ({
      id: slot.id,
      slotId: slot.slotId,
      vehicleType: slot.vehicleType,
      status: slot.status || 'available', // Default to 'available' if status is empty/null
      section: slot.section,
      areaName: slot.areaName,
      location: slot.location
    }));

    res.json({
      success: true,
      data: {
        parkingSlots
      }
    });

  } catch (error) {
    console.error('Error fetching parking slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking slots data',
      error: error.message
    });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics...');

    // Get total statistics
    const totalQuery = `
      SELECT 
        COUNT(*) as total_spots,
        SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) as total_occupied,
        SUM(CASE WHEN ps.status = 'available' THEN 1 ELSE 0 END) as total_vacant,
        SUM(CASE WHEN ps.status = 'reserved' THEN 1 ELSE 0 END) as total_reserved
      FROM parking_spot ps
      INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE pa.status = 'active'
    `;

    const totalStats = await db.query(totalQuery);
    const stats = totalStats[0];

    // Get vehicle type breakdown
    const vehicleTypesQuery = `
      SELECT 
        ps.spot_type as vehicle_type,
        COUNT(*) as total,
        SUM(CASE WHEN ps.status = 'occupied' THEN 1 ELSE 0 END) as occupied
      FROM parking_spot ps
      INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE pa.status = 'active'
      GROUP BY ps.spot_type
    `;

    const vehicleTypes = await db.query(vehicleTypesQuery);

    res.json({
      success: true,
      data: {
        totalSpots: parseInt(stats.total_spots),
        totalOccupied: parseInt(stats.total_occupied),
        totalVacant: parseInt(stats.total_vacant),
        totalReserved: parseInt(stats.total_reserved),
        vehicleTypes: vehicleTypes.map(type => ({
          type: type.vehicle_type,
          total: parseInt(type.total),
          occupied: parseInt(type.occupied),
          available: parseInt(type.total) - parseInt(type.occupied)
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});

// Get detailed information for a specific parking slot
router.get('/parking-slot/:slotId', authenticateToken, async (req, res) => {
  try {
    const { slotId } = req.params;
    console.log(`📊 Fetching details for parking slot: ${slotId}`);

    const query = `
      SELECT
        ps.parking_spot_id as id,
        ps.spot_number as slotId,
        ps.spot_type as vehicleType,
        ps.status,
        psec.section_name as section,
        pa.parking_area_name as areaName,
        pa.location,
        r.reservation_id,
        r.booking_status,
        CONCAT(u.first_name, ' ', u.last_name) as reserved_by_name,
        v.plate_number as reserved_plate_number,
        u.email as reserved_by_email
      FROM parking_spot ps
      INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      LEFT JOIN reservations r ON ps.parking_spot_id = r.parking_spots_id 
        AND r.booking_status IN ('reserved', 'active')
        AND r.end_time IS NULL
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE ps.parking_spot_id = ? AND pa.status = 'active'
      ORDER BY r.time_stamp DESC
      LIMIT 1
    `;

    const results = await db.query(query, [slotId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found'
      });
    }

    const slot = results[0];
    console.log(`✅ Found slot details:`, slot);

    // Format the response
    const slotDetails = {
      id: slot.id,
      slotId: slot.slotId,
      vehicleType: slot.vehicleType,
      status: slot.status,
      section: slot.section,
      areaName: slot.areaName,
      location: slot.location,
      reservedBy: slot.reserved_by_name || null,
      reservedPlateNumber: slot.reserved_plate_number || null,
      reservedByEmail: slot.reserved_by_email || null,
      reservationId: slot.reservation_id || null,
      bookingStatus: slot.booking_status || null
    };
    
    console.log('📊 Formatted slot details:', slotDetails);

    res.json({
      success: true,
      data: {
        slotDetails
      }
    });

  } catch (error) {
    console.error('Error fetching parking slot details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking slot details',
      error: error.message
    });
  }
});

// Get attendant profile information
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Fetching attendant profile for user: ${req.user.user_id}`);

    const query = `
      SELECT
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.hour_balance,
        u.assigned_area_id,
        pa.parking_area_name,
        pa.location,
        t.account_type_name,
        u.created_at
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      LEFT JOIN parking_area pa ON u.assigned_area_id = pa.parking_area_id
      WHERE u.user_id = ? AND t.account_type_name = 'Attendant'
    `;

    const results = await db.query(query, [req.user.user_id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendant profile not found'
      });
    }

    const user = results[0];
    console.log(`✅ Found attendant profile:`, user);
    console.log(`📍 Assigned Area ID: ${user.assigned_area_id}`);
    console.log(`📍 Area Name: ${user.parking_area_name}`);
    console.log(`📍 Location: ${user.location}`);

    // Format the response
    const attendantProfile = {
      attendantId: `ATT${user.user_id.toString().padStart(3, '0')}`,
      attendantName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      hourBalance: user.hour_balance,
      accountType: user.account_type_name,
      assignedAreaId: user.assigned_area_id,
      assignedAreaName: user.parking_area_name || 'Not Assigned',
      assignedAreaLocation: user.location || 'Not Assigned',
      assignedAreas: user.parking_area_name ? `${user.parking_area_name} - ${user.location || 'No Location'}` : 'Not Assigned',
      createdAt: user.created_at
    };

    res.json({
      success: true,
      data: {
        attendantProfile
      }
    });

  } catch (error) {
    console.error('Error fetching attendant profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendant profile',
      error: error.message
    });
  }
});

// Get attendant notification preferences
router.get('/notification-settings', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Fetching notification settings for user: ${req.user.user_id}`);

    // For now, return default settings. In a real app, this would come from a user_preferences table
    const notificationSettings = {
      newReservationAlerts: true,
      lowCapacityAlerts: true,
      systemMaintenanceAlerts: true,
      emailNotifications: false,
      pushNotifications: true
    };

    res.json({
      success: true,
      data: {
        notificationSettings
      }
    });

  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings',
      error: error.message
    });
  }
});

// Update attendant notification preferences
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const { notificationSettings } = req.body;
    console.log(`📊 Updating notification settings for user: ${req.user.user_id}`, notificationSettings);

    // For now, just return success. In a real app, this would save to a user_preferences table
    console.log('✅ Notification settings updated successfully');

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        notificationSettings
      }
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
});

// Start parking session via QR scan (attendant)
router.post('/start-parking-session', authenticateToken, async (req, res) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        message: 'Missing qrCodeData in request body'
      });
    }

    // Parse QR code data - supports both old format (reservationId) and new format (qr_key)
    let reservationId;
    let qrKey = null;
    let qrData;
    
    if (typeof qrCodeData === 'object') {
      qrData = qrCodeData;
    } else if (typeof qrCodeData === 'string') {
      try {
        qrData = JSON.parse(qrCodeData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code format: not valid JSON'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format: unsupported type'
      });
    }

    // Check for new format with qr_key
    if (qrData.qr_key) {
      qrKey = qrData.qr_key;
      console.log(`🔑 QR code contains qr_key: ${qrKey}`);
    } 
    // Check for old format with reservationId (backward compatibility)
    else if (qrData.reservationId) {
      reservationId = qrData.reservationId;
      console.log(`📋 QR code contains reservationId: ${reservationId}`);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format: missing qr_key or reservationId'
      });
    }

    // Find the reservation by qr_key (new format) or reservation_id (old format)
    let reservation;
    if (qrKey) {
      // New format: find by qr_key - try regular spot first
      reservation = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.vehicle_id,
          r.parking_spots_id,
          r.parking_section_id,
          r.booking_status,
          r.start_time,
          v.plate_number,
          ps.spot_number,
          pa.parking_area_id as area_id,
          pa.parking_area_name,
          pa.location,
          CONCAT(u.first_name, ' ', u.last_name) as user_name,
          'regular_spot' as booking_type
        FROM reservations r
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        JOIN users u ON r.user_id = u.user_id
        WHERE r.qr_key = ? AND r.booking_status = 'reserved'
      `, [qrKey]);
      
      // If no regular spot found, try capacity section
      if (reservation.length === 0) {
        reservation = await db.query(`
          SELECT 
            r.reservation_id,
            r.user_id,
            r.vehicle_id,
            r.parking_spots_id,
            r.parking_section_id,
            r.booking_status,
            r.start_time,
            v.plate_number,
            r.spot_number,
            pa.parking_area_id as area_id,
            pa.parking_area_name,
            pa.location,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            'capacity_section' as booking_type
          FROM reservations r
          JOIN vehicles v ON r.vehicle_id = v.vehicle_id
          JOIN parking_section ps ON r.parking_section_id = ps.parking_section_id
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          JOIN users u ON r.user_id = u.user_id
          WHERE r.qr_key = ? AND r.booking_status = 'reserved' AND r.parking_spots_id = 0
        `, [qrKey]);
      }
    } else {
      // Old format: find by reservation_id - try regular spot first
      reservation = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.vehicle_id,
          r.parking_spots_id,
          r.parking_section_id,
          r.booking_status,
          r.start_time,
          v.plate_number,
          ps.spot_number,
          pa.parking_area_id as area_id,
          pa.parking_area_name,
          pa.location,
          CONCAT(u.first_name, ' ', u.last_name) as user_name,
          'regular_spot' as booking_type
        FROM reservations r
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        JOIN users u ON r.user_id = u.user_id
        WHERE r.reservation_id = ? AND r.booking_status = 'reserved'
      `, [reservationId]);
      
      // If no regular spot found, try capacity section
      if (reservation.length === 0) {
        reservation = await db.query(`
          SELECT 
            r.reservation_id,
            r.user_id,
            r.vehicle_id,
            r.parking_spots_id,
            r.parking_section_id,
            r.booking_status,
            r.start_time,
            v.plate_number,
            r.spot_number,
            pa.parking_area_id as area_id,
            pa.parking_area_name,
            pa.location,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            'capacity_section' as booking_type
          FROM reservations r
          JOIN vehicles v ON r.vehicle_id = v.vehicle_id
          JOIN parking_section ps ON r.parking_section_id = ps.parking_section_id
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          JOIN users u ON r.user_id = u.user_id
          WHERE r.reservation_id = ? AND r.booking_status = 'reserved' AND r.parking_spots_id = 0
        `, [reservationId]);
      }
    }

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or already started'
      });
    }

    const reservationData = reservation[0];

    // Handle capacity sections differently
    if (reservationData.booking_type === 'capacity_section') {
      
      // Call the confirm-parking logic for capacity sections
      const connection = await db.connection.getConnection();
      try {
        await connection.beginTransaction();
        
        // Update reservation status to active
        await connection.execute(`
          UPDATE reservations 
          SET booking_status = 'active', start_time = NOW()
          WHERE reservation_id = ?
        `, [reservationData.reservation_id]);
        
        // Move from reserved_count to parked_count - use parking_section_id
        await connection.execute(`
          UPDATE parking_section 
          SET 
            reserved_count = reserved_count - 1,
            parked_count = parked_count + 1
          WHERE parking_section_id = ?
        `, [reservationData.parking_section_id]);
        
        await connection.commit();
        console.log(`✅ Capacity section confirmed: moved from reserved to parked`);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      
      // Update booking status to active and set start time
      await db.query(`
        UPDATE reservations 
        SET booking_status = 'active', start_time = NOW()
        WHERE reservation_id = ?
      `, [reservationData.reservation_id]);

      // Update parking spot status from 'reserved' to 'occupied'
      await db.query(`
        UPDATE parking_spot 
        SET status = 'occupied'
        WHERE parking_spot_id = ? AND status = 'reserved'
      `, [reservationData.parking_spots_id]);
    }

    // Get the actual start_time from database to ensure accuracy
    const updatedReservation = await db.query(`
      SELECT start_time
      FROM reservations
      WHERE reservation_id = ?
    `, [reservationData.reservation_id]);

    const actualStartTime = updatedReservation[0]?.start_time || new Date().toISOString();

    // Insert into qr_scan_tracking table
    await db.query(`
      INSERT INTO qr_scan_tracking (
        reservation_id,
        attendant_user_id,
        vehicle_plate,
        parking_area_name,
        spot_number,
        scan_type,
        scan_timestamp,
        status_at_scan
      ) VALUES (?, ?, ?, ?, ?, 'start', NOW(), ?)
    `, [
      reservationData.reservation_id,
      req.user.user_id, // The attendant who scanned
      reservationData.plate_number, // Vehicle plate number
      reservationData.parking_area_name,
      reservationData.spot_number,
      'active' // Status at scan
    ]);

    console.log(`✅ Parking session started for reservation ${reservationData.reservation_id} at ${actualStartTime}`);
    console.log(`📝 Attendant log recorded: Staff ${req.user.user_id} scanned START for ${reservationData.user_name}`);

    // Log parking start from user's perspective
    await logUserActivity(
      reservationData.user_id,
      ActionTypes.PARKING_START,
      `Parking session started by attendant: Spot ${reservationData.spot_number} at ${reservationData.parking_area_name}`,
      reservationData.reservation_id
    );

    emitReservationUpdated({
      reservationId: reservationData.reservation_id,
      userId: reservationData.user_id,
      areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
      sectionId: reservationData.parking_section_id ? Number(reservationData.parking_section_id) : undefined,
      spotId: reservationData.parking_spots_id ? Number(reservationData.parking_spots_id) : undefined,
      status: 'active',
      source: 'attendant.start-parking-session'
    });
    if (reservationData.booking_type === 'capacity_section') {
      emitCapacityUpdated({
        areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
        sectionId: reservationData.parking_section_id ? Number(reservationData.parking_section_id) : undefined,
        status: 'active',
        source: 'attendant.start-parking-session'
      });
    } else {
      emitSpotsUpdated({
        areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
        spotId: reservationData.parking_spots_id ? Number(reservationData.parking_spots_id) : undefined,
        reservationId: reservationData.reservation_id,
        status: 'occupied',
        source: 'attendant.start-parking-session'
      });
    }

    res.json({
      success: true,
      message: 'Parking session started successfully',
      data: {
        reservationId: reservationData.reservation_id,
        vehiclePlate: reservationData.plate_number,
        spotNumber: reservationData.spot_number,
        areaName: reservationData.parking_area_name,
        location: reservationData.location,
        startTime: actualStartTime,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Error starting parking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start parking session',
      error: error.message
    });
  }
});

// End parking session via QR scan (attendant)
router.post('/end-parking-session', authenticateToken, async (req, res) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({
        success: false,
        message: 'Missing qrCodeData in request body'
      });
    }

    // Parse QR code data - supports both old format (reservationId) and new format (qr_key)
    let reservationId;
    let qrKey = null;
    let qrData;
    
    if (typeof qrCodeData === 'object') {
      qrData = qrCodeData;
    } else if (typeof qrCodeData === 'string') {
      try {
        qrData = JSON.parse(qrCodeData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid QR code format: not valid JSON'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format: unsupported type'
      });
    }

    // Check for new format with qr_key
    if (qrData.qr_key) {
      qrKey = qrData.qr_key;
      console.log(`🔑 QR code contains qr_key: ${qrKey}`);
    } 
    // Check for old format with reservationId (backward compatibility)
    else if (qrData.reservationId) {
      reservationId = qrData.reservationId;
      console.log(`📋 QR code contains reservationId: ${reservationId}`);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format: missing qr_key or reservationId'
      });
    }

    // Find the reservation by qr_key (new format) or reservation_id (old format)
    // Look for both 'reserved' and 'active' status to handle cases where attendant ends directly
    let reservation;
    if (qrKey) {
      // New format: find by qr_key - try regular spot first
      reservation = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.vehicle_id,
          r.parking_spots_id,
          r.parking_section_id,
          r.booking_status,
          r.start_time,
          r.time_stamp as created_at,
          v.plate_number,
          ps.spot_number,
          pa.parking_area_id as area_id,
          pa.parking_area_name,
          pa.location,
          CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM reservations r
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        JOIN users u ON r.user_id = u.user_id
        WHERE r.qr_key = ? AND r.booking_status IN ('active', 'reserved')
      `, [qrKey]);
      
      // If no regular spot found, try capacity section
      if (reservation.length === 0) {
        reservation = await db.query(`
          SELECT 
            r.reservation_id,
            r.user_id,
            r.vehicle_id,
            r.parking_spots_id,
            r.parking_section_id,
            r.booking_status,
            r.start_time,
            v.plate_number,
            r.spot_number,
            pa.parking_area_id as area_id,
            pa.parking_area_name,
            pa.location,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            'capacity_section' as booking_type
          FROM reservations r
          JOIN vehicles v ON r.vehicle_id = v.vehicle_id
          JOIN parking_section ps ON r.parking_section_id = ps.parking_section_id
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          JOIN users u ON r.user_id = u.user_id
          WHERE r.qr_key = ? AND r.booking_status IN ('active', 'reserved') AND r.parking_spots_id = 0
        `, [qrKey]);
      }
    } else {
      // Old format: find by reservation_id - try regular spot first
      reservation = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.vehicle_id,
          r.parking_spots_id,
          r.parking_section_id,
          r.booking_status,
          r.start_time,
          r.time_stamp as created_at,
          v.plate_number,
          ps.spot_number,
          pa.parking_area_id as area_id,
          pa.parking_area_name,
          pa.location,
          CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM reservations r
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        JOIN users u ON r.user_id = u.user_id
        WHERE r.reservation_id = ? AND r.booking_status IN ('active', 'reserved')
      `, [reservationId]);
      
      // If no regular spot found, try capacity section
      if (reservation.length === 0) {
        reservation = await db.query(`
          SELECT 
            r.reservation_id,
            r.user_id,
            r.vehicle_id,
            r.parking_spots_id,
            r.parking_section_id,
            r.booking_status,
            r.start_time,
            r.time_stamp as created_at,
            v.plate_number,
            r.spot_number,
            pa.parking_area_id as area_id,
            pa.parking_area_name,
            pa.location,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            'capacity_section' as booking_type
          FROM reservations r
          JOIN vehicles v ON r.vehicle_id = v.vehicle_id
          JOIN parking_section ps ON r.parking_section_id = ps.parking_section_id
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          JOIN users u ON r.user_id = u.user_id
          WHERE r.reservation_id = ? AND r.booking_status IN ('active', 'reserved') AND r.parking_spots_id = 0
        `, [reservationId]);
      }
    }

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active parking session not found'
      });
    }

    const reservationData = reservation[0];

    // Handle different booking statuses
    let startTime;
    let actualStartTime;
    
    if (reservationData.booking_status === 'reserved') {
      // Reservation hasn't been activated yet
      // Use current time as start time since attendant is ending it directly
      actualStartTime = new Date();
      startTime = actualStartTime;
      console.log(`🔄 Reservation was 'reserved', setting start_time to current time: ${actualStartTime.toISOString()}`);
    } else {
      // Reservation is already active
      actualStartTime = reservationData.start_time ? new Date(reservationData.start_time) : new Date();
      startTime = actualStartTime;
      console.log(`✅ Reservation was 'active', using existing start_time: ${actualStartTime.toISOString()}`);
    }

    // 1. First, set end_time to NOW in database
    await db.query(`
      UPDATE reservations 
      SET end_time = NOW(), 
          booking_status = 'completed',
          updated_at = NOW()
      WHERE reservation_id = ? 
        AND booking_status IN ('active', 'reserved')
    `, [reservationData.reservation_id]);

    // 2. Get duration calculation from database (more accurate)
    const [durationData] = await db.query(`
      SELECT 
        r.reservation_id,
        r.user_id,
        r.created_at,
        r.start_time,
        r.end_time,
        -- Calculate in database for accuracy
        ROUND(TIMESTAMPDIFF(SECOND, r.created_at, r.end_time) / 3600, 4) AS total_hours,
        ROUND(TIMESTAMPDIFF(SECOND, r.created_at, r.start_time) / 3600, 4) AS wait_hours,
        ROUND(TIMESTAMPDIFF(SECOND, r.start_time, r.end_time) / 3600, 4) AS parking_hours
      FROM reservations r
      WHERE r.reservation_id = ?
    `, [reservationData.reservation_id]);

    if (!durationData || durationData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or update failed'
      });
    }

    // 3. Validate duration makes sense
    if (durationData.total_hours <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration calculated'
      });
    }

    // 4. Use database-calculated durations
    const totalDuration = parseFloat(durationData.total_hours ?? 0);
    const waitTime = durationData.start_time ? parseFloat(durationData.wait_hours ?? 0) : 0;
    const parkingTime = durationData.start_time ? parseFloat(durationData.parking_hours ?? 0) : 0;
    
    // Ensure minimum charge (even for very short durations)
    const durationHours = Math.max(0.0167, totalDuration); // 0.0167 hours = 1 minute
    
    console.log(`💰 Database-calculated billing breakdown:`);
    console.log(`   Created: ${durationData.created_at}`);
    console.log(`   Started: ${durationData.start_time || 'Never'}`);
    console.log(`   Ended: ${durationData.end_time}`);
    console.log(`   Wait time: ${waitTime.toFixed(4)} hours (${(waitTime * 60).toFixed(1)} minutes)`);
    console.log(`   Parking time: ${parkingTime.toFixed(4)} hours (${(parkingTime * 60).toFixed(1)} minutes)`);
    console.log(`   Total charged: ${durationHours.toFixed(4)} hours`);

    // Get user's subscription hours balance
    const subscriptionHours = await db.query(`
      SELECT 
        COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
      FROM subscriptions
      WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
    `, [reservationData.user_id]);

    const balanceHours = subscriptionHours[0]?.total_hours_remaining || 0;

    // Calculate charge (hours used)
    const chargeHours = durationHours;

    // Get active subscription BEFORE updating (to ensure we have the right data)
    const activeSubscription = await db.query(`
      SELECT subscription_id, hours_remaining
      FROM subscriptions
      WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
      ORDER BY purchase_date ASC
      LIMIT 1
    `, [reservationData.user_id]);

    // Check if duration exceeds available balance
    const exceedsBalance = activeSubscription.length > 0 && activeSubscription[0].hours_remaining < chargeHours;
    
    // Calculate hours to deduct (deduct what's available, up to chargeHours)
    let hoursToDeduct = 0;
    let penaltyHours = 0;
    
    if (activeSubscription.length > 0 && balanceHours > 0 && chargeHours > 0) {
      hoursToDeduct = Math.min(chargeHours, activeSubscription[0].hours_remaining);
      
      // Calculate penalty if user exceeds their balance (regardless of how much they have)
      if (exceedsBalance) {
        penaltyHours = chargeHours - activeSubscription[0].hours_remaining;
        console.log(`⚠️ Penalty detected: User has ${activeSubscription[0].hours_remaining} hours, used ${chargeHours} hours, penalty: ${penaltyHours} hours`);
      }
      
      console.log(`💰 Deduction calculation: chargeHours=${chargeHours}, available=${activeSubscription[0].hours_remaining}, willDeduct=${hoursToDeduct}, penalty=${penaltyHours}`);
    } else {
      console.log(`⚠️ Cannot deduct: activeSubscription.length=${activeSubscription.length}, balanceHours=${balanceHours}, chargeHours=${chargeHours}`);
    }

    // Build transaction queries
    const transactionQueries = [
      // Update booking status to completed and set end time
      // Also set start_time if it was null (reserved status)
      {
        sql: `
          UPDATE reservations 
          SET booking_status = 'completed', 
              end_time = NOW(),
              start_time = CASE 
                WHEN start_time IS NULL THEN NOW()
                ELSE start_time
              END
          WHERE reservation_id = ?
        `,
        params: [reservationData.reservation_id]
      },
      // Handle parking spot/section freeing
      ...(reservationData.booking_type === 'capacity_section' ? [
        // If reservation was reserved, decrement reserved_count
        ...(reservationData.booking_status === 'reserved' ? [{
          sql: `
            UPDATE parking_section 
            SET reserved_count = GREATEST(0, reserved_count - 1)
            WHERE parking_section_id = ?
          `,
          params: [reservationData.booking_type === 'capacity_section' ? reservationData.parking_section_id : reservationData.parking_spots_id]
        }] : []),
        // If reservation was active, decrement parked_count
        ...(reservationData.booking_status === 'active' ? [{
          sql: `
            UPDATE parking_section 
            SET parked_count = GREATEST(0, parked_count - 1)
            WHERE parking_section_id = ?
          `,
          params: [reservationData.booking_type === 'capacity_section' ? reservationData.parking_section_id : reservationData.parking_spots_id]
        }] : [])
      ] : [{
        sql: `
          UPDATE parking_spot 
          SET status = 'available'
          WHERE parking_spot_id = ?
        `,
        params: [reservationData.parking_spots_id]
      }]),
      // Deduct subscription hours if applicable
      ...(hoursToDeduct > 0 && activeSubscription.length > 0 ? [{
        sql: `
          UPDATE subscriptions 
          SET hours_remaining = GREATEST(0, hours_remaining - ?), hours_used = hours_used + ?
          WHERE subscription_id = ?
        `,
        params: [hoursToDeduct, hoursToDeduct, activeSubscription[0].subscription_id]
      }] : []),
      // Insert into qr_scan_tracking table
      {
        sql: `
          INSERT INTO qr_scan_tracking (
            reservation_id,
            attendant_user_id,
            vehicle_plate,
            parking_area_name,
            spot_number,
            scan_type,
            scan_timestamp,
            status_at_scan
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        `,
        params: [
          reservationData.reservation_id,
          req.user.user_id, // The attendant who scanned
          reservationData.plate_number, // Vehicle plate number
          reservationData.parking_area_name,
          reservationData.spot_number,
          reservationData.booking_status === 'reserved' ? 'end_reserved' : 'end_active', // More specific scan type
          reservationData.booking_status // Status at scan
        ]
      }
    ];

    // Add penalty insertion if penalty exists
    if (penaltyHours > 0) {
      transactionQueries.push({
        sql: `
          INSERT INTO penalty (user_id, penalty_time)
          VALUES (?, ?)
        `,
        params: [reservationData.user_id, penaltyHours]
      });
    }

    // Use transaction to ensure all updates happen atomically
    await db.transaction(transactionQueries);

    // Verify the deduction by getting updated balance (include all active subscriptions, even if hours_remaining is 0)
    const updatedSubscriptionHours = await db.query(`
      SELECT 
        COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
      FROM subscriptions
      WHERE user_id = ? AND status = 'active'
    `, [reservationData.user_id]);

    const verifiedBalanceHours = updatedSubscriptionHours[0]?.total_hours_remaining || 0;
    
    console.log(`✅ ${reservationData.booking_status === 'reserved' ? 'Reserved parking ended directly' : 'Active parking session ended'} - Deducted ${hoursToDeduct} hours. Balance: ${balanceHours} -> ${verifiedBalanceHours}`);
    console.log(`📝 Attendant log recorded: Staff ${req.user.user_id} scanned END for ${reservationData.user_name} (${reservationData.booking_status})`);

    // Log parking end from user's perspective
    await logUserActivity(
      reservationData.user_id,
      ActionTypes.PARKING_END,
      `${reservationData.booking_status === 'reserved' ? 'Reserved parking' : 'Parking session'} ended by attendant: Spot ${reservationData.spot_number} at ${reservationData.parking_area_name}. Duration: ${durationHours} hours, ${hoursToDeduct} hours deducted`,
      reservationData.reservation_id
    );

    emitReservationUpdated({
      reservationId: reservationData.reservation_id,
      userId: reservationData.user_id,
      areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
      sectionId: reservationData.parking_section_id ? Number(reservationData.parking_section_id) : undefined,
      spotId: reservationData.parking_spots_id ? Number(reservationData.parking_spots_id) : undefined,
      status: 'completed',
      source: 'attendant.end-parking-session-qr'
    });
    if (reservationData.booking_type === 'capacity_section') {
      emitCapacityUpdated({
        areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
        sectionId: reservationData.parking_section_id ? Number(reservationData.parking_section_id) : undefined,
        status: 'completed',
        source: 'attendant.end-parking-session-qr'
      });
    } else {
      emitSpotsUpdated({
        areaId: reservationData.area_id ? Number(reservationData.area_id) : undefined,
        spotId: reservationData.parking_spots_id ? Number(reservationData.parking_spots_id) : undefined,
        reservationId: reservationData.reservation_id,
        status: 'available',
        source: 'attendant.end-parking-session-qr'
      });
    }

    console.log(`✅ ${reservationData.booking_status === 'reserved' ? 'Reserved parking' : 'Parking session'} ended for reservation ${reservationData.reservation_id}`);

    // Prepare response message
    let responseMessage = reservationData.booking_status === 'reserved' 
      ? 'Reserved parking ended successfully' 
      : 'Parking session ended successfully';
      
    if (penaltyHours > 0) {
      const penaltyHoursFormatted = Math.floor(penaltyHours);
      const penaltyMinutesFormatted = Math.round((penaltyHours - penaltyHoursFormatted) * 60);
      responseMessage += `. You exceeded your remaining balance by ${penaltyHoursFormatted} hour${penaltyHoursFormatted !== 1 ? 's' : ''} ${penaltyMinutesFormatted} minute${penaltyMinutesFormatted !== 1 ? 's' : ''}. This penalty will be deducted from your next subscription plan.`;
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        reservationId: reservationData.reservation_id,
        vehiclePlate: reservationData.plate_number,
        spotNumber: reservationData.spot_number,
        areaName: reservationData.parking_area_name,
        location: reservationData.location,
        startTime: reservationData.start_time,
        endTime: new Date().toISOString(),
        createdAt: reservationData.created_at,
        durationMinutes: Math.round(durationHours * 60),
        durationHours: durationHours,
        chargeHours: hoursToDeduct,
        balanceHours: verifiedBalanceHours,
        status: 'completed',
        penaltyHours: penaltyHours > 0 ? penaltyHours : 0,
        hasPenalty: penaltyHours > 0,
        // Simplified billing breakdown
        billingBreakdown: {
          waitTimeHours: waitTime,
          waitTimeMinutes: Math.round(waitTime * 60),
          parkingTimeHours: parkingTime,
          parkingTimeMinutes: Math.round(parkingTime * 60),
          totalChargedHours: durationHours,
          totalChargedMinutes: Math.round(durationHours * 60),
          breakdown: `Wait time: ${Math.round(waitTime * 60)} min + Parking time: ${Math.round(parkingTime * 60)} min = ${durationHours.toFixed(2)} hrs charged`
        }
      }
    });

  } catch (error) {
    console.error('Error ending parking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end parking session',
      error: error.message
    });
  }
});

// Get current parking session status for a reservation (for real-time updates)
router.get('/parking-session-status/:reservationId', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;
    console.log(`📊 Getting parking session status for reservation ID: ${reservationId}`);

    const reservation = await db.query(`
      SELECT 
        r.reservation_id,
        r.user_id,
        r.vehicle_id,
        r.parking_spots_id,
        r.booking_status,
        r.start_time,
        r.end_time,
        v.plate_number,
        ps.spot_number,
        pa.parking_area_name,
        pa.location
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE r.reservation_id = ?
    `, [reservationId]);

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const reservationData = reservation[0];
    let durationMinutes = 0;

    if (reservationData.booking_status === 'active' && reservationData.start_time) {
      const startTime = new Date(reservationData.start_time);
      const currentTime = new Date();
      durationMinutes = Math.max(1, Math.ceil((currentTime - startTime) / (1000 * 60)));
    } else if (reservationData.booking_status === 'completed' && reservationData.start_time && reservationData.end_time) {
      const startTime = new Date(reservationData.start_time);
      const endTime = new Date(reservationData.end_time);
      durationMinutes = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60)));
    }

    res.json({
      success: true,
      data: {
        reservationId: reservationData.reservation_id,
        vehiclePlate: reservationData.plate_number,
        spotNumber: reservationData.spot_number,
        areaName: reservationData.parking_area_name,
        location: reservationData.location,
        status: reservationData.booking_status,
        startTime: reservationData.start_time,
        endTime: reservationData.end_time,
        durationMinutes: durationMinutes
      }
    });

  } catch (error) {
    console.error('Error getting parking session status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parking session status',
      error: error.message
    });
  }
});

// Get parking session status by QR code (for real-time updates)
router.get('/parking-session-status-qr/:qrCode', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.params;

    // Parse QR code data to get reservation ID
    let reservationId;
    try {
      const qrData = JSON.parse(qrCode);
      reservationId = qrData.reservationId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format'
      });
    }

    const reservation = await db.query(`
      SELECT 
        r.reservation_id,
        r.user_id,
        r.vehicle_id,
        r.parking_spots_id,
        r.booking_status,
        r.start_time,
        r.end_time,
        v.plate_number,
        ps.spot_number,
        pa.parking_area_name,
        pa.location
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE r.reservation_id = ?
    `, [reservationId]);

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const reservationData = reservation[0];
    let durationMinutes = 0;

    if (reservationData.booking_status === 'active' && reservationData.start_time) {
      const startTime = new Date(reservationData.start_time);
      const currentTime = new Date();
      durationMinutes = Math.max(1, Math.ceil((currentTime - startTime) / (1000 * 60)));
    } else if (reservationData.booking_status === 'completed' && reservationData.start_time && reservationData.end_time) {
      const startTime = new Date(reservationData.start_time);
      const endTime = new Date(reservationData.end_time);
      durationMinutes = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60)));
    }

    res.json({
      success: true,
      data: {
        reservationId: reservationData.reservation_id,
        vehiclePlate: reservationData.plate_number,
        spotNumber: reservationData.spot_number,
        areaName: reservationData.parking_area_name,
        location: reservationData.location,
        status: reservationData.booking_status,
        startTime: reservationData.start_time,
        endTime: reservationData.end_time,
        durationMinutes: durationMinutes
      }
    });

  } catch (error) {
    console.error('Error getting parking session status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parking session status',
      error: error.message
    });
  }
});

// Get parking scan history for attendants
router.get('/scan-history', authenticateToken, async (req, res) => {
  try {

    // Get all QR scan tracking records with additional details
    const scanHistory = await db.query(`
      SELECT 
        CONCAT('qr_', qst.qr_id) as id,
        qst.reservation_id as reservationId,
        qst.vehicle_plate as vehiclePlate,
        CONCAT(u.first_name, ' ', u.last_name) as userName,
        v.vehicle_type as vehicleType,
        v.brand as vehicleBrand,
        qst.parking_area_name as parkingArea,
        qst.spot_number as parkingSlot,
        qst.scan_type as scanType,
        qst.scan_timestamp as scanTime,
        CONCAT(staff.first_name, ' ', staff.last_name) as attendantName,
        staff_type.account_type_name as userType,
        qst.status_at_scan as status
      FROM qr_scan_tracking qst
      LEFT JOIN users staff ON qst.attendant_user_id = staff.user_id
      LEFT JOIN types staff_type ON staff.user_type_id = staff_type.type_id
      LEFT JOIN reservations r ON qst.reservation_id = r.reservation_id
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE qst.attendant_user_id IS NOT NULL
      
      ORDER BY qst.scan_timestamp DESC
      LIMIT 100
    `);


    res.json({
      success: true,
      data: {
        scans: scanHistory
      }
    });

  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scan history',
      error: error.message
    });
  }
});

// Admin: Create guest booking for available parking spot
router.post(
  '/create-guest-booking',
  authenticateToken,
  validateBodyInt('spotId', 'Spot ID'),
  validateBodyString('firstName', { label: 'First name', min: 1, max: 50 }),
  validateBodyString('lastName', { label: 'Last name', min: 1, max: 50 }),
  validateBodyString('plateNumber', { label: 'Plate number', min: 2, max: 20, pattern: /^[A-Za-z0-9 -]+$/ }),
  validateBodyEnum('vehicleType', ['car', 'motorcycle', 'bike', 'bicycle'], 'vehicle type'),
  validateBodyString('brand', { label: 'Brand', min: 1, max: 50, optional: true }),
  validateBodyString('model', { label: 'Model', min: 1, max: 50, optional: true }),
  validateBodyString('color', { label: 'Color', min: 1, max: 30, optional: true }),
  async (req, res) => {
  try {
    // Check if user is admin
    const userCheck = await db.query(`
      SELECT u.user_id, u.user_type_id, t.account_type_name
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Allow both Admin and Attendant to create guest bookings
    const isAdminOrAttendant = userCheck[0].account_type_name === 'Admin' || 
                               userCheck[0].account_type_name === 'Attendant' || 
                               userCheck[0].user_type_id === 3 || 
                               userCheck[0].user_type_id === 2;
    if (!isAdminOrAttendant) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Attendant access required'
      });
    }

    const { spotId, firstName, lastName, plateNumber, vehicleType, brand, model, color } = req.body;

    // Debug: Log received parameters
    console.log('🔍 Guest booking request parameters:', {
      spotId,
      firstName,
      lastName,
      plateNumber,
      vehicleType,
      brand,
      model,
      color,
      bodyKeys: Object.keys(req.body)
    });

    // Validate required fields
    if (!spotId || !firstName || !lastName || !plateNumber || !vehicleType) {
      console.log('❌ Validation failed - missing parameters:', {
        hasSpotId: !!spotId,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasPlateNumber: !!plateNumber,
        hasVehicleType: !!vehicleType
      });
      return res.status(400).json({
        success: false,
        message: 'Spot ID, first name, last name, plate number, and vehicle type are required'
      });
    }

    // Get spot details and lock it
    let connection = null;
    try {
      if (!db.connection) {
        await db.connect();
      }
      connection = await db.connection.getConnection();
      await connection.beginTransaction();

      // Lock the spot and check availability
      const [lockedSpots] = await connection.execute(
        `SELECT ps.parking_spot_id, ps.status, ps.spot_type, ps.spot_number, 
         psec.parking_area_id, pa.parking_area_name, pa.location
         FROM parking_spot ps
         INNER JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
         INNER JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
         WHERE ps.parking_spot_id = ? FOR UPDATE`,
        [spotId]
      );

      if (lockedSpots.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Parking spot not found'
        });
      }

      const spot = lockedSpots[0];

      // Check if spot is available
      if (spot.status !== 'available') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Parking spot is not available',
          errorCode: 'SPOT_UNAVAILABLE'
        });
      }

      // Validate vehicle type compatibility
      let expectedSpotType = vehicleType.toLowerCase();
      if (vehicleType.toLowerCase() === 'bicycle' || vehicleType.toLowerCase() === 'ebike') {
        expectedSpotType = 'bike';
      }

      if (expectedSpotType !== spot.spot_type.toLowerCase()) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `This parking spot is for ${spot.spot_type}s only. Selected vehicle type is ${vehicleType}.`,
          errorCode: 'VEHICLE_TYPE_MISMATCH'
        });
      }

      // Create guest user (temporary user with guest identifier)
      const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@tappark.guest`;
      const guestPassword = 'guest_temp_password'; // Temporary password, guest won't login
      const hashedPassword = await bcrypt.hash(guestPassword, 12);
      
      const [guestUserResult] = await connection.execute(
        `INSERT INTO users (email, password, first_name, last_name, user_type_id, hour_balance)
         VALUES (?, ?, ?, ?, 4, 0)`,
        [guestEmail, hashedPassword, firstName, lastName]
      );

      const guestUserId = guestUserResult.insertId;

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
        // Create new vehicle for guest
        const [vehicleResult] = await connection.execute(
          `INSERT INTO vehicles (user_id, plate_number, vehicle_type, brand, color)
           VALUES (?, ?, ?, ?, ?)`,
          [guestUserId, plateNumber, vehicleType, brand || null, color || null]
        );
        vehicleId = vehicleResult.insertId;
        console.log(`✅ Guest vehicle created with ID: ${vehicleId}`);
      }

      // Update spot status to occupied (since attendant booking starts immediately)
      await connection.execute(
        'UPDATE parking_spot SET status = ? WHERE parking_spot_id = ? AND status = ?',
        ['occupied', spotId, 'available']
      );

      // Create reservation with active status and start_time (since attendant booking starts immediately)
      const [reservationResult] = await connection.execute(
        `INSERT INTO reservations (user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number, time_stamp, start_time, booking_status, QR)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 'active', '')`,
        [guestUserId, vehicleId, spotId, null, null]
      );

      const reservationId = reservationResult.insertId;

      // Insert into guest_bookings table to track who created this guest booking
      const [guestBookingResult] = await connection.execute(
        `INSERT INTO guest_bookings (guest_user_id, vehicle_id, reservation_id, attendant_id)
         VALUES (?, ?, ?, ?)`,
        [guestUserId, vehicleId, reservationId, req.user.user_id]
      );

      console.log(`✅ Guest booking record created with ID: ${guestBookingResult.insertId}`);

      // Get spot details to populate parking_section_id and spot_number
      const [spotDetails] = await connection.execute(`
        SELECT ps.spot_number, ps.parking_section_id, psec.section_name
        FROM parking_spot ps
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        WHERE ps.parking_spot_id = ?
      `, [spotId]);

      const spotNumber = spotDetails.length > 0 ? `${spotDetails[0].section_name}-${spotDetails[0].spot_number}` : null;
      const parkingSectionId = spotDetails.length > 0 ? spotDetails[0].parking_section_id : null;

      // Update reservation with spot details
      await connection.execute(
        `UPDATE reservations SET parking_section_id = ?, spot_number = ? WHERE reservation_id = ?`,
        [parkingSectionId, spotNumber, reservationId]
      );

      // Generate QR code data
      const qrData = {
        reservationId: reservationId,
        userId: guestUserId,
        vehicleId: vehicleId,
        spotId: spotId,
        areaId: spot.parking_area_id,
        plateNumber: plateNumber,
        parkingArea: spot.parking_area_name,
        spotNumber: spot.spot_number,
        isGuest: true,
        firstName: firstName,
        lastName: lastName,
        timestamp: Date.now()
      };

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Update reservation with QR code
      await connection.execute(
        'UPDATE reservations SET QR = ? WHERE reservation_id = ?',
        [qrCodeDataURL, reservationId]
      );

      await connection.commit();
      connection.release();

      // Log activity
      await logUserActivity(
        req.user.user_id,
        ActionTypes.OTHER,
        `Admin created guest booking: ${firstName} ${lastName} - Spot ${spot.spot_number}`,
        reservationId
      );

      emitReservationUpdated({
        reservationId,
        userId: guestUserId,
        areaId: spot.parking_area_id ? Number(spot.parking_area_id) : undefined,
        spotId: Number(spotId),
        status: 'active',
        source: 'attendant.create-guest-booking'
      });
      emitSpotsUpdated({
        areaId: spot.parking_area_id ? Number(spot.parking_area_id) : undefined,
        spotId: Number(spotId),
        reservationId,
        status: 'occupied',
        source: 'attendant.create-guest-booking'
      });

      res.json({
        success: true,
        message: 'Guest booking created successfully',
        data: {
          reservationId: reservationId,
          qrCode: qrCodeDataURL,
          bookingDetails: {
            reservationId: reservationId,
            qrCode: qrCodeDataURL,
            firstName: firstName,
            lastName: lastName,
            vehiclePlate: plateNumber,
            vehicleType: vehicleType,
            vehicleBrand: brand || 'N/A',
            areaName: spot.parking_area_name,
            areaLocation: spot.location,
            spotNumber: spot.spot_number,
            spotType: spot.spot_type,
            status: 'active',
            isGuest: true
          }
        }
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('Create guest booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest booking',
      error: error.message
    });
  }
});

// Check if plate number already exists
router.get('/check-plate/:plateNumber', authenticateToken, async (req, res) => {
  try {
    const { plateNumber } = req.params;
    
    if (!plateNumber || plateNumber.trim().length === 0) {
      return res.json({
        success: true,
        exists: false,
        message: 'Plate number is empty'
      });
    }

    // Check if vehicle with this plate number exists
    const existingVehicleResult = await db.query(
      'SELECT vehicle_id, plate_number, vehicle_type, brand FROM vehicles WHERE plate_number = ?',
      [plateNumber.trim().toUpperCase()]
    );

    const existingVehicle = existingVehicleResult && existingVehicleResult.length > 0 ? existingVehicleResult[0] : null;
    const exists = existingVehicle !== null;
    
    res.json({
      success: true,
      exists: exists,
      vehicle: exists ? {
        vehicleId: existingVehicle.vehicle_id,
        plateNumber: existingVehicle.plate_number,
        vehicleType: existingVehicle.vehicle_type,
        brand: existingVehicle.brand
      } : null,
      message: exists ? 'Plate number already exists' : 'Plate number is available'
    });

  } catch (error) {
    console.error('Error checking plate number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check plate number',
      error: error.message
    });
  }
});

// Admin/Attendant: End parking session (for occupied spots)
router.put('/end-parking-session/:reservationId', authenticateToken, validateParamInt('reservationId', 'Reservation ID'), async (req, res) => {
  try {
    // Check if user is admin or attendant
    const userCheck = await db.query(`
      SELECT u.user_id, u.user_type_id, t.account_type_name
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isAdminOrAttendant = userCheck[0].account_type_name === 'Admin' || 
                               userCheck[0].account_type_name === 'Attendant' || 
                               userCheck[0].user_type_id === 3 || 
                               userCheck[0].user_type_id === 2;
    
    if (!isAdminOrAttendant) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Attendant access required'
      });
    }

    const { reservationId } = req.params;

    // Get reservation details
    const reservations = await db.query(`
      SELECT 
        r.reservation_id,
        r.user_id,
        r.parking_spots_id,
        psec.parking_area_id as area_id,
        r.booking_status,
        r.start_time
      FROM reservations r
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      WHERE r.reservation_id = ? AND r.booking_status = 'active'
    `, [reservationId]);

    if (reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active parking session not found'
      });
    }

    const reservation = reservations[0];

    // Use transaction to update reservation and spot status
    let connection = null;
    try {
      if (!db.connection) {
        await db.connect();
      }
      connection = await db.connection.getConnection();
      await connection.beginTransaction();

      // Update reservation to completed
      await connection.execute(
        `UPDATE reservations 
         SET booking_status = 'completed', end_time = NOW()
         WHERE reservation_id = ? AND booking_status = 'active'`,
        [reservationId]
      );

      // Update spot status to available
      await connection.execute(
        `UPDATE parking_spot 
         SET status = 'available'
         WHERE parking_spot_id = ?`,
        [reservation.parking_spots_id]
      );

      await connection.commit();
      connection.release();

      // Log activity
      await logUserActivity(
        req.user.user_id,
        ActionTypes.OTHER,
        `Admin/Attendant ended parking session for reservation ${reservationId}`,
        reservationId
      );

      emitReservationUpdated({
        reservationId: parseInt(reservationId, 10),
        userId: reservation.user_id,
        areaId: reservation.area_id ? Number(reservation.area_id) : undefined,
        spotId: reservation.parking_spots_id ? Number(reservation.parking_spots_id) : undefined,
        status: 'completed',
        source: 'attendant.end-parking-session-admin'
      });
      emitSpotsUpdated({
        areaId: reservation.area_id ? Number(reservation.area_id) : undefined,
        spotId: reservation.parking_spots_id ? Number(reservation.parking_spots_id) : undefined,
        reservationId: parseInt(reservationId, 10),
        status: 'available',
        source: 'attendant.end-parking-session-admin'
      });

      res.json({
        success: true,
        message: 'Parking session ended successfully',
        data: {
          reservationId: parseInt(reservationId),
          status: 'completed',
          spotFreed: true
        }
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('End parking session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end parking session',
      error: error.message
    });
  }
});

// Admin/Attendant: Cancel booking (for reserved spots)
router.put('/cancel-booking/:reservationId', authenticateToken, validateParamInt('reservationId', 'Reservation ID'), async (req, res) => {
  try {
    // Check if user is admin or attendant
    const userCheck = await db.query(`
      SELECT u.user_id, u.user_type_id, t.account_type_name
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isAdminOrAttendant = userCheck[0].account_type_name === 'Admin' || 
                               userCheck[0].account_type_name === 'Attendant' || 
                               userCheck[0].user_type_id === 3 || 
                               userCheck[0].user_type_id === 2;
    
    if (!isAdminOrAttendant) {
      return res.status(403).json({
        success: false,
        message: 'Admin or Attendant access required'
      });
    }

    const { reservationId } = req.params;

    // Get reservation details
    const reservations = await db.query(`
      SELECT 
        r.reservation_id,
        r.user_id,
        r.parking_spots_id,
        psec.parking_area_id as area_id,
        r.booking_status
      FROM reservations r
      JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      WHERE r.reservation_id = ? AND r.booking_status = 'reserved'
    `, [reservationId]);

    if (reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reserved booking not found'
      });
    }

    const reservation = reservations[0];

    // Use transaction to cancel reservation and free spot
    let connection = null;
    try {
      if (!db.connection) {
        await db.connect();
      }
      connection = await db.connection.getConnection();
      await connection.beginTransaction();

      // Update reservation to cancelled
      await connection.execute(
        `UPDATE reservations 
         SET booking_status = 'cancelled'
         WHERE reservation_id = ? AND booking_status = 'reserved'`,
        [reservationId]
      );

      // Update spot status to available
      await connection.execute(
        `UPDATE parking_spot 
         SET status = 'available'
         WHERE parking_spot_id = ?`,
        [reservation.parking_spots_id]
      );

      await connection.commit();
      connection.release();

      // Log activity
      await logUserActivity(
        req.user.user_id,
        ActionTypes.OTHER,
        `Admin/Attendant cancelled booking for reservation ${reservationId}`,
        reservationId
      );

      emitReservationUpdated({
        reservationId: parseInt(reservationId, 10),
        userId: reservation.user_id,
        areaId: reservation.area_id ? Number(reservation.area_id) : undefined,
        spotId: reservation.parking_spots_id ? Number(reservation.parking_spots_id) : undefined,
        status: 'cancelled',
        source: 'attendant.cancel-booking-admin'
      });
      emitSpotsUpdated({
        areaId: reservation.area_id ? Number(reservation.area_id) : undefined,
        spotId: reservation.parking_spots_id ? Number(reservation.parking_spots_id) : undefined,
        reservationId: parseInt(reservationId, 10),
        status: 'available',
        source: 'attendant.cancel-booking-admin'
      });

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          reservationId: parseInt(reservationId),
          status: 'cancelled',
          spotFreed: true
        }
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw error;
    }

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

module.exports = router;

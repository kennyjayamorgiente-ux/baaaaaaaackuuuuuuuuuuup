const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateBodyInt, validateParamInt } = require('../middleware/validation');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');
const {
  emitReservationUpdated,
  emitSpotsUpdated,
  emitCapacityUpdated
} = require('../utils/realtime');

const router = express.Router();

const capacityVehicleTypes = ['motorcycle', 'bicycle'];

const normalizeVehicleType = (type) => {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower === 'bike' || lower === 'bicycle' || lower === 'ebike') {
    return 'bicycle';
  }
  if (lower === 'motorbike') {
    return 'motorcycle';
  }
  return lower;
};

const isCapacityVehicleType = (type) => {
  const normalized = normalizeVehicleType(type);
  return normalized ? capacityVehicleTypes.includes(normalized) : false;
};

// Get all parking areas
router.get('/areas', async (req, res) => {
  try {
    const areas = await db.query(`
      SELECT 
        parking_area_id as id,
        parking_area_name as name,
        location,
        status,
        num_of_floors
      FROM parking_area 
      WHERE status = 'active'
      ORDER BY parking_area_name
    `);

    res.json({
      success: true,
      data: {
        areas
      }
    });

  } catch (error) {
    console.error('Get parking areas error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking areas'
    });
  }
});

// Get parking spots for a specific area
router.get('/areas/:areaId/spots', async (req, res) => {
  try {
    const { areaId } = req.params;
    const { vehicleType, includeAll } = req.query; // Optional vehicle type filter and includeAll flag
    const normalizedVehicleType = normalizeVehicleType(vehicleType);
    
    console.log(`🔍 Getting spots for area ${areaId}, vehicle type: ${vehicleType}, includeAll: ${includeAll}`);
    console.log(`🔍 All query params:`, req.query);
    console.log(`🔍 Full URL:`, req.originalUrl);

    let spots;
    
    // For capacity-type vehicles, return section capacity data instead of individual spots
    if (normalizedVehicleType && capacityVehicleTypes.includes(normalizedVehicleType)) {
      console.log(`🏍️ Getting capacity sections for ${normalizedVehicleType}`);
      
      let query = `
        SELECT 
          ps.parking_section_id as id,
          ps.section_name as spot_number,
          CASE 
            WHEN (ps.capacity - ps.parked_count - ps.reserved_count) > 0 THEN 'available'
            ELSE 'full'
          END as status,
          ? as spot_type,
          ps.section_name
        FROM parking_section ps
        WHERE ps.parking_area_id = ? 
          AND ps.vehicle_type = ?
          AND ps.section_mode = 'capacity_only'
          AND ps.status != 'unavailable'
      `;

      const params = [normalizedVehicleType, areaId, normalizedVehicleType];

      // Only show available sections unless includeAll is set
      if (!includeAll || includeAll === 'false') {
        query += ` AND (ps.capacity - ps.parked_count - ps.reserved_count) > 0`;
      }

      query += ` ORDER BY ps.section_name`;

      spots = await db.query(query, params);
      
      console.log(`📋 Found ${spots.length} ${normalizedVehicleType} sections:`, spots.map(s => `${s.spot_number} (${s.status}, available: ${s.status === 'available'})`));
      
    } else {
      // For other vehicles, return regular parking spots
      console.log(`🚗 Getting regular parking spots for vehicle type: ${vehicleType}`);
      
      let query = `
        SELECT 
          ps.parking_spot_id as id,
          ps.spot_number,
          ps.status,
          ps.spot_type,
          psec.section_name
        FROM parking_spot ps
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        WHERE psec.parking_area_id = ?
          AND psec.status != 'unavailable'
      `;

      const params = [areaId];

      // Only filter by status if includeAll is not set (for backward compatibility)
      if (!includeAll || includeAll === 'false') {
        query += ` AND ps.status = 'available'`;
      }

      // Filter by vehicle type if provided
      if (vehicleType) {
        // Map vehicle types to spot types for compatibility
        let spotType = vehicleType;
        if (vehicleType === 'bicycle' || vehicleType === 'ebike') {
          spotType = 'bike';
        } else if (vehicleType === 'motorbike') {
          spotType = 'motorcycle';
        }
        
        console.log(`🔍 Filtering spots for vehicle type: ${vehicleType} -> spot type: ${spotType}`);
        query += ` AND ps.spot_type = ?`;
        params.push(spotType);
      }

      query += ` ORDER BY ps.spot_number`;

      spots = await db.query(query, params);
      
      console.log(`📋 Found ${spots.length} spots:`, spots.map(s => `${s.spot_number} (${s.status}, ${s.spot_type})`));
    }

    console.log(`🔍 Final spots response:`, JSON.stringify(spots, null, 2));

    res.json({
      success: true,
      data: {
        spots
      }
    });

  } catch (error) {
    console.error('Get parking spots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking spots'
    });
  }
});

// Get all parking spots with statuses for layout visualization
router.get('/areas/:areaId/spots-status', authenticateToken, async (req, res) => {
  try {
    const { areaId } = req.params;
    const userId = req.user.user_id;
    
    console.log(`📊 Getting all spot statuses for area ${areaId} (for layout visualization)`);

    // Query to get all spots with their statuses, and check if current user has booked each spot
    const query = `
      SELECT 
        ps.parking_spot_id as id,
        ps.spot_number,
        ps.status,
        ps.spot_type,
        psec.section_name,
        CASE 
          WHEN EXISTS (
            SELECT 1 
            FROM reservations r 
            WHERE r.parking_spots_id = ps.parking_spot_id 
            AND r.user_id = ?
            AND r.booking_status IN ('reserved', 'active')
          ) THEN 1
          ELSE 0
        END as is_user_booked
      FROM parking_spot ps
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      WHERE psec.parking_area_id = ?
      ORDER BY ps.spot_number
    `;

    const spots = await db.query(query, [userId, areaId]);
    
    console.log(`📋 Found ${spots.length} spots with statuses`);

    res.json({
      success: true,
      data: {
        spots
      }
    });

  } catch (error) {
    console.error('Get parking spots status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking spots status'
    });
  }
});

const requireBookingEligibility = async (userId) => {
  const penaltyResult = await db.query(
    'SELECT COALESCE(SUM(penalty_time), 0) AS total_penalty_hours FROM penalty WHERE user_id = ?',
    [userId]
  );
  const outstandingPenalty = parseFloat(penaltyResult[0]?.total_penalty_hours || 0);
  if (outstandingPenalty > 0.0001) {
    return {
      allowed: false,
      reason: 'penalty',
      outstandingPenalty,
      balanceHours: 0
    };
  }

  const balanceResult = await db.query(
    `SELECT COALESCE(SUM(hours_remaining), 0) AS total_hours_remaining
     FROM subscriptions
     WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`,
    [userId]
  );
  const balanceHours = parseFloat(balanceResult[0]?.total_hours_remaining || 0);

  if (balanceHours <= 0) {
    return {
      allowed: false,
      reason: 'insufficient_balance',
      outstandingPenalty: 0,
      balanceHours
    };
  }

  return {
    allowed: true,
    outstandingPenalty: 0,
    balanceHours
  };
};

// Book a parking spot or section
router.post('/book', authenticateToken, validateBodyInt('vehicleId', 'Vehicle ID'), validateBodyInt('spotId', 'Spot ID'), validateBodyInt('areaId', 'Area ID'), async (req, res) => {
  try {
    const { vehicleId, spotId, areaId } = req.body;

    console.log('🔍 Booking Debug - Input:', { vehicleId, spotId, areaId });

    const eligibility = await requireBookingEligibility(req.user.user_id);
    if (!eligibility.allowed) {
      const messages = {
        penalty: `You have ${eligibility.outstandingPenalty.toFixed(2)} penalty hours outstanding. Please purchase a plan to settle them before reserving again.`,
        insufficient_balance: 'You have no remaining subscription hours. Please purchase a plan before reserving a spot.'
      };
      return res.status(403).json({
        success: false,
        errorCode: eligibility.reason === 'penalty' ? 'OUTSTANDING_PENALTY' : 'INSUFFICIENT_BALANCE',
        message: messages[eligibility.reason],
        data: eligibility
      });
    }

    // Check what type of spot this spotId actually is
    const spotTypeCheck = await db.query(`
      SELECT 
        'parking_spot' as source_table,
        ps.spot_number,
        ps.spot_type,
        psec.section_name
      FROM parking_spot ps
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      WHERE ps.parking_spot_id = ?
      
      UNION ALL
      
      SELECT 
        'parking_section' as source_table,
        CONCAT(section_name, '-capacity') as spot_number,
        vehicle_type as spot_type,
        section_name
      FROM parking_section
      WHERE parking_section_id = ?
    `, [spotId, spotId]);
    
    console.log('🔍 Booking Debug - Spot type check:', spotTypeCheck);

    // Validate required fields
    if (!vehicleId || !spotId || !areaId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID, spot ID, and area ID are required'
      });
    }

    // Check if vehicle belongs to user
    const vehicles = await db.query(
      'SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?',
      [vehicleId, req.user.user_id]
    );

    if (vehicles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle not found or does not belong to user'
      });
    }

    // Get vehicle type to determine booking type (before transaction)
    const vehicleDetails = await db.query(
      'SELECT plate_number, vehicle_type, brand FROM vehicles WHERE vehicle_id = ?',
      [vehicleId]
    );

    if (vehicleDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const vehicle = vehicleDetails[0];
    const vehicleTypeNormalized = normalizeVehicleType(vehicle.vehicle_type);
    const isCapacityVehicleBooking = capacityVehicleTypes.includes(vehicleTypeNormalized);

    console.log('🔍 Booking Debug - Vehicle:', vehicle);
    console.log('🔍 Booking Debug - normalized type:', vehicleTypeNormalized);
    console.log('🔍 Booking Debug - isCapacityVehicleBooking:', isCapacityVehicleBooking);

    // If capacity-based vehicle, assign to section instead of individual spot
    if (isCapacityVehicleBooking) {
      console.log(`�️ Redirecting to capacity section booking for ${vehicleTypeNormalized} vehicle ${vehicle.plate_number}`);
      return await bookCapacitySection(req, res, vehicle, areaId, vehicleTypeNormalized);
    }

    const areaDetails = await db.query(
      'SELECT parking_area_name, location FROM parking_area WHERE parking_area_id = ?',
      [areaId]
    );

    if (areaDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Parking area not found'
      });
    }

    // Use transaction with row-level locking to prevent race conditions
    // This ensures only one user can book the spot at a time
    let connection = null;
    try {
      if (!db.connection) {
        await db.connect();
      }

      // Get a connection from the pool for transaction
      connection = await db.connection.getConnection();
      await connection.beginTransaction();

      // Lock the spot row and check availability atomically
      const [lockedSpots] = await connection.execute(
        'SELECT status, spot_type, spot_number FROM parking_spot WHERE parking_spot_id = ? FOR UPDATE',
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
          message: 'Parking spot is no longer available',
          errorCode: 'SPOT_UNAVAILABLE'
        });
      }

      const vehicleType = vehicleDetails[0].vehicle_type;
      const spotType = spot.spot_type;
      
      console.log('🔍 Vehicle type from DB:', vehicleType);
      console.log('🔍 Spot type from DB:', spotType);

      // Map vehicle types to spot types for compatibility
      let expectedSpotType = vehicleType.toLowerCase();
      if (vehicleType.toLowerCase() === 'bicycle') {
        expectedSpotType = 'bike';
      } else if (vehicleType.toLowerCase() === 'ebike') {
        expectedSpotType = 'bike';
      }
      
      console.log('🔍 Expected spot type:', expectedSpotType);
      console.log('🔍 Actual spot type:', spotType);
      console.log('🔍 Types match?', expectedSpotType === spotType.toLowerCase());

      // Validate vehicle type compatibility with spot type (case-insensitive)
      if (expectedSpotType !== spotType.toLowerCase()) {
        await connection.rollback();
        connection.release();
        console.log('❌ Type mismatch - rejecting booking');
        return res.status(400).json({
          success: false,
          errorCode: 'VEHICLE_TYPE_MISMATCH',
          message: `This parking spot is for ${spotType}s only. Your vehicle is a ${vehicleType}.`,
          data: {
            vehicleType: vehicleType,
            spotType: spotType,
            expectedSpotType: expectedSpotType
          }
        });
      }
      
      console.log('✅ Type validation passed');

      // Atomically update spot status to 'reserved' (only if still available)
      // This prevents double booking even if two requests pass the check above
      const [updateResult] = await connection.execute(
        'UPDATE parking_spot SET status = ? WHERE parking_spot_id = ? AND status = ?',
        ['reserved', spotId, 'available']
      );

      // Check if the update actually affected a row
      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Parking spot was just booked by another user. Please try a different spot.',
          errorCode: 'SPOT_ALREADY_BOOKED'
        });
      }

      // Generate unique QR key before creating reservation
      const qrKey = uuidv4();
      
      // Get spot details to populate parking_section_id and spot_number
      const [spotDetails] = await connection.execute(`
        SELECT ps.spot_number, ps.parking_section_id, psec.section_name
        FROM parking_spot ps
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        WHERE ps.parking_spot_id = ?
      `, [spotId]);

      const spotNumber = spotDetails.length > 0 ? `${spotDetails[0].section_name}-${spotDetails[0].spot_number}` : null;
      const parkingSectionId = spotDetails.length > 0 ? spotDetails[0].parking_section_id : null;

      // Create reservation within the same transaction
      // Try to insert with qr_key, fallback if column doesn't exist
      let insertResult;
      try {
        [insertResult] = await connection.execute(`
          INSERT INTO reservations (
            user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number, 
            time_stamp, start_time, booking_status, QR, qr_key
          ) VALUES (?, ?, ?, ?, ?, NOW(), NULL, 'reserved', '', ?)
        `, [req.user.user_id, vehicleId, spotId, parkingSectionId, spotNumber, qrKey]);
      } catch (insertError) {
        // If qr_key column doesn't exist, add it and retry
        if (insertError.message && insertError.message.includes('Unknown column')) {
            try {
            await connection.execute(`
              ALTER TABLE reservations 
              ADD COLUMN qr_key VARCHAR(255) UNIQUE NULL AFTER QR
            `);
            } catch (alterError) {
            // Column might have been added by another request, try insert again
            if (!alterError.message.includes('Duplicate column name')) {
              throw alterError;
            }
          }
          // Retry insert with qr_key
          [insertResult] = await connection.execute(`
            INSERT INTO reservations (
              user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number, 
              time_stamp, start_time, booking_status, QR, qr_key
            ) VALUES (?, ?, ?, ?, ?, NOW(), NULL, 'reserved', '', ?)
          `, [req.user.user_id, vehicleId, spotId, parkingSectionId, spotNumber, qrKey]);
        } else {
          throw insertError;
        }
      }

      const reservationId = insertResult.insertId;
      
      // Generate QR code data with only qr_key
      // IMPORTANT: Only qr_key is included in the QR code for validation
      const qrData = {
        qr_key: qrKey
      };
      
      
      // Generate QR code as data URL
      // The QR code contains only: qr_key
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Update the reservation with the QR code (qr_key already set in INSERT)
      await connection.execute(
        'UPDATE reservations SET QR = ? WHERE reservation_id = ?',
        [qrCodeDataURL, reservationId]
      );

      // Commit the transaction
      await connection.commit();
      connection.release();

      // Log parking booking (outside transaction)
      await logUserActivity(
        req.user.user_id,
        ActionTypes.PARKING_BOOK,
        `Parking spot booked: ${spot.spot_number} at ${areaDetails[0].parking_area_name} for vehicle ${vehicleDetails[0].plate_number}`,
        reservationId
      );

      emitReservationUpdated({
        reservationId,
        userId: req.user.user_id,
        areaId: Number(areaId),
        spotId: Number(spotId),
        status: 'reserved',
        source: 'parking-areas.book'
      });
      emitSpotsUpdated({
        areaId: Number(areaId),
        spotId: Number(spotId),
        status: 'reserved',
        reservationId,
        source: 'parking-areas.book'
      });

      res.json({
        success: true,
        data: {
          reservationId,
          qrCode: qrCodeDataURL,
          qrKey: qrKey,
          message: 'Parking spot booked successfully',
          bookingDetails: {
            reservationId,
            qrCode: qrCodeDataURL,
            qrKey: qrKey,
            vehiclePlate: vehicleDetails[0].plate_number,
            vehicleType: vehicleDetails[0].vehicle_type,
            vehicleBrand: vehicleDetails[0].brand,
            areaName: areaDetails[0].parking_area_name,
            areaLocation: areaDetails[0].location,
            spotNumber: spot.spot_number,
            spotType: spot.spot_type,
            startTime: null, // Will be set when attendant scans QR
            status: 'reserved'
          }
        }
      });

    } catch (transactionError) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      throw transactionError;
    }

  } catch (error) {
    console.error('Book parking spot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book parking spot'
    });
  }
});

// Helper function to book capacity-based sections (motorcycle, bicycle, etc.)
async function bookCapacitySection(req, res, vehicle, areaId, capacityVehicleType) {
  try {
    const { spotId } = req.body; // Get the recommended section ID
    console.log(`�️ Booking ${capacityVehicleType} section for vehicle ${vehicle.plate_number} in area ${areaId}`);
    console.log(`🎯 Recommended section ID: ${spotId}`);
    
    // Start transaction
    const connection = await db.connection.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Use the recommended section instead of finding a different one
      const [assignedSections] = await connection.execute(`
        SELECT 
          ps.parking_section_id,
          ps.section_name,
          ps.capacity,
          ps.parked_count,
          ps.reserved_count,
          (ps.capacity - ps.parked_count - ps.reserved_count) as available_capacity
        FROM parking_section ps
        WHERE ps.parking_section_id = ? 
          AND ps.parking_area_id = ? 
          AND ps.vehicle_type = ?
          AND ps.section_mode = 'capacity_only'
          AND (ps.capacity - ps.parked_count - ps.reserved_count) > 0
          AND ps.status != 'unavailable'
      `, [spotId, areaId, capacityVehicleType]);
      
      if (assignedSections.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Recommended section is no longer available or is full/unavailable',
          errorCode: 'SECTION_NOT_AVAILABLE'
        });
      }
      
      const assignedSection = assignedSections[0];
      console.log(`✅ Using recommended section ${assignedSection.section_name} with ${assignedSection.available_capacity} spots available`);
      
      // Create reservation for the section
      const qrKey = uuidv4();
      
      // Generate a spot number for this motorcycle section reservation
      const spotNumber = `${assignedSection.section_name}-${assignedSection.reserved_count + 1}`;
      
      // Use a dummy parking_spots_id for motorcycle sections (0 indicates capacity-only section)
      const dummyParkingSpotId = 0;
      
      const [insertResult] = await connection.execute(`
        INSERT INTO reservations (
          user_id, vehicle_id, parking_spots_id, parking_section_id, spot_number,
          time_stamp, start_time, booking_status, QR, qr_key
        ) VALUES (?, ?, ?, ?, ?, NOW(), NULL, 'reserved', ?, ?)
      `, [req.user.user_id, req.body.vehicleId, dummyParkingSpotId, assignedSection.parking_section_id, spotNumber, qrKey, qrKey]);
      
      console.log(`✅ Reservation created with ID: ${insertResult.insertId}`);
      
      // Increment reserved_count for the section
      await connection.execute(`
        UPDATE parking_section 
        SET reserved_count = reserved_count + 1 
        WHERE parking_section_id = ?
      `, [assignedSection.parking_section_id]);
      
      console.log(`✅ Section reserved_count incremented`);
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ Transaction committed successfully`);
      
      // Generate QR code data with only qr_key (same as regular spots)
      // IMPORTANT: Only qr_key is included in the QR code for validation
      const qrData = {
        qr_key: qrKey
      };
      
      
      // Generate QR code as data URL (same format as regular spots)
      // The QR code contains only: qr_key
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
        [qrCodeDataURL, insertResult.insertId]
      );
      
      
      // Log motorcycle section booking
      await logUserActivity(
        req.user.user_id,
        ActionTypes.PARKING_BOOK,
        `${capacityVehicleType} section ${assignedSection.section_name} booked in area ${areaId}`,
        insertResult.insertId
      );

      emitReservationUpdated({
        reservationId: insertResult.insertId,
        userId: req.user.user_id,
        areaId: Number(areaId),
        status: 'reserved',
        source: 'parking-areas.book-capacity'
      });
      emitCapacityUpdated({
        areaId: Number(areaId),
        sectionId: assignedSection.parking_section_id,
        status: 'reserved',
        source: 'parking-areas.book-capacity'
      });
      
      console.log(`🎯 Sending response for reservation ${insertResult.insertId}`);
      res.json({
        success: true,
        message: `${capacityVehicleType.charAt(0).toUpperCase() + capacityVehicleType.slice(1)} section ${assignedSection.section_name} booked successfully`,
        data: {
          reservationId: insertResult.insertId,
          qrCode: qrCodeDataURL,
          qrKey: qrKey,
          message: `You've been assigned to ${assignedSection.section_name} section`,
          bookingDetails: {
            reservationId: insertResult.insertId,
            qrCode: qrCodeDataURL,
            qrKey: qrKey,
            vehicleType: vehicle.vehicle_type,
            plateNumber: vehicle.plate_number,
            sectionName: assignedSection.section_name,
            sectionId: assignedSection.parking_section_id,
            availableCapacity: assignedSection.available_capacity - 1,
            startTime: null, // Will be set when attendant scans QR
            status: 'reserved',
            bookingType: `${capacityVehicleType}_section`
          }
        }
      });
      console.log(`✅ Response sent successfully`);
      
    } catch (error) {
      console.error('❌ Transaction error in bookCapacitySection:', error);
      await connection.rollback();
      connection.release();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Book capacity section error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to book capacity section',
      error: error.message
    });
  }
}

// Timer is now purely local - no server-side timer needed
// Timer starts/stops only through QR scans

// Get parking area layout info (AJAX approach)
router.get('/area/:areaId/layout', authenticateToken, async (req, res) => {
  try {
    const { areaId } = req.params;

    const result = await db.query(`
      SELECT 
        pa.parking_area_id,
        pa.parking_area_name,
        pa.location,
        pl.parking_layout_id,
        pl.layout_data,
        pl.floor
      FROM parking_area pa
      LEFT JOIN parking_layout pl ON pa.parking_area_id = pl.parking_area_id
      WHERE pa.parking_area_id = ? AND pa.status = 'active'
      ORDER BY pl.created_at DESC, pl.parking_layout_id DESC
      LIMIT 1
    `, [areaId]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Parking area not found'
      });
    }

    const area = result[0];
    
    // Parse the layout data to extract SVG and sections
    let layoutSvg = '';
    let hasLayout = false;
    let sections = [];
    
    if (area.layout_data) {
      try {
        // Handle both string and already-parsed object cases
        let layoutData;
        if (typeof area.layout_data === 'string') {
          layoutData = JSON.parse(area.layout_data);
        } else {
          layoutData = area.layout_data;
        }
        
        if (layoutData) {
          // Extract SVG data
          if (layoutData.svg_data) {
            layoutSvg = layoutData.svg_data;
            // Replace capacityGradient with white fill for capacity sections
            layoutSvg = layoutSvg
              .replace(/fill="url\(#capacityGradient\)"/g, 'fill="#ffffff"')
              .replace(/stroke="#ff6b35"/g, 'stroke="#dee2e6"');
            hasLayout = true;
            console.log('✅ Successfully extracted SVG, length:', layoutSvg.length);
          } else {
            console.log('⚠️ Layout data exists but no svg_data field found');
          }
          
          // Extract sections data - THIS IS THE KEY FIX!
          if (layoutData.sections && Array.isArray(layoutData.sections)) {
            sections = layoutData.sections;
            console.log('✅ Successfully extracted sections:', sections.length, 'sections');
            console.log('🔍 Section details:', sections.map(s => ({
              position: s.position,
              section_name: s.section_data?.section_name,
              section_mode: s.section_data?.section_mode,
              type: s.section_data?.type,
              capacity: s.section_data?.capacity
            })));
          } else {
            console.log('⚠️ No sections array found in layout data');
            console.log('🔍 Available layout data properties:', Object.keys(layoutData));
          }
        }
      } catch (parseError) {
        // Try to extract SVG directly using regex as fallback
        if (area.layout_data && typeof area.layout_data === 'string') {
          // Method 1: Try to find SVG tag directly (most reliable for malformed JSON)
          // This works best when JSON is broken but SVG content is intact
          const svgMatch = area.layout_data.match(/<svg[\s\S]*?<\/svg>/);
          if (svgMatch && svgMatch[0].length > 100) {
            layoutSvg = svgMatch[0];
            // Replace capacityGradient with white fill for capacity sections
            layoutSvg = layoutSvg
              .replace(/fill="url\(#capacityGradient\)"/g, 'fill="#ffffff"')
              .replace(/stroke="#ff6b35"/g, 'stroke="#dee2e6"');
            hasLayout = true;
            // Silent success - no console log needed
          } else {
            // Method 2: Try to find svg_data field with proper handling of escaped quotes
            let svgDataMatch = area.layout_data.match(/"svg_data"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            
            if (svgDataMatch && svgDataMatch[1].length > 100) {
              // Unescape the SVG string from method 2
              layoutSvg = svgDataMatch[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\');
              // Replace capacityGradient with white fill for capacity sections
              layoutSvg = layoutSvg
                .replace(/fill="url\(#capacityGradient\)"/g, 'fill="#ffffff"')
                .replace(/stroke="#ff6b35"/g, 'stroke="#dee2e6"');
              hasLayout = true;
              // Silent success - no console log needed
            } else {
              // Method 3: Manual parsing as last resort (only use if substantial)
              const svgDataStart = area.layout_data.indexOf('"svg_data"');
              if (svgDataStart !== -1) {
                const colonIndex = area.layout_data.indexOf(':', svgDataStart);
                if (colonIndex !== -1) {
                  let searchStart = colonIndex + 1;
                  while (searchStart < area.layout_data.length && /\s/.test(area.layout_data[searchStart])) {
                    searchStart++;
                  }
                  const valueStart = area.layout_data.indexOf('"', searchStart) + 1;
                  if (valueStart > 0 && valueStart < area.layout_data.length) {
                    let valueEnd = valueStart;
                    let escaped = false;
                    while (valueEnd < area.layout_data.length) {
                      const char = area.layout_data[valueEnd];
                      if (char === '\\' && !escaped) {
                        escaped = true;
                        valueEnd++;
                      } else if (char === '"' && !escaped) {
                        break;
                      } else {
                        escaped = false;
                        valueEnd++;
                      }
                    }
                    if (valueEnd > valueStart) {
                      const svgString = area.layout_data.substring(valueStart, valueEnd);
                      const unescapedSvg = svgString
                        .replace(/\\"/g, '"')
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\r/g, '\r')
                        .replace(/\\\\/g, '\\');
                      // Only use if it's substantial (more than 100 chars)
                      if (unescapedSvg.length > 100) {
                        layoutSvg = unescapedSvg;
                        // Replace capacityGradient with white fill for capacity sections
                        layoutSvg = layoutSvg
                          .replace(/fill="url\(#capacityGradient\)"/g, 'fill="#ffffff"')
                          .replace(/stroke="#ff6b35"/g, 'stroke="#dee2e6"');
                        hasLayout = true;
                        // Silent success - no console log needed
                      }
                    }
                  }
                }
              }
            }
          }
          
          if (!hasLayout) {
            // Only log as error if we couldn't extract anything
            const errorPos = parseError.message.match(/position (\d+)/)?.[1] || 'unknown';
            console.error('❌ Error parsing layout data:', parseError.message);
            console.error('📄 Error at position:', errorPos);
            console.error('❌ Could not extract SVG from malformed JSON');
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        areaId: area.parking_area_id,
        areaName: area.parking_area_name,
        location: area.location,
        layoutId: area.parking_layout_id || null,
        layoutName: `${area.parking_area_name}_floor_${area.floor || 1}`,
        layoutSvg: layoutSvg,
        hasLayout: hasLayout,
        floor: area.floor || 1,
        sections: sections // ADD SECTIONS DATA TO RESPONSE!
      }
    });

  } catch (error) {
    console.error('Get parking area layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch parking area layout'
    });
  }
});

// Serve SVG files statically (AJAX approach)
router.get('/layout/:layoutName', (req, res) => {
  try {
    const { layoutName } = req.params;
    
    // Security: Only allow specific layout names
    const allowedLayouts = ['FPAParking', 'FUMainParking'];
    if (!allowedLayouts.includes(layoutName)) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    const svgPath = path.join(__dirname, `../../PARKINGLAYOUT-1,PARKINGLAYOUT-2/${layoutName}.svg`);
    
    // Check if file exists
    if (!fs.existsSync(svgPath)) {
      return res.status(404).json({
        success: false,
        message: 'SVG file not found'
      });
    }

    // Set appropriate headers for SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the SVG file
    res.sendFile(svgPath);

  } catch (error) {
    console.error('Serve SVG layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to serve layout SVG'
    });
  }
});

// Get parking spot ID from reservation ID
router.get('/reservation/:reservationId/parking-spot-id', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const result = await db.query(`
      SELECT 
        r.parking_spots_id,
        r.parking_section_id,
        COALESCE(ps_section.parking_area_id, direct_section.parking_area_id) AS parking_area_id
      FROM reservations r
      LEFT JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
      LEFT JOIN parking_section ps_section ON ps.parking_section_id = ps_section.parking_section_id
      LEFT JOIN parking_section direct_section ON r.parking_section_id = direct_section.parking_section_id
      WHERE r.reservation_id = ? AND r.user_id = ?
    `, [reservationId, req.user.user_id]);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or does not belong to user'
      });
    }
    
    res.json({
      success: true,
      data: {
        parkingSpotId: result[0].parking_spots_id,
        parkingSectionId: result[0].parking_section_id,
        parkingAreaId: result[0].parking_area_id
      }
    });
    
  } catch (error) {
    console.error('Get parking spot ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parking spot ID'
    });
  }
});

// Get booking details by reservation ID
router.get('/booking/:reservationId', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;

    // Get complete booking details with all related information
    // Handle both regular spots and capacity sections
    let bookingDetails;
    
    // First get the reservation to see what type it is
    const reservationCheck = await db.query(`
      SELECT parking_spots_id, parking_section_id
      FROM reservations 
      WHERE reservation_id = ? AND user_id = ?
    `, [reservationId, req.user.user_id]);
    
    if (reservationCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or does not belong to user'
      });
    }
    
    const reservation = reservationCheck[0];
    const parkingSpotsId = reservation.parking_spots_id;
    const parkingSectionId = reservation.parking_section_id;
    
    console.log('🔍 Booking Details Debug - parking_spots_id:', parkingSpotsId);
    console.log('🔍 Booking Details Debug - parking_section_id:', parkingSectionId);
    
    // Determine booking type: capacity section (parking_spots_id = 0) vs regular spot
    if (parkingSpotsId === 0 && parkingSectionId) {
      // This is a capacity section booking
      console.log('📋 Getting booking details for capacity section');
      bookingDetails = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.time_stamp,
          r.start_time,
          r.end_time,
          r.booking_status,
          r.waiting_end_time,
          r.QR,
          r.qr_key,
          u.first_name,
          u.last_name,
          u.email,
          v.plate_number,
          v.vehicle_type,
          v.brand,
          v.color,
          ps.parking_area_id,
          pa.parking_area_name,
          pa.location,
          r.parking_spots_id,
          r.spot_number,
          'motorcycle' as spot_type,
          ps.section_name
        FROM reservations r
        JOIN users u ON r.user_id = u.user_id
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_section ps ON r.parking_section_id = ps.parking_section_id
        JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
        WHERE r.reservation_id = ? AND r.user_id = ?
      `, [reservationId, req.user.user_id]);
      
      console.log('🔍 Capacity section query result:', bookingDetails.length, 'records found');
      if (bookingDetails.length > 0) {
        console.log('🔍 First result:', {
          reservationId: bookingDetails[0].reservation_id,
          spotNumber: bookingDetails[0].spot_number,
          sectionName: bookingDetails[0].section_name,
          bookingStatus: bookingDetails[0].booking_status
        });
      }
      
    } else {
      // This is a regular parking spot
      console.log('📋 Getting booking details for regular parking spot');
      bookingDetails = await db.query(`
        SELECT 
          r.reservation_id,
          r.user_id,
          r.time_stamp,
          r.start_time,
          r.end_time,
          r.booking_status,
          r.waiting_end_time,
          r.QR,
          r.qr_key,
          u.first_name,
          u.last_name,
          u.email,
          v.plate_number,
          v.vehicle_type,
          v.brand,
          v.color,
          psec.parking_area_id,
          pa.parking_area_name,
          pa.location,
          r.parking_spots_id,
          ps.spot_number,
          ps.spot_type,
          psec.section_name
        FROM reservations r
        JOIN users u ON r.user_id = u.user_id
        JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        JOIN parking_spot ps ON r.parking_spots_id = ps.parking_spot_id
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        WHERE r.reservation_id = ? AND r.user_id = ?
      `, [reservationId, req.user.user_id]);
      
      console.log('🔍 Regular spot query result:', bookingDetails.length, 'records found');
      if (bookingDetails.length > 0) {
        console.log('🔍 First result:', {
          reservationId: bookingDetails[0].reservation_id,
          spotNumber: bookingDetails[0].spot_number,
          spotType: bookingDetails[0].spot_type,
          bookingStatus: bookingDetails[0].booking_status
        });
      }
    }

    if (bookingDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or does not belong to user'
      });
    }

    const booking = bookingDetails[0];
    

    // Ensure qr_key is a clean UUID string, not JSON
    let qrKey = booking.qr_key;
    if (qrKey) {
      // Convert to string and trim
      qrKey = String(qrKey).trim();
      
      // If qr_key appears to be JSON, try to extract the actual UUID
      // This handles cases where old data might have JSON stored in qr_key
      if (qrKey.startsWith('{') || qrKey.startsWith('[')) {
        try {
          const parsed = JSON.parse(qrKey);
          // If it parsed to an object, it's not a valid UUID
          if (typeof parsed === 'object') {
            qrKey = null;
          }
        } catch (e) {
          // Parse failed but starts with {, still not valid
          qrKey = null;
        }
      }
      // If not JSON, use as is (should be UUID)
    }
    // If qrKey is null/undefined, it will be returned as null (no logging to reduce spam)

    // Check for penalty if reservation is completed
    let penaltyInfo = null;
    if (booking.booking_status === 'completed' && booking.start_time && booking.end_time) {
      // Get the most recent penalty for this reservation (if any)
      // We'll check if there's a penalty record created around the time of completion
      const penaltyRecord = await db.query(`
        SELECT penalty_time
        FROM penalty
        WHERE user_id = ?
        ORDER BY penalty_id DESC
        LIMIT 1
      `, [req.user.user_id]);

      if (penaltyRecord.length > 0) {
        penaltyInfo = {
          penaltyHours: penaltyRecord[0].penalty_time,
          hasPenalty: true
        };
      }
    }

    // Calculate billing breakdown for expired reservations
    let billingBreakdown = null;
    if (req.query.includeBilling === 'true' || req.query.includeBilling === true) {
      const isExpired = booking.booking_status === 'invalid';
      const alreadyProcessedExpired = isExpired && !!booking.waiting_end_time;

      if (isExpired) {
        console.log('💰 Calculating billing breakdown for expired reservation (explicit request)');

        const [durationData] = await db.query(`
          SELECT 
            r.reservation_id,
            r.user_id,
            r.time_stamp AS created_at,
            r.waiting_end_time AS end_time,
            ROUND(TIMESTAMPDIFF(SECOND, r.time_stamp, r.waiting_end_time) / 3600, 4) AS total_hours,
            ROUND(TIMESTAMPDIFF(SECOND, r.time_stamp, r.waiting_end_time) / 3600, 4) AS wait_hours,
            0 AS parking_hours
          FROM reservations r
          WHERE r.reservation_id = ? AND r.user_id = ?
            AND r.waiting_end_time IS NOT NULL
        `, [booking.reservation_id, req.user.user_id]);

        const hasData = Array.isArray(durationData) ? durationData.length > 0 : durationData && Object.keys(durationData).length > 0;

        if (hasData) {
          const data = Array.isArray(durationData) ? durationData[0] : durationData;

          try {
            const waitTime = parseFloat(data.wait_hours);
            const waitHours = Math.floor(waitTime);
            const waitMinutes = Math.round((waitTime - waitHours) * 60);
            const totalChargedHours = waitHours + waitMinutes / 100;

            billingBreakdown = {
              waitTimeHours: waitHours,
              waitTimeMinutes: waitMinutes,
              parkingTimeHours: 0,
              parkingTimeMinutes: 0,
              totalChargedHours,
              totalChargedMinutes: waitMinutes,
              breakdown: `Wait time: ${waitHours}h ${waitMinutes}m + Parking time: 0h 0m = ${totalChargedHours} charged`
            };

            if (!alreadyProcessedExpired) {
              try {
                const subscriptionHours = await db.query(`
                  SELECT 
                    COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
                  FROM subscriptions
                  WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
                `, [booking.user_id]);

                const balanceHours = subscriptionHours[0]?.total_hours_remaining || 0;
                const activeSubscription = await db.query(`
                  SELECT subscription_id, hours_remaining
                  FROM subscriptions
                  WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
                  ORDER BY purchase_date ASC
                  LIMIT 1
                `, [booking.user_id]);

                const exceedsBalance = activeSubscription.length > 0 && activeSubscription[0].hours_remaining < totalChargedHours;
                let hoursToDeduct = 0;
                let penaltyHours = 0;

                if (activeSubscription.length > 0 && totalChargedHours > 0) {
                  hoursToDeduct = Math.min(totalChargedHours, activeSubscription[0].hours_remaining);
                  if (exceedsBalance) {
                    penaltyHours = totalChargedHours - activeSubscription[0].hours_remaining;
                  }

                  const transactionQueries = [
                    {
                      sql: `
                        UPDATE reservations 
                        SET booking_status = 'invalid', waiting_end_time = NOW()
                        WHERE reservation_id = ?
                      `,
                      params: [booking.reservation_id]
                    },
                    ...(hoursToDeduct > 0 ? [{
                      sql: `
                        UPDATE subscriptions 
                        SET hours_remaining = GREATEST(0, hours_remaining - ?), hours_used = hours_used + ?
                        WHERE subscription_id = ?
                      `,
                      params: [hoursToDeduct, hoursToDeduct, activeSubscription[0].subscription_id]
                    }] : []),
                    ...(penaltyHours > 0 ? [{
                      sql: `
                        INSERT INTO penalty (user_id, penalty_time)
                        VALUES (?, ?)
                      `,
                      params: [booking.user_id, penaltyHours]
                    }] : [])
                  ];

                  await db.transaction(transactionQueries);

                  await db.query(`
                    SELECT COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
                    FROM subscriptions 
                    WHERE user_id = ? AND status = 'active'
                  `, [booking.user_id]);
                }
              } catch (deductionError) {
                console.error('❌ Error in balance deduction for expired reservation:', deductionError);
              }
            }
          } catch (error) {
            console.error('❌ Error in billing calculation:', error);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        reservationId: booking.reservation_id,
        displayName: `${booking.first_name} ${booking.last_name}`,
        userEmail: booking.email,
        vehicleDetails: {
          plateNumber: booking.plate_number,
          vehicleType: booking.vehicle_type,
          brand: booking.brand,
          color: booking.color
        },
        parkingArea: {
          id: booking.parking_area_id,
          name: booking.parking_area_name,
          location: booking.location
        },
        parkingSlot: {
          parkingSpotId: booking.parking_spot_id,
          spotNumber: booking.spot_number,
          spotType: booking.spot_type,
          sectionName: booking.section_name
        },
        timestamps: {
          bookingTime: booking.time_stamp,
          startTime: booking.start_time,
          endTime: booking.end_time || null
        },
        bookingStatus: booking.booking_status,
        qrCode: booking.QR,
        qrKey: qrKey || null,
        penaltyInfo: penaltyInfo,
        billingBreakdown: billingBreakdown
      }
    });

  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details'
    });
  }
});

// Get current booking (reserved or active) for the logged-in user
router.get('/current-booking', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching current-booking for user:', req.user.user_id);
    
    // Get the most recent reservation for the user
    const reservationCheck = await db.query(`
      SELECT 
        r.reservation_id,
        r.time_stamp,
        r.start_time,
        r.end_time,
        r.booking_status,
        r.QR,
        r.qr_key,
        r.parking_spots_id,
        v.plate_number,
        v.vehicle_type,
        v.brand,
        v.color
      FROM reservations r
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.user_id = ? AND r.booking_status IN ('reserved', 'active')
      ORDER BY r.time_stamp DESC
      LIMIT 1
    `, [req.user.user_id]);

    if (reservationCheck.length === 0) {
      console.log('📋 No current booking found');
      return res.json({
        success: true,
        data: {
          booking: null
        }
      });
    }

    const reservation = reservationCheck[0];
    const parkingSpotsId = reservation.parking_spots_id;
    
    console.log('📋 Found reservation:', reservation.reservation_id, 'parking_spots_id:', parkingSpotsId);
    
    // Check if this parking_spots_id exists in parking_section table
    const sectionCheck = await db.query(`
      SELECT parking_section_id 
      FROM parking_section 
      WHERE parking_section_id = ?
    `, [parkingSpotsId]);

    let bookingDetails;
    
    if (sectionCheck.length > 0) {
      // This is a capacity section
      console.log('🏍️ Current booking is a capacity section');
      bookingDetails = await db.query(`
        SELECT 
          ps.parking_area_id,
          pa.parking_area_name,
          pa.location,
          ps.section_name
        FROM parking_section ps
        JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
        WHERE ps.parking_section_id = ?
      `, [parkingSpotsId]);

      if (bookingDetails.length > 0) {
        const section = bookingDetails[0];
        const booking = {
          reservationId: reservation.reservation_id,
          bookingStatus: reservation.booking_status,
          location_name: section.parking_area_name,
          spot_number: `M1-${section.section_name}-1`,
          plate_number: reservation.plate_number,
          vehicle_type: reservation.vehicle_type,
          vehicle_brand: reservation.brand,
          vehicle_color: reservation.color,
          spot_type: 'motorcycle',
          section_name: section.section_name,
          location: section.location,
          parking_area_id: section.parking_area_id,
          time_stamp: reservation.time_stamp,
          start_time: reservation.start_time,
          end_time: reservation.end_time,
          qr_code: reservation.QR,
          qr_key: reservation.qr_key
        };

        console.log('📋 Returning capacity section booking:', booking);
        return res.json({
          success: true,
          data: {
            booking: booking
          }
        });
      }
    } else {
      // This is a regular spot
      console.log('🚗 Current booking is a regular spot');
      bookingDetails = await db.query(`
        SELECT 
          ps.spot_number,
          ps.spot_type,
          psec.section_name,
          pa.parking_area_id,
          pa.parking_area_name,
          pa.location
        FROM parking_spot ps
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        WHERE ps.parking_spot_id = ?
      `, [parkingSpotsId]);

      if (bookingDetails.length > 0) {
        const spot = bookingDetails[0];
        const booking = {
          reservationId: reservation.reservation_id,
          bookingStatus: reservation.booking_status,
          location_name: spot.parking_area_name,
          spot_number: spot.spot_number,
          plate_number: reservation.plate_number,
          vehicle_type: reservation.vehicle_type,
          vehicle_brand: reservation.brand,
          vehicle_color: reservation.color,
          spot_type: spot.spot_type,
          section_name: spot.section_name,
          location: spot.location,
          parking_area_id: spot.parking_area_id,
          time_stamp: reservation.time_stamp,
          start_time: reservation.start_time,
          end_time: reservation.end_time,
          qr_code: reservation.QR,
          qr_key: reservation.qr_key
        };

        console.log('📋 Returning regular spot booking:', booking);
        return res.json({
          success: true,
          data: {
            booking: booking
          }
        });
      }
    }

    // If we get here, something went wrong with the joins
    console.log('❌ Could not find parking details for reservation:', reservation.reservation_id);
    return res.json({
      success: true,
      data: {
        booking: null
      }
    });

  } catch (error) {
    console.error('Get current booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current booking'
    });
  }
});

// Get all active bookings for the logged-in user
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching my-bookings for user:', req.user.user_id);
    
    // Get all reservations for the user first
    const reservations = await db.query(`
      SELECT 
        r.reservation_id,
        r.time_stamp,
        r.start_time,
        r.end_time,
        r.booking_status,
        r.QR,
        r.qr_key,
        r.parking_spots_id,
        r.parking_section_id,
        r.spot_number,
        u.first_name,
        u.last_name,
        u.email,
        v.plate_number,
        v.vehicle_type,
        v.brand,
        v.color
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.user_id = ?
      ORDER BY r.time_stamp DESC
    `, [req.user.user_id]);

    console.log('📋 Found reservations:', reservations.length);

    const formattedBookings = [];

    // Process each reservation to determine if it's a spot or section
    for (const reservation of reservations) {
      const parkingSpotsId = reservation.parking_spots_id;
      const parkingSectionId = reservation.parking_section_id;
      
      let bookingDetails;
      
      // Check if this is a capacity section (parking_spots_id = 0) OR has parking_section_id
      if (parkingSpotsId === 0 || parkingSectionId) {
        // This is a capacity section (motorcycle or other capacity-based)
        console.log('🏍️ Processing capacity section booking:', reservation.reservation_id);
        
        if (parkingSectionId) {
          bookingDetails = await db.query(`
            SELECT 
              ps.parking_area_id,
              pa.parking_area_name,
              pa.location,
              ps.section_name,
              ps.vehicle_type
            FROM parking_section ps
            JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
            WHERE ps.parking_section_id = ?
          `, [parkingSectionId]);

          if (bookingDetails.length > 0) {
            const section = bookingDetails[0];
            formattedBookings.push({
              reservationId: reservation.reservation_id,
              displayName: `${reservation.first_name} ${reservation.last_name}`,
              userEmail: reservation.email,
              vehicleDetails: {
                plateNumber: reservation.plate_number,
                vehicleType: reservation.vehicle_type,
                brand: reservation.brand,
                color: reservation.color
              },
              parkingArea: {
                id: section.parking_area_id,
                name: section.parking_area_name,
                location: section.location
              },
              parkingSlot: {
                spotNumber: reservation.spot_number || `${section.section_name}-1`,
                spotType: section.vehicle_type || 'motorcycle',
                sectionName: section.section_name
              },
              timestamps: {
                bookingTime: reservation.time_stamp,
                startTime: reservation.start_time,
                endTime: reservation.end_time
              },
              bookingStatus: reservation.booking_status,
              qrCode: reservation.QR,
              qrKey: reservation.qr_key
            });
          }
        }
      } else {
        // This is a regular spot
        console.log('🚗 Processing regular spot booking:', reservation.reservation_id);
        bookingDetails = await db.query(`
          SELECT 
            ps.spot_number,
            ps.spot_type,
            psec.section_name,
            pa.parking_area_id,
            pa.parking_area_name,
            pa.location
          FROM parking_spot ps
          JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
          JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
          WHERE ps.parking_spot_id = ?
        `, [parkingSpotsId]);

        if (bookingDetails.length > 0) {
          const spot = bookingDetails[0];
          formattedBookings.push({
            reservationId: reservation.reservation_id,
            displayName: `${reservation.first_name} ${reservation.last_name}`,
            userEmail: reservation.email,
            vehicleDetails: {
              plateNumber: reservation.plate_number,
              vehicleType: reservation.vehicle_type,
              brand: reservation.brand,
              color: reservation.color
            },
            parkingArea: {
              id: spot.parking_area_id,
              name: spot.parking_area_name,
              location: spot.location
            },
            parkingSlot: {
              spotNumber: spot.spot_number,
              spotType: spot.spot_type,
              sectionName: spot.section_name
            },
            timestamps: {
              bookingTime: reservation.time_stamp,
              startTime: reservation.start_time,
              endTime: reservation.end_time
            },
            bookingStatus: reservation.booking_status,
            qrCode: reservation.QR,
            qrKey: reservation.qr_key
          });
        }
      }
    }

    console.log('📋 Final formatted bookings:', formattedBookings.length);

    res.json({
      success: true,
      data: {
        bookings: formattedBookings
      }
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings'
    });
  }
});

// End parking session - update booking status to inactive and free the spot
router.put('/end-session/:reservationId', authenticateToken, validateParamInt('reservationId', 'Reservation ID'), async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user.user_id;

    const connection = await db.connection.getConnection();
    try {
      await connection.beginTransaction();

      const [reservationRows] = await connection.execute(
        `SELECT 
          r.reservation_id,
          r.user_id,
          r.parking_spots_id,
          r.booking_status
        FROM reservations r
        WHERE r.reservation_id = ? AND r.user_id = ?
          AND r.booking_status IN ('active', 'reserved')
        FOR UPDATE`,
        [reservationId, userId]
      );

      if (reservationRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Active or reserved reservation not found'
        });
      }

      const reservationData = reservationRows[0];
      const [updateReservationResult] = await connection.execute(
        `UPDATE reservations 
         SET booking_status = 'completed', end_time = NOW()
         WHERE reservation_id = ? AND user_id = ?
           AND booking_status IN ('active', 'reserved')`,
        [reservationId, userId]
      );

      if (!updateReservationResult || updateReservationResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Reservation state changed. Please refresh and try again.'
        });
      }

      let spotFreed = false;
      if (reservationData.parking_spots_id && Number(reservationData.parking_spots_id) > 0) {
        await connection.execute(
          `UPDATE parking_spot 
           SET status = 'available'
           WHERE parking_spot_id = ?`,
          [reservationData.parking_spots_id]
        );
        spotFreed = true;
      }

      await connection.commit();

      emitReservationUpdated({
        reservationId: Number(reservationId),
        userId,
        status: 'completed',
        spotId: reservationData.parking_spots_id,
        source: 'parking-areas.end-session'
      });
      if (spotFreed) {
        emitSpotsUpdated({
          spotId: reservationData.parking_spots_id,
          status: 'available',
          reservationId: Number(reservationId),
          source: 'parking-areas.end-session'
        });
      }

      res.json({
        success: true,
        message: 'Parking session ended successfully',
        data: {
          reservationId: reservationId,
          status: 'completed',
          spotFreed
        }
      });
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('End parking session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end parking session'
    });
  }
});

module.exports = router;

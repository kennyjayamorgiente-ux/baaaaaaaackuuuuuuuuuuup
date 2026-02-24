const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');

const router = express.Router();

// Get user's favorite parking spots
router.get('/', authenticateToken, async (req, res) => {
  try {
    const favorites = await db.query(`
      SELECT 
        f.favorites_id,
        f.parking_spot_id,
        f.user_id,
        f.created_at
      FROM favorites f
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.user.user_id]);

    // Get current availability for each favorite spot
    const favoritesWithAvailability = await Promise.all(
      favorites.map(async (favorite) => {
        const parkingSpotId = favorite.parking_spot_id;
        const isCapacitySection = isNaN(parseInt(parkingSpotId));
        
        if (isCapacitySection) {
          // Handle capacity section (motorcycle section)
          // Use the section name directly (e.g., "X", "V", "VB")
          const sectionName = parkingSpotId;
          console.log('🔍 Processing motorcycle section favorite:', sectionName);
          
          // Get section details
          const section = await db.query(`
            SELECT 
              ps.section_name,
              ps.parking_section_id,
              ps.parking_area_id as parking_area_id,
              pa.parking_area_name,
              pa.location
            FROM parking_section ps
            JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
            WHERE ps.section_name = ?
          `, [sectionName]);

          if (section.length === 0) {
            console.log('❌ Section not found:', sectionName);
            return null; // Section doesn't exist anymore
          }

          console.log('✅ Found section:', section[0]);

          // Check if there are active reservations for this section
          const currentReservations = await db.query(`
            SELECT r.reservation_id, r.booking_status, r.start_time, r.end_time, r.user_id,
                   u.first_name, u.last_name, v.plate_number, v.vehicle_type
            FROM reservations r
            JOIN users u ON r.user_id = u.user_id
            JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.parking_section_id = ? 
            AND r.booking_status IN ('reserved', 'active')
            AND (r.end_time IS NULL OR r.end_time > NOW())
            ORDER BY r.time_stamp DESC
          `, [section[0].parking_section_id]);

          let displayStatus = 'available';
          
          if (currentReservations.length > 0) {
            const reservation = currentReservations[0];
            if (reservation.user_id === req.user.user_id) {
              displayStatus = reservation.booking_status === 'active' ? 'active' : 'reserved';
            } else {
              displayStatus = reservation.booking_status === 'active' ? 'occupied' : 'reserved';
            }
          }

          const result = {
            ...favorite,
            spot_number: sectionName,
            spot_type: 'motorcycle',
            spot_status: displayStatus,
            status: displayStatus,
            section_name: sectionName,
            parking_section_id: section[0].parking_section_id,
            parking_area_id: section[0].parking_area_id,
            parking_area_name: section[0].parking_area_name,
            location: section[0].location,
            current_reservation: currentReservations[0] || null,
            is_capacity_section: true,
            total_reservations: currentReservations.length
          };
          
          console.log('🔍 Returning motorcycle section favorite:', result);
          return result;
        } else {
          // Handle regular parking spot
          console.log('🔍 Processing regular spot favorite:', favorite.parking_spot_id);
          const spot = await db.query(`
            SELECT 
              ps.spot_number,
              ps.spot_type,
              ps.status as spot_status,
              ps.parking_section_id,
              psec.section_name,
              psec.parking_area_id as parking_area_id,
              pa.parking_area_name,
              pa.location
            FROM parking_spot ps
            JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
            JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
            WHERE ps.parking_spot_id = ?
          `, [parkingSpotId]);

          if (spot.length === 0) {
            return null; // Spot doesn't exist anymore
          }

          // Check if spot is currently reserved or active by any user
          const currentReservation = await db.query(`
            SELECT r.reservation_id, r.booking_status, r.start_time, r.end_time, r.user_id
            FROM reservations r
            WHERE r.parking_spots_id = ? 
            AND r.booking_status IN ('reserved', 'active')
            AND (r.end_time IS NULL OR r.end_time > NOW())
            ORDER BY r.time_stamp DESC
            LIMIT 1
          `, [parkingSpotId]);

          // Determine display status: use spot's actual status from parking_spot table
          // But also check if there's an active reservation for better UX
          let displayStatus = spot[0].spot_status; // Default to spot's status from parking_spot table
          
          if (currentReservation.length > 0) {
            const reservation = currentReservation[0];
            // If current user has the reservation, it's their spot (could be reserved or active)
            if (reservation.user_id === req.user.user_id) {
              displayStatus = reservation.booking_status === 'active' ? 'active' : 'reserved';
            } else {
              // Another user has it reserved/active
              displayStatus = reservation.booking_status === 'active' ? 'occupied' : 'reserved';
            }
          } else {
            // No active reservation, use spot's status from database
            displayStatus = spot[0].spot_status;
          }

          return {
            ...favorite,
            ...spot[0],
            status: displayStatus, // Display status for UI
            current_reservation: currentReservation[0] || null,
            is_capacity_section: false
          };
        }
      })
    );

    // Filter out null entries (deleted spots/sections)
    const validFavorites = favoritesWithAvailability.filter(fav => fav !== null);

    res.json({
      success: true,
      data: {
        favorites: validFavorites
      }
    });

  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorite parking spots'
    });
  }
});

// Add parking spot to favorites
router.post('/:parkingSpotId', authenticateToken, async (req, res) => {
  try {
    const { parkingSpotId } = req.params;

    // Check if this is a regular parking spot or a capacity section
    // Regular spots: numeric IDs (e.g., 123)
    // Capacity sections: string format (e.g., "X", "V", "VB" for motorcycle sections)
    const isCapacitySection = isNaN(parseInt(parkingSpotId));
    
    if (isCapacitySection) {
      // Handle capacity section (motorcycle section)
      // Use the section name directly (e.g., "X", "V", "VB")
      const sectionName = parkingSpotId;
      
      // Check if the capacity section exists
      const section = await db.query(
        'SELECT parking_section_id FROM parking_section WHERE section_name = ?',
        [sectionName]
      );

      if (section.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Capacity section not found'
        });
      }

      // Check if already in favorites (for capacity sections, we store the section name)
      const existingFavorite = await db.query(
        'SELECT favorites_id FROM favorites WHERE user_id = ? AND parking_spot_id = ?',
        [req.user.user_id, parkingSpotId]
      );

      if (existingFavorite.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Capacity section already in favorites',
          alreadyExists: true
        });
      }

      // Add capacity section to favorites (store the section name as string)
      console.log('🔍 Adding to favorites - parkingSpotId:', parkingSpotId, 'type:', typeof parkingSpotId);
      console.log('🔍 Adding to favorites - userId:', req.user.user_id);
      
      try {
        await db.query(
          'INSERT INTO favorites (user_id, parking_spot_id, created_at) VALUES (?, ?, NOW())',
          [req.user.user_id, parkingSpotId]
        );
        console.log('✅ Successfully inserted into favorites');
      } catch (insertError) {
        console.error('❌ Insert error:', insertError);
        console.error('❌ Insert error details:', {
          code: insertError.code,
          errno: insertError.errno,
          sqlMessage: insertError.sqlMessage,
          sqlState: insertError.sqlState
        });
        throw insertError;
      }

      // Get section details for logging
      const sectionDetails = await db.query(`
        SELECT ps.section_name, pa.parking_area_name
        FROM parking_section ps
        JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
        WHERE ps.section_name = ?
      `, [sectionName]);

      // Log favorite addition
      if (sectionDetails.length > 0) {
        await logUserActivity(
          req.user.user_id,
          ActionTypes.FAVORITE_ADD,
          `Added to favorites: Capacity section ${sectionName} at ${sectionDetails[0].parking_area_name}`,
          parkingSpotId
        );
      }

      res.status(201).json({
        success: true,
        message: 'Capacity section added to favorites'
      });

    } else {
      // Handle regular parking spot
      const spot = await db.query(
        'SELECT parking_spot_id FROM parking_spot WHERE parking_spot_id = ?',
        [parkingSpotId]
      );

      if (spot.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Parking spot not found'
        });
      }

      // Check if already in favorites
      const existingFavorite = await db.query(
        'SELECT favorites_id FROM favorites WHERE user_id = ? AND parking_spot_id = ?',
        [req.user.user_id, parkingSpotId]
      );

      if (existingFavorite.length > 0) {
        return res.status(200).json({
          success: true,
          message: 'Parking spot already in favorites',
          alreadyExists: true
        });
      }

      // Add to favorites
      await db.query(
        'INSERT INTO favorites (user_id, parking_spot_id, created_at) VALUES (?, ?, NOW())',
        [req.user.user_id, parkingSpotId]
      );

      // Get spot details for logging
      const spotDetails = await db.query(`
        SELECT ps.spot_number, pa.parking_area_name
        FROM parking_spot ps
        JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
        JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
        WHERE ps.parking_spot_id = ?
      `, [parkingSpotId]);

      // Log favorite addition
      if (spotDetails.length > 0) {
        await logUserActivity(
          req.user.user_id,
          ActionTypes.FAVORITE_ADD,
          `Added to favorites: Spot ${spotDetails[0].spot_number} at ${spotDetails[0].parking_area_name}`,
          parseInt(parkingSpotId)
        );
      }

      res.status(201).json({
        success: true,
        message: 'Parking spot added to favorites'
      });
    }

  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites'
    });
  }
});

// Remove parking spot from favorites
router.delete('/:parkingSpotId', authenticateToken, async (req, res) => {
  try {
    const { parkingSpotId } = req.params;

    // Check if favorite exists
    const favorite = await db.query(
      'SELECT favorites_id FROM favorites WHERE user_id = ? AND parking_spot_id = ?',
      [req.user.user_id, parkingSpotId]
    );

    if (favorite.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    // Get spot details before deletion for logging
    const spotDetails = await db.query(`
      SELECT ps.spot_number, pa.parking_area_name
      FROM parking_spot ps
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE ps.parking_spot_id = ?
    `, [parkingSpotId]);

    // Remove from favorites
    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND parking_spot_id = ?',
      [req.user.user_id, parkingSpotId]
    );

    // Log favorite removal
    if (spotDetails.length > 0) {
      await logUserActivity(
        req.user.user_id,
        ActionTypes.FAVORITE_REMOVE,
        `Removed from favorites: Spot ${spotDetails[0].spot_number} at ${spotDetails[0].parking_area_name}`,
        parseInt(parkingSpotId)
      );
    }

    res.json({
      success: true,
      message: 'Parking spot removed from favorites'
    });

  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove parking spot from favorites'
    });
  }
});

// Check if parking spot is in favorites
router.get('/check/:parkingSpotId', authenticateToken, async (req, res) => {
  try {
    const { parkingSpotId } = req.params;

    const favorite = await db.query(
      'SELECT favorites_id FROM favorites WHERE user_id = ? AND parking_spot_id = ?',
      [req.user.user_id, parkingSpotId]
    );

    res.json({
      success: true,
      data: {
        isFavorite: favorite.length > 0
      }
    });

  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status'
    });
  }
});

module.exports = router;

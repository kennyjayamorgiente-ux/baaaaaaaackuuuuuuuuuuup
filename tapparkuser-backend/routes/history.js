const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get comprehensive user history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let history = [];

    if (!type || type === 'parking') {
      // Get all reservations for the user first
      const reservations = await db.query(`
        SELECT 
          r.reservation_id as id,
          r.time_stamp as timestamp,
          r.start_time,
          r.end_time,
          r.booking_status,
          r.QR as qr_code,
          r.parking_spots_id,
          v.plate_number,
          v.vehicle_type,
          v.brand,
          v.color,
          CASE 
            WHEN r.end_time IS NOT NULL THEN GREATEST(1, TIMESTAMPDIFF(MINUTE, r.start_time, r.end_time)) / 60.0
            ELSE NULL
          END as hours_deducted
        FROM reservations r
        LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.user_id = ?
        ORDER BY r.time_stamp DESC
        LIMIT ? OFFSET ?
      `, [req.user.user_id, parseInt(limit), parseInt(offset)]);

      // Process each reservation to get parking details
      const parkingHistory = [];
      
      for (const reservation of reservations) {
        const parkingSpotsId = reservation.parking_spots_id;
        
        // Check if this parking_spots_id exists in parking_section table
        const sectionCheck = await db.query(`
          SELECT parking_section_id 
          FROM parking_section 
          WHERE parking_section_id = ?
        `, [parkingSpotsId]);

        let parkingDetails;
        
        if (sectionCheck.length > 0) {
          // This is a capacity section
          parkingDetails = await db.query(`
            SELECT 
              pa.parking_area_name as location_name,
              pa.location,
              ps.section_name
            FROM parking_section ps
            JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
            WHERE ps.parking_section_id = ?
          `, [parkingSpotsId]);

          if (parkingDetails.length > 0) {
            const section = parkingDetails[0];
            parkingHistory.push({
              ...reservation,
              location_name: section.location_name,
              location: section.location,
              spot_number: `M1-${section.section_name}-1`,
              spot_type: 'motorcycle',
              section_name: section.section_name
            });
          }
        } else {
          // This is a regular spot
          parkingDetails = await db.query(`
            SELECT 
              pa.parking_area_name as location_name,
              pa.location,
              ps.spot_number,
              ps.spot_type,
              psec.section_name
            FROM parking_spot ps
            JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
            JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
            WHERE ps.parking_spot_id = ?
          `, [parkingSpotsId]);

          if (parkingDetails.length > 0) {
            const spot = parkingDetails[0];
            parkingHistory.push({
              ...reservation,
              location_name: spot.location_name,
              location: spot.location,
              spot_number: spot.spot_number,
              spot_type: spot.spot_type,
              section_name: spot.section_name
            });
          }
        }
      }

      history = history.concat(parkingHistory);
    }

    if (!type || type === 'payments') {
      // Get payment history
      const paymentHistory = await db.query(`
        SELECT 
          'payment' as type,
          p.payment_id as id,
          p.payment_date as timestamp,
          p.amount,
          'subscription' as payment_type,
          pm.method_name as payment_method,
          p.status,
          pl.plan_name as location_name,
          pl.number_of_hours,
          pl.cost
        FROM payments p
        LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
        LEFT JOIN subscriptions s ON p.subscription_id = s.subscription_id
        LEFT JOIN plans pl ON s.plan_id = pl.plan_id
        WHERE s.user_id = ?
        ORDER BY p.payment_date DESC
        LIMIT ? OFFSET ?
      `, [req.user.user_id, parseInt(limit), parseInt(offset)]);

      history = history.concat(paymentHistory);
    }

    // Sort combined history by timestamp
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get total counts
    const parkingCount = await db.query(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ?',
      [req.user.user_id]
    );

    const paymentCount = await db.query(
      'SELECT COUNT(*) as count FROM payments p JOIN subscriptions s ON p.subscription_id = s.subscription_id WHERE s.user_id = ?',
      [req.user.user_id]
    );

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil((parkingCount[0].count + paymentCount[0].count) / limit),
          totalItems: parkingCount[0].count + paymentCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history'
    });
  }
});

// Get parking history only
router.get('/parking', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Get all reservations for the user first
    let reservationQuery = `
      SELECT 
        r.reservation_id,
        r.time_stamp,
        r.start_time,
        r.end_time,
        r.waiting_end_time,
        r.booking_status,
        r.parking_spots_id,
        r.parking_section_id,
        v.plate_number,
        v.vehicle_type,
        v.brand,
        CASE 
          WHEN r.booking_status = 'invalid' AND r.waiting_end_time IS NOT NULL THEN GREATEST(1, TIMESTAMPDIFF(MINUTE, r.time_stamp, r.waiting_end_time))
          WHEN r.end_time IS NOT NULL THEN GREATEST(1, TIMESTAMPDIFF(MINUTE, r.time_stamp, r.end_time))
          ELSE NULL
        END as duration_minutes,
        CASE 
          WHEN r.booking_status = 'invalid' AND r.waiting_end_time IS NOT NULL THEN GREATEST(1, TIMESTAMPDIFF(MINUTE, r.time_stamp, r.waiting_end_time)) / 60.0
          WHEN r.end_time IS NOT NULL THEN GREATEST(1, TIMESTAMPDIFF(MINUTE, r.time_stamp, r.end_time)) / 60.0
          ELSE NULL
        END as hours_deducted,
        CASE 
          WHEN r.booking_status = 'invalid' AND r.waiting_end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, r.time_stamp, r.waiting_end_time)
          WHEN r.start_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, r.time_stamp, r.start_time)
          ELSE NULL
        END as wait_minutes,
        CASE 
          WHEN r.booking_status = 'invalid' THEN 0
          WHEN r.start_time IS NOT NULL AND r.end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, r.start_time, r.end_time)
          ELSE NULL
        END as parking_minutes
      FROM reservations r
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.user_id = ?
    `;
    const reservationParams = [req.user.user_id];

    if (status) {
      reservationQuery += ' AND r.booking_status = ?';
      reservationParams.push(status);
    }

    reservationQuery += ' ORDER BY r.time_stamp DESC LIMIT ? OFFSET ?';
    reservationParams.push(parseInt(limit), parseInt(offset));

    const reservations = await db.query(reservationQuery, reservationParams);

    const normalizeBillingMinutes = (waitMinutes = 0, parkingMinutes = 0, durationMinutes = 0) => {
      const normalizedWait = Math.max(0, waitMinutes || 0);
      const normalizedParking = Math.max(0, parkingMinutes || 0);
      const total = Math.max(0, durationMinutes || 0);

      const sum = normalizedWait + normalizedParking;
      if (total > sum) {
        const delta = total - sum;
        if (normalizedParking > 0) {
          return {
            waitMinutes: normalizedWait,
            parkingMinutes: normalizedParking + delta,
          };
        }
        return {
          waitMinutes: normalizedWait + delta,
          parkingMinutes: normalizedParking,
        };
      }

      return {
        waitMinutes: normalizedWait,
        parkingMinutes: normalizedParking,
      };
    };

    // Process each reservation to get parking details
    const sessions = [];
    
    for (const reservation of reservations) {
      const parkingSpotsId = reservation.parking_spots_id;
      const parkingSectionId = reservation.parking_section_id;

      // Try to fetch regular parking spot details first
      const regularSpotDetails = parkingSpotsId
        ? await db.query(`
            SELECT 
              pa.parking_area_id,
              pa.parking_area_name as location_name,
              pa.location as location_address,
              ps.parking_spot_id,
              ps.spot_number,
              ps.spot_type,
              ps.status as spot_status,
              psec.section_name
            FROM parking_spot ps
            JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
            JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
            WHERE ps.parking_spot_id = ?
          `, [parkingSpotsId])
        : [];

      const buildBillingBreakdown = () => {
        if (!(reservation.end_time && reservation.start_time)) {
          return null;
        }

        const totalMinutes = reservation.duration_minutes || 0;
        const { waitMinutes, parkingMinutes } = normalizeBillingMinutes(
          reservation.wait_minutes,
          reservation.parking_minutes,
          totalMinutes
        );

        return {
          waitTimeHours: waitMinutes / 60,
          waitTimeMinutes: waitMinutes,
          parkingTimeHours: parkingMinutes / 60,
          parkingTimeMinutes: parkingMinutes,
          totalChargedHours: totalMinutes / 60,
          totalChargedMinutes: totalMinutes,
          breakdown: `Wait time: ${waitMinutes} min + Parking time: ${parkingMinutes} min = ${(totalMinutes / 60).toFixed(2)} hrs charged`
        };
      };

      if (regularSpotDetails.length > 0) {
        const spot = regularSpotDetails[0];
        const billingBreakdown = buildBillingBreakdown();

        sessions.push({
          ...reservation,
          parking_area_id: spot.parking_area_id,
          location_name: spot.location_name,
          location_address: spot.location_address,
          parking_spot_id: spot.parking_spot_id,
          spot_number: spot.spot_number,
          spot_type: spot.spot_type,
          spot_status: spot.spot_status,
          section_name: spot.section_name,
          billingBreakdown
        });
        continue;
      }

      if (parkingSectionId) {
        const sectionDetails = await db.query(`
          SELECT 
            pa.parking_area_id,
            pa.parking_area_name as location_name,
            pa.location as location_address,
            ps.section_name,
            ps.vehicle_type
          FROM parking_section ps
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          WHERE ps.parking_section_id = ?
        `, [parkingSectionId]);

        if (sectionDetails.length > 0) {
          const section = sectionDetails[0];
          const billingBreakdown = buildBillingBreakdown();

          sessions.push({
            ...reservation,
            parking_area_id: section.parking_area_id,
            location_name: section.location_name,
            location_address: section.location_address,
            parking_spot_id: 0,
            spot_number: section.section_name,
            spot_type: section.vehicle_type || 'motorcycle',
            spot_status: 'available',
            section_name: section.section_name,
            billingBreakdown
          });
        }
      }
    }

    const totalCount = await db.query(
      'SELECT COUNT(*) as count FROM reservations WHERE user_id = ?' + (status ? ' AND booking_status = ?' : ''),
      status ? [req.user.user_id, status] : [req.user.user_id]
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

// Get payment history only
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.payment_id,
        p.subscription_id,
        p.amount,
        'subscription' as payment_type,
        pm.method_name as payment_method,
        p.status,
        p.payment_date as created_at,
        pl.plan_name as location_name,
        pl.description as location_address,
        pl.number_of_hours,
        pl.cost
      FROM payments p
      LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
      LEFT JOIN subscriptions s ON p.subscription_id = s.subscription_id
      LEFT JOIN plans pl ON s.plan_id = pl.plan_id
      WHERE s.user_id = ?
    `;
    const params = [req.user.user_id];

    if (type) {
      query += ' AND p.payment_type = ?';
      params.push(type);
    }

    query += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payments = await db.query(query, params);

    const totalCount = await db.query(
      'SELECT COUNT(*) as count FROM payments p JOIN subscriptions s ON p.subscription_id = s.subscription_id WHERE s.user_id = ?' + (type ? ' AND p.payment_type = ?' : ''),
      type ? [req.user.user_id, type] : [req.user.user_id]
    );

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount[0].count / limit),
          totalItems: totalCount[0].count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// Get history statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Parking statistics
    const parkingStats = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN booking_status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        SUM(CASE WHEN booking_status = 'active' THEN 1 ELSE 0 END) as active_sessions
      FROM reservations 
      WHERE user_id = ? AND time_stamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.user.user_id, parseInt(period)]);

    // Payment statistics
    const paymentStats = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_type = 'topup' THEN amount ELSE 0 END) as total_topup,
        SUM(CASE WHEN payment_type = 'parking_fee' THEN amount ELSE 0 END) as total_parking_fees,
        AVG(CASE WHEN payment_type = 'parking_fee' THEN amount ELSE NULL END) as avg_parking_cost
      FROM payments 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [req.user.user_id, parseInt(period)]);

    // Monthly breakdown
    const monthlyBreakdown = await db.query(`
      SELECT 
        DATE_FORMAT(time_stamp, '%Y-%m') as month,
        COUNT(*) as sessions_count
      FROM reservations 
      WHERE user_id = ? AND time_stamp >= DATE_SUB(NOW(), INTERVAL 12 MONTH) AND booking_status = 'completed'
      GROUP BY DATE_FORMAT(time_stamp, '%Y-%m')
      ORDER BY month DESC
    `, [req.user.user_id]);

    // Most used locations
    // Get reservations first, then determine location for each
    const locationReservations = await db.query(`
      SELECT r.parking_spots_id
      FROM reservations r
      WHERE r.user_id = ? AND r.booking_status = 'completed'
    `, [req.user.user_id]);

    const locationCounts = new Map();
    
    for (const reservation of locationReservations) {
      const parkingSpotsId = reservation.parking_spots_id;
      
      // Check if this parking_spots_id exists in parking_section table
      const sectionCheck = await db.query(`
        SELECT parking_section_id 
        FROM parking_section 
        WHERE parking_section_id = ?
      `, [parkingSpotsId]);

      let locationDetails;
      
      if (sectionCheck.length > 0) {
        // This is a capacity section
        locationDetails = await db.query(`
          SELECT 
            pa.parking_area_id,
            pa.parking_area_name as location_name
          FROM parking_section ps
          JOIN parking_area pa ON ps.parking_area_id = pa.parking_area_id
          WHERE ps.parking_section_id = ?
        `, [parkingSpotsId]);
      } else {
        // This is a regular spot
        locationDetails = await db.query(`
          SELECT 
            pa.parking_area_id,
            pa.parking_area_name as location_name
          FROM parking_spot ps
          JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
          JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
          WHERE ps.parking_spot_id = ?
        `, [parkingSpotsId]);
      }

      if (locationDetails.length > 0) {
        const location = locationDetails[0];
        const key = location.parking_area_id;
        const current = locationCounts.get(key) || { location_name: location.location_name, visit_count: 0 };
        current.visit_count += 1;
        locationCounts.set(key, current);
      }
    }

    // Convert to array and sort by visit count
    const topLocations = Array.from(locationCounts.values())
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        parking: parkingStats[0],
        payments: paymentStats[0],
        monthlyBreakdown,
        topLocations
      }
    });

  } catch (error) {
    console.error('Get history stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history statistics'
    });
  }
});

// Cache for frequent spots (cache for 3 minutes)
const frequentSpotsCache = new Map();
const FREQUENT_SPOTS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const buildFrequentCacheKey = (userId, limit) => `frequent_spots_${userId}_${limit}`;

// Helper function to invalidate frequent spots cache
const invalidateFrequentSpotsCache = (userId) => {
  const prefix = `frequent_spots_${userId}_`;
  let deleted = 0;
  for (const key of Array.from(frequentSpotsCache.keys())) {
    if (key.startsWith(prefix)) {
      frequentSpotsCache.delete(key);
      deleted++;
    }
  }
  console.log(`🔥 Invalidated frequent spots cache for user ${userId} (${deleted} entries)`);
};

const normalizeLimit = (value, fallback = 5) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 10); // keep query small
};

// Get frequently used parking spots with lightweight queries
router.get('/frequent-spots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const parsedLimit = normalizeLimit(req.query.limit);
    const cacheKey = buildFrequentCacheKey(userId, parsedLimit);
    const now = Date.now();

    const cachedData = frequentSpotsCache.get(cacheKey);
    if (cachedData && (now - cachedData.timestamp) < FREQUENT_SPOTS_CACHE_TTL) {
      console.log('📦 Serving frequent spots from cache for user:', userId);
      return res.json({
        success: true,
        data: {
          frequent_spots: cachedData.spots,
          cached: true
        }
      });
    }

    console.log('🔍 Fetching frequent spots for user:', userId);

    const aggregatedSpots = await db.query(`
      SELECT 
        r.parking_spots_id,
        r.parking_section_id,
        COUNT(r.reservation_id) AS usage_count,
        MAX(r.time_stamp) AS last_used
      FROM reservations r
      WHERE r.user_id = ?
        AND (
          r.parking_spots_id > 0
          OR (r.parking_spots_id = 0 AND r.parking_section_id IS NOT NULL)
        )
      GROUP BY r.parking_spots_id, r.parking_section_id
      ORDER BY usage_count DESC, last_used DESC
      LIMIT ?
    `, [userId, parsedLimit]);

    if (aggregatedSpots.length === 0) {
      frequentSpotsCache.set(cacheKey, { spots: [], timestamp: now });
      return res.json({
        success: true,
        data: {
          frequent_spots: [],
          cached: false
        }
      });
    }

    const regularSpotIds = aggregatedSpots
      .filter(spot => spot.parking_spots_id && spot.parking_spots_id > 0)
      .map(spot => spot.parking_spots_id);

    const sectionIds = aggregatedSpots
      .filter(spot => (!spot.parking_spots_id || spot.parking_spots_id === 0) && spot.parking_section_id)
      .map(spot => spot.parking_section_id);

    const buildInClause = (ids) => {
      if (!ids || !ids.length) {
        return { clause: 'IN (NULL)', params: [] };
      }
      const placeholders = ids.map(() => '?').join(',');
      return { clause: `IN (${placeholders})`, params: ids };
    };

    const regularIn = buildInClause(regularSpotIds);
    const sectionIn = buildInClause(sectionIds);

    const regularDetails = regularSpotIds.length ? await db.query(`
      SELECT 
        ps.parking_spot_id,
        ps.spot_number,
        ps.spot_type,
        ps.status AS spot_status,
        pa.parking_area_id,
        pa.parking_area_name AS location_name,
        pa.location AS location_address,
        psec.section_name
      FROM parking_spot ps
      JOIN parking_section psec ON ps.parking_section_id = psec.parking_section_id
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE ps.parking_spot_id ${regularIn.clause}
    `, regularIn.params) : [];

    const sectionDetails = sectionIds.length ? await db.query(`
      SELECT 
        psec.parking_section_id,
        psec.section_name,
        pa.parking_area_id,
        pa.parking_area_name AS location_name,
        pa.location AS location_address
      FROM parking_section psec
      JOIN parking_area pa ON psec.parking_area_id = pa.parking_area_id
      WHERE psec.parking_section_id ${sectionIn.clause}
    `, sectionIn.params) : [];

    const regularDetailsMap = new Map();
    regularDetails.forEach(detail => {
      regularDetailsMap.set(detail.parking_spot_id, detail);
    });

    const sectionDetailsMap = new Map();
    sectionDetails.forEach(detail => {
      sectionDetailsMap.set(detail.parking_section_id, detail);
    });

    const activeSpotReservations = regularSpotIds.length ? await db.query(`
      SELECT reservation_id, booking_status, user_id, start_time, end_time, parking_spots_id
      FROM reservations
      WHERE parking_spots_id ${regularIn.clause}
        AND booking_status IN ('reserved', 'active')
        AND (end_time IS NULL OR end_time > NOW())
      ORDER BY time_stamp DESC
    `, regularIn.params) : [];

    const activeSectionReservations = sectionIds.length ? await db.query(`
      SELECT reservation_id, booking_status, user_id, start_time, end_time, parking_section_id
      FROM reservations
      WHERE parking_section_id ${sectionIn.clause}
        AND booking_status IN ('reserved', 'active')
        AND (end_time IS NULL OR end_time > NOW())
      ORDER BY time_stamp DESC
    `, sectionIn.params) : [];

    const latestSpotReservationMap = new Map();
    activeSpotReservations.forEach(row => {
      if (!latestSpotReservationMap.has(row.parking_spots_id)) {
        latestSpotReservationMap.set(row.parking_spots_id, row);
      }
    });

    const latestSectionReservationMap = new Map();
    activeSectionReservations.forEach(row => {
      if (!latestSectionReservationMap.has(row.parking_section_id)) {
        latestSectionReservationMap.set(row.parking_section_id, row);
      }
    });

    const assembledSpots = aggregatedSpots
      .map(spot => {
        const isSection = !spot.parking_spots_id || spot.parking_spots_id === 0;
        const detail = isSection
          ? sectionDetailsMap.get(spot.parking_section_id)
          : regularDetailsMap.get(spot.parking_spots_id);

        if (!detail) {
          return null;
        }

        const currentReservation = isSection
          ? latestSectionReservationMap.get(spot.parking_section_id) || null
          : latestSpotReservationMap.get(spot.parking_spots_id) || null;

        let status = 'AVAILABLE';
        if (currentReservation) {
          if (currentReservation.user_id === userId) {
            status = currentReservation.booking_status === 'active' ? 'ACTIVE' : 'RESERVED';
          } else {
            status = currentReservation.booking_status === 'active' ? 'OCCUPIED' : 'RESERVED';
          }
        }

        const baseSpotData = {
          parking_area_id: detail.parking_area_id,
          location_name: detail.location_name,
          location_address: detail.location_address,
          usage_count: spot.usage_count,
          last_used: spot.last_used,
          status,
          current_reservation: currentReservation
        };

        if (isSection) {
          return {
            ...baseSpotData,
            spot_number: `M1-${detail.section_name}-1`,
            spot_type: 'motorcycle',
            parking_spot_id: 0,
            section_name: detail.section_name
          };
        }

        return {
          ...baseSpotData,
          spot_number: detail.spot_number,
          spot_type: detail.spot_type,
          parking_spot_id: detail.parking_spot_id,
          section_name: detail.section_name
        };
      })
      .filter(Boolean);

    frequentSpotsCache.set(cacheKey, {
      spots: assembledSpots,
      timestamp: now
    });

    if (frequentSpotsCache.size > 50) {
      const oldestKey = frequentSpotsCache.keys().next().value;
      frequentSpotsCache.delete(oldestKey);
    }

    res.json({
      success: true,
      data: {
        frequent_spots: assembledSpots,
        cached: false
      }
    });

    console.log('✅ Frequent spots response sent:', assembledSpots.length, 'spots');

  } catch (error) {
    console.error('❌ Get frequent spots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch frequent parking spots'
    });
  }
});

// Delete parking history record
router.delete('/parking/:reservationId', authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.params;
    const userId = req.user.user_id;

    // Verify that the reservation belongs to the user
    const reservation = await db.query(
      'SELECT reservation_id, user_id FROM reservations WHERE reservation_id = ?',
      [reservationId]
    );

    if (reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History record not found'
      });
    }

    if (reservation[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this record'
      });
    }

    // Delete the reservation
    const result = await db.query(
      'DELETE FROM reservations WHERE reservation_id = ? AND user_id = ?',
      [reservationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'History record not found or could not be deleted'
      });
    }

    res.json({
      success: true,
      message: 'History record deleted successfully'
    });

  } catch (error) {
    console.error('Delete history record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete history record'
    });
  }
});

module.exports = router;

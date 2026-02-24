const express = require('express');
const QRCode = require('qrcode');
const db = require('../config/database');
const { authenticateToken, attendantOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Generate QR code for parking session
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { data, size = 200, margin = 2 } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    const qrCodeImage = await QRCode.toDataURL(data, {
      width: size,
      margin: margin,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        qrCode: qrCodeImage,
        data: data
      }
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
});

// Scan QR code (validate parking session)
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    // Find parking session by QR code
    const sessions = await db.query(`
      SELECT ps.*, u.first_name, u.last_name, u.email, v.plate_number, v.vehicle_type, 
             pl.name as location_name, pl.address
      FROM parking_sessions ps
      JOIN users u ON ps.user_id = u.id
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.qr_code = ? AND ps.status = 'active'
    `, [qrCode]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired QR code'
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
          currentCost,
          isValid: true
        }
      }
    });

  } catch (error) {
    console.error('QR code scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan QR code'
    });
  }
});

// Validate QR code for authorized parking operations (attendant/admin)
router.post('/validate', authenticateToken, attendantOrAdmin, async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    // Find parking session by QR code
    const sessions = await db.query(`
      SELECT ps.*, u.first_name, u.last_name, v.plate_number, v.vehicle_type, 
             pl.name as location_name, pl.address
      FROM parking_sessions ps
      JOIN users u ON ps.user_id = u.id
      JOIN vehicles v ON ps.vehicle_id = v.id
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.qr_code = ? AND ps.status = 'active'
    `, [qrCode]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired QR code',
        data: {
          isValid: false
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
          id: session.id,
          plateNumber: session.plate_number,
          vehicleType: session.vehicle_type,
          locationName: session.location_name,
          startTime: session.start_time,
          durationMinutes,
          currentCost,
          isValid: true
        }
      }
    });

  } catch (error) {
    console.error('QR code validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate QR code'
    });
  }
});

// Get QR code for current active session
router.get('/current-session', authenticateToken, async (req, res) => {
  try {
    const sessions = await db.query(`
      SELECT ps.qr_code, ps.start_time, ps.hourly_rate, pl.name as location_name
      FROM parking_sessions ps
      JOIN parking_locations pl ON ps.location_id = pl.id
      WHERE ps.user_id = ? AND ps.status = 'active'
      ORDER BY ps.start_time DESC
      LIMIT 1
    `, [req.user.user_id]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active parking session found'
      });
    }

    const session = sessions[0];
    
    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(session.qr_code, {
      width: parseInt(process.env.QR_CODE_SIZE) || 200,
      margin: parseInt(process.env.QR_CODE_MARGIN) || 2
    });

    res.json({
      success: true,
      data: {
        qrCode: session.qr_code,
        qrCodeImage,
        session: {
          startTime: session.start_time,
          hourlyRate: session.hourly_rate,
          locationName: session.location_name
        }
      }
    });

  } catch (error) {
    console.error('Get current session QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current session QR code'
    });
  }
});

module.exports = router;

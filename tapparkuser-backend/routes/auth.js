const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logUserActivity, ActionTypes } = require('../utils/userLogger');

const router = express.Router();

// Configure multer for profile picture uploads
const uploadDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    // Use user_id if available (after auth), otherwise use temp name
    const userId = req.user?.user_id || 'temp';
    cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
  // Phone field is optional and will be stored as provided
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with Subscriber type (type_id = 1)
    const result = await db.query(`
      INSERT INTO users (email, password, first_name, last_name, user_type_id, hour_balance)
      VALUES (?, ?, ?, ?, 1, 0)
    `, [email, hashedPassword, firstName, lastName]);

    const userId = result.insertId;

    // Log user registration
    await logUserActivity(
      userId,
      ActionTypes.REGISTER,
      `User registered with email: ${email}, name: ${firstName} ${lastName}`
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          isVerified: false
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with type information
    // Check if user has accepted terms by checking if they have a TERMS_ACCEPTED log entry
    const users = await db.query(`
      SELECT u.user_id, u.email, u.password, u.first_name, u.last_name, u.hour_balance, u.user_type_id, u.profile_picture, 
             t.account_type_name,
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM user_logs 
                 WHERE user_id = u.user_id 
                 AND action_type = 'TERMS_ACCEPTED'
               ) THEN 1
               ELSE 0
             END as terms_accepted
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response and format user data
    delete user.password;
    
    // Construct profile image URL if exists
    let profileImageUrl = null;
    if (user.profile_picture) {
      const host = req.get('host');
      const protocol = req.protocol;
      profileImageUrl = `${protocol}://${host}/uploads/profile-pictures/${user.profile_picture}`;
    }
    
    const userResponse = {
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      hour_balance: user.hour_balance,
      type_id: user.user_type_id,
      account_type_name: user.account_type_name,
      profile_image: profileImageUrl,
      terms_accepted: user.terms_accepted === 1 || user.terms_accepted === true
    };

    // Log user login
    await logUserActivity(
      user.user_id,
      ActionTypes.LOGIN,
      `User logged in: ${user.email} (${user.account_type_name})`
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Check for database connection errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.message?.includes('connect ECONNREFUSED') ||
      error.message?.includes('connection') ||
      error.message?.includes('Unable to connect') ||
      error.errno === -61 ||
      error.errno === 10061 ||
      error.sqlState === '08001'
    ) {
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please ensure the database server is running.',
        errorCode: 'DATABASE_CONNECTION_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.user_id, u.email, u.first_name, u.last_name, u.hour_balance, u.user_type_id, u.profile_picture, 
             t.account_type_name, u.created_at,
             CASE 
               WHEN EXISTS (
                 SELECT 1 FROM user_logs 
                 WHERE user_id = u.user_id 
                 AND action_type = 'TERMS_ACCEPTED'
               ) THEN 1
               ELSE 0
             END as terms_accepted
      FROM users u
      LEFT JOIN types t ON u.user_type_id = t.type_id
      WHERE u.user_id = ?
    `, [req.user.user_id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    let profileImageUrl = null;
    
    // If profile_picture exists, construct the URL
    if (user.profile_picture) {
      const host = req.get('host');
      const protocol = req.protocol;
      profileImageUrl = `${protocol}://${host}/uploads/profile-pictures/${user.profile_picture}`;
    }

    const userResponse = {
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      hour_balance: user.hour_balance,
      type_id: user.user_type_id,
      account_type_name: user.account_type_name,
      profile_image: profileImageUrl,
      terms_accepted: user.terms_accepted === 1 || user.terms_accepted === true,
      created_at: user.created_at
    };

    res.json({
      success: true,
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Accept terms and conditions
router.post('/accept-terms', authenticateToken, async (req, res) => {
  try {
    // Log terms acceptance (this is how we track if user has accepted)
    // We check for TERMS_ACCEPTED log entry instead of a column
    await logUserActivity(
      req.user.user_id,
      ActionTypes.TERMS_ACCEPTED,
      'User accepted terms and conditions'
    );

    res.json({
      success: true,
      message: 'Terms and conditions accepted successfully'
    });

  } catch (error) {
    console.error('Accept terms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept terms and conditions'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty')
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

    const { firstName, lastName } = req.body;
    const updateFields = [];
    const updateValues = [];

    if (firstName) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName);
    }
    if (lastName) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(req.user.user_id);

    await db.query(`
      UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?
    `, updateValues);

    // Log profile update
    await logUserActivity(
      req.user.user_id,
      ActionTypes.PROFILE_UPDATE,
      `Profile updated: ${updateFields.join(', ')}`,
      req.user.user_id,
      updateFields.join(', ')
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Upload profile picture
router.post('/profile/picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filename = req.file.filename;
    const userId = req.user.user_id;

    // Get old profile picture to delete it later
    const users = await db.query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    );

    let oldProfilePicture = null;
    if (users.length > 0 && users[0].profile_picture) {
      oldProfilePicture = users[0].profile_picture;
    }

    // Update user profile with new picture filename
    await db.query(
      'UPDATE users SET profile_picture = ? WHERE user_id = ?',
      [filename, userId]
    );

    // Delete old profile picture if it exists
    if (oldProfilePicture) {
      const oldFilePath = path.join(uploadDir, oldProfilePicture);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Construct the URL
    const host = req.get('host');
    const protocol = req.protocol;
    const profileImageUrl = `${protocol}://${host}/uploads/profile-pictures/${filename}`;

    // Log profile image update
    await logUserActivity(
      userId,
      ActionTypes.PROFILE_IMAGE_UPDATE,
      `Profile image uploaded: ${filename}`,
      userId,
      'profile_picture'
    );

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profile_image: profileImageUrl,
        filename: filename
      }
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    
    // If file was uploaded but there was an error, delete it
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete profile picture
router.delete('/profile/picture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get current profile picture
    const users = await db.query(
      'SELECT profile_picture FROM users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const profilePicture = users[0].profile_picture;

    // Remove profile picture from database
    await db.query(
      'UPDATE users SET profile_picture = NULL WHERE user_id = ?',
      [userId]
    );

    // Delete file if it exists
    if (profilePicture) {
      const filePath = path.join(uploadDir, profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Log profile image deletion
    await logUserActivity(
      userId,
      ActionTypes.PROFILE_IMAGE_UPDATE,
      `Profile image deleted`,
      userId,
      'profile_picture'
    );

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Profile picture delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body;

    // Get current password
    const users = await db.query(
      'SELECT password FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE user_id = ?',
      [hashedNewPassword, req.user.user_id]
    );

    // Log password change
    await logUserActivity(
      req.user.user_id,
      ActionTypes.PASSWORD_CHANGE,
      `Password changed successfully`,
      req.user.user_id,
      'password'
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Logout (invalidate token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated system, you would maintain a blacklist of tokens
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// Verify email (placeholder - you would implement email verification)
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const users = await db.query(
      'SELECT id FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Mark user as verified
    await db.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?',
      [users[0].id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

module.exports = router;

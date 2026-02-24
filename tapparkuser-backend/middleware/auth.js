const jwt = require('jsonwebtoken');
const db = require('../config/database');
const isProduction = process.env.NODE_ENV === 'production';

const getNormalizedRole = (user) => {
  const accountType = String(user?.account_type_name || '').trim().toLowerCase();
  const role = String(user?.role || '').trim().toLowerCase();
  const userTypeId = Number(user?.user_type_id);
  return { accountType, role, userTypeId };
};

const isAdminUser = (user) => {
  const { accountType, role, userTypeId } = getNormalizedRole(user);
  return accountType === 'admin' || role === 'admin' || userTypeId === 3;
};

const isAttendantUser = (user) => {
  const { accountType, role, userTypeId } = getNormalizedRole(user);
  return accountType === 'attendant' || role === 'attendant' || userTypeId === 2;
};

const verifyJwtToken = (token) => {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT secret is not configured');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

const getAuthTokenFromHeader = (headerValue) => {
  if (!headerValue) return null;
  const parts = String(headerValue).split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
};

const getUserRowsById = async (userId) => {
  return db.query(
    `SELECT u.user_id, u.email, u.first_name, u.last_name, u.user_type_id, t.account_type_name
     FROM users u
     LEFT JOIN types t ON u.user_type_id = t.type_id
     WHERE u.user_id = ?`,
    [userId]
  );
};

const getSingleUserById = async (userId) => {
  const rows = await getUserRowsById(userId);
  if (!rows || !rows.length) {
    return null;
  }
  return rows[0];
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('? JWT_SECRET is not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        errorCode: 'JWT_SECRET_MISSING'
      });
    }

    const authHeader = req.headers['authorization'];
    const token = getAuthTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        console.error('? Invalid JWT token');
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (jwtError.name === 'TokenExpiredError') {
        console.error('? Token expired');
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      throw jwtError;
    }

    if (!decoded || !decoded.userId) {
      console.error('? Token payload missing userId');
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // Check if user still exists and is active
    let userRows;
    try {
      userRows = await getUserRowsById(decoded.userId);
    } catch (dbError) {
      console.error('? Database query error in auth middleware:', dbError.code || dbError.message);

      // Check for database connection errors
      if (
        dbError.code === 'ECONNREFUSED' ||
        dbError.code === 'ETIMEDOUT' ||
        dbError.code === 'ENOTFOUND' ||
        dbError.message?.includes('connect ECONNREFUSED') ||
        dbError.message?.includes('connection') ||
        dbError.message?.includes('Unable to connect') ||
        dbError.errno === -61 || // Connection refused (Mac/Linux)
        dbError.errno === 10061 || // Connection refused (Windows)
        dbError.sqlState === '08001' || // SQL connection error
        (dbError.sqlState === 'HY000' && dbError.code === 'ECONNREFUSED')
      ) {
        return res.status(503).json({
          success: false,
          message: 'Database connection error. Please ensure the database server is running.',
          errorCode: 'DATABASE_CONNECTION_ERROR'
        });
      }

      throw dbError;
    }

    if (!userRows || !userRows.length) {
      console.error('? User not found for userId:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add user info to request
    req.user = userRows[0];
    next();
  } catch (error) {
    console.error('? Auth middleware error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: isProduction ? undefined : error.stack
    });

    // If it's already been handled above, don't send another response
    if (res.headersSent) {
      return;
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: isProduction ? undefined : error.message,
      errorCode: 'AUTH_ERROR'
    });
  }
};

const authenticateSocket = async (socket, next) => {
  try {
    const handshakeAuthToken = socket?.handshake?.auth?.token;
    const handshakeHeaderToken = getAuthTokenFromHeader(socket?.handshake?.headers?.authorization);
    const token = handshakeAuthToken || handshakeHeaderToken;

    if (!token) {
      return next(new Error('Access token required'));
    }

    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }

    if (!decoded || !decoded.userId) {
      return next(new Error('Invalid token payload'));
    }

    const user = await getSingleUserById(decoded.userId);
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    socket.data.user = user;
    socket.data.isPrivileged = isAdminUser(user) || isAttendantUser(user);
    return next();
  } catch (error) {
    console.error('? Socket authentication error:', error.message);
    return next(new Error('Authentication error'));
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = getAuthTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyJwtToken(token);
      const user = await db.query(
        `SELECT u.user_id, u.email, u.first_name, u.last_name, u.user_type_id, t.account_type_name
         FROM users u
         LEFT JOIN types t ON u.user_type_id = t.type_id
         WHERE u.user_id = ?`,
        [decoded.userId]
      );

      if (user.length) {
        req.user = user[0];
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Check if user has sufficient balance
const checkBalance = (requiredAmount = 0) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await db.query(
        'SELECT hour_balance FROM users WHERE user_id = ?',
        [req.user.user_id]
      );

      if (!user.length) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user[0].hour_balance < requiredAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Required: $${requiredAmount}, Available: $${user[0].hour_balance}`
        });
      }

      req.userBalance = user[0].hour_balance;
      next();
    } catch (error) {
      console.error('Balance check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Balance check failed'
      });
    }
  };
};

// Admin only middleware
const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const isAdmin = isAdminUser(req.user);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Attendant or admin middleware
const attendantOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const canManageParking = isAttendantUser(req.user) || isAdminUser(req.user);
    if (!canManageParking) {
      return res.status(403).json({
        success: false,
        message: 'Attendant or admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Attendant/admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateSocket,
  optionalAuth,
  checkBalance,
  adminOnly,
  attendantOrAdmin
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Grace Period Checker
const GracePeriodChecker = require('./grace_period_checker');

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vehicleRoutes = require('./routes/vehicles');
const parkingRoutes = require('./routes/parking');
const parkingAreasRoutes = require('./routes/parking-areas');
const qrRoutes = require('./routes/qr');
const paymentRoutes = require('./routes/payments');
const favoriteRoutes = require('./routes/favorites');
const historyRoutes = require('./routes/history');
const subscriptionRoutes = require('./routes/subscriptions');
const attendantRoutes = require('./routes/attendant');
const paypalRoutes = require('./routes/paypal');
const capacityRoutes = require('./routes/capacity-management');
const feedbackRoutes = require('./routes/feedback_v2');
const {
  setIO,
  roomForArea,
  roomForReservation,
  roomForUser,
  emitReservationUpdated,
  emitSpotsUpdated
} = require('./utils/realtime');
const { authenticateSocket } = require('./middleware/auth');
const { setupRedisAdapter } = require('./utils/socket-adapter');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const EXPIRED_DEDUCTION_PATCH = 'expired-deduction-v2-2026-02-18';
const isProduction = process.env.NODE_ENV === 'production';
const DEBUG_GRACE_CHECKER = process.env.DEBUG_GRACE_CHECKER === 'true';
const corsAllowList = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const socketPingIntervalMs = parseInt(process.env.SOCKET_PING_INTERVAL_MS || '25000', 10);
const socketPingTimeoutMs = parseInt(process.env.SOCKET_PING_TIMEOUT_MS || '20000', 10);
const socketCookieEnabled = String(process.env.SOCKET_COOKIE_ENABLED || (isProduction ? 'true' : 'false')).toLowerCase() === 'true';

console.log(`🔧 Backend patch loaded: ${EXPIRED_DEDUCTION_PATCH}`);
if (!isProduction) {
  console.log(`📁 Backend file: ${__filename}`);
  console.log(`📂 Backend cwd: ${process.cwd()}`);
}

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsAllowList.includes(origin)) return callback(null, true);
      if (!isProduction) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    methods: ['GET', 'POST']
  },
  pingInterval: socketPingIntervalMs,
  pingTimeout: socketPingTimeoutMs,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false
  },
  cookie: socketCookieEnabled
    ? {
        name: process.env.SOCKET_COOKIE_NAME || 'tappark.sid',
        httpOnly: true,
        path: '/',
        sameSite: isProduction ? 'lax' : 'strict'
      }
    : false
});
setIO(io);

let redisAdapterState = null;
const realtimeMetrics = {
  connectedTotal: 0,
  currentConnections: 0,
  subscribeRequests: 0,
  rejectedSubscriptions: 0,
  subscriptionErrors: 0
};

const normalizePositiveInt = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

const canAccessReservation = async (userId, reservationId, isPrivileged) => {
  if (isPrivileged) return true;

  const rows = await db.query(
    'SELECT reservation_id FROM reservations WHERE reservation_id = ? AND user_id = ? LIMIT 1',
    [reservationId, userId]
  );

  return Boolean(rows && rows.length);
};

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const currentUserId = normalizePositiveInt(socket?.data?.user?.user_id);
  const isPrivileged = Boolean(socket?.data?.isPrivileged);

  if (!currentUserId) {
    socket.disconnect(true);
    return;
  }

  socket.join(roomForUser(currentUserId));
  realtimeMetrics.connectedTotal += 1;
  realtimeMetrics.currentConnections += 1;

  if (!isProduction) {
    console.log('Socket connected: ' + socket.id + ' (user:' + currentUserId + ')');
  }

  socket.on('subscribe', async (payload = {}) => {
    const areaId = normalizePositiveInt(payload.areaId);
    const reservationId = normalizePositiveInt(payload.reservationId);

    realtimeMetrics.subscribeRequests += 1;

    if (areaId) {
      socket.join(roomForArea(areaId));
    }

    if (reservationId) {
      try {
        const allowed = await canAccessReservation(currentUserId, reservationId, isPrivileged);
        if (allowed) {
          socket.join(roomForReservation(reservationId));
        } else if (!isProduction) {
          realtimeMetrics.rejectedSubscriptions += 1;
          console.warn('Rejected reservation room subscribe user=' + currentUserId + ' reservation=' + reservationId);
        }
      } catch (error) {
        if (!isProduction) {
          realtimeMetrics.subscriptionErrors += 1;
          console.error('Reservation room auth check failed:', error.message);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    realtimeMetrics.currentConnections = Math.max(0, realtimeMetrics.currentConnections - 1);
  });

  socket.on('unsubscribe', (payload = {}) => {
    const areaId = normalizePositiveInt(payload.areaId);
    const reservationId = normalizePositiveInt(payload.reservationId);

    if (areaId) socket.leave(roomForArea(areaId));
    if (reservationId) socket.leave(roomForReservation(reservationId));
  });
});

app.disable('x-powered-by');

// Basic middleware with security/performance defaults
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsAllowList.includes(origin)) return callback(null, true);
    if (!isProduction) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: process.env.CORS_CREDENTIALS !== 'false',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const realtimeReadPathMatchers = [
  /^\/parking-areas\/booking\/\d+(?:\/)?$/,
  /^\/parking-areas\/my-bookings(?:\/)?$/,
  /^\/parking-areas\/areas(?:\/)?$/,
  /^\/capacity\/areas\/\d+\/capacity-status(?:\/)?$/,
  /^\/capacity\/sections\/\d+\/spots(?:\/)?$/,
  /^\/subscriptions\/balance(?:\/)?$/,
  /^\/history\/frequent-spots(?:\/)?$/,
  /^\/auth\/profile(?:\/)?$/
];

const isRealtimeReadPath = (reqPath = '') => {
  return realtimeReadPathMatchers.some((matcher) => matcher.test(reqPath));
};

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  limit: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || (isProduction ? '6000' : '5000'),
    10
  ),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

const realtimeReadLimiter = rateLimit({
  windowMs: parseInt(process.env.REALTIME_RATE_LIMIT_WINDOW_MS || '60000', 10),
  limit: parseInt(
    process.env.REALTIME_RATE_LIMIT_MAX_REQUESTS || (isProduction ? '1200' : '10000'),
    10
  ),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many realtime requests. Please try again in a moment.'
  }
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
  limit: parseInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || (isProduction ? '40' : '500'),
    10
  ),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

if (isProduction) {
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' && isRealtimeReadPath(req.path)) {
      return realtimeReadLimiter(req, res, next);
    }
    return generalLimiter(req, res, next);
  });
} else {
  console.log('Rate limiting disabled in development mode');
}

app.use(express.json({
  limit: '10mb'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000
}));

// Add response time middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000 && !isProduction) { // Log slow requests in non-production
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Serve static files (QR codes)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Serve profile pictures (explicit handler to avoid static middleware issues)
const profilePicturesDir = path.join(__dirname, 'uploads', 'profile-pictures');

app.use('/uploads/profile-pictures', express.static(profilePicturesDir));

app.get('/uploads/profile-pictures/:filename', (req, res, next) => {
  const { filename } = req.params;
  const filePath = path.join(profilePicturesDir, filename);

  if (fs.existsSync(filePath)) {
    if (!isProduction) {
      console.log(`📸 Serving profile picture: ${filename}`);
    }
    return res.sendFile(filePath);
  }

  console.warn('⚠️ Profile picture not found');
  return res.status(404).json({
    success: false,
    message: 'Profile picture not found'
  });
});

// Health check endpoint (no database required)
app.get('/health', (req, res) => {
  const socketsConnected = io?.engine?.clientsCount || 0;
  const redisEnabled = Boolean(redisAdapterState?.enabled);
  const realtimeSnapshot = { ...realtimeMetrics };

  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    uptimeSeconds: Math.round(process.uptime()),
    realtime: {
      socketsConnected,
      redisAdapterEnabled: redisEnabled,
      metrics: realtimeSnapshot
    }
  });
});
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/parking-areas', parkingAreasRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/attendant', attendantRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', isProduction ? err.message : err);
  res.status(500).json({
    success: false,
    message: 'Server Error'
  });
});

const validateRuntimeConfig = () => {
  if (!isProduction) {
    return;
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('your_super_secret_jwt_key_here')) {
    throw new Error('JWT_SECRET must be set to a strong non-default value in production');
  }

  if (!corsAllowList.length) {
    throw new Error('CORS_ORIGINS must be configured in production');
  }
};

let isShuttingDown = false;
let gracePeriodInterval = null;

const handleShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(signal + ' received, shutting down gracefully');

  try {
    if (gracePeriodInterval) {
      clearInterval(gracePeriodInterval);
      gracePeriodInterval = null;
    }

    await new Promise((resolve) => {
      io.close(() => resolve());
    });

    await new Promise((resolve) => {
      httpServer.close(() => resolve());
    });

    if (redisAdapterState?.close) {
      await redisAdapterState.close();
    }

    await db.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  handleShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  handleShutdown('SIGINT');
});

const startHttpServer = async () => {
  validateRuntimeConfig();

  redisAdapterState = await setupRedisAdapter(io, { isProduction });

  if (redisAdapterState.enabled) {
    console.log('Socket.IO Redis adapter enabled');
  } else {
    console.log('Socket.IO Redis adapter disabled: ' + redisAdapterState.reason);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('Tapparkuser Backend Server running on port ' + PORT);
    console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('Health check: http://localhost:' + PORT + '/health');
    console.log('CORS allowlist size: ' + corsAllowList.length);
    console.log('API Documentation: http://localhost:' + PORT + '/api');
    console.log('Database will connect when first API call is made');
  });
};

startHttpServer().catch((error) => {
  console.error('Failed to start server: ' + error.message);
  process.exit(1);
});

// Database will connect automatically on first API call - no startup delay
console.log('Database connects automatically on first API call');
// Grace Period Checker - Simple Direct Approach
console.log('🔧 Setting up grace period checker...');

let isGracePeriodCheckRunning = false;

const ensureDbPool = async () => {
  if (!db.connection) {
    await db.connect();
  }
  return db.connection;
};

const runGracePeriodCheck = async () => {
  if (isGracePeriodCheckRunning) {
    if (!isProduction || DEBUG_GRACE_CHECKER) {
      console.log('⏳ Grace period check already running. Skipping this interval.');
    }
    return;
  }

  isGracePeriodCheckRunning = true;

  try {
    if (!isProduction || DEBUG_GRACE_CHECKER) {
      console.log(`🧩 Grace checker build: ${EXPIRED_DEDUCTION_PATCH}`);
      console.log('🧪 Running simple grace period check...');
    }

    // Get grace period from environment or default to 15 minutes
    const GRACE_PERIOD_MINUTES = parseInt(process.env.GRACE_PERIOD_MINUTES) || 15;
    if (!isProduction || DEBUG_GRACE_CHECKER) {
      console.log(`⏰ Using grace period: ${GRACE_PERIOD_MINUTES} minutes`);
    }

    const pool = await ensureDbPool();

    // Find expired reservations
    const [expiredReservations] = await pool.execute(`
      SELECT 
        reservation_id,
        user_id,
        parking_spots_id,
        parking_section_id,
        ROUND(TIMESTAMPDIFF(SECOND, time_stamp, NOW()) / 3600, 4) AS wait_hours
      FROM reservations 
      WHERE booking_status = 'reserved' 
        AND start_time IS NULL 
        AND TIMESTAMPDIFF(SECOND, time_stamp, NOW()) >= ?
    `, [GRACE_PERIOD_MINUTES * 60]);

    if (!isProduction || DEBUG_GRACE_CHECKER || expiredReservations.length > 0) {
      console.log(`📊 Found ${expiredReservations.length} expired reservations`);
    }

    if (expiredReservations.length > 0) {
      for (const reservation of expiredReservations) {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          const waitHours = parseFloat(reservation.wait_hours || 0);
          const chargeHours = Math.max(0, waitHours);

          await connection.execute(
            'UPDATE reservations SET booking_status = ?, waiting_end_time = NOW(), end_time = NOW(), updated_at = NOW() WHERE reservation_id = ?',
            ['invalid', reservation.reservation_id]
          );

          if (reservation.parking_spots_id !== 0) {
            await connection.execute(
              'UPDATE parking_spot SET status = ?, is_occupied = 0 WHERE parking_spot_id = ?',
              ['available', reservation.parking_spots_id]
            );
          }

          if (reservation.parking_section_id) {
            await connection.execute(
              'UPDATE parking_section SET reserved_count = GREATEST(reserved_count - 1, 0) WHERE parking_section_id = ?',
              [reservation.parking_section_id]
            );
            if (!isProduction || DEBUG_GRACE_CHECKER) {
              console.log(`✅ Decremented reserved_count for section ${reservation.parking_section_id}`);
            }
          }

          // Deduct waiting-time charge from total subscription balance (FIFO across active subscriptions)
          let totalDeductedHours = 0;
          let remainingChargeHours = chargeHours;

          const [activeSubscriptions] = await connection.execute(
            `SELECT subscription_id, hours_remaining
             FROM subscriptions
             WHERE user_id = ? AND status = 'active' AND hours_remaining > 0
             ORDER BY purchase_date ASC`,
            [reservation.user_id]
          );

          for (const sub of activeSubscriptions) {
            if (remainingChargeHours <= 0) break;
            const subRemaining = parseFloat(sub.hours_remaining || 0);
            const deductNow = Math.min(remainingChargeHours, subRemaining);
            if (deductNow <= 0) continue;

            await connection.execute(
              `UPDATE subscriptions
               SET hours_remaining = GREATEST(0, hours_remaining - ?), hours_used = hours_used + ?
               WHERE subscription_id = ?`,
              [deductNow, deductNow, sub.subscription_id]
            );

            totalDeductedHours += deductNow;
            remainingChargeHours -= deductNow;
          }

          const penaltyHours = remainingChargeHours > 0 ? remainingChargeHours : 0;

          if (penaltyHours > 0) {
            await connection.execute(
              `INSERT INTO penalty (user_id, penalty_time)
               VALUES (?, ?)`,
              [reservation.user_id, penaltyHours]
            );
          }

          const [updatedBalanceRows] = await connection.execute(
            `SELECT COALESCE(SUM(hours_remaining), 0) as total_hours_remaining
             FROM subscriptions
             WHERE user_id = ? AND status = 'active'`,
            [reservation.user_id]
          );
          const updatedBalance = parseFloat(updatedBalanceRows[0]?.total_hours_remaining || 0);
          await connection.execute(
            'UPDATE users SET hour_balance = ? WHERE user_id = ?',
            [updatedBalance, reservation.user_id]
          );

          await connection.commit();
          emitReservationUpdated({
            reservationId: reservation.reservation_id,
            userId: reservation.user_id,
            status: 'invalid',
            source: 'grace-period-checker'
          });
          emitSpotsUpdated({
            spotId: reservation.parking_spots_id,
            status: 'available',
            source: 'grace-period-checker'
          });
          if (!isProduction || DEBUG_GRACE_CHECKER) {
            console.log(`✅ Expired reservation #${reservation.reservation_id} | charged=${totalDeductedHours.toFixed(4)}h | penalty=${penaltyHours.toFixed(4)}h | balance=${updatedBalance.toFixed(4)}h`);
          }
        } catch (error) {
          await connection.rollback();
          console.error(`❌ Failed to expire reservation #${reservation.reservation_id}:`, error.message);
        } finally {
          connection.release();
        }
      }
    }

    if (!isProduction || DEBUG_GRACE_CHECKER) {
      console.log('✅ Simple grace period check completed');
    }

  } catch (error) {
    console.error('❌ Simple grace period check failed:', error.message);
    console.error('❌ Full error:', error);
  } finally {
    isGracePeriodCheckRunning = false;
  }
};

// Test run immediately
setTimeout(runGracePeriodCheck, 2000);

// Run every second so reservation expiration does not drift past the grace deadline.
const GRACE_CHECK_INTERVAL_MS = parseInt(process.env.GRACE_CHECK_INTERVAL_MS || '1000', 10);
gracePeriodInterval = setInterval(() => {
  runGracePeriodCheck();
}, GRACE_CHECK_INTERVAL_MS);

console.log(`⏰ Simple grace period checker scheduled every ${GRACE_CHECK_INTERVAL_MS}ms`);
if (!isProduction) {
  console.log('⏰ Interval ID:', gracePeriodInterval);
}




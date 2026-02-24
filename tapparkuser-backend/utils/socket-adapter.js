const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const setupRedisAdapter = async (io, options = {}) => {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === 'production';
  const redisUrl = process.env.REDIS_URL;

  // Auto-enable in production. In development, opt-in with SOCKET_REDIS_ENABLED=true.
  const redisEnabled = toBool(process.env.SOCKET_REDIS_ENABLED, isProduction);
  // In production, Redis is required by default for consistent realtime across instances.
  const redisRequired = toBool(process.env.SOCKET_REDIS_REQUIRED, isProduction);

  if (!redisEnabled) {
    return { enabled: false, reason: 'Redis adapter disabled' };
  }

  if (!redisUrl) {
    const message = 'Redis adapter enabled but REDIS_URL is missing';
    if (redisRequired) {
      throw new Error(message);
    }
    return { enabled: false, reason: message };
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    return {
      enabled: true,
      reason: 'Redis adapter enabled',
      close: async () => {
        await Promise.allSettled([pubClient.quit(), subClient.quit()]);
      }
    };
  } catch (error) {
    await Promise.allSettled([pubClient.quit(), subClient.quit()]);

    if (redisRequired) {
      throw error;
    }

    return { enabled: false, reason: error.message };
  }
};

module.exports = {
  setupRedisAdapter
};

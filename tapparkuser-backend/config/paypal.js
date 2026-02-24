const axios = require('axios');
const https = require('https');

// PayPal Configuration
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox'; // 'sandbox' or 'live'
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_TIMEOUT_MS = parseInt(process.env.PAYPAL_TIMEOUT_MS, 10) || 20000;
const PAYPAL_KEEPALIVE_MS = parseInt(process.env.PAYPAL_KEEPALIVE_MS, 10) || 60000;
const PAYPAL_MAX_SOCKETS = parseInt(process.env.PAYPAL_MAX_SOCKETS, 10) || 25;
const PAYPAL_DEBUG = process.env.PAYPAL_DEBUG === 'true';

const PAYPAL_API_BASE = PAYPAL_MODE === 'sandbox' 
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: PAYPAL_KEEPALIVE_MS,
  maxSockets: PAYPAL_MAX_SOCKETS
});

const paypalClient = axios.create({
  baseURL: PAYPAL_API_BASE,
  timeout: PAYPAL_TIMEOUT_MS,
  httpsAgent: keepAliveAgent,
  headers: {
    Connection: 'keep-alive'
  }
});

let cachedAccessToken = null;
let cachedTokenExpiry = 0; // epoch ms
let pendingTokenPromise = null;

// Generate PayPal access token
const generateAccessToken = async () => {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('PayPal credentials not configured');
    }

    if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
      if (PAYPAL_DEBUG) {
        console.log('🟢 PayPal token cache hit');
      }
      return cachedAccessToken;
    }

    if (pendingTokenPromise) {
      return pendingTokenPromise;
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const tokenRequestStarted = Date.now();
    pendingTokenPromise = paypalClient.post('/v1/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`
      }
    }).then(response => {
      const { access_token, expires_in } = response.data;
      cachedAccessToken = access_token;
      const safetyWindow = Math.max(expires_in - 60, 60); // keep at least 1 min safety
      cachedTokenExpiry = Date.now() + safetyWindow * 1000;
      if (PAYPAL_DEBUG) {
        console.log(`✅ PayPal token fetched in ${Date.now() - tokenRequestStarted}ms (expires_in=${expires_in}s)`);
      }
      return access_token;
    }).finally(() => {
      pendingTokenPromise = null;
    });

    return pendingTokenPromise;
  } catch (error) {
    pendingTokenPromise = null;
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    console.error('Error generating PayPal access token:', error.response?.data || error.message);
    throw error;
  }
};

// Create PayPal order
const createOrder = async (amount, currency = 'USD', options = {}) => {
  const { returnUrl, cancelUrl } = options;
  try {
    const accessToken = await generateAccessToken();

    const paypalRequestStarted = Date.now();
    const response = await paypalClient.post('/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: parseFloat(amount).toFixed(2)
        }
      }],
      application_context: {
        return_url: returnUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/paypal/success`,
        cancel_url: cancelUrl || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/paypal/cancel`,
        brand_name: 'TapPark',
        user_action: 'PAY_NOW'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (PAYPAL_DEBUG) {
      console.log(`🧾 PayPal createOrder amount=${amount} took ${Date.now() - paypalRequestStarted}ms`);
    }

    return response.data;
  } catch (error) {
    console.error('Error creating PayPal order:', error.response?.data || error.message);
    throw error;
  }
};

// Capture PayPal order
const captureOrder = async (orderId) => {
  try {
    const accessToken = await generateAccessToken();

    const captureStarted = Date.now();
    const response = await paypalClient.post(`/v2/checkout/orders/${orderId}/capture`, {}, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (PAYPAL_DEBUG) {
      console.log(`💰 PayPal capture order=${orderId} took ${Date.now() - captureStarted}ms`);
    }

    return response.data;
  } catch (error) {
    console.error('Error capturing PayPal order:', error.response?.data || error.message);
    throw error;
  }
};

// Get order details
const getOrderDetails = async (orderId) => {
  try {
    const accessToken = await generateAccessToken();

    const response = await paypalClient.get(`/v2/checkout/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting PayPal order details:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  generateAccessToken,
  createOrder,
  captureOrder,
  getOrderDetails,
  PAYPAL_MODE,
  PAYPAL_API_BASE
};

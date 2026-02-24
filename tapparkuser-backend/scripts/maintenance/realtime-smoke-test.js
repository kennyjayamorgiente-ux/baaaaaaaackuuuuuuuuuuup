require('dotenv').config();
const { io } = require('socket.io-client');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;

const buildSocketUrl = (url) => url.replace(/\/api\/?$/, '');

const fail = (message) => {
  console.error('FAIL ' + message);
  process.exit(1);
};

const login = async () => {
  if (!EMAIL || !PASSWORD) {
    fail('Set SMOKE_EMAIL and SMOKE_PASSWORD before running realtime smoke test');
  }

  const response = await fetch(BASE_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  if (!response.ok) {
    const text = await response.text();
    fail('Login failed: ' + response.status + ' ' + text.slice(0, 200));
  }

  const data = await response.json();
  const token = data?.data?.token;
  const userId = data?.data?.user?.user_id;

  if (!token || !userId) {
    fail('Login response missing token/user_id');
  }

  return { token, userId };
};

const connectClient = (socketUrl, token, userId, index) => {
  return new Promise((resolve, reject) => {
    const socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 8000,
      auth: { token }
    });

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('Client ' + index + ' connection timeout'));
    }, 8000);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.emit('subscribe', { userId });
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(new Error('Client ' + index + ' connect_error: ' + error.message));
    });
  });
};

const run = async () => {
  console.log('Running realtime smoke test against ' + BASE_URL);

  const { token, userId } = await login();
  const socketUrl = buildSocketUrl(BASE_URL);

  const clients = [];
  try {
    const count = Number(process.env.REALTIME_SMOKE_CLIENTS || 5);

    for (let i = 0; i < count; i += 1) {
      const socket = await connectClient(socketUrl, token, userId, i + 1);
      clients.push(socket);
    }

    console.log('PASS connected clients: ' + clients.length);
  } finally {
    clients.forEach((client) => client.close());
  }
};

run().catch((error) => fail(error.message));


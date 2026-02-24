const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = Number.parseInt(process.env.SMOKE_TIMEOUT_MS || '8000', 10);
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  validateStatus: () => true
});

const results = [];

const runCheck = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

const expectStatus = (response, expected, message) => {
  if (response.status !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${response.status})`);
  }
};

const expectSuccessFlag = (response, message) => {
  if (!response.data || response.data.success !== true) {
    throw new Error(message);
  }
};

async function main() {
  console.log(`Running smoke tests against ${BASE_URL}`);

  await runCheck('GET /health', async () => {
    const res = await client.get('/health');
    expectStatus(res, 200, 'Health endpoint failed');
    expectSuccessFlag(res, 'Health endpoint did not return success=true');
  });

  await runCheck('GET /api/parking-areas/areas', async () => {
    const res = await client.get('/api/parking-areas/areas');
    expectStatus(res, 200, 'Parking areas endpoint failed');
    expectSuccessFlag(res, 'Parking areas endpoint did not return success=true');
    if (!res.data?.data || !Array.isArray(res.data.data.areas)) {
      throw new Error('Parking areas response is missing data.areas array');
    }
  });

  await runCheck('GET /api/auth/profile without token returns 401', async () => {
    const res = await client.get('/api/auth/profile');
    expectStatus(res, 401, 'Auth profile should reject missing token');
  });

  let token = null;
  if (SMOKE_EMAIL && SMOKE_PASSWORD) {
    await runCheck('POST /api/auth/login', async () => {
      const res = await client.post('/api/auth/login', {
        email: SMOKE_EMAIL,
        password: SMOKE_PASSWORD
      });
      expectStatus(res, 200, 'Login failed');
      expectSuccessFlag(res, 'Login did not return success=true');
      token = res.data?.data?.token || null;
      if (!token) {
        throw new Error('Login response missing token');
      }
    });

    await runCheck('GET /api/auth/profile with token', async () => {
      if (!token) {
        throw new Error('No token available from login');
      }
      const res = await client.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      expectStatus(res, 200, 'Authenticated profile failed');
      expectSuccessFlag(res, 'Authenticated profile did not return success=true');
    });
  } else {
    console.log('SKIP auth login/profile checks (set SMOKE_EMAIL and SMOKE_PASSWORD to enable)');
  }

  const failed = results.filter((item) => !item.ok);
  console.log(`Smoke test summary: ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Smoke test runner failed: ${error.message}`);
  process.exit(1);
});

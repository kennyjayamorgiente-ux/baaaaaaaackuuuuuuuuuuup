require('dotenv').config();

const normalizeBaseUrl = (value) => {
  if (!value) return '';
  return String(value).replace(/\/+$/, '');
};

const tapparkConfig = {
  owner: process.env.TAPPARK_OWNER || '',
  system: process.env.TAPPARK_SYSTEM || 'tappark',
  baseUrl: normalizeBaseUrl(process.env.TAPPARK_BASE_URL || 'https://mis.foundationu.com/api/tappark'),
  refreshUrl: process.env.TAPPARK_REFRESH_URL || 'https://mis.foundationu.com/api/token/refresh',
  accessToken: process.env.TAPPARK_ACCESS_TOKEN || '',
  refreshToken: process.env.TAPPARK_REFRESH_TOKEN || '',
  expiresAt: process.env.TAPPARK_EXPIRES_AT || '',
  timeoutMs: Number(process.env.TAPPARK_TIMEOUT_MS || 15000),
};

module.exports = tapparkConfig;

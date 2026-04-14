const axios = require('axios');
const tapparkConfig = require('./config');

class TapparkApiClient {
  constructor(config = tapparkConfig) {
    this.config = config;
    this.accessToken = config.accessToken || '';
    this.refreshToken = config.refreshToken || '';
    this.expiresAt = config.expiresAt || '';
    this.refreshPromise = null;

    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: {
        Accept: 'application/json',
      },
    });
  }

  isConfigured() {
    return Boolean(
      this.config.baseUrl &&
      this.config.refreshUrl &&
      this.refreshToken
    );
  }

  getAuthHeaders() {
    if (!this.accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  isTokenExpired() {
    if (!this.expiresAt) {
      return !this.accessToken;
    }

    const expiresAtMs = new Date(this.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      return !this.accessToken;
    }

    const refreshWindowMs = 60 * 1000;
    return Date.now() >= expiresAtMs - refreshWindowMs;
  }

  async ensureAccessToken() {
    if (!this.isConfigured()) {
      throw new Error('Tappark API is not fully configured');
    }

    if (this.accessToken) {
      return this.accessToken;
    }

    await this.refreshAccessTokenSafely();
    return this.accessToken;
  }

  async refreshAccessTokenSafely() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  async refreshAccessToken() {
    const response = await axios.post(
      this.config.refreshUrl,
      null,
      {
        timeout: this.config.timeoutMs,
        headers: {
          Authorization: `Bearer ${this.refreshToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    const payload = response.data || {};
    this.accessToken = payload.access_token || '';
    this.refreshToken = payload.refresh_token || this.refreshToken;
    this.expiresAt = payload.expires_at || '';

    if (!this.accessToken) {
      throw new Error('Tappark refresh succeeded but no access token was returned');
    }

    return payload;
  }

  async request(config) {
    await this.ensureAccessToken();

    try {
      const response = await this.http.request({
        ...config,
        headers: {
          ...this.getAuthHeaders(),
          ...(config.headers || {}),
        },
      });

      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 && this.refreshToken) {
        try {
          await this.refreshAccessTokenSafely();
          const retryResponse = await this.http.request({
            ...config,
            headers: {
              ...this.getAuthHeaders(),
              ...(config.headers || {}),
            },
          });
          return retryResponse.data;
        } catch (refreshError) {
          throw refreshError;
        }
      }

      throw error;
    }
  }

  async getStudent(studentId) {
    return this.request({
      method: 'GET',
      url: `/student/${encodeURIComponent(studentId)}`,
    });
  }

  async searchStudents(search) {
    return this.request({
      method: 'GET',
      url: '/student-search',
      params: { search },
    });
  }

  async loginStudent(studentId, password) {
    return this.request({
      method: 'POST',
      url: '/student-login',
      data: {
        student_id: studentId,
        password,
      },
    });
  }

  async getEmployee(employeeId) {
    return this.request({
      method: 'GET',
      url: `/employee/${encodeURIComponent(employeeId)}`,
    });
  }

  async searchEmployees(search) {
    return this.request({
      method: 'GET',
      url: '/employee-search',
      params: { search },
    });
  }

  async loginEmployee(employeeId, password) {
    return this.request({
      method: 'POST',
      url: '/employee-login',
      data: {
        employee_id: employeeId,
        password,
      },
    });
  }
}

module.exports = new TapparkApiClient();
module.exports.TapparkApiClient = TapparkApiClient;

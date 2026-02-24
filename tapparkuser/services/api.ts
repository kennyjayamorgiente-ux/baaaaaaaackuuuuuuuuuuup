import { getApiUrl } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { normalizeProfileImageUrl, normalizeUserProfileImageFields } from '../utils/profileImage';

const MULTIPART_UPLOAD_TYPE = (FileSystem as any)?.FileSystemUploadType?.MULTIPART ?? 1;


// Get API URL based on environment (localhost for emulator, network IP for physical device)
const API_BASE_URL = getApiUrl();
console.log('🌍 API Base URL:', API_BASE_URL);

// API Service for Tapparkuser Backend
export class ApiService {
  private static baseURL = API_BASE_URL;
  private static REQUEST_TIMEOUT = 30000; // 30 seconds timeout
  private static RETRY_ATTEMPTS = 2; // Number of retry attempts
  private static RETRY_DELAY = 1000; // Delay between retries in ms
  
  // Request caching
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
  // Request debouncing
  private static pendingRequests = new Map<string, Promise<any>>();
  
  // Stale-while-revalidate cache infrastructure
  private static swrCache = new Map<string, {
    data: any;
    timestamp: number;
    staleTime: number;
    tokenHash: string | null;
  }>();
  private static swrPendingRequests = new Map<string, Promise<any>>();
  private static revalidationCallbacks = new Map<string, Array<(data: any) => void>>();
  
  // Clear cache method
  static clearCache(): void {
    this.cache.clear();
    this.swrCache.clear();
    console.log('🗑️ API cache cleared');
  }
  
  // Clear specific cache entry
  static clearCacheEntry(url: string): void {
    this.cache.forEach((_, key) => {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    });
    this.swrCache.forEach((_, key) => {
      if (key.includes(url)) {
        this.swrCache.delete(key);
      }
    });
  }
  
  // Invalidate SWR cache by pattern
  static invalidateSWRCache(pattern: string): void {
    this.swrCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        this.swrCache.delete(key);
        console.log('🗑️ Invalidated SWR cache for:', key);
      }
    });
  }
  
  // Force refresh - bypass cache completely and fetch fresh data
  static async forceRefresh<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const token = await this.getStoredToken();
    const tokenHash = token ? this.getTokenHash(token) : null;
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}:${tokenHash}`;
    
    // Clear cache for this endpoint
    this.swrCache.delete(cacheKey);
    console.log('🔄 Force refresh for:', url);
    
    // Execute fresh request
    return this.executeRequest<T>(url, options, false, cacheKey);
  }
  
  // Stale-while-revalidate request method
  static async requestWithRevalidate<T>(
    endpoint: string,
    options: RequestInit = {},
    staleTime: number = 0, // Time in ms before data is considered stale (0 = always revalidate)
    onRevalidate?: (data: T) => void // Callback when fresh data arrives
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const token = await this.getStoredToken();
    const tokenHash = token ? this.getTokenHash(token) : null;
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}:${tokenHash}`;
    const now = Date.now();
    
    // Check if we have cached data
    const cached = this.swrCache.get(cacheKey);
    
    if (cached && cached.tokenHash === tokenHash) {
      const age = now - cached.timestamp;
      const isStale = age > cached.staleTime;
      
      if (!isStale) {
        // Data is fresh, return immediately
        console.log(`✨ Serving fresh SWR cache (${Math.round(age / 1000)}s old):`, url);
        return cached.data;
      }
      
      // Data is stale but available - return it immediately
      console.log(`⏰ Serving stale SWR cache (${Math.round(age / 1000)}s old), revalidating in background:`, url);
      
      // Register revalidation callback if provided
      if (onRevalidate) {
        if (!this.revalidationCallbacks.has(cacheKey)) {
          this.revalidationCallbacks.set(cacheKey, []);
        }
        this.revalidationCallbacks.get(cacheKey)!.push(onRevalidate);
      }
      
      // Trigger background revalidation (don't await)
      this.revalidateInBackground<T>(url, options, cacheKey, staleTime, tokenHash);
      
      // Return stale data immediately
      return cached.data;
    }
    
    // No cache available - fetch fresh data (with loading state)
    console.log('🆕 No SWR cache available, fetching fresh data:', url);
    
    // Check if there's already a pending request
    if (this.swrPendingRequests.has(cacheKey)) {
      console.log('⏳ SWR request already pending, returning existing promise:', url);
      return this.swrPendingRequests.get(cacheKey);
    }
    
    // Create new request
    const requestPromise = this.executeRequest<T>(url, options, false, cacheKey);
    this.swrPendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Cache the result
      if (tokenHash) {
        this.swrCache.set(cacheKey, {
          data: result,
          timestamp: now,
          staleTime,
          tokenHash
        });
      }
      
      return result;
    } finally {
      this.swrPendingRequests.delete(cacheKey);
    }
  }
  
  // Background revalidation helper
  private static async revalidateInBackground<T>(
    url: string,
    options: RequestInit,
    cacheKey: string,
    staleTime: number,
    tokenHash: string | null
  ): Promise<void> {
    // Don't start another revalidation if one is already in progress
    if (this.swrPendingRequests.has(cacheKey)) {
      return;
    }
    
    const requestPromise = this.executeRequest<T>(url, options, false, cacheKey);
    this.swrPendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // Update cache with fresh data
      if (tokenHash) {
        this.swrCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          staleTime,
          tokenHash
        });
        console.log('✅ Background revalidation complete:', url);
      }
      
      // Call all registered callbacks with fresh data
      const callbacks = this.revalidationCallbacks.get(cacheKey);
      if (callbacks && callbacks.length > 0) {
        console.log(`📢 Notifying ${callbacks.length} callback(s) with fresh data`);
        callbacks.forEach(callback => {
          try {
            callback(result);
          } catch (error) {
            console.error('Error in revalidation callback:', error);
          }
        });
        // Clear callbacks after notifying
        this.revalidationCallbacks.delete(cacheKey);
      }
    } catch (error) {
      console.error('❌ Background revalidation failed:', error);
    } finally {
      this.swrPendingRequests.delete(cacheKey);
    }
  }
  
  // Helper function to create a hash/mask of token for logging
  private static getTokenHash(token: string): string {
    if (!token || token.length < 8) return '***';
    // Show first 4 and last 4 characters, mask the middle
    const start = token.substring(0, 4);
    const end = token.substring(token.length - 4);
    const middle = '*'.repeat(Math.min(token.length - 8, 12));
    return `${start}${middle}${end}`;
  }
  
  // Helper function to add timeout to fetch with retry logic
  private static async fetchWithTimeout(
    url: string,
    config: RequestInit,
    timeout: number = this.REQUEST_TIMEOUT,
    retryCount: number = 0
  ): Promise<Response> {
    try {
      return Promise.race([
        fetch(url, config),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout: Server did not respond in time')), timeout)
        ),
      ]);
    } catch (error) {
      // Retry logic for network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('timeout') || 
                         errorMessage.includes('Failed to fetch') ||
                         errorMessage.includes('Network request failed');
      
      if (isRetryable && retryCount < this.RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying request (${retryCount + 1}/${this.RETRY_ATTEMPTS}):`, url);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.fetchWithTimeout(url, config, timeout, retryCount + 1);
      }
      
      throw error;
    }
  }
  
  private static buildUrl(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) {
      return endpoint;
    }

    const baseWithSlash = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
    const normalizedBase = baseWithSlash.replace(/\/+$/, '/');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${normalizedBase}${normalizedEndpoint}`;
  }

  // Generic request method with caching and debouncing
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = false
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📋 Using cached response for:', url);
        return cached.data;
      }
    }
    
    // Debounce: if same request is pending, return the existing promise
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Request debounced, returning pending promise:', url);
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create the request promise
    const requestPromise = this.executeRequest<T>(url, options, useCache, cacheKey);
    
    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // Execute the actual request
  private static async executeRequest<T>(
    url: string,
    options: RequestInit,
    useCache: boolean,
    cacheKey: string
  ): Promise<T> {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists
    const token = await this.getStoredToken();
    if (token) {
      const tokenHash = this.getTokenHash(token);
      console.log('🔑 API Request - Token hash:', tokenHash);
      console.log('🌐 API Request - URL:', url);
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      console.log('🔑 API Request - Token status: No token');
      console.log('🌐 API Request - URL:', url);
      console.warn('⚠️ No authentication token found for API request to:', url);
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`📡 Attempting API request to: ${url}`);
      
      const response = await this.fetchWithTimeout(url, config);
      
      // Handle non-JSON responses (network errors, etc.)
      let data;
      const contentType = response.headers.get('content-type');
      
      try {
        const responseText = await response.text();
        console.log(`📥 Response status: ${response.status}, Content-Type: ${contentType}`);
        
        // Try to parse as JSON
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(responseText);
          } catch (jsonError) {
            // If response is not valid JSON, throw a clearer error
            console.error('❌ Failed to parse JSON response:', responseText.substring(0, 200));
            throw new Error(`Invalid JSON response from server. Status: ${response.status}`);
          }
        } else {
          // For non-JSON responses
          if (!response.ok) {
            console.error('❌ Non-JSON error response:', responseText.substring(0, 200));
            throw new Error(`Server returned non-JSON response. Status: ${response.status}. ${responseText.substring(0, 100)}`);
          }
          // If response is OK but not JSON, return empty object
          data = {};
        }
      } catch (parseError) {
        // If we can't parse the response at all
        console.error('❌ Parse error:', parseError);
        throw new Error(`Unable to parse server response. Status: ${response.status}`);
      }

      if (!response.ok) {
        if (response.status === 429) {
          const errorMessage = data.message || data.error || 'Too many requests. Please try again later.';
          throw new Error(errorMessage);
        }

        // Handle 401 Unauthorized - distinguish between login errors and token errors
        if (response.status === 401) {
          const errorMessage = data.message || data.error || 'Authentication failed';
          
          // Only remove token if it's a token expiration issue, not login failure
          if (errorMessage.includes('expired') || errorMessage.includes('invalid') || !data.message) {
            console.log('🔐 Token expired or invalid, removing token');
            await this.removeToken();
            throw new Error('Authentication error: Please login again');
          } else {
            // This is a login error (wrong email/password), pass through the server message
            throw new Error(errorMessage);
          }
        }
        // Handle 503 Service Unavailable - usually database connection errors
        if (response.status === 503) {
          const errorMessage = data.message || data.error || 'Service unavailable';
          console.error(`❌ Database Error (${response.status}):`, errorMessage);
          throw new Error(errorMessage);
        }
        // Handle 403 Forbidden - check if it's a business logic error (insufficient balance/penalty)
        if (response.status === 403) {
          const errorMessage = data.message || data.error || 'Access denied';
          // Don't log as error for business logic responses
          if (data.errorCode === 'INSUFFICIENT_BALANCE' || data.errorCode === 'OUTSTANDING_PENALTY') {
            console.log(`📋 Business Logic Response (${response.status}):`, errorMessage);
          } else {
            console.error(`❌ API Error (${response.status}):`, errorMessage);
          }
          throw new Error(errorMessage);
        }
        // Handle 400 Bad Request - check if it's a spot availability error
        if (response.status === 400) {
          const errorMessage = data.message || data.error || 'Bad request';
          // Don't log as error for spot availability issues
          if (errorMessage.includes('no longer available') || 
              errorMessage.includes('not available') ||
              errorMessage.includes('spot is no longer available')) {
            console.log(`📋 Business Logic Response (${response.status}):`, errorMessage);
          } else {
            console.error(`❌ API Error (${response.status}):`, errorMessage);
          }
          throw new Error(errorMessage);
        }
        // Include full error details for debugging
        const errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
        console.error(`❌ API Error (${response.status}):`, errorMessage);
        throw new Error(errorMessage);
      }

      // Cache successful GET requests
      if (useCache && response.ok && (!options.method || options.method === 'GET')) {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        
        // Clean old cache entries periodically
        if (this.cache.size > 50) {
          const now = Date.now();
          this.cache.forEach((value, key) => {
            if (now - value.timestamp > this.CACHE_DURATION) {
              this.cache.delete(key);
            }
          });
        }
      }
      
      return data;
    } catch (error) {
      // Handle network errors (connection refused, timeout, etc.)
      // Check for various network error patterns
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = String(error);
      
      if (
        error instanceof TypeError ||
        errorString.includes('Failed to fetch') ||
        errorString.includes('Network request failed') ||
        errorString.includes('NetworkError') ||
        errorMessage.includes('Request timeout') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND')
      ) {
        console.error('🌐 Network error detected:', errorMessage);
        console.error('🔍 URL attempted:', url);
        console.error('💡 Make sure:');
        console.error('   1. Backend server is running');
        console.error('   2. IP address is correct:', url);
        console.error('   3. Device and computer are on the same WiFi network');
        console.error('   4. Firewall allows connections on port 3000');
        
        // Provide more specific error message based on error type
        const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Request timeout');
        const errorMsg = isTimeout
          ? `Connection timeout: Server at ${this.baseURL} did not respond. Check if backend is running.`
          : `Network error: Cannot reach server at ${this.baseURL}. Ensure backend is running and devices are on the same network.`;
        
        throw new Error(errorMsg);
      }
      
      // Don't log authentication errors that are expected
      if (error instanceof Error && (
        error.message.includes('Authentication error') ||
        error.message.includes('Access token required') ||
        error.message.includes('Please login again') ||
        error.message.includes('401') ||
        error.message.includes('Invalid email or password')
      )) {
        // Only log in debug mode, don't spam console
        console.log('🔐 Authentication issue:', error.message);
        throw error;
      }
      
      // Re-throw the error if it's already an Error instance with a message
      if (error instanceof Error) {
        if (error.message.includes('Too many requests')) {
          // Avoid noisy repeated stack logs for expected 429 throttling
          console.log('⏳ Request throttled:', error.message);
          throw error;
        }
        // Don't log as error for business logic responses
        if (error.message.includes('You have no remaining subscription hours') ||
            error.message.includes('penalty hours outstanding') ||
            error.message.includes('Please purchase a plan') ||
            error.message.includes('Booking not found or does not belong to user') ||
            error.message.includes('Booking not found') ||
            error.message.includes('no longer available') ||
            error.message.includes('not available') ||
            error.message.includes('spot is no longer available')) {
          // SILENT - no logging for business logic
        } else {
          console.error('❌ API Request failed:', error.message);
        }
        throw error;
      }
      
      // Don't log business logic errors as errors
      const isBusinessLogicError = error instanceof Error && (
        error.message.includes('You have no remaining subscription hours') ||
        error.message.includes('penalty hours outstanding') ||
        error.message.includes('Please purchase a plan') ||
        error.message.includes('Booking not found or does not belong to user') ||
        error.message.includes('Booking not found') ||
        error.message.includes('no longer available') ||
        error.message.includes('not available') ||
        error.message.includes('spot is no longer available')
      );
      
      if (isBusinessLogicError) {
        // SILENT - no logging for business logic
      } else {
        console.error('❌ API Request failed (unknown error):', error);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  // Token management
  private static token: string | null = null;
  private static readonly TOKEN_KEY = 'tappark_auth_token';
  private static tokenInitialized = false;

  // Initialize token from AsyncStorage on app start
  static async initializeToken(): Promise<void> {
    if (this.tokenInitialized) return;
    
    try {
      const storedToken = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.token = storedToken;
        console.log('Token initialized from AsyncStorage');
      }
      this.tokenInitialized = true;
    } catch (error) {
      console.error('Error initializing token:', error);
      this.tokenInitialized = true;
    }
  }

  static async getStoredToken(): Promise<string | null> {
    try {
      // First check in-memory token
      if (this.token) {
        return this.token;
      }
      
      // If not in memory, try to get from AsyncStorage
      const storedToken = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.token = storedToken; // Cache in memory
        return storedToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  private static async storeToken(token: string): Promise<void> {
    try {
      // Store token in both memory and AsyncStorage
      this.token = token;
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      console.log('Token stored in memory and AsyncStorage');
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  private static async removeToken(): Promise<void> {
    try {
      // Remove token from both memory and AsyncStorage
      this.token = null;
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      console.log('Token removed from memory and AsyncStorage');
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }

  // Authentication endpoints
  static async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      message: string;
      data: {
        user: {
          user_id: number;
          email: string;
          first_name: string;
          last_name: string;
          hour_balance: number;
          type_id: number;
          account_type_name: string;
          terms_accepted?: boolean;
        };
        token: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token after successful login
    if (response.success && response.data.token) {
      await this.storeToken(response.data.token);
    }

    if (response?.success && response?.data?.user) {
      response.data.user = normalizeUserProfileImageFields(response.data.user) as any;
    }

    return response;
  }

  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const response = await this.request<{
      success: boolean;
      message: string;
      data: {
        user: {
          id: number;
          email: string;
          firstName: string;
          lastName: string;
          phone?: string;
          isVerified: boolean;
        };
        token: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store token after successful registration
    if (response.success && response.data.token) {
      await this.storeToken(response.data.token);
    }

    return response;
  }

  static async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Silent logout - no console errors needed
    } finally {
      // Always remove token locally
      await this.removeToken();
    }
  }

  static async getProfile() {
    const response = await this.request<{
      success: boolean;
      data: {
        user: {
          user_id: number;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string;
          profile_image?: string;
          hour_balance: number;
          is_verified: boolean;
          created_at: string;
          type_id: number;
          account_type_name: string;
          terms_accepted?: boolean;
        };
      };
    }>('/auth/profile');

    if (response?.success && response?.data?.user) {
      response.data.user = normalizeUserProfileImageFields(response.data.user) as any;
    }

    return response;
  }

  static async acceptTerms() {
    return this.request<{
      success: boolean;
      message: string;
    }>('/auth/accept-terms', {
      method: 'POST',
    });
  }

  // Upload profile picture
  static async uploadProfilePicture(imageUri: string) {
    const token = await this.getStoredToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    // Create FormData
    const formData = new FormData();
    
    // Extract filename from URI and determine type
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename.toLowerCase());
    let mimeType = 'image/jpeg';
    if (match) {
      const ext = match[1];
      if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
    }

    // Append file to FormData
    formData.append('profilePicture', {
      uri: imageUri,
      type: mimeType,
      name: filename,
    } as any);

    const url = this.buildUrl('/auth/profile/picture');

    try {
      console.log('📤 Uploading profile picture to:', url);

      const uploadResult = await FileSystem.uploadAsync(url, imageUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        httpMethod: 'POST',
        uploadType: MULTIPART_UPLOAD_TYPE as any,
        fieldName: 'profilePicture',
        mimeType,
        parameters: {},
      });

      let responseData: any = {};

      if (uploadResult.body) {
        try {
          responseData = JSON.parse(uploadResult.body);
        } catch (jsonError) {
          console.warn('⚠️ Upload response not JSON:', uploadResult.body?.slice(0, 200));
        }
      }

      if (uploadResult.status !== 200) {
        const errorMessage = responseData.message || responseData.error || `Failed to upload profile picture (status ${uploadResult.status})`;
        console.error('❌ Upload profile picture failed:', {
          status: uploadResult.status,
          url,
          responseBody: uploadResult.body?.slice(0, 200)
        });
        throw new Error(errorMessage);
      }

      if (responseData?.data?.profile_image) {
        responseData.data.profile_image = normalizeProfileImageUrl(responseData.data.profile_image);
      }

      return responseData;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error;
    }
  }

  // Delete profile picture
  static async deleteProfilePicture() {
    return this.request<{
      success: boolean;
      message: string;
    }>('/auth/profile/picture', {
      method: 'DELETE',
    });
  }

  // Change password
  static async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });
  }

  // Vehicle endpoints
  private static readonly VEHICLE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  static async getVehicles(onRevalidate?: (data: any) => void) {
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        vehicles: Array<{
          id: number;
          plate_number: string;
          vehicle_type: string;
          brand?: string;
          model?: string;
          color?: string;
          is_default: boolean;
          created_at: string;
        }>;
        cached?: boolean;
      };
    }>('/vehicles', {}, this.VEHICLE_CACHE_TTL, onRevalidate); // 2 min stale time
  }

  // Method to invalidate vehicle cache (call after add/update/delete)
  static invalidateVehicleCache() {
    this.invalidateSWRCache('/vehicles');
    console.log('🚗 Invalidated vehicle cache');
  }

  static async addVehicle(vehicleData: {
    plateNumber: string;
    vehicleType: string;
    brand?: string;
    model?: string;
    color?: string;
    isDefault?: boolean;
  }) {
    const result = await this.request<{
      success: boolean;
      message: string;
      data: {
        vehicle: {
          id: number;
          plate_number: string;
          vehicle_type: string;
          brand?: string;
          model?: string;
          color?: string;
          is_default: boolean;
          created_at: string;
        };
      };
    }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });

    // Invalidate cache on successful addition
    if (result.success) {
      this.invalidateVehicleCache();
    }

    return result;
  }

  static async deleteVehicle(vehicleId: number) {
    const result = await this.request<{
      success: boolean;
      message: string;
    }>(`/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });

    // Invalidate cache on successful deletion
    if (result.success) {
      this.invalidateVehicleCache();
    }

    return result;
  }

  // Parking endpoints
  static async getParkingLocations(lat?: number, lng?: number, radius?: number) {
    const params = new URLSearchParams();
    if (lat) params.append('lat', lat.toString());
    if (lng) params.append('lng', lng.toString());
    if (radius) params.append('radius', radius.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/parking/locations?${queryString}` : '/parking/locations';

    return this.request<{
      success: boolean;
      data: {
        locations: Array<{
          id: number;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          total_spots: number;
          available_spots: number;
          hourly_rate: number;
          daily_rate: number;
          operating_hours: Record<string, any>;
          amenities: string[];
          is_active: boolean;
        }>;
      };
    }>(endpoint);
  }

  static async startParking(vehicleId: number, locationId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        session: {
          id: number;
          qrCode: string;
          qrCodeImage: string;
          startTime: string;
          hourlyRate: number;
        };
      };
    }>('/parking/start', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, locationId }),
    });
  }

  static async endParking(sessionId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        session: {
          id: number;
          durationMinutes: number;
          totalCost: number;
          endTime: string;
        };
      };
    }>(`/parking/end/${sessionId}`, {
      method: 'POST',
    });
  }

  static async getActiveSession() {
    return this.request<{
      success: boolean;
      data: {
        session: {
          id: number;
          plate_number: string;
          vehicle_type: string;
          location_name: string;
          start_time: string;
          duration_minutes: number;
          current_cost: number;
        } | null;
      };
    }>('/parking/active');
  }

  // Payment endpoints
  static async getBalance() {
    return this.request<{
      success: boolean;
      data: {
        balance: number;
      };
    }>('/payments/balance');
  }

  static async topUpWallet(amount: number, paymentMethod: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        transactionId: string;
        amount: number;
        newBalance: number;
      };
    }>('/payments/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethod }),
    });
  }

  // Health check
  static async healthCheck() {
    return this.request<{
      success: boolean;
      status: string;
      timestamp: string;
      environment: string;
      version: string;
    }>('/health', {}, true); // Use cache
  }

  // Parking Areas endpoints
  static async getParkingAreas() {
    return this.request<{
      success: boolean;
      data: {
        locations: Array<{
          id: number;
          name: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          total_spots: number;
          available_spots: number;
          capacity_total_spots?: number;
          capacity_available_spots?: number;
          hourly_rate: string;
          daily_rate: string;
          operating_hours: string;
          amenities: string;
          is_active: string;
        }>;
      };
    }>('/parking/locations', {}, true); // Use cache
  }

  static async getParkingSpots(areaId: number, vehicleType?: string, includeAll?: boolean) {
    const query = new URLSearchParams();
    if (vehicleType) {
      query.append('vehicleType', vehicleType);
    }
    if (includeAll) {
      query.append('includeAll', 'true');
    }

    const queryString = query.toString();
    const url = queryString
      ? `/parking-areas/areas/${areaId}/spots?${queryString}`
      : `/parking-areas/areas/${areaId}/spots`;

    return this.request<{
      success: boolean;
      data: {
        spots: Array<{
          id: number;
          spot_number: string;
          status: string;
          spot_type: string;
          section_name: string;
        }>;
      };
    }>(url);
  }

  static async getParkingSpotsStatus(areaId: number) {
    return this.request<{
      success: boolean;
      data: {
        spots: Array<{
          id: number;
          spot_number: string;
          status: string;
          spot_type: string;
          section_name: string;
          is_user_booked?: boolean | number; // Indicates if current user has booked this spot
        }>;
      };
    }>(`/parking-areas/areas/${areaId}/spots-status`);
  }

  static async bookParkingSpot(vehicleId: number, spotId: number, areaId: number) {
    const result = await this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        bookingDetails: {
          vehiclePlate: string;
          vehicleType: string;
          vehicleBrand: string;
          areaName: string;
          areaLocation: string;
          spotNumber: string;
          spotType: string;
          startTime: string;
          status: string;
        };
      };
    }>('/parking-areas/book', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId,
        spotId,
        areaId
      }),
    });
    
    // Invalidate related caches after successful booking
    if (result.success) {
      this.invalidateSWRCache('/parking-areas/my-bookings');
      this.invalidateSWRCache('/history');
      this.invalidateFrequentSpotsCache();
      console.log('🔄 Invalidated booking-related caches after new booking');
    }
    
    return result;
  }

  // Timer is now purely local - no server-side timer needed

  // Get user history
  static async getHistory(page: number = 1, limit: number = 20, type?: string, onRevalidate?: (data: any) => void) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (type) {
      params.append('type', type);
    }
    
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        history: any[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
        };
      };
    }>(`/history?${params.toString()}`, {}, 0, onRevalidate); // 0s stale time = always revalidate
  }

  // Get parking history only
  static async getParkingHistory(page: number = 1, limit: number = 10, status?: string, onRevalidate?: (data: any) => void) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }
    
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        sessions: any[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
        };
      };
    }>(`/history/parking?${params.toString()}`, {}, 0, onRevalidate); // 0s stale time = always revalidate
  }

  // Get payment history only
  static async getPaymentHistory(page: number = 1, limit: number = 10, type?: string, onRevalidate?: (data: any) => void) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (type) {
      params.append('type', type);
    }
    
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        payments: any[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          itemsPerPage: number;
        };
      };
    }>(`/history/payments?${params.toString()}`, {}, 0, onRevalidate); // 0s stale time = always revalidate
  }

  // Delete history record
  static async deleteHistoryRecord(reservationId: number) {
    const result = await this.request<{
      success: boolean;
      message: string;
    }>(`/history/parking/${reservationId}`, {
      method: 'DELETE',
    });
    
    // Invalidate history cache after deleting
    if (result.success) {
      this.invalidateSWRCache('/history');
      console.log('🔄 Invalidated history cache after deleting record');
    }
    
    return result;
  }

  // Get history statistics
  static async getHistoryStats(period: number = 30) {
    return this.request<{
      success: boolean;
      data: {
        parking: {
          total_sessions: number;
          completed_sessions: number;
          active_sessions: number;
        };
        payments: {
          total_payments: number;
          total_topup: number;
          total_parking_fees: number;
          avg_parking_cost: number;
        };
        monthlyBreakdown: Array<{
          month: string;
          sessions_count: number;
        }>;
        topLocations: Array<{
          location_name: string;
          visit_count: number;
        }>;
      };
    }>(`/history/stats?period=${period}`);
  }

  // Get parking spot ID from reservation ID
  static async getParkingSpotIdFromReservation(reservationId: number) {
    return this.request<{
      success: boolean;
      data: {
        parkingSpotId: number;
        parkingSectionId?: number;
        parkingAreaId?: number;
      };
    }>(`/parking-areas/reservation/${reservationId}/parking-spot-id`);
  }

  static async getBookingDetails(reservationId: number, includeBilling: boolean = false, onRevalidate?: (data: any) => void) {
    const queryParams = includeBilling ? 'includeBilling=true' : '';
    const endpoint = queryParams ? `/parking-areas/booking/${reservationId}?${queryParams}` : `/parking-areas/booking/${reservationId}`;
    
    console.log('🔍 getBookingDetails called with:', { reservationId, includeBilling });
    
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        reservationId: number;
        displayName: string;
        userEmail: string;
        vehicleDetails: {
          plateNumber: string;
          vehicleType: string;
          brand: string;
          color: string;
        };
        parkingArea: {
          id: number;
          name: string;
          location: string;
        };
        parkingSlot: {
          parkingSpotId: number;
          spotNumber: string;
          spotType: string;
          sectionName?: string;
        };
        timestamps: {
          bookingTime: string;
          startTime: string | null;
          endTime: string | null;
        };
        bookingStatus: string;
        qrCode: string;
        qrKey?: string;
        penaltyInfo?: {
          hasPenalty?: boolean;
          penaltyHours?: number;
        } | null;
        billingBreakdown?: {
          waitTimeHours: number;
          waitTimeMinutes: number;
          parkingTimeHours: number;
          parkingTimeMinutes: number;
          totalChargedHours: number;
          totalChargedMinutes: number;
          breakdown: string;
        } | null;
      };
    }>(endpoint, {}, 5000, onRevalidate); // 5s stale time to prevent 429 spam during polling
  }

  static async getMyBookings(onRevalidate?: (data: any) => void) {
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        bookings: Array<{
          reservationId: number;
          displayName: string;
          userEmail: string;
          vehicleDetails: {
            plateNumber: string;
            vehicleType: string;
            brand: string;
            color: string;
          };
          parkingArea: {
            name: string;
            location: string;
          };
          parkingSlot: {
            spotNumber: string;
            spotType: string;
            sectionName: string;
          };
          timestamps: {
            bookingTime: string;
            startTime: string;
          };
          bookingStatus: string;
          qrCode: string;
        }>;
      };
    }>('/parking-areas/my-bookings', {}, 15000, onRevalidate); // 15s stale time to reduce redundant requests
  }

  static async endParkingSession(reservationId: number) {
    const result = await this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        status: string;
        spotFreed: boolean;
      };
    }>(`/parking-areas/end-session/${reservationId}`, {
      method: 'PUT',
    });
    
    // Invalidate related caches after ending session
    if (result.success) {
      this.invalidateSWRCache('/parking-areas/my-bookings');
      this.invalidateSWRCache('/history');
      this.invalidateFrequentSpotsCache();
      console.log('🔄 Invalidated booking-related caches after ending session');
    }
    
    return result;
  }

  // Favorites API methods
  static async getFavorites(onRevalidate?: (data: any) => void) {
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        favorites: Array<{
          favorites_id: number;
          parking_spot_id: number;
          user_id: number;
          created_at: string;
          spot_number: string;
          spot_type: string;
          spot_status: string;
          parking_section_id: number;
          section_name: string;
          parking_area_id: number;
          parking_area_name: string;
          location: string;
          hourly_rate: number;
        }>;
      };
    }>('/favorites', {}, this.VEHICLE_CACHE_TTL, onRevalidate); // 2 min stale time
  }

  static async addFavorite(parkingSpotId: number | string) {
    const result = await this.request<{
      success: boolean;
      message: string;
    }>(`/favorites/${parkingSpotId}`, {
      method: 'POST',
    });
    
    // Invalidate favorites cache after adding
    if (result.success) {
      this.invalidateSWRCache('/favorites');
      console.log('🔄 Invalidated favorites cache after adding');
    }
    
    return result;
  }

  static async removeFavorite(parkingSpotId: number | string) {
    const result = await this.request<{
      success: boolean;
      message: string;
    }>(`/favorites/${parkingSpotId}`, {
      method: 'DELETE',
    });
    
    // Invalidate favorites cache after removing
    if (result.success) {
      this.invalidateSWRCache('/favorites');
      console.log('🔄 Invalidated favorites cache after removing');
    }
    
    return result;
  }

  static async checkFavorite(parkingSpotId: number | string) {
    return this.request<{
      success: boolean;
      data: {
        isFavorite: boolean;
      };
    }>(`/favorites/check/${parkingSpotId}`);
  }

  // Subscription/Plans API methods
  static async getSubscriptionPlans() {
    return this.request<{
      success: boolean;
      data: Array<{
        plan_id: number;
        plan_name: string;
        cost: number;
        number_of_hours: number;
        description: string;
      }>;
    }>('/subscriptions/plans');
  }

  static async purchaseSubscription(planId: number, paymentMethodId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        plan_name: string;
        hours_added: number;
        cost: number;
        total_hours_remaining: number;
      };
    }>('/subscriptions/purchase', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        payment_method_id: paymentMethodId
      })
    });
  }

  static async getSubscriptionBalance() {
    return this.request<{
      success: boolean;
      data: {
        total_hours_remaining: number;
        total_hours_used: number;
        active_subscriptions: number;
        user_hour_balance: number;
        subscriptions: Array<{
          subscription_id: number;
          purchase_date: string;
          hours_remaining: number;
          hours_used: number;
          plan_name: string;
          cost: number;
          number_of_hours: number;
        }>;
      };
    }>('/subscriptions/balance');
  }

  // Frequent spots cache
  private static readonly FREQUENT_SPOTS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  // Get frequently used parking spots
  static async getFrequentSpots(limit: number = 5, onRevalidate?: (data: any) => void) {
    return this.requestWithRevalidate<{
      success: boolean;
      data: {
        frequent_spots: Array<{
          location_name: string;
          location_address: string;
          spot_number: string;
          spot_type: string;
          parking_spot_id: number;
          usage_count: number;
          last_used: string;
          status: string;
          current_reservation: any;
        }>;
        cached?: boolean;
      };
    }>(`/history/frequent-spots?limit=${limit}`, {}, this.FREQUENT_SPOTS_CACHE_TTL, onRevalidate); // 2 min stale time
  }

  // Method to invalidate frequent spots cache
  static invalidateFrequentSpotsCache() {
    this.invalidateSWRCache('/history/frequent-spots');
    console.log('🔥 Invalidated frequent spots cache');
  }

  // Attendant API methods
  static async getVehicleTypes() {
    return this.request<{
      success: boolean;
      data: {
        vehicleTypes: Array<{
          id: string;
          name: string;
          totalCapacity: number;
          occupied: number;
          available: number;
          reserved: number;
        }>;
      };
    }>('/attendant/vehicle-types');
  }

  static async getParkingSlots() {
    return this.request<{
      success: boolean;
      data: {
        parkingSlots: Array<{
          id: string;
          slotId: string;
          vehicleType: string;
          status: 'available' | 'occupied' | 'reserved';
          section: string;
          occupantName?: string;
          plateNumber?: string;
        }>;
      };
    }>('/attendant/parking-slots');
  }

  static async getDashboardStats() {
    return this.request<{
      success: boolean;
      data: {
        totalSlots: number;
        occupiedSlots: number;
        availableSlots: number;
        reservedSlots: number;
        occupancyRate: number;
      };
    }>('/attendant/dashboard-stats');
  }

  static async getParkingSlotDetails(slotId: string) {
    return this.request<{
      success: boolean;
      data: {
        slotDetails: {
          id: string;
          slotId: string;
          vehicleType: string;
          status: string;
          section: string;
          areaName: string;
          location: string;
        };
      };
    }>(`/attendant/parking-slot/${slotId}`);
  }

  static async getAttendantProfile() {
    return this.request<{
      success: boolean;
      data: {
        attendantProfile: {
          attendantId: string;
          attendantName: string;
          email: string;
          hourBalance: number;
          accountType: string;
          assignedAreaId?: number;
          assignedAreaName: string;
          assignedAreaLocation: string;
          assignedAreas: string;
          createdAt: string;
        };
      };
    }>('/attendant/profile');
  }

  static async getNotificationSettings() {
    return this.request<{
      success: boolean;
      data: {
        notificationSettings: {
          newReservationAlerts: boolean;
          lowCapacityAlerts: boolean;
          systemMaintenanceAlerts: boolean;
          emailNotifications: boolean;
          pushNotifications: boolean;
        };
      };
    }>('/attendant/notification-settings');
  }

  static async updateNotificationSettings(notificationSettings: {
    newReservationAlerts: boolean;
    lowCapacityAlerts: boolean;
    systemMaintenanceAlerts: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        notificationSettings: typeof notificationSettings;
      };
    }>('/attendant/notification-settings', {
      method: 'PUT',
      body: JSON.stringify({ notificationSettings }),
    });
  }

  // QR Scanner API methods for attendants
  static async startParkingSessionViaQR(qrCodeData: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        vehiclePlate: string;
        spotNumber: string;
        areaName: string;
        location: string;
        startTime: string;
        status: string;
      };
    }>('/attendant/start-parking-session', {
      method: 'POST',
      body: JSON.stringify({ qrCodeData }),
    });
  }

  static async endParkingSessionViaQR(qrCodeData: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        vehiclePlate: string;
        spotNumber: string;
        areaName: string;
        location: string;
        startTime: string;
        endTime: string;
        durationMinutes: number;
        durationHours: number;
        chargeHours: number;
        balanceHours: number;
        status: string;
      };
    }>('/attendant/end-parking-session', {
      method: 'POST',
      body: JSON.stringify({ qrCodeData }),
    });
  }

  static async getParkingSessionStatus(qrCode: string) {
    return this.request<{
      success: boolean;
      data: {
        reservationId: number;
        vehiclePlate: string;
        spotNumber: string;
        areaName: string;
        location: string;
        status: string;
        startTime: string;
        endTime: string;
        durationMinutes: number;
      };
    }>(`/attendant/parking-session-status/${qrCode}`);
  }

  // Get parking scan history for attendants
  static async getParkingScanHistory() {
    return this.request<{
      success: boolean;
      data: {
        scans: Array<{
          id: string;
          reservationId: number;
          vehiclePlate: string;
          userName?: string;
          vehicleType: string;
          vehicleBrand: string;
          parkingArea: string;
          parkingSlot: string;
          scanType: 'start' | 'end';
          scanTime: string;
          attendantName: string;
          userType: string;
          status: string;
        }>;
      };
    }>('/attendant/scan-history');
  }

  // Admin: Check if plate number already exists
  static async checkPlateNumber(plateNumber: string) {
    return this.request<{
      success: boolean;
      exists: boolean;
      vehicle: {
        vehicleId: number;
        plateNumber: string;
        vehicleType: string;
        brand: string;
      } | null;
      message: string;
    }>(`/attendant/check-plate/${encodeURIComponent(plateNumber)}`);
  }

  // Admin: Create guest booking
  static async createGuestBooking(bookingData: {
    spotId: number;
    firstName: string;
    lastName: string;
    plateNumber: string;
    vehicleType: string;
    brand?: string;
    model?: string;
    color?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        qrCode: string;
        bookingDetails: {
          reservationId: number;
          qrCode: string;
          guestName: string;
          vehiclePlate: string;
          vehicleType: string;
          vehicleBrand: string;
          areaName: string;
          areaLocation: string;
          spotNumber: string;
          spotType: string;
          status: string;
          isGuest: boolean;
        };
      };
    }>('/attendant/create-guest-booking', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // Admin/Attendant: End parking session
  static async endParkingSessionByAdmin(reservationId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        status: string;
        spotFreed: boolean;
      };
    }>(`/attendant/end-parking-session/${reservationId}`, {
      method: 'PUT',
    });
  }

  // Admin/Attendant: Cancel booking
  static async cancelBookingByAdmin(reservationId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        status: string;
        spotFreed: boolean;
      };
    }>(`/attendant/cancel-booking/${reservationId}`, {
      method: 'PUT',
    });
  }

  // Parking Layout API Methods
  static async getParkingAreaLayout(areaId: number) {
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    return this.request<{
      success: boolean;
      data: {
        areaId: number;
        areaName: string;
        location: string;
        layoutId: number | null;
        layoutName: string;
        layoutSvg: string;
        hasLayout: boolean;
        floor?: number;
      };
    }>(`/parking-areas/area/${areaId}/layout?t=${timestamp}`);
  }

  static async getParkingLayouts() {
    return this.request<{
      success: boolean;
      data: {
        layouts: Array<{
          areaId: number;
          areaName: string;
          location: string;
          floor: number;
          hasLayoutData: boolean;
          layoutDataLength: number;
          createdAt: string;
        }>;
      };
    }>('/parking-areas/layouts');
  }

  static async loadLayoutSvg(layoutName: string) {
    const url = this.buildUrl(`/parking-areas/layout/${layoutName}`);

    return fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      });
  }

  // PayPal Payment Methods
  static async createPayPalOrder(planId: number) {
    return this.request<{
      success: boolean;
      data: {
        orderId: string;
        approvalUrl: string;
        plan: {
          plan_id: number;
          plan_name: string;
          cost: number;
          hours: number;
        };
      };
    }>('/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    });
  }

  static async capturePayPalOrder(orderId: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        plan_name: string;
        hours_added: number;
        cost: number;
        total_hours_remaining: number;
        orderId: string;
        captureId: string;
      };
    }>('/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  static async cancelPayPalOrder(orderId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>('/paypal/cancel-order', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  static async getPayPalTransaction(orderId: string) {
    return this.request<{
      success: boolean;
      data: {
        id: number;
        user_id: number;
        plan_id: number;
        paypal_order_id: string;
        capture_id: string;
        amount: number;
        status: string;
        plan_name: string;
        number_of_hours: number;
      };
    }>(`/paypal/transaction/${orderId}`);
  }

  // Capacity Management Methods
  static async getCapacityStatus(areaId: number) {
    return this.request<{
      success: boolean;
      data: Array<{
        sectionId: number;
        sectionName: string;
        vehicleType: string;
        totalCapacity: number;
        availableCapacity: number;
        activeReservations: number;
        utilizationRate: string;
      }>;
    }>(`/capacity/areas/${areaId}/capacity-status`);
  }

  static async reserveCapacity(
    sectionId: number,
    params?: {
      reservationId?: number;
      vehicleId?: number;
      spotNumber?: string;
      areaId?: number;
    }
  ) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        reservationId: number;
        qrCode?: string;
        qrKey?: string;
        sectionName: string;
        remainingCapacity: number;
        bookingDetails?: {
          reservationId: number;
          vehiclePlate?: string;
          vehicleType?: string;
          vehicleBrand?: string;
          areaName?: string;
          areaLocation?: string;
          sectionName?: string;
          spotNumber?: string;
          spotType?: string;
          status?: string;
          startTime?: string | null;
        };
      };
    }>(`/capacity/sections/${sectionId}/reserve`, {
      method: 'POST',
      body: JSON.stringify({
        reservationId: params?.reservationId,
        vehicleId: params?.vehicleId,
        spotNumber: params?.spotNumber,
        areaId: params?.areaId,
      }),
    });
  }

  static async endCapacityReservation(sectionId: number) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/capacity/sections/${sectionId}/end-reservation`, {
      method: 'POST',
    });
  }

  static async getUserCapacityReservations() {
    return this.request<{
      success: boolean;
      data: Array<{
        capacity_reservation_id: number;
        parking_section_id: number;
        status: string;
        created_at: string;
        ended_at: string | null;
        section_name: string;
        vehicle_type: string;
        area_name: string;
        area_location: string;
      }>;
    }>('/capacity/user/capacity-reservations');
  }

  static async getSectionParkedUsers(sectionId: number) {
    return this.request<{
      success: boolean;
      data: {
        sectionId: number;
        parkedUsers: Array<{
          reservationId: number;
          userId: number;
          name: string;
          plateNumber: string;
          vehicleType: string;
          brand: string;
          color: string;
          startTime: string;
          endTime: string;
          sectionName: string;
        }>;
        totalParked: number;
      };
    }>(`/capacity/sections/${sectionId}/parked-users`);
  }

  static async getSectionMotorcycleSpots(sectionId: number) {
    return this.request<{
      success: boolean;
      data: {
        sectionId: number;
        spots: Array<{
          spotId: number;
          spotNumber: string;
          spotType: string;
          status: 'available' | 'reserved' | 'active';
          sectionName: string;
          isUserBooked: boolean;
          reservation: {
            reservationId: number;
            userId: number;
            userName: string;
            plateNumber: string;
            brand: string;
            color: string;
            startTime: string;
            endTime: string;
          } | null;
        }>;
        totalSpots: number;
        availableSpots: number;
        occupiedSpots: number;
        reservedSpots: number;
      };
    }>(`/capacity/sections/${sectionId}/spots`);
  }

  static async assignMotorcycleSpot(sectionId: number, spotNumber: string, vehicleId: number) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        sectionId: number;
        spotNumber: string;
        reservationId: number;
        sectionName: string;
      };
    }>(`/capacity/sections/${sectionId}/spots/${spotNumber}/assign`, {
      method: 'POST',
      body: JSON.stringify({ vehicleId })
    });
  }

  static async assignMotorcycleSpotGuest(
    sectionId: number, 
    spotNumber: string, 
    firstName: string,
    lastName: string,
    plateNumber: string,
    brand?: string,
    model?: string,
    color?: string
  ) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        sectionId: number;
        spotNumber: string;
        reservationId: number;
        sectionName: string;
      };
    }>(`/capacity/sections/${sectionId}/spots/${spotNumber}/guest-assign`, {
      method: 'POST',
      body: JSON.stringify({
        firstName,
        lastName,
        plateNumber,
        brand,
        model,
        color
      })
    });
  }

  static async releaseMotorcycleSpot(sectionId: number, spotNumber: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/capacity/sections/${sectionId}/spots/${spotNumber}/release`, {
      method: 'POST'
    });
  }

  static async updateSpotStatus(sectionId: number, spotNumber: string, status: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/capacity/sections/${sectionId}/spots/${spotNumber}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  static async updateRegularSpotStatus(spotId: string, status: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/parking/spots/${spotId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  static async updateSectionStatus(sectionId: string, status: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/capacity/sections/${sectionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Feedback endpoints
  static async submitFeedback(feedbackData: {
    rating: number;
    content?: string;
  }) {
    console.log('🚀 Submitting feedback to API:', feedbackData);
    
    try {
      const result = await this.request<{
        success: boolean;
        message: string;
        data: {
          feedback_id: number;
        };
      }>('/feedback', {
        method: 'POST',
        body: JSON.stringify(feedbackData)
      });
      
      console.log('✅ Feedback API response:', result);
      return result;
    } catch (error) {
      console.error('❌ Feedback API error:', error);
      throw error;
    }
  }

  // Test endpoint for debugging
  static async testFeedbackEndpoint() {
    console.log('🔍 Testing feedback endpoint...');
    
    try {
      const result = await this.request<{
        success: boolean;
        message: string;
        data: any;
      }>('/feedback/test', {
        method: 'GET'
      });
      
      console.log('✅ Feedback test response:', result);
      return result;
    } catch (error) {
      console.error('❌ Feedback test error:', error);
      throw error;
    }
  }

  // Get feedback details with comments
  static async getFeedbackDetails(feedbackId: number) {
    console.log('🔍 Getting feedback details:', feedbackId);
    
    try {
      const result = await this.request<{
        success: boolean;
        message: string;
        data: {
          feedback: {
            feedback_id: number;
            user_id: number;
            content: string;
            rating: number;
            status: string;
            created_at: string;
            subscription_id?: number;
          };
          comments: Array<{
            feedback_comment_id: number;
            feedback_id: number;
            user_id: number;
            role: string;
            comment: string;
            created_at: string;
          }>;
        };
      }>(`/feedback/${feedbackId}/details`, {
        method: 'GET'
      });
      
      console.log('✅ Feedback details response:', result);
      return result;
    } catch (error) {
      console.error('❌ Feedback details error:', error);
      throw error;
    }
  }

  // Get all feedback for the current user
  static async getUserFeedback() {
    console.log('🔍 Getting user feedback list');
    
    try {
      const result = await this.request<{
        success: boolean;
        message: string;
        data: {
          feedback: Array<{
            feedback_id: number;
            user_id: number;
            content: string;
            rating: number;
            status: string;
            created_at: string;
            subscription_id?: number;
          }>;
        };
      }>('/feedback/user', {
        method: 'GET'
      });
      
      console.log('✅ User feedback list response:', result);
      return result;
    } catch (error) {
      console.error('❌ User feedback list error:', error);
      throw error;
    }
  }

  static async getFeedbackComments(feedbackId: number) {
    return this.request<{
      success: boolean;
      data: {
        comments: Array<{
          feedback_comment_id: number;
          feedback_id: number;
          user_id: number;
          role: 'user' | 'admin';
          comment: string;
          created_at: string;
        }>;
      };
    }>(`/feedback/${feedbackId}/comments`);
  }

  static async addFeedbackComment(feedbackId: number, comment: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: {
        comment_id: number;
      };
    }>(`/feedback/${feedbackId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }

  // Get user's subscription balance (hours remaining)
  static async getUserHourBalance() {
    return this.request<{
      success: boolean;
      data: {
        total_hours_remaining: number;
        total_hours_used: number;
        active_subscriptions: number;
        subscriptions: Array<{
          id: number;
          plan_name: string;
          hours_remaining: number;
          hours_used: number;
          status: string;
          created_at: string;
        }>;
      };
    }>('/subscriptions/balance');
  }

}

export default ApiService;

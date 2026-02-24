import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';

// API Configuration for Tapparkuser
export const API_CONFIG = {
  // Your computer's IP address (from ipconfig)
  // Update this if your IP changes
  COMPUTER_IP: '192.168.1.200', // Updated to match ipconfig Wi-Fi IPv4
  
  // API Base URLs
  LOCALHOST: 'http://localhost:3000/api',
  NETWORK: 'http://192.168.1.200:3000/api', // Updated to match ipconfig Wi-Fi IPv4
  
  // Current environment
  // Change this to 'network' when testing on physical device
  ENVIRONMENT: 'network' as 'localhost' | 'network',

  // Set to true to auto-detect IP from Expo, false to use COMPUTER_IP above
  AUTO_DETECT: false, // Force configured NETWORK IP for same Wi-Fi/LAN devices
};

const API_PORT = 3000;
const API_PATH = '/api';

const stripProtocol = (value: string) => value.replace(/^[a-zA-Z]+:\/\//, '');

const normalizeLocalhostForPlatform = (host: string) => {
  if (Platform.OS === 'android' && (host === 'localhost' || host === '127.0.0.1')) {
    return '10.0.2.2';
  }
  return host;
};

const getExpoDetectedHost = (): string | null => {
  const expoConfigCandidates: Array<string | undefined | null> = [
    Constants?.expoGoConfig?.debuggerHost,
    Constants?.expoGoConfig?.hostUri,
    (Constants as any)?.expoConfig?.hostUri || null
  ];

  for (const candidate of expoConfigCandidates) {
    if (!candidate) continue;

    const cleanedCandidate = stripProtocol(candidate);
    const hostPart = cleanedCandidate.split(':')[0];

    if (!hostPart) continue;

    // Use Android emulator loopback when necessary
    const normalizedHost = normalizeLocalhostForPlatform(hostPart);
    return `${normalizedHost}:${API_PORT}`;
  }

  return null;
};

const getSourceModuleHost = (): string | null => {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const match = scriptURL.match(/^https?:\/\/([^/:]+)(?::(\d+))?/);
  if (!match) return null;

  const host = normalizeLocalhostForPlatform(match[1]);
  return `${host}:${API_PORT}`;
};

const buildUrlFromHost = (hostWithPort: string) => `http://${hostWithPort}${API_PATH}`;
const isLoopbackHost = (hostWithPort: string) => {
  const host = hostWithPort.split(':')[0];
  return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
};

// Get the appropriate API URL based on environment
export const getApiUrl = () => {
  const detectedHost = getExpoDetectedHost() || getSourceModuleHost();
  if (__DEV__) {
    console.log('[API CONFIG] AUTO_DETECT:', API_CONFIG.AUTO_DETECT);
    console.log('[API CONFIG] detectedHost via Expo:', getExpoDetectedHost());
    console.log('[API CONFIG] detectedHost via SourceModule:', getSourceModuleHost());
    console.log('[API CONFIG] configured NETWORK host:', API_CONFIG.NETWORK);
    console.log('[API CONFIG] Final detectedHost:', detectedHost);
  }

  if (API_CONFIG.AUTO_DETECT && detectedHost && !isLoopbackHost(detectedHost)) {
    const finalUrl = buildUrlFromHost(detectedHost);
    if (__DEV__) {
      console.log('[API CONFIG] ✅ Using AUTO_DETECT URL:', finalUrl);
    }
    return finalUrl;
  }

  const fallbackUrl = API_CONFIG.ENVIRONMENT === 'network' 
    ? API_CONFIG.NETWORK 
    : API_CONFIG.LOCALHOST;
  
  if (__DEV__) {
    console.log('[API CONFIG] ⚠️ Using fallback URL:', fallbackUrl);
    if (API_CONFIG.AUTO_DETECT && !detectedHost) {
      console.warn('[API CONFIG] ⚠️ AUTO_DETECT is enabled but no host detected. Using configured IP.');
    }
  }

  return fallbackUrl;
};

export default API_CONFIG;




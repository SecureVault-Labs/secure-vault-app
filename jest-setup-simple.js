// Simple Jest setup for utility testing

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  addScreenshotListener: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  getRandomBytesAsync: jest.fn(),
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

// Mock basic React Native modules for utility testing
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

// Global test setup
global.__DEV__ = false;

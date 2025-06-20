// Note: @testing-library/jest-native is deprecated, using built-in matchers instead

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

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  addScreenshotListener: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  return {
    ...RN,
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
    BackHandler: {
      exitApp: jest.fn(),
    },
  };
});

// Global test setup
global.__DEV__ = false;

// Mock React Native animated helper
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => {});

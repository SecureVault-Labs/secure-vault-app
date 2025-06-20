import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
import { SecurityManager } from '../../utils/SecurityManager';
import { router } from 'expo-router';

// Type declaration for global __DEV__
declare global {
  var __DEV__: boolean;
}

// Mock dependencies
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

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe('SecurityManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset SecurityManager state
    SecurityManager.isInProtectedFlow = false;
    SecurityManager.isAuthenticated = false;
    SecurityManager.sessionTimer = null;
    SecurityManager.lastActivity = Date.now();

    // Mock global __DEV__
    global.__DEV__ = false;
  });

  describe('Session Management', () => {
    it('should not start session timer when not in protected flow', () => {
      SecurityManager.isInProtectedFlow = false;
      SecurityManager.resetSessionTimer();

      expect(SecurityManager.sessionTimer).toBeNull();
    });

    it('should start session timer when in protected flow', () => {
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.resetSessionTimer();

      expect(SecurityManager.sessionTimer).not.toBeNull();
    });

    it('should enter protected flow correctly', () => {
      SecurityManager.enterProtectedFlow();

      expect(SecurityManager.isInProtectedFlow).toBe(true);
      expect(SecurityManager.sessionTimer).not.toBeNull();
    });

    it('should exit protected flow correctly', () => {
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.isAuthenticated = true;
      SecurityManager.sessionTimer = setTimeout(() => {}, 1000);

      SecurityManager.exitProtectedFlow();

      expect(SecurityManager.isInProtectedFlow).toBe(false);
      expect(SecurityManager.isAuthenticated).toBe(false);
      expect(SecurityManager.sessionTimer).toBeNull();
    });

    it('should track user activity only in protected flow', async () => {
      const initialActivity = SecurityManager.lastActivity;

      // Not in protected flow
      SecurityManager.isInProtectedFlow = false;
      SecurityManager.trackUserActivity();
      expect(SecurityManager.lastActivity).toBe(initialActivity);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      // In protected flow
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.trackUserActivity();
      expect(SecurityManager.lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('App Foreground Handling', () => {
    it('should skip session checks when not in protected flow', async () => {
      SecurityManager.isInProtectedFlow = false;
      const requireAuthSpy = jest.spyOn(
        SecurityManager,
        'requireAuthentication'
      );

      await SecurityManager.handleAppForeground();

      expect(requireAuthSpy).not.toHaveBeenCalled();
    });

    it('should skip re-authentication when recently authenticated', async () => {
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.isAuthenticated = true;
      const requireAuthSpy = jest.spyOn(
        SecurityManager,
        'requireAuthentication'
      );

      await SecurityManager.handleAppForeground();

      expect(requireAuthSpy).not.toHaveBeenCalled();
    });

    it('should perform logout when session expired', async () => {
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.isAuthenticated = false;
      SecurityManager.lastActivity = Date.now() - 400000; // 6+ minutes ago
      SecurityManager.sessionTimeout = 300000; // 5 minutes

      const logoutSpy = jest.spyOn(SecurityManager, 'performSecureLogout');

      await SecurityManager.handleAppForeground();

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('should require authentication when session valid but not authenticated', async () => {
      SecurityManager.isInProtectedFlow = true;
      SecurityManager.isAuthenticated = false;
      SecurityManager.lastActivity = Date.now() - 60000; // 1 minute ago
      SecurityManager.sessionTimeout = 300000; // 5 minutes

      const requireAuthSpy = jest.spyOn(
        SecurityManager,
        'requireAuthentication'
      );

      await SecurityManager.handleAppForeground();

      expect(requireAuthSpy).toHaveBeenCalled();
    });
  });

  describe('Authentication Grace Period', () => {
    it('should mark authentication completed and set grace period', () => {
      jest.useFakeTimers();

      SecurityManager.markAuthenticationCompleted();

      expect(SecurityManager.isAuthenticated).toBe(true);
      expect(SecurityManager.isInProtectedFlow).toBe(true);

      // Fast forward past grace period
      jest.advanceTimersByTime(6000);

      expect(SecurityManager.isAuthenticated).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('Network Monitoring', () => {
    it('should not trigger network detection in development mode', () => {
      global.__DEV__ = true;
      const alertSpy = jest.spyOn(Alert, 'alert');

      SecurityManager.handleNetworkDetected();

      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should trigger security alert when network detected in production', () => {
      global.__DEV__ = false;
      const alertSpy = jest.spyOn(Alert, 'alert');

      SecurityManager.handleNetworkDetected();

      expect(alertSpy).toHaveBeenCalledWith(
        'Security Alert',
        'Internet connection detected. SecureVault must close for security.',
        expect.any(Array),
        { cancelable: false }
      );
    });
  });

  describe('Session Timeout Handling', () => {
    it('should clear data when app is in background', () => {
      SecurityManager.isAppInBackground = true;
      const clearDataSpy = jest.spyOn(SecurityManager, 'clearSensitiveData');

      SecurityManager.handleSessionTimeout();

      expect(clearDataSpy).toHaveBeenCalled();
    });

    it('should show alert when app is in foreground', () => {
      SecurityManager.isAppInBackground = false;
      const alertSpy = jest.spyOn(Alert, 'alert');

      SecurityManager.handleSessionTimeout();

      expect(alertSpy).toHaveBeenCalledWith(
        'Session Expired',
        'Your session has expired for security. Please authenticate again.',
        expect.any(Array),
        { cancelable: false }
      );
    });
  });

  describe('Secure Logout', () => {
    it('should clear data and exit protected flow', async () => {
      const clearDataSpy = jest.spyOn(SecurityManager, 'clearSensitiveData');
      const exitProtectedFlowSpy = jest.spyOn(
        SecurityManager,
        'exitProtectedFlow'
      );

      await SecurityManager.performSecureLogout();

      expect(clearDataSpy).toHaveBeenCalled();
      expect(exitProtectedFlowSpy).toHaveBeenCalled();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'currentSession'
      );
    });
  });

  describe('Authentication Settings', () => {
    it('should return correct auth settings when data exists', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('true') // biometricEnabled
        .mockResolvedValueOnce('true') // twoFactorEnabled
        .mockResolvedValueOnce('true'); // hasSetupPassword

      const settings = await SecurityManager.getAuthenticationSettings();

      expect(settings).toEqual({
        requiresAuth: true,
        biometricEnabled: true,
        twoFactorEnabled: true,
      });
    });

    it('should return default settings when no data exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const settings = await SecurityManager.getAuthenticationSettings();

      expect(settings).toEqual({
        requiresAuth: false, // Should be false when no password is set
        biometricEnabled: false,
        twoFactorEnabled: false,
      });
    });
  });

  describe('Emergency Wipe', () => {
    it('should clear all data and navigate to root', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const clearDataSpy = jest.spyOn(SecurityManager, 'clearSensitiveData');

      await SecurityManager.emergencyWipe();

      expect(clearDataSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        'Emergency Wipe Complete',
        'All data has been securely deleted.',
        expect.any(Array)
      );
    });
  });
});

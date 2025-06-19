import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Type definitions
interface AuthenticationSettings {
  requiresAuth: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
}

interface AppIntegrityResult {
  isValid: boolean;
  checks?: {
    isJailbroken: boolean;
    isRooted: boolean;
    isDebugging: boolean;
    isEmulator: boolean;
  };
  error?: string;
}

type SessionTimer = ReturnType<typeof setTimeout> | null;
type NetworkUnsubscribe = (() => void) | undefined;

export class SecurityManager {
  static isNetworkMonitoringActive: boolean = false;
  static sessionTimer: SessionTimer = null;
  static sessionTimeout: number = 300000; // 5 minutes default
  static lastActivity: number = Date.now();
  static isAppInBackground: boolean = false;
  static isAuthenticated: boolean = false;
  static authenticationGracePeriod: number = 5000; // 5 seconds grace period after authentication

  // 1. Initialize security on app start
  static async initializeSecurity(): Promise<boolean> {
    try {
      // Check if app should run (no internet in production)
      if (!__DEV__) {
        const hasNetwork: boolean = await this.checkNetworkConnection();
        if (hasNetwork) {
          this.forceCloseApp(
            'Internet connection detected. SecureVault only works offline.'
          );
          return false;
        }
      }

      // Enable screen protection
      await this.enableScreenProtection();

      // Start network monitoring
      this.startNetworkMonitoring();

      // Setup session management
      this.setupSessionManagement();

      // Setup app state monitoring
      this.setupAppStateMonitoring();

      return true;
    } catch (error) {
      console.error('Security initialization failed:', error);
      return false;
    }
  }

  // 2. Network connection detection
  static async checkNetworkConnection(): Promise<boolean> {
    try {
      const netInfo: NetInfoState = await NetInfo.fetch();
      return (
        netInfo.isConnected === true && netInfo.isInternetReachable === true
      );
    } catch (error) {
      // If we can't check, assume there's internet for safety
      return true;
    }
  }

  // 3. Start continuous network monitoring
  static startNetworkMonitoring(): NetworkUnsubscribe {
    if (this.isNetworkMonitoringActive || __DEV__) return;

    this.isNetworkMonitoringActive = true;

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && state.isInternetReachable) {
        this.handleNetworkDetected();
      }
    });

    return unsubscribe;
  }

  // 4. Handle network detection
  static handleNetworkDetected(): void {
    if (__DEV__) {
      console.warn('Network detected - but allowing in development mode');
      return;
    }

    Alert.alert(
      'Security Alert',
      'Internet connection detected. SecureVault must close for security.',
      [
        {
          text: 'Close App',
          onPress: () => this.forceCloseApp(),
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  }

  // 5. Force close application
  static forceCloseApp(
    message: string = 'App closed for security reasons'
  ): void {
    try {
      // Clear sensitive data
      this.clearSensitiveData();

      // Show final message
      Alert.alert('Security', message, [
        {
          text: 'OK',
          onPress: () => {
            if (Platform.OS === 'android') {
              // On Android, we can exit the app
              require('react-native').BackHandler.exitApp();
            } else {
              // On iOS, move to background (Apple doesn't allow force exit)
              // The app will be suspended by the system
              console.log('App should be moved to background');
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error during force close:', error);
    }
  }

  // 6. Enable screen protection
  static async enableScreenProtection(): Promise<
    ScreenCapture.Subscription | undefined
  > {
    try {
      if (Platform.OS !== 'web') {
        // Prevent screen capture
        await ScreenCapture.preventScreenCaptureAsync();

        // Add listener for screen capture attempts
        const subscription = ScreenCapture.addScreenshotListener(() => {
          this.handleScreenCaptureAttempt();
        });

        return subscription;
      }
    } catch (error) {
      console.warn('Screen protection setup failed:', error);
    }
  }

  // 7. Handle screen capture attempts
  static handleScreenCaptureAttempt(): void {
    Alert.alert(
      'Security Violation',
      'Screen capture detected. For security, you will be logged out.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Delay logout to avoid setState during render
            setTimeout(() => {
              this.performSecureLogout();
            }, 0);
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  }

  // 8. Session management setup
  static setupSessionManagement(): void {
    // Load session timeout preference
    this.loadSessionTimeout();

    // Start session timer
    this.resetSessionTimer();

    // Track user activity
    this.trackUserActivity();
  }

  // 9. Load session timeout from settings
  static async loadSessionTimeout(): Promise<void> {
    try {
      const timeout: string | null = await SecureStore.getItemAsync(
        'sessionTimeout'
      );
      if (timeout) {
        this.sessionTimeout = parseInt(timeout);
      }
    } catch (error) {
      console.error('Failed to load session timeout:', error);
    }
  }

  // 10. Reset session timer
  static resetSessionTimer(): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.lastActivity = Date.now();

    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeout);
  }

  // 11. Handle session timeout
  static handleSessionTimeout(): void {
    if (this.isAppInBackground) {
      // If app is in background, just clear data
      this.clearSensitiveData();
    } else {
      Alert.alert(
        'Session Expired',
        'Your session has expired for security. Please authenticate again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Delay logout to avoid setState during render
              setTimeout(() => {
                this.performSecureLogout();
              }, 0);
            },
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    }
  }

  // 12. Track user activity
  static trackUserActivity(): void {
    // This would be called on user interactions
    this.resetSessionTimer();
  }

  // 12a. Mark authentication as completed
  static markAuthenticationCompleted(): void {
    console.log('🔐 Authentication completed, setting grace period');
    this.isAuthenticated = true;
    this.lastActivity = Date.now();
    this.resetSessionTimer();

    // Clear authentication flag after grace period
    setTimeout(() => {
      console.log('⏰ Authentication grace period ended');
      this.isAuthenticated = false;
    }, this.authenticationGracePeriod);
  }

  // 13. Setup app state monitoring
  static setupAppStateMonitoring(): void {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        this.isAppInBackground = true;
        this.handleAppBackground();
      } else if (nextAppState === 'active') {
        this.isAppInBackground = false;
        this.handleAppForeground();
      }
    });
  }

  // 14. Handle app going to background
  static handleAppBackground(): void {
    // Clear sensitive data from memory
    this.clearSensitiveData();

    // Show privacy screen
    this.showPrivacyScreen();
  }

  // 15. Handle app coming to foreground
  static async handleAppForeground(): Promise<void> {
    console.log('📱 App coming to foreground');

    // If we just completed authentication, don't require it again
    if (this.isAuthenticated) {
      console.log('✅ Recently authenticated, skipping re-authentication');
      return;
    }

    // Check if session is still valid
    const timeSinceLastActivity: number = Date.now() - this.lastActivity;
    console.log('⏰ Time since last activity:', timeSinceLastActivity, 'ms');
    console.log('⏰ Session timeout:', this.sessionTimeout, 'ms');

    if (timeSinceLastActivity > this.sessionTimeout) {
      console.log('⏰ Session expired, performing logout');
      this.performSecureLogout();
    } else {
      console.log('🔐 Session valid, requiring authentication');
      // Re-authenticate user
      await this.requireAuthentication();
    }
  }

  // 16. Show privacy screen
  static showPrivacyScreen(): void {
    // This would show a privacy overlay
    // Implementation depends on your UI framework
    console.log('Privacy screen should be shown');
  }

  // 17. Require authentication
  static async requireAuthentication(): Promise<void> {
    try {
      console.log('🔐 requireAuthentication called');
      const authSettings: AuthenticationSettings =
        await this.getAuthenticationSettings();
      console.log('📋 Auth settings:', authSettings);

      if (authSettings.requiresAuth) {
        console.log(
          '🔄 Authentication required, navigating to authenticate screen'
        );
        // Navigate to authentication screen after render phase
        setTimeout(() => {
          router.replace('/authenticate');
        }, 0);
      } else {
        console.log('✅ No authentication required');
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Delay logout to avoid setState during render
      setTimeout(() => {
        this.performSecureLogout();
      }, 0);
    }
  }

  // 18. Get authentication settings
  static async getAuthenticationSettings(): Promise<AuthenticationSettings> {
    try {
      const biometricEnabled: string | null = await SecureStore.getItemAsync(
        'biometricEnabled'
      );
      const twoFactorEnabled: string | null = await SecureStore.getItemAsync(
        'twoFactorEnabled'
      );
      const hasPassword: string | null = await SecureStore.getItemAsync(
        'hasSetupPassword'
      );

      return {
        requiresAuth: hasPassword === 'true',
        biometricEnabled: biometricEnabled === 'true',
        twoFactorEnabled: twoFactorEnabled === 'true',
      };
    } catch (error) {
      return {
        requiresAuth: true,
        biometricEnabled: false,
        twoFactorEnabled: false,
      };
    }
  }

  // 19. Perform secure logout
  static async performSecureLogout(): Promise<void> {
    try {
      // Clear all sensitive data
      await this.clearSensitiveData();

      // Clear session state
      await SecureStore.deleteItemAsync('currentSession');

      // Navigate to initial screen after render phase
      setTimeout(() => {
        router.replace('/');
      }, 0);
    } catch (error) {
      console.error('Secure logout failed:', error);
    }
  }

  // 20. Clear sensitive data
  static async clearSensitiveData(): Promise<void> {
    try {
      // Clear any cached sensitive data
      // This would clear variables, caches, etc.

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }

  // 21. Set session timeout
  static async setSessionTimeout(timeoutMs: number): Promise<void> {
    try {
      this.sessionTimeout = timeoutMs;
      await SecureStore.setItemAsync('sessionTimeout', timeoutMs.toString());
      this.resetSessionTimer();
    } catch (error) {
      console.error('Failed to set session timeout:', error);
    }
  }

  // 22. Validate app integrity
  static async validateAppIntegrity(): Promise<AppIntegrityResult> {
    try {
      // Check if app is running in a secure environment
      // This would include checks for:
      // - Jailbreak/Root detection
      // - Debugger detection
      // - Emulator detection

      return {
        isValid: true, // Placeholder
        checks: {
          isJailbroken: false,
          isRooted: false,
          isDebugging: __DEV__,
          isEmulator: false,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 23. Emergency wipe
  static async emergencyWipe(): Promise<void> {
    try {
      // Clear all stored data
      const keys: string[] = [
        'masterPassword',
        'vaultItems',
        'biometricEnabled',
        'twoFactorEnabled',
        'hasSetupPassword',
        'hasCompletedOnboarding',
        'sessionTimeout',
        'authSettings',
      ];

      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Continue even if individual deletions fail
        }
      }

      // Clear sensitive data from memory
      await this.clearSensitiveData();

      Alert.alert(
        'Emergency Wipe Complete',
        'All data has been securely deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Delay navigation to avoid setState during render
              setTimeout(() => {
                router.replace('/');
              }, 0);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Emergency wipe failed:', error);
    }
  }
}

export default SecurityManager;

import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import SplashScreen from './splash';
import SecurityManager from '../utils/SecurityManager';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasInternetConnection, setHasInternetConnection] = useState<
    boolean | null
  >(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fallbackNavigation = async () => {
    try {
      const hasCompletedOnboarding = await SecureStore.getItemAsync(
        'hasCompletedOnboarding'
      );
      const hasSetupPassword = await SecureStore.getItemAsync(
        'hasSetupPassword'
      );

      if (!hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else if (!hasSetupPassword) {
        router.replace('/setup');
      } else {
        router.replace('/authenticate');
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Fallback navigation error:', error);
      router.replace('/onboarding');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only initialize once per app session
    if (!hasInitialized) {
      setHasInitialized(true);
      // Add timeout fallback for iPad/device-specific issues
      const initTimeout = setTimeout(() => {
        console.warn('Initialization timeout, forcing navigation');
        fallbackNavigation();
      }, 10000); // 10 second fallback

      checkInternetFirst().finally(() => {
        clearTimeout(initTimeout);
      });
    }
  }, [hasInitialized]);

  const checkInternetFirst = async () => {
    try {
      // FIRST: Check for internet connection immediately
      console.log('🔍 Checking internet connection on app startup...');

      // Add platform-specific handling
      if (Platform.OS === 'ios' && Platform.isPad) {
        console.log('📱 Detected iPad, using simplified initialization');
      } else if (Platform.OS === 'android') {
        console.log(
          '🤖 Detected Android device, using standard initialization'
        );
      }

      const hasInternet = await SecurityManager.checkNetworkConnection();

      if (hasInternet && !__DEV__) {
        // Internet detected - navigate immediately to no-internet screen
        console.log('🌐 Internet detected on startup, showing blocker screen');
        setHasInternetConnection(true);
        SecurityManager.setInNoInternetMode(true);

        // Navigate to no-internet screen immediately without any delay
        router.replace('/no-internet-required');
        setIsLoading(false);
        return;
      }

      // No internet detected or in dev mode - proceed with normal app initialization
      console.log(
        '✅ No internet detected on startup, proceeding with app initialization'
      );
      setHasInternetConnection(false);
      await initializeApp();
    } catch (error) {
      console.error('Error during initial internet check:', error);
      // Platform-specific error handling
      if (Platform.OS === 'ios' && Platform.isPad) {
        console.log(
          '📱 iPad error fallback, proceeding with offline initialization'
        );
        setHasInternetConnection(false);
        await initializeApp();
      } else if (Platform.OS === 'android') {
        console.log(
          '🤖 Android error fallback, proceeding with offline initialization'
        );
        setHasInternetConnection(false);
        await initializeApp();
      } else {
        // If we can't check internet, assume it's present for security
        setHasInternetConnection(true);
        router.replace('/no-internet-required');
        setIsLoading(false);
      }
    }
  };

  const initializeApp = async () => {
    try {
      // Initialize security (but skip internet check since we already did it)
      const securityInitialized =
        await SecurityManager.initializeSecurityWithoutInternetCheck();
      if (!securityInitialized) {
        console.error('Security initialization failed');
        return;
      }

      // Check if user has completed onboarding
      const hasCompletedOnboarding = await SecureStore.getItemAsync(
        'hasCompletedOnboarding'
      );

      // Check if user has set up master password
      const hasSetupPassword = await SecureStore.getItemAsync(
        'hasSetupPassword'
      );

      // Show splash for 3 seconds, then navigate based on app state
      setTimeout(() => {
        // Double-check we're still in offline mode before navigating
        // This prevents navigation if user is on no-internet screen
        if (!SecurityManager.isOnNoInternetScreen()) {
          if (!hasCompletedOnboarding) {
            router.replace('/onboarding');
          } else if (!hasSetupPassword) {
            router.replace('/setup');
          } else {
            // User is set up, ALWAYS require authentication on app launch
            router.replace('/authenticate');
          }
        }
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error during app initialization:', error);
      // Default to onboarding if there's an error
      setTimeout(() => {
        // Only navigate if not on no-internet screen
        if (!SecurityManager.isOnNoInternetScreen()) {
          router.replace('/onboarding');
        }
        setIsLoading(false);
      }, 3000);
    }
  };

  // Only show splash screen if we're still loading and no internet was detected
  if (isLoading && hasInternetConnection !== true) {
    return <SplashScreen />;
  }

  // If internet was detected, the navigation to no-internet screen has already happened
  // If loading is complete, return null (router will handle navigation)
  // This prevents the main index from interfering with navigation from other screens
  return null;
}

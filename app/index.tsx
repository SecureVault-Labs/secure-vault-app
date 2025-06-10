import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import SplashScreen from './splash';
import SecurityManager from '../utils/SecurityManager';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      // Initialize security first
      const securityInitialized = await SecurityManager.initializeSecurity();
      if (!securityInitialized) {
        // Security initialization failed, app should close
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
        if (!hasCompletedOnboarding) {
          router.replace('/onboarding');
        } else if (!hasSetupPassword) {
          router.replace('/setup');
        } else {
          // User is set up, ALWAYS require authentication on app launch
          router.replace('/authenticate');
        }
        setIsLoading(false);
      }, 3000);
    } catch (error) {
      console.error('Error checking app state:', error);
      // Default to onboarding if there's an error
      setTimeout(() => {
        router.replace('/onboarding');
        setIsLoading(false);
      }, 3000);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return null;
}

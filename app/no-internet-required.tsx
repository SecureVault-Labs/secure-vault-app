import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WifiOff, Shield, AlertTriangle, RefreshCw } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import SecurityManager from '../utils/SecurityManager';

export default function NoInternetRequiredScreen() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [autoCheckResult, setAutoCheckResult] = useState<boolean | null>(null);
  const [userTriggeredCheck, setUserTriggeredCheck] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Visual debugging for release builds
    const checkForAutoNavigation = async () => {
      try {
        setDebugInfo('Checking network status...');
        const safeToProceed = await SecurityManager.isSafeToProceed();
        setAutoCheckResult(safeToProceed);

        if (safeToProceed) {
          setDebugInfo(
            '⚠️ WARNING: Network check says safe to proceed but will NOT auto-navigate!'
          );
          // CRITICAL: Never auto-navigate, only allow manual user action
        } else {
          setDebugInfo('✅ Correctly blocking - internet detected');
        }
      } catch (error) {
        setDebugInfo('❌ Error checking network: ' + error);
      }
    };

    // Only check, don't auto-navigate
    checkForAutoNavigation();
  }, []);

  const checkInternetStatus = async () => {
    setUserTriggeredCheck(true);
    setIsChecking(true);
    setDebugInfo('User manually triggered internet check...');

    try {
      const safeToProceed = await SecurityManager.isSafeToProceed();
      setLastCheckTime(new Date());

      setDebugInfo(`Manual check result - safeToProceed: ${safeToProceed}`);

      if (safeToProceed) {
        // No internet detected, proceed to the app
        setDebugInfo('✅ No internet detected, proceeding to app');
        SecurityManager.exitNoInternetMode();

        // Check app state to navigate to the correct screen
        const hasCompletedOnboarding = await SecureStore.getItemAsync(
          'hasCompletedOnboarding'
        );
        const hasSetupPassword = await SecureStore.getItemAsync(
          'hasSetupPassword'
        );

        // Navigate to the appropriate screen based on app state
        if (!hasCompletedOnboarding) {
          router.replace('/onboarding');
        } else if (!hasSetupPassword) {
          router.replace('/setup');
        } else {
          router.replace('/authenticate');
        }
      } else {
        // Still has internet
        setDebugInfo('⚠️ Internet still detected - staying on blocker screen');
        Alert.alert(
          'Internet Still Active',
          'Please disable your internet connection (WiFi and cellular data) to continue using GetSecureVault.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setDebugInfo('❌ Error checking internet status: ' + error);
      Alert.alert(
        'Check Failed',
        'Unable to verify internet status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsChecking(false);
    }
  };

  const showWhyOffline = () => {
    Alert.alert(
      'Why Offline Mode?',
      'SecureVault operates in offline mode to ensure maximum security:\n\n• Prevents data leaks to external servers\n• Eliminates remote attack vectors\n• Ensures your crypto assets stay private\n• No tracking or analytics\n• Complete air-gapped security',
      [{ text: 'Understood' }]
    );
  };

  const showHowToDisable = () => {
    Alert.alert(
      'How to Disable Internet',
      'To disable internet connection:\n\n📱 iOS:\n• Settings → WiFi → Turn OFF\n• Settings → Cellular → Turn OFF\n\n🤖 Android:\n• Settings → WiFi → Turn OFF\n• Settings → Mobile Data → Turn OFF\n\nAlternatively:\n• Enable Airplane Mode\n• Then disable WiFi if it auto-enables\n\nOnce disabled, return here and tap "Check Connection".',
      [{ text: 'Got it' }]
    );
  };

  const showDebugInfo = async () => {
    try {
      const hasCompletedOnboarding = await SecureStore.getItemAsync(
        'hasCompletedOnboarding'
      );
      const hasSetupPassword = await SecureStore.getItemAsync(
        'hasSetupPassword'
      );

      Alert.alert(
        'Debug: App State',
        `Current app state:\n\n• Onboarding completed: ${
          hasCompletedOnboarding || 'false'
        }\n• Password setup: ${
          hasSetupPassword || 'false'
        }\n\nExpected navigation:\n${
          !hasCompletedOnboarding
            ? '→ Onboarding'
            : !hasSetupPassword
            ? '→ Setup Password'
            : '→ Authentication'
        }`,
        [
          { text: 'OK' },
          {
            text: 'Reset App State',
            style: 'destructive',
            onPress: async () => {
              await SecureStore.deleteItemAsync('hasCompletedOnboarding');
              await SecureStore.deleteItemAsync('hasSetupPassword');
              Alert.alert(
                'Reset Complete',
                'App state has been reset. The app will restart from onboarding.'
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Debug Error', 'Failed to read app state: ' + error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <WifiOff size={64} color="#E74C3C" />
            <Shield size={32} color="#2ECC71" style={styles.shieldIcon} />
          </View>
          <Text style={styles.title}>Internet Connection Detected</Text>
          <Text style={styles.subtitle}>
            SecureVault requires offline mode for maximum security
          </Text>
        </View>

        {/* Warning Section */}
        <View style={styles.warningSection}>
          <View style={styles.warningHeader}>
            <AlertTriangle size={24} color="#F39C12" />
            <Text style={styles.warningTitle}>Security Notice</Text>
          </View>
          <Text style={styles.warningText}>
            For maximum security, SecureVault operates completely offline. This
            prevents any data from being transmitted to external servers and
            ensures your crypto assets remain private and secure.
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>To Continue:</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>Turn off WiFi</Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Turn off cellular/mobile data
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Tap "Check Connection" below
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.primaryButton, isChecking && styles.disabledButton]}
            onPress={checkInternetStatus}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <RefreshCw size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isChecking ? 'Checking...' : 'Check Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={showHowToDisable}
          >
            <Text style={styles.secondaryButtonText}>
              How to Disable Internet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={showWhyOffline}
          >
            <Text style={styles.secondaryButtonText}>Why Offline Mode?</Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: '#E67E22' }]}
              onPress={showDebugInfo}
            >
              <Text style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>
                Debug App State
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Debug Info */}
        {debugInfo && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>{debugInfo}</Text>
            {autoCheckResult !== null && (
              <Text style={styles.debugText}>
                Network check result:{' '}
                {autoCheckResult ? 'SAFE TO PROCEED' : 'BLOCKED'}
              </Text>
            )}
          </View>
        )}

        {/* Last Check Info */}
        {lastCheckTime && (
          <View style={styles.statusInfo}>
            <Text style={styles.lastCheckText}>
              Last check: {lastCheckTime.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  shieldIcon: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#F4F6F8',
    borderRadius: 16,
    padding: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
  },
  warningSection: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#F39C12',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8D6E63',
    lineHeight: 20,
  },
  instructionsSection: {
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 16,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#1E3A5F',
    color: '#FFFFFF',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0B1F3A',
    flex: 1,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
  },
  statusInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  lastCheckText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
  debugInfo: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 4,
  },
});

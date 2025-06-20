import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Eye,
  EyeOff,
  Fingerprint,
  Shield,
  Clock,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AuthenticationManager from '../utils/AuthenticationManager';
import SecurityManager from '../utils/SecurityManager';

export default function SetupScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(300000); // 5 minutes default
  const [isSetupLoading, setIsSetupLoading] = useState(false);
  const [setupProgress, setSetupProgress] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    if (Platform.OS !== 'web') {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    }
  };

  const getPasswordStrength = () => {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(
      Boolean
    ).length;

    if (score <= 2)
      return { strength: 'Weak', color: '#E67E22', width: '25%' as const };
    if (score <= 3)
      return { strength: 'Medium', color: '#E67E22', width: '50%' as const };
    if (score <= 4)
      return { strength: 'Strong', color: '#2ECC71', width: '75%' as const };
    return {
      strength: 'Very Strong',
      color: '#2ECC71',
      width: '100%' as const,
    };
  };

  const handleSetup = async () => {
    console.log('🚀 Starting setup process...');
    console.log('📊 Setup configuration:', {
      passwordLength: password.length,
      biometricEnabled,
      twoFactorEnabled,
      sessionTimeout,
    });

    // Validate password length
    if (password.length < 8) {
      console.log('❌ Password validation failed: too short');
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    console.log('✅ Password length validation passed');

    // Validate password confirmation
    if (password !== confirmPassword) {
      console.log('❌ Password confirmation failed: passwords do not match');
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    console.log('✅ Password confirmation validation passed');

    // Start loading state
    setIsSetupLoading(true);
    setSetupProgress('Initializing security...');

    try {
      console.log('🔧 Creating authentication configuration...');
      setSetupProgress('Creating authentication configuration...');

      // Setup authentication with all selected options
      const authConfig = {
        masterPassword: password,
        enableBiometric: biometricEnabled,
        enable2FA: twoFactorEnabled,
        deviceId: 'device_unique_id', // In production, use proper device ID
      };
      console.log('✅ Authentication configuration created');

      console.log('🔐 Calling AuthenticationManager.setupAuthentication...');
      setSetupProgress('Setting up authentication...');

      const result = await AuthenticationManager.setupAuthentication(
        authConfig
      );
      console.log('✅ AuthenticationManager.setupAuthentication completed');
      console.log('📋 Setup result:', {
        hasSuccess: 'success' in result,
        hasConfig: 'config' in result,
        hasQrCode: 'qrCodeData' in result,
        hasRecoveryCodes: 'recoveryCodes' in result,
        resultKeys: Object.keys(result),
      });

      if ('success' in result || 'config' in result) {
        console.log(
          '✅ Authentication setup successful, proceeding with configuration...'
        );

        console.log('⏱️ Setting session timeout...');
        setSetupProgress('Configuring session timeout...');

        // Set session timeout
        await SecurityManager.setSessionTimeout(sessionTimeout);
        console.log('✅ Session timeout set to:', sessionTimeout);

        console.log('💾 Marking setup as complete in SecureStore...');
        setSetupProgress('Finalizing setup...');

        // Mark setup as complete
        await SecureStore.setItemAsync('hasSetupPassword', 'true');
        console.log('✅ hasSetupPassword saved');

        await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
        console.log('✅ hasCompletedOnboarding saved');

        // Show 2FA setup info if enabled
        if (twoFactorEnabled && 'qrCodeData' in result && result.qrCodeData) {
          console.log('🔐 2FA was enabled, showing setup information...');
          console.log('📱 QR Code data length:', result.qrCodeData.length);
          console.log(
            '🔑 Recovery codes count:',
            result.recoveryCodes?.length || 0
          );
          console.log(
            '🔐 Manual entry key:',
            result.manualEntryKey ? 'present' : 'missing'
          );

          Alert.alert(
            '2FA Setup Complete',
            `Please save your recovery codes: ${result.recoveryCodes?.join(
              ', '
            )}\n\nManual entry key: ${result.manualEntryKey}`,
            [
              {
                text: 'Continue',
                onPress: () => {
                  console.log(
                    '🔄 Navigating to authenticate screen (with 2FA)...'
                  );
                  try {
                    router.dismissAll();
                  } catch (error) {
                    // Ignore dismissAll errors when there's no stack to dismiss
                  }
                  router.replace('/authenticate');
                },
              },
            ]
          );
        } else {
          console.log('🔄 Navigating to authenticate screen (without 2FA)...');
          try {
            router.dismissAll();
          } catch (error) {
            // Ignore dismissAll errors when there's no stack to dismiss
          }
          router.replace('/authenticate');
        }
        console.log('🎉 Setup process completed successfully!');
      } else {
        console.log(
          '❌ Authentication setup failed - invalid result structure'
        );
        console.log('📋 Received result:', result);
        Alert.alert('Error', 'Failed to setup authentication');
      }
    } catch (error) {
      console.log('💥 Setup process failed with error:');
      console.error('Error details:', error);
      console.log('Error type:', typeof error);
      console.log('Error constructor:', error?.constructor?.name);

      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Failed to save security settings: ' + errorMessage);
      console.log('❌ Setup process terminated due to error');
    } finally {
      // Always stop loading state
      setIsSetupLoading(false);
      setSetupProgress('');
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Secure Your Vault</Text>
        <Text style={styles.subtitle}>
          Create a master password to protect your crypto assets
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Master Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter master password"
              placeholderTextColor="#757575"
              editable={!isSetupLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isSetupLoading}
            >
              {showPassword ? (
                <EyeOff size={20} color="#757575" />
              ) : (
                <Eye size={20} color="#757575" />
              )}
            </TouchableOpacity>
          </View>
          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      backgroundColor: passwordStrength.color,
                      width: passwordStrength.width,
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.strengthText, { color: passwordStrength.color }]}
              >
                {passwordStrength.strength}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              placeholder="Confirm master password"
              placeholderTextColor="#757575"
              editable={!isSetupLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isSetupLoading}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#757575" />
              ) : (
                <Eye size={20} color="#757575" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {biometricAvailable && (
          <TouchableOpacity
            style={styles.biometricOption}
            onPress={() => setBiometricEnabled(!biometricEnabled)}
            disabled={isSetupLoading}
          >
            <View style={styles.biometricContent}>
              <Fingerprint size={24} color="#1E3A5F" />
              <View style={styles.biometricText}>
                <Text style={styles.biometricTitle}>
                  Enable Biometric Authentication
                </Text>
                <Text style={styles.biometricSubtitle}>
                  Use fingerprint or Face ID for quick access
                </Text>
              </View>
            </View>
            <View
              style={[styles.checkbox, biometricEnabled && styles.checkedBox]}
            >
              {biometricEnabled && <Check size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.biometricOption}
          onPress={() => setTwoFactorEnabled(!twoFactorEnabled)}
          disabled={isSetupLoading}
        >
          <View style={styles.biometricContent}>
            <Shield size={24} color="#1E3A5F" />
            <View style={styles.biometricText}>
              <Text style={styles.biometricTitle}>
                Enable Two-Factor Authentication
              </Text>
              <Text style={styles.biometricSubtitle}>
                Add an extra layer of security with TOTP codes
              </Text>
            </View>
          </View>
          <View
            style={[styles.checkbox, twoFactorEnabled && styles.checkedBox]}
          >
            {twoFactorEnabled && <Check size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Session Timeout</Text>
          <View style={styles.timeoutOptions}>
            {[
              { label: '30 seconds', value: 30000 },
              { label: '1 minute', value: 60000 },
              { label: '5 minutes', value: 300000 },
              { label: '15 minutes', value: 900000 },
              { label: '30 minutes', value: 1800000 },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeoutOption,
                  sessionTimeout === option.value &&
                    styles.selectedTimeoutOption,
                ]}
                onPress={() => setSessionTimeout(option.value)}
                disabled={isSetupLoading}
              >
                <Clock
                  size={16}
                  color={
                    sessionTimeout === option.value ? '#FFFFFF' : '#1E3A5F'
                  }
                />
                <Text
                  style={[
                    styles.timeoutOptionText,
                    sessionTimeout === option.value &&
                      styles.selectedTimeoutOptionText,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Loading Progress Indicator */}
      {isSetupLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
          <Text style={styles.loadingText}>{setupProgress}</Text>
          <Text style={styles.loadingSubtext}>
            This may take a moment while we secure your data...
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.setupButton,
          password.length < 8 || password !== confirmPassword || isSetupLoading
            ? styles.disabledButton
            : null,
        ]}
        onPress={handleSetup}
        disabled={
          password.length < 8 || password !== confirmPassword || isSetupLoading
        }
      >
        <Text style={styles.setupButtonText}>
          {isSetupLoading ? 'Setting up...' : 'Secure My Vault'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#E0E6ED',
    borderRadius: 2,
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  biometricOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    marginTop: 16,
  },
  biometricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  biometricText: {
    marginLeft: 12,
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
  },
  biometricSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E6ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginTop: 12,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    marginTop: 4,
    textAlign: 'center',
  },
  setupButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 48,
  },
  disabledButton: {
    backgroundColor: '#E0E6ED',
  },
  setupButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeoutOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeoutOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E6ED',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTimeoutOption: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  timeoutOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
    marginLeft: 4,
  },
  selectedTimeoutOptionText: {
    color: '#FFFFFF',
  },
});

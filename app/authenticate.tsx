import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Fingerprint, Shield, Key } from 'lucide-react-native';
import AuthenticationManager from '../utils/AuthenticationManager';
import SecurityManager from '../utils/SecurityManager';

export default function AuthenticateScreen() {
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authSettings, setAuthSettings] = useState({
    hasPassword: false,
    biometricEnabled: false,
    twoFactorEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1: password, 2: biometric, 3: 2FA
  const [failedAttempts, setFailedAttempts] = useState(0);
  // Track completion of each authentication method
  const [completedAuth, setCompletedAuth] = useState({
    password: false,
    biometric: false,
    twoFactor: false,
  });
  const router = useRouter();

  useEffect(() => {
    loadAuthSettings();
  }, []);

  // Auto-check authentication completion when completedAuth state changes
  useEffect(() => {
    if (
      authSettings.hasPassword ||
      authSettings.biometricEnabled ||
      authSettings.twoFactorEnabled
    ) {
      console.log(
        '🔄 completedAuth state changed, checking completion...',
        completedAuth
      );
      checkAuthenticationComplete();
    }
  }, [completedAuth, authSettings]);

  const loadAuthSettings = async () => {
    try {
      const settings = await AuthenticationManager.getAuthenticationSettings();
      setAuthSettings(settings);

      // Always start with password first
      setAuthStep(1);
    } catch (error) {
      console.error('Failed to load auth settings:', error);
    }
  };

  // Check if all required authentication methods are completed
  const checkAuthenticationComplete = () => {
    const passwordRequired = authSettings.hasPassword;
    const biometricRequired = authSettings.biometricEnabled;
    const twoFactorRequired = authSettings.twoFactorEnabled;

    const passwordCompleted = !passwordRequired || completedAuth.password;
    const biometricCompleted = !biometricRequired || completedAuth.biometric;
    const twoFactorCompleted = !twoFactorRequired || completedAuth.twoFactor;

    console.log('🔐 Auth completion check:', {
      passwordRequired,
      biometricRequired,
      twoFactorRequired,
      passwordCompleted,
      biometricCompleted,
      twoFactorCompleted,
      completedAuthState: completedAuth,
      authSettingsState: authSettings,
    });

    if (passwordCompleted && biometricCompleted && twoFactorCompleted) {
      console.log('✅ All authentication methods completed, granting access');

      // Mark authentication as completed to prevent immediate re-authentication
      SecurityManager.markAuthenticationCompleted();

      // Enter protected flow since user is now authenticated
      SecurityManager.enterProtectedFlow();

      try {
        router.dismissAll();
      } catch (error) {
        // Ignore dismissAll errors when there's no stack to dismiss
      }
      router.replace('/(tabs)');
      return true;
    }

    // Move to next required step
    if (!passwordCompleted) {
      console.log('🔄 Moving to password step (step 1)');
      setAuthStep(1);
    } else if (!biometricCompleted) {
      console.log('🔄 Moving to biometric step (step 2)');
      setAuthStep(2);
    } else if (!twoFactorCompleted) {
      console.log('🔄 Moving to 2FA step (step 3)');
      setAuthStep(3);
    }

    return false;
  };

  const handleAuthenticate = async () => {
    if (isLoading) return;

    setIsLoading(true);
    SecurityManager.trackUserActivity(); // Reset session timer

    try {
      // For password step, validate password first
      if (authStep === 1) {
        const passwordValid = await AuthenticationManager.verifyMasterPassword(
          password
        );

        if (!passwordValid) {
          setFailedAttempts((prev) => prev + 1);
          Alert.alert('Authentication Failed', 'Invalid master password');

          // After 5 failed attempts, offer reset option
          if (failedAttempts >= 4) {
            showResetOption();
          }
          setIsLoading(false);
          return;
        }

        // Password is valid, mark as completed
        console.log('✅ Password authentication completed');
        setCompletedAuth((prev) => {
          const newState = { ...prev, password: true };
          console.log('🔄 Updated completedAuth state:', newState);
          return newState;
        });

        setIsLoading(false);
        return;
      }

      // For 2FA step, validate TOTP/recovery code
      if (authStep === 3) {
        console.log('🔐 Starting 2FA verification process...');
        console.log('📊 2FA Input Details:', {
          useRecoveryCode,
          recoveryCodeLength: recoveryCode?.length || 0,
          twoFactorCodeLength: twoFactorCode?.length || 0,
          recoveryCodeValue: recoveryCode || 'none',
          twoFactorCodeValue: twoFactorCode || 'none',
        });

        let twoFactorValid = false;

        if (useRecoveryCode && recoveryCode) {
          console.log('🔑 Attempting recovery code verification...');
          console.log('Recovery code:', recoveryCode);

          twoFactorValid = await AuthenticationManager.verifyRecoveryCode(
            recoveryCode,
            password
          );

          console.log('🔑 Recovery code result:', twoFactorValid);
        } else if (!useRecoveryCode && twoFactorCode) {
          console.log('📱 Attempting TOTP code verification...');
          console.log('TOTP code:', twoFactorCode);
          console.log('Password length:', password.length);
          console.log('Current timestamp:', new Date().toISOString());
          console.log('Current Unix time:', Math.floor(Date.now() / 1000));
          console.log(
            'Current time step (30s):',
            Math.floor(Date.now() / 1000 / 30)
          );

          twoFactorValid = await AuthenticationManager.verify2FA(
            twoFactorCode,
            password
          );

          console.log('📱 TOTP verification result:', twoFactorValid);
        } else {
          console.log('⚠️ No valid 2FA input provided');
          console.log('useRecoveryCode:', useRecoveryCode);
          console.log('recoveryCode present:', !!recoveryCode);
          console.log('twoFactorCode present:', !!twoFactorCode);
        }

        if (!twoFactorValid) {
          console.log('❌ 2FA verification failed');
          setFailedAttempts((prev) => prev + 1);
          Alert.alert('Authentication Failed', 'Invalid 2FA code');

          if (failedAttempts >= 4) {
            showResetOption();
          }
          setIsLoading(false);
          return;
        }

        // 2FA successful, mark as completed
        console.log('✅ 2FA authentication completed successfully');
        setCompletedAuth((prev) => {
          const newState = { ...prev, twoFactor: true };
          console.log('🔄 Updated completedAuth state:', newState);
          return newState;
        });

        setIsLoading(false);
        return;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', 'Authentication failed: ' + errorMessage);
      setFailedAttempts((prev) => prev + 1);

      if (failedAttempts >= 4) {
        showResetOption();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (authSettings.biometricEnabled) {
      setIsLoading(true);
      try {
        const result = await AuthenticationManager.verifyBiometric();
        if (result) {
          // Biometric auth successful, mark as completed
          console.log('✅ Biometric authentication completed');
          setCompletedAuth((prev) => {
            const newState = { ...prev, biometric: true };
            console.log('🔄 Updated completedAuth state:', newState);
            return newState;
          });

          setIsLoading(false);
        } else {
          setFailedAttempts((prev) => prev + 1);
          Alert.alert(
            'Biometric Failed',
            'Biometric authentication failed. You must complete all enabled authentication methods.'
          );

          if (failedAttempts >= 4) {
            showResetOption();
          }
          setIsLoading(false);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert('Error', 'Biometric authentication error: ' + errorMessage);
        setFailedAttempts((prev) => prev + 1);

        if (failedAttempts >= 4) {
          showResetOption();
        }
        setIsLoading(false);
      }
    }
  };

  const showResetOption = () => {
    Alert.alert(
      'Too Many Failed Attempts',
      'You have exceeded the maximum number of authentication attempts. You can reset the app to start over, but this will permanently delete all your stored data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App & Delete All Data',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete ALL your vault data, passwords, and settings. This action cannot be undone. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: () => SecurityManager.emergencyWipe(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getAuthStepMessage = () => {
    const methods = [];
    if (authSettings.hasPassword || authStep === 1) methods.push('Password');
    if (authSettings.biometricEnabled) methods.push('Biometric');
    if (authSettings.twoFactorEnabled) methods.push('2FA');

    if (methods.length <= 1) {
      return 'Enter your master password to continue';
    }

    const remaining = [];
    if (!completedAuth.password && authSettings.hasPassword)
      remaining.push('Password');
    if (!completedAuth.biometric && authSettings.biometricEnabled)
      remaining.push('Biometric');
    if (!completedAuth.twoFactor && authSettings.twoFactorEnabled)
      remaining.push('2FA');

    if (remaining.length === 0) {
      return 'Authentication complete!';
    }

    return `Complete all methods: ${remaining.join(' + ')}`;
  };

  const renderAuthProgress = () => {
    const methods = [];
    if (authSettings.hasPassword)
      methods.push({ name: 'Password', completed: completedAuth.password });
    if (authSettings.biometricEnabled)
      methods.push({ name: 'Biometric', completed: completedAuth.biometric });
    if (authSettings.twoFactorEnabled)
      methods.push({ name: '2FA', completed: completedAuth.twoFactor });

    if (methods.length <= 1) return null;

    return (
      <View style={styles.progressContainer}>
        {methods.map((method, index) => (
          <View key={method.name} style={styles.progressItem}>
            <View
              style={[
                styles.progressDot,
                method.completed && styles.progressDotCompleted,
              ]}
            />
            <Text
              style={[
                styles.progressText,
                method.completed && styles.progressTextCompleted,
              ]}
            >
              {method.name}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPasswordStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Key size={32} color="#1E3A5F" />
        <Text style={styles.stepTitle}>Enter Master Password</Text>
        <Text style={styles.stepSubtitle}>{getAuthStepMessage()}</Text>
        {renderAuthProgress()}
        {failedAttempts > 0 && (
          <Text style={styles.failedAttempts}>
            Failed attempts: {failedAttempts}/5
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Master password"
            placeholderTextColor="#757575"
            autoFocus
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#757575" />
            ) : (
              <Eye size={20} color="#757575" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.authButton, !password && styles.disabledButton]}
        onPress={handleAuthenticate}
        disabled={!password || isLoading}
      >
        <Text style={styles.authButtonText}>
          {isLoading ? 'Verifying...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBiometricStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Fingerprint size={32} color="#1E3A5F" />
        <Text style={styles.stepTitle}>Biometric Authentication</Text>
        <Text style={styles.stepSubtitle}>{getAuthStepMessage()}</Text>
        {renderAuthProgress()}
      </View>

      <TouchableOpacity
        style={styles.authButton}
        onPress={handleBiometricAuth}
        disabled={isLoading}
      >
        <Fingerprint size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.authButtonText}>
          {isLoading ? 'Authenticating...' : 'Use Biometric'}
        </Text>
      </TouchableOpacity>

      {!completedAuth.password && (
        <TouchableOpacity
          style={styles.fallbackButton}
          onPress={() => setAuthStep(1)}
        >
          <Text style={styles.fallbackButtonText}>Complete Password First</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const render2FAStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Shield size={32} color="#1E3A5F" />
        <Text style={styles.stepTitle}>Two-Factor Authentication</Text>
        <Text style={styles.stepSubtitle}>{getAuthStepMessage()}</Text>
        {renderAuthProgress()}
        <Text style={styles.stepInstruction}>
          {useRecoveryCode
            ? 'Enter your recovery code'
            : 'Enter the 6-digit code from your authenticator app'}
        </Text>
        {failedAttempts > 0 && (
          <Text style={styles.failedAttempts}>
            Failed attempts: {failedAttempts}/5
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={useRecoveryCode ? recoveryCode : twoFactorCode}
          onChangeText={useRecoveryCode ? setRecoveryCode : setTwoFactorCode}
          placeholder={useRecoveryCode ? 'Recovery code' : '6-digit code'}
          placeholderTextColor="#757575"
          keyboardType={useRecoveryCode ? 'default' : 'numeric'}
          maxLength={useRecoveryCode ? 8 : 6}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[
          styles.authButton,
          !(useRecoveryCode ? recoveryCode : twoFactorCode) &&
            styles.disabledButton,
        ]}
        onPress={handleAuthenticate}
        disabled={
          !(useRecoveryCode ? recoveryCode : twoFactorCode) || isLoading
        }
      >
        <Text style={styles.authButtonText}>
          {isLoading ? 'Verifying...' : 'Authenticate'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.recoveryButton}
        onPress={() => setUseRecoveryCode(!useRecoveryCode)}
      >
        <Text style={styles.recoveryButtonText}>
          {useRecoveryCode ? 'Use authenticator code' : 'Use recovery code'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getCurrentStep = () => {
    if (authStep === 1) {
      return renderPasswordStep();
    } else if (authStep === 2 && authSettings.biometricEnabled) {
      return renderBiometricStep();
    } else if (authStep === 3 && authSettings.twoFactorEnabled) {
      return render2FAStep();
    } else {
      // No authentication required, go to main app
      try {
        router.dismissAll();
      } catch (error) {
        // Ignore dismissAll errors when there's no stack to dismiss
      }
      router.replace('/(tabs)');
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>SecureVault</Text>
          <Text style={styles.subtitle}>Authenticate to access your vault</Text>
        </View>

        {getCurrentStep()}

        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={() => {
            Alert.alert(
              'Emergency Wipe',
              'This will permanently delete all data. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Wipe Data',
                  style: 'destructive',
                  onPress: () => SecurityManager.emergencyWipe(),
                },
              ]
            );
          }}
        >
          <Text style={styles.emergencyButtonText}>Emergency Wipe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginTop: 12,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepInstruction: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
    textAlign: 'center',
    marginTop: 8,
  },
  failedAttempts: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#E74C3C',
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    textAlign: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  authButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#E0E6ED',
  },
  authButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  fallbackButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  fallbackButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
  },
  recoveryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  recoveryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
  },
  emergencyButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  emergencyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#E74C3C',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  progressItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E6ED',
    marginBottom: 4,
  },
  progressDotCompleted: {
    backgroundColor: '#2ECC71',
  },
  progressText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
  progressTextCompleted: {
    color: '#2ECC71',
    fontFamily: 'Inter-Medium',
  },
});

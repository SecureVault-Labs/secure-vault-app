import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { CryptoUtils } from './CryptoUtils';
import { TOTPManager } from './TOTPManager';

interface AuthConfig {
  masterPassword: string;
  enableBiometric?: boolean;
  enable2FA?: boolean;
  deviceId: string;
}

interface TwoFAConfig {
  enabled: boolean;
  encryptedSecret: string;
  encryptedRecoveryCodes: string[];
  algorithm: string;
  digits: number;
  period: number;
  setupDate: string;
  deviceId: string;
}

interface TwoFASetupResult {
  config: TwoFAConfig;
  qrCodeData: string;
  recoveryCodes: string[];
  manualEntryKey: string;
}

interface AuthCredentials {
  password?: string;
  requestBiometric?: boolean;
  twoFactorCode?: string;
  recoveryCode?: string;
}

interface AuthResults {
  passwordValid: boolean;
  biometricValid: boolean;
  twoFactorValid: boolean;
  success: boolean;
  error?: string;
}

interface AuthSettings {
  hasPassword: boolean;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
}

interface BiometricSetupResult {
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
}

interface SessionData {
  createdAt: string;
  expiresAt: string;
  sessionId: string;
}

export class AuthenticationManager {
  // Helper method to clear all authentication data
  static async clearAllAuthenticationData(): Promise<void> {
    console.log('🗑️ Clearing all authentication data...');
    try {
      const keysToDelete = [
        'masterPasswordHash',
        'passwordSalt',
        'hasSetupPassword',
        'biometricEnabled',
        'twoFactorConfig',
        'currentSession',
      ];

      for (const key of keysToDelete) {
        await SecureStore.deleteItemAsync(key);
      }
      console.log('✅ All authentication data cleared');
    } catch (error) {
      console.log(
        '⚠️ Some authentication data may not have been cleared:',
        error
      );
    }
  }

  // 1. Setup authentication during initial setup
  static async setupAuthentication(
    config: AuthConfig
  ): Promise<TwoFASetupResult | { success: boolean }> {
    console.log('🔐 AuthenticationManager.setupAuthentication started');
    console.log('📋 Received config:', {
      hasPassword: !!config.masterPassword,
      passwordLength: config.masterPassword?.length || 0,
      enableBiometric: config.enableBiometric,
      enable2FA: config.enable2FA,
      deviceId: config.deviceId,
    });

    try {
      // Clear any existing authentication data to ensure clean setup
      await this.clearAllAuthenticationData();

      const {
        masterPassword,
        enableBiometric = false,
        enable2FA = false,
        deviceId,
      } = config;

      console.log('📊 Destructured config:', {
        enableBiometric,
        enable2FA,
        deviceId,
        hasPassword: !!masterPassword,
      });

      console.log('💾 Starting master password storage...');
      // Store master password securely
      await this.storeMasterPassword(masterPassword);
      console.log('✅ Master password stored successfully');

      // Setup biometric if requested
      if (enableBiometric) {
        console.log('👆 Setting up biometric authentication...');
        await this.setupBiometric();
        console.log('✅ Biometric setup completed');
      } else {
        console.log('⏭️ Skipping biometric setup (not enabled)');
      }

      // Always save biometric setting first
      console.log('💾 Saving biometric setting...');
      await SecureStore.setItemAsync(
        'biometricEnabled',
        enableBiometric.toString()
      );
      console.log('✅ biometricEnabled saved:', enableBiometric.toString());

      // Setup 2FA if requested
      if (enable2FA) {
        console.log('🔐 Setting up 2FA...');
        const twoFASetup = await this.setup2FA(masterPassword, deviceId);
        console.log('✅ 2FA setup completed');

        console.log('🎉 Returning 2FA setup result');
        return { ...twoFASetup };
      } else {
        console.log('⏭️ Skipping 2FA setup (not enabled)');
        console.log('🗑️ Clearing any existing 2FA configuration...');
        // Clear any existing 2FA config to ensure clean state
        await SecureStore.deleteItemAsync('twoFactorConfig');
        console.log('✅ Existing 2FA configuration cleared');
      }

      console.log('🎉 Authentication setup completed successfully');
      return { success: true };
    } catch (error) {
      console.log('💥 Authentication setup failed with error:');
      console.error('Error details:', error);
      console.log('Error type:', typeof error);
      console.log('Error constructor:', error?.constructor?.name);

      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
      }

      throw new Error(
        'Authentication setup failed: ' + (error as Error).message
      );
    }
  }

  // 2. Store master password securely
  static async storeMasterPassword(password: string): Promise<void> {
    console.log('🔒 storeMasterPassword started');
    console.log('📊 Password length:', password.length);

    try {
      console.log('🧂 Generating salt and hashing password...');
      // Generate salt and hash password
      const { hash, salt } = await CryptoUtils.hashPassword(password);
      console.log('✅ Password hashed successfully');
      console.log('📊 Hash length:', hash.length);
      console.log('📊 Salt length:', salt.length);

      console.log('💾 Storing masterPasswordHash...');
      // Store hashed password and salt
      await SecureStore.setItemAsync('masterPasswordHash', hash);
      console.log('✅ masterPasswordHash stored');

      console.log('💾 Storing passwordSalt...');
      await SecureStore.setItemAsync('passwordSalt', salt);
      console.log('✅ passwordSalt stored');

      console.log('💾 Storing hasSetupPassword flag...');
      await SecureStore.setItemAsync('hasSetupPassword', 'true');
      console.log('✅ hasSetupPassword flag stored');

      console.log('🎉 storeMasterPassword completed successfully');
    } catch (error) {
      console.log('💥 storeMasterPassword failed with error:');
      console.error('Error details:', error);
      console.log('Error type:', typeof error);
      console.log('Error constructor:', error?.constructor?.name);

      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
      }

      throw new Error(
        'Failed to store master password: ' + (error as Error).message
      );
    }
  }

  // 3. Setup biometric authentication
  static async setupBiometric(): Promise<BiometricSetupResult> {
    try {
      // Check if biometric is available
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) {
        throw new Error('Biometric hardware not available');
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        throw new Error('No biometric credentials enrolled');
      }

      const supportedTypes =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        available: true,
        enrolled: true,
        types: supportedTypes,
      };
    } catch (error) {
      throw new Error('Biometric setup failed: ' + (error as Error).message);
    }
  }

  // 4. Setup 2FA (Time-based One-Time Password)
  static async setup2FA(
    masterPassword: string,
    deviceId: string
  ): Promise<TwoFASetupResult> {
    console.log('🔐 setup2FA started');
    console.log('📊 Parameters:', {
      passwordLength: masterPassword.length,
      deviceId: deviceId,
    });

    try {
      console.log('🔑 Generating TOTP secret...');
      // Generate TOTP secret
      const totpSecret = TOTPManager.generateSecret();
      console.log('✅ TOTP secret generated');
      console.log('📊 TOTP secret length:', totpSecret.length);

      console.log('🔒 Encrypting TOTP secret...');
      // Encrypt TOTP secret
      const encryptedSecret = await CryptoUtils.encrypt(
        totpSecret,
        masterPassword + deviceId + 'TOTP_SECRET_SALT'
      );
      console.log('✅ TOTP secret encrypted');
      console.log('📊 Encrypted secret length:', encryptedSecret.length);

      console.log('🎲 Generating recovery codes...');
      // Generate recovery codes
      const recoveryCodes = CryptoUtils.generateRecoveryCodes(8);
      console.log('✅ Recovery codes generated');
      console.log('📊 Recovery codes count:', recoveryCodes.length);

      console.log('🔒 Encrypting recovery codes (batch)...');
      // Encrypt all recovery codes as a single JSON string for efficiency
      const recoveryCodesJson = JSON.stringify(recoveryCodes);
      const encryptedRecoveryCodes = await CryptoUtils.encrypt(
        recoveryCodesJson,
        masterPassword + deviceId + 'RECOVERY_CODE_SALT'
      );
      console.log('✅ All recovery codes encrypted in single operation');

      console.log('📋 Creating 2FA config...');
      const config: TwoFAConfig = {
        enabled: true,
        encryptedSecret: encryptedSecret,
        encryptedRecoveryCodes: [encryptedRecoveryCodes], // Single encrypted string containing all codes
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        setupDate: new Date().toISOString(),
        deviceId: deviceId,
      };
      console.log('✅ 2FA config created');

      console.log('💾 Storing 2FA config...');
      await SecureStore.setItemAsync('twoFactorConfig', JSON.stringify(config));
      console.log('✅ 2FA config stored');

      console.log('📱 Generating QR code data...');
      const qrCodeData = this.generateQRCodeData(
        totpSecret,
        'SecureVault',
        'User'
      );
      console.log('✅ QR code data generated');
      console.log('📊 QR code data length:', qrCodeData.length);

      console.log('🎉 setup2FA completed successfully');
      return {
        config: config,
        qrCodeData: qrCodeData,
        recoveryCodes: recoveryCodes,
        manualEntryKey: totpSecret,
      };
    } catch (error) {
      console.log('💥 setup2FA failed with error:');
      console.error('Error details:', error);
      console.log('Error type:', typeof error);
      console.log('Error constructor:', error?.constructor?.name);

      if (error instanceof Error) {
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
      }

      throw new Error('2FA setup failed: ' + (error as Error).message);
    }
  }

  // 5. Authenticate user with all configured methods
  static async authenticateUser(
    credentials: AuthCredentials
  ): Promise<AuthResults> {
    try {
      const authSettings = await this.getAuthenticationSettings();
      const results: AuthResults = {
        passwordValid: false,
        biometricValid: false,
        twoFactorValid: false,
        success: false,
      };

      // 1. Verify master password
      if (credentials.password) {
        results.passwordValid = await this.verifyMasterPassword(
          credentials.password
        );
        if (!results.passwordValid) {
          return { ...results, error: 'Invalid master password' };
        }
      }

      // 2. Verify biometric if enabled and requested
      if (authSettings.biometricEnabled && credentials.requestBiometric) {
        results.biometricValid = await this.verifyBiometric();
        if (!results.biometricValid) {
          return { ...results, error: 'Biometric authentication failed' };
        }
      }

      // 3. Verify 2FA if enabled
      if (authSettings.twoFactorEnabled) {
        if (credentials.twoFactorCode) {
          results.twoFactorValid = await this.verify2FA(
            credentials.twoFactorCode,
            credentials.password!
          );
        } else if (credentials.recoveryCode) {
          results.twoFactorValid = await this.verifyRecoveryCode(
            credentials.recoveryCode,
            credentials.password!
          );
        }

        if (!results.twoFactorValid) {
          return { ...results, error: 'Invalid 2FA code' };
        }
      }

      // Check if all required authentication methods passed
      const requiredMethods = this.getRequiredAuthMethods(authSettings);
      results.success = this.validateAuthenticationResults(
        results,
        requiredMethods
      );

      return results;
    } catch (error) {
      return {
        passwordValid: false,
        biometricValid: false,
        twoFactorValid: false,
        success: false,
        error: 'Authentication failed: ' + (error as Error).message,
      };
    }
  }

  // 6. Verify master password
  static async verifyMasterPassword(password: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync('masterPasswordHash');
      const salt = await SecureStore.getItemAsync('passwordSalt');

      if (!storedHash || !salt) {
        return false;
      }

      // Verify password using our crypto utils
      return await CryptoUtils.verifyPassword(password, storedHash, salt);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  // 7. Verify biometric authentication
  static async verifyBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with biometrics',
        fallbackLabel: 'Use password instead',
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  }

  // 8. Verify 2FA code
  static async verify2FA(
    providedCode: string,
    masterPassword: string
  ): Promise<boolean> {
    try {
      const twoFactorConfig = await SecureStore.getItemAsync('twoFactorConfig');
      if (!twoFactorConfig) {
        return false;
      }

      const config: TwoFAConfig = JSON.parse(twoFactorConfig);
      const deviceId = await this.getDeviceId();

      // Decrypt TOTP secret
      const decryptedSecret = await CryptoUtils.decrypt(
        config.encryptedSecret,
        masterPassword + deviceId + 'TOTP_SECRET_SALT'
      );

      // Verify TOTP code
      return await this.verifyTOTPCode(providedCode, decryptedSecret);
    } catch (error) {
      console.error('2FA verification failed:', error);
      return false;
    }
  }

  // 9. Verify recovery code
  static async verifyRecoveryCode(
    providedCode: string,
    masterPassword: string
  ): Promise<boolean> {
    try {
      const twoFactorConfig = await SecureStore.getItemAsync('twoFactorConfig');
      if (!twoFactorConfig) {
        return false;
      }

      const config: TwoFAConfig = JSON.parse(twoFactorConfig);
      const deviceId = await this.getDeviceId();

      // Handle new batch format (single encrypted JSON string)
      if (config.encryptedRecoveryCodes.length === 1) {
        try {
          // Decrypt the JSON string containing all recovery codes
          const decryptedJson = await CryptoUtils.decrypt(
            config.encryptedRecoveryCodes[0],
            masterPassword + deviceId + 'RECOVERY_CODE_SALT'
          );

          const recoveryCodes: string[] = JSON.parse(decryptedJson);
          const codeIndex = recoveryCodes.indexOf(providedCode);

          if (codeIndex !== -1) {
            // Remove used recovery code
            recoveryCodes.splice(codeIndex, 1);

            // Re-encrypt the updated list
            const updatedJson = JSON.stringify(recoveryCodes);
            const reEncrypted = await CryptoUtils.encrypt(
              updatedJson,
              masterPassword + deviceId + 'RECOVERY_CODE_SALT'
            );

            // Update config
            config.encryptedRecoveryCodes = [reEncrypted];
            await SecureStore.setItemAsync(
              'twoFactorConfig',
              JSON.stringify(config)
            );

            return true;
          }
        } catch (decryptError) {
          console.error(
            'Failed to decrypt batch recovery codes:',
            decryptError
          );
          return false;
        }
      } else {
        // Handle legacy format (individual encrypted codes) for backward compatibility
        for (let i = 0; i < config.encryptedRecoveryCodes.length; i++) {
          try {
            const decryptedCode = await CryptoUtils.decrypt(
              config.encryptedRecoveryCodes[i],
              masterPassword + deviceId + 'RECOVERY_CODE_SALT'
            );

            if (decryptedCode === providedCode) {
              // Remove used recovery code
              config.encryptedRecoveryCodes.splice(i, 1);
              await SecureStore.setItemAsync(
                'twoFactorConfig',
                JSON.stringify(config)
              );
              return true;
            }
          } catch (decryptError) {
            continue;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Recovery code verification failed:', error);
      return false;
    }
  }

  // 10. Get authentication settings
  static async getAuthenticationSettings(): Promise<AuthSettings> {
    try {
      const biometricEnabled = await SecureStore.getItemAsync(
        'biometricEnabled'
      );
      const hasPassword = await SecureStore.getItemAsync('hasSetupPassword');

      // Check if 2FA is enabled by looking for the config
      const twoFactorConfig = await SecureStore.getItemAsync('twoFactorConfig');
      const twoFactorEnabled = twoFactorConfig ? 'true' : 'false';

      console.log('🔐 Loading auth settings:', {
        hasPassword: hasPassword === 'true',
        biometricEnabled: biometricEnabled === 'true',
        twoFactorEnabled: twoFactorEnabled === 'true',
        hasTwoFactorConfig: !!twoFactorConfig,
      });

      return {
        hasPassword: hasPassword === 'true',
        biometricEnabled: biometricEnabled === 'true',
        twoFactorEnabled: twoFactorEnabled === 'true',
      };
    } catch (error) {
      console.error('Failed to load auth settings:', error);
      return {
        hasPassword: false,
        biometricEnabled: false,
        twoFactorEnabled: false,
      };
    }
  }

  // 11. Get required authentication methods
  static getRequiredAuthMethods(authSettings: AuthSettings): string[] {
    const required: string[] = [];

    if (authSettings.hasPassword) {
      required.push('password');
    }

    if (authSettings.biometricEnabled) {
      required.push('biometric');
    }

    if (authSettings.twoFactorEnabled) {
      required.push('twoFactor');
    }

    return required;
  }

  // 12. Validate authentication results
  static validateAuthenticationResults(
    results: AuthResults,
    requiredMethods: string[]
  ): boolean {
    for (const method of requiredMethods) {
      switch (method) {
        case 'password':
          if (!results.passwordValid) return false;
          break;
        case 'biometric':
          if (!results.biometricValid) return false;
          break;
        case 'twoFactor':
          if (!results.twoFactorValid) return false;
          break;
      }
    }
    return true;
  }

  // 13. Create session
  static async createSession(): Promise<SessionData> {
    try {
      const sessionData: SessionData = {
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        sessionId: this.generateSessionId(),
      };

      await SecureStore.setItemAsync(
        'currentSession',
        JSON.stringify(sessionData)
      );
      return sessionData;
    } catch (error) {
      throw new Error('Session creation failed: ' + (error as Error).message);
    }
  }

  // Helper functions for TOTP (now using TOTPManager)
  static generateTOTPSecret(length: number = 32): string {
    return TOTPManager.generateSecret(length);
  }

  static generateRecoveryCodes(count: number = 8): string[] {
    return CryptoUtils.generateRecoveryCodes(count);
  }

  static generateQRCodeData(
    secret: string,
    issuer: string,
    accountName: string
  ): string {
    return TOTPManager.generateQRCodeData(secret, issuer, accountName);
  }

  static async verifyTOTPCode(
    providedCode: string,
    secret: string,
    windowSize: number = 1
  ): Promise<boolean> {
    try {
      const result = await TOTPManager.verifyTOTP(providedCode, secret);
      return result.valid;
    } catch (error) {
      console.error('TOTP verification failed:', error);
      return false;
    }
  }

  static async generateTOTPCode(
    secret: string,
    timeStep?: number
  ): Promise<string> {
    try {
      return await TOTPManager.generateTOTP(secret);
    } catch (error) {
      console.error('TOTP generation failed:', error);
      // Fallback to simple implementation
      const now = timeStep || Math.floor(Date.now() / 1000);
      const timeCounter = Math.floor(now / 30);
      const code = Math.abs(timeCounter * secret.length) % 1000000;
      return code.toString().padStart(6, '0');
    }
  }

  static generateSessionId(): string {
    return CryptoUtils.generateSessionId();
  }

  static async getDeviceId(): Promise<string> {
    // In production, use a proper device ID
    return 'device_unique_id';
  }
}

export default AuthenticationManager;

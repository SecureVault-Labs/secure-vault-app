import { AuthenticationManager } from '../../utils/AuthenticationManager';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { CryptoUtils } from '../../utils/CryptoUtils';
import { TOTPManager } from '../../utils/TOTPManager';

// Mock dependencies
jest.mock('../../utils/CryptoUtils');
jest.mock('../../utils/TOTPManager');

const mockCryptoUtils = CryptoUtils as jest.Mocked<typeof CryptoUtils>;
const mockTOTPManager = TOTPManager as jest.Mocked<typeof TOTPManager>;

describe('AuthenticationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for CryptoUtils
    mockCryptoUtils.hashPassword.mockResolvedValue({
      hash: 'hashedPassword123',
      salt: 'randomSalt123',
    });
    mockCryptoUtils.verifyPassword.mockResolvedValue(true);
    mockCryptoUtils.encrypt.mockResolvedValue('encryptedData');
    mockCryptoUtils.decrypt.mockResolvedValue('decryptedData');
    mockCryptoUtils.generateRecoveryCodes.mockReturnValue([
      'RECOVERY1',
      'RECOVERY2',
      'RECOVERY3',
      'RECOVERY4',
    ]);

    // Default mocks for TOTPManager
    mockTOTPManager.generateSecret.mockReturnValue('TOTP_SECRET_123');
    mockTOTPManager.verifyTOTP.mockResolvedValue({ valid: true });
    mockTOTPManager.generateQRCodeData.mockReturnValue('otpauth://totp/...');
  });

  describe('Setup Authentication', () => {
    it('should setup password-only authentication', async () => {
      const config = {
        masterPassword: 'securePassword123',
        deviceId: 'test-device-123',
        enableBiometric: false,
        enable2FA: false,
      };

      const result = await AuthenticationManager.setupAuthentication(config);

      expect(result).toEqual({ success: true });
      expect(mockCryptoUtils.hashPassword).toHaveBeenCalledWith(
        'securePassword123'
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometricEnabled',
        'false'
      );
    });

    it('should setup password + biometric authentication', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        true
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        true
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([1, 2]); // FINGERPRINT, FACIAL_RECOGNITION

      const config = {
        masterPassword: 'securePassword123',
        deviceId: 'test-device-123',
        enableBiometric: true,
        enable2FA: false,
      };

      const result = await AuthenticationManager.setupAuthentication(config);

      expect(result).toEqual({ success: true });
      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometricEnabled',
        'true'
      );
    });

    it('should setup password + 2FA authentication', async () => {
      const config = {
        masterPassword: 'securePassword123',
        deviceId: 'test-device-123',
        enableBiometric: false,
        enable2FA: true,
      };

      const result = await AuthenticationManager.setupAuthentication(config);

      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('qrCodeData');
      expect(result).toHaveProperty('recoveryCodes');
      expect(result).toHaveProperty('manualEntryKey');
      expect(mockTOTPManager.generateSecret).toHaveBeenCalled();
      expect(mockCryptoUtils.generateRecoveryCodes).toHaveBeenCalled();
    });

    it('should setup full authentication (password + biometric + 2FA)', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(
        true
      );
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(
        true
      );
      (
        LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock
      ).mockResolvedValue([1, 2]);

      const config = {
        masterPassword: 'securePassword123',
        deviceId: 'test-device-123',
        enableBiometric: true,
        enable2FA: true,
      };

      const result = await AuthenticationManager.setupAuthentication(config);

      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('qrCodeData');
      expect(result).toHaveProperty('recoveryCodes');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'biometricEnabled',
        'true'
      );
    });

    it('should handle setup errors gracefully', async () => {
      mockCryptoUtils.hashPassword.mockRejectedValue(new Error('Hash failed'));

      const config = {
        masterPassword: 'securePassword123',
        deviceId: 'test-device-123',
      };

      await expect(
        AuthenticationManager.setupAuthentication(config)
      ).rejects.toThrow('Authentication setup failed');
    });
  });

  describe('Password Authentication', () => {
    it('should verify correct master password', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('hashedPassword123') // masterPasswordHash
        .mockResolvedValueOnce('randomSalt123'); // passwordSalt

      const result = await AuthenticationManager.verifyMasterPassword(
        'correctPassword'
      );

      expect(result).toBe(true);
      expect(mockCryptoUtils.verifyPassword).toHaveBeenCalledWith(
        'correctPassword',
        'hashedPassword123',
        'randomSalt123'
      );
    });

    it('should reject incorrect master password', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('hashedPassword123')
        .mockResolvedValueOnce('randomSalt123');
      mockCryptoUtils.verifyPassword.mockResolvedValue(false);

      const result = await AuthenticationManager.verifyMasterPassword(
        'wrongPassword'
      );

      expect(result).toBe(false);
    });

    it('should handle missing password data', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await AuthenticationManager.verifyMasterPassword(
        'anyPassword'
      );

      expect(result).toBe(false);
    });
  });

  describe('Biometric Authentication', () => {
    it('should verify biometric successfully', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await AuthenticationManager.verifyBiometric();

      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Authenticate with biometrics',
        fallbackLabel: 'Use password instead',
        cancelLabel: 'Cancel',
      });
    });

    it('should handle biometric failure', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User cancelled',
      });

      const result = await AuthenticationManager.verifyBiometric();

      expect(result).toBe(false);
    });

    it('should handle biometric errors', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware error')
      );

      const result = await AuthenticationManager.verifyBiometric();

      expect(result).toBe(false);
    });
  });

  describe('2FA Authentication', () => {
    it('should verify TOTP code successfully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          enabled: true,
          encryptedSecret: 'encryptedTOTPSecret',
          deviceId: 'test-device-123',
        })
      );
      mockCryptoUtils.decrypt.mockResolvedValue('TOTP_SECRET_123');
      mockTOTPManager.verifyTOTP.mockResolvedValue({ valid: true });

      const result = await AuthenticationManager.verify2FA(
        '123456',
        'masterPassword'
      );

      expect(result).toBe(true);
      expect(mockTOTPManager.verifyTOTP).toHaveBeenCalledWith(
        '123456',
        'TOTP_SECRET_123'
      );
    });

    it('should reject invalid TOTP code', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          enabled: true,
          encryptedSecret: 'encryptedTOTPSecret',
          deviceId: 'test-device-123',
        })
      );
      mockCryptoUtils.decrypt.mockResolvedValue('TOTP_SECRET_123');
      mockTOTPManager.verifyTOTP.mockResolvedValue({ valid: false });

      const result = await AuthenticationManager.verify2FA(
        '000000',
        'masterPassword'
      );

      expect(result).toBe(false);
    });

    it('should verify recovery code successfully', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          enabled: true,
          encryptedRecoveryCodes: ['encryptedBatch'],
          deviceId: 'test-device-123',
        })
      );
      mockCryptoUtils.decrypt.mockResolvedValue(
        JSON.stringify(['RECOVERY1', 'RECOVERY2', 'RECOVERY3'])
      );

      const result = await AuthenticationManager.verifyRecoveryCode(
        'RECOVERY2',
        'masterPassword'
      );

      expect(result).toBe(true);
      expect(mockCryptoUtils.encrypt).toHaveBeenCalled(); // Re-encrypt updated codes
    });

    it('should reject invalid recovery code', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          enabled: true,
          encryptedRecoveryCodes: ['encryptedBatch'],
          deviceId: 'test-device-123',
        })
      );
      mockCryptoUtils.decrypt.mockResolvedValue(
        JSON.stringify(['RECOVERY1', 'RECOVERY2', 'RECOVERY3'])
      );

      const result = await AuthenticationManager.verifyRecoveryCode(
        'INVALID',
        'masterPassword'
      );

      expect(result).toBe(false);
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should authenticate with password only', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('true') // biometricEnabled
        .mockResolvedValueOnce(null) // twoFactorEnabled
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce('hashedPassword')
        .mockResolvedValueOnce('salt');

      const credentials = {
        password: 'correctPassword',
      };

      const result = await AuthenticationManager.authenticateUser(credentials);

      expect(result.success).toBe(true);
      expect(result.passwordValid).toBe(true);
    });

    it('should authenticate with password + biometric', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('true') // biometricEnabled
        .mockResolvedValueOnce(null) // twoFactorEnabled
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce('hashedPassword')
        .mockResolvedValueOnce('salt');

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      const credentials = {
        password: 'correctPassword',
        requestBiometric: true,
      };

      const result = await AuthenticationManager.authenticateUser(credentials);

      expect(result.success).toBe(true);
      expect(result.passwordValid).toBe(true);
      expect(result.biometricValid).toBe(true);
    });

    it('should authenticate with password + 2FA', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('false') // biometricEnabled
        .mockResolvedValueOnce(JSON.stringify({ enabled: true })) // twoFactorConfig
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce('hashedPassword')
        .mockResolvedValueOnce('salt')
        .mockResolvedValueOnce(
          JSON.stringify({
            enabled: true,
            encryptedSecret: 'encryptedSecret',
            deviceId: 'test-device',
          })
        );

      mockCryptoUtils.decrypt.mockResolvedValue('TOTP_SECRET');
      mockTOTPManager.verifyTOTP.mockResolvedValue({ valid: true });

      const credentials = {
        password: 'correctPassword',
        twoFactorCode: '123456',
      };

      const result = await AuthenticationManager.authenticateUser(credentials);

      expect(result.success).toBe(true);
      expect(result.passwordValid).toBe(true);
      expect(result.twoFactorValid).toBe(true);
    });

    it('should fail authentication with wrong password', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('false') // biometricEnabled
        .mockResolvedValueOnce(null) // twoFactorEnabled
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce('hashedPassword')
        .mockResolvedValueOnce('salt');

      mockCryptoUtils.verifyPassword.mockResolvedValue(false);

      const credentials = {
        password: 'wrongPassword',
      };

      const result = await AuthenticationManager.authenticateUser(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid master password');
    });
  });

  describe('Authentication Settings', () => {
    it('should return correct settings when all auth methods enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('true') // biometricEnabled
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce(JSON.stringify({ enabled: true })); // twoFactorConfig

      const settings = await AuthenticationManager.getAuthenticationSettings();

      expect(settings).toEqual({
        hasPassword: true,
        biometricEnabled: true,
        twoFactorEnabled: true,
      });
    });

    it('should return correct settings when only password enabled', async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce('false') // biometricEnabled
        .mockResolvedValueOnce('true') // hasSetupPassword
        .mockResolvedValueOnce(null); // twoFactorConfig

      const settings = await AuthenticationManager.getAuthenticationSettings();

      expect(settings).toEqual({
        hasPassword: true,
        biometricEnabled: false,
        twoFactorEnabled: false,
      });
    });

    it('should handle errors when loading settings', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const settings = await AuthenticationManager.getAuthenticationSettings();

      expect(settings).toEqual({
        hasPassword: false,
        biometricEnabled: false,
        twoFactorEnabled: false,
      });
    });
  });

  describe('Cleanup and Reset', () => {
    it('should clear all authentication data', async () => {
      await AuthenticationManager.clearAllAuthenticationData();

      const expectedKeys = [
        'masterPasswordHash',
        'passwordSalt',
        'hasSetupPassword',
        'biometricEnabled',
        'twoFactorConfig',
        'currentSession',
      ];

      expectedKeys.forEach((key) => {
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(key);
      });
    });
  });
});

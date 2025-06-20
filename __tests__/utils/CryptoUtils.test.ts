import { CryptoUtils } from '../../utils/CryptoUtils';
import * as Crypto from 'expo-crypto';

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  getRandomValues: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

describe('CryptoUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getRandomValues to return predictable values for testing
    (Crypto.getRandomValues as jest.Mock).mockImplementation(
      (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }
    );

    // Mock digestStringAsync to return predictable hash
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(
      'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcdef12'
    );
  });

  describe('Random Generation', () => {
    it('should generate random bytes of specified length', () => {
      const result = CryptoUtils.generateRandomBytes(16);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(16);
      expect(Crypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
    });

    it('should generate random string of specified length', () => {
      const result = CryptoUtils.generateRandomString(10);

      expect(typeof result).toBe('string');
      expect(result.length).toBe(10);
    });

    it('should generate salt of specified length', () => {
      const result = CryptoUtils.generateSalt(20);

      expect(typeof result).toBe('string');
      expect(result.length).toBe(20);
    });

    it('should generate session ID', () => {
      const result = CryptoUtils.generateSessionId();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate TOTP secret', () => {
      const result = CryptoUtils.generateTOTPSecret(32);

      expect(typeof result).toBe('string');
      expect(result.length).toBe(32);
    });

    it('should generate recovery codes', () => {
      const result = CryptoUtils.generateRecoveryCodes(5);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      result.forEach((code) => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from password and salt', async () => {
      const password = 'testPassword123';
      const salt = 'testSalt';

      const result = await CryptoUtils.deriveKey(password, salt, 100, 32);

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // 32 bytes * 2 (hex encoding)
      expect(Crypto.digestStringAsync).toHaveBeenCalled();
    });

    it('should use default parameters when not specified', async () => {
      const password = 'testPassword123';
      const salt = 'testSalt';

      const result = await CryptoUtils.deriveKey(password, salt);

      expect(typeof result).toBe('string');
      expect(Crypto.digestStringAsync).toHaveBeenCalled();
    });

    it('should handle errors during key derivation', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockRejectedValue(
        new Error('Crypto error')
      );

      await expect(CryptoUtils.deriveKey('password', 'salt')).rejects.toThrow(
        'Crypto error'
      );
    });
  });

  describe('Password Hashing', () => {
    it('should hash password with generated salt', async () => {
      const password = 'mySecurePassword123';

      const result = await CryptoUtils.hashPassword(password);

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(typeof result.hash).toBe('string');
      expect(typeof result.salt).toBe('string');
      expect(result.hash.length).toBeGreaterThan(0);
      expect(result.salt.length).toBeGreaterThan(0);
    });

    it('should hash password with provided salt', async () => {
      const password = 'mySecurePassword123';
      const salt = 'providedSalt';

      const result = await CryptoUtils.hashPassword(password, salt);

      expect(result.salt).toBe(salt);
      expect(result.hash).toBeDefined();
    });

    it('should verify correct password', async () => {
      const password = 'correctPassword123';
      const salt = 'testSalt';

      // First hash the password
      const hashResult = await CryptoUtils.hashPassword(password, salt);

      // Then verify it
      const isValid = await CryptoUtils.verifyPassword(
        password,
        hashResult.hash,
        salt
      );

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const correctPassword = 'correctPassword123';
      const incorrectPassword = 'wrongPassword123';
      const salt = 'testSalt';

      // Hash the correct password
      const hashResult = await CryptoUtils.hashPassword(correctPassword, salt);

      // Try to verify with incorrect password
      const isValid = await CryptoUtils.verifyPassword(
        incorrectPassword,
        hashResult.hash,
        salt
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt text successfully', async () => {
      const plaintext = 'This is secret data that needs protection';
      const password = 'encryptionPassword123';

      const encrypted = await CryptoUtils.encrypt(plaintext, password);
      const decrypted = await CryptoUtils.decrypt(encrypted, password);

      expect(typeof encrypted).toBe('string');
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt with provided salt', async () => {
      const plaintext = 'Secret message';
      const password = 'password123';
      const salt = 'customSalt';

      const encrypted = await CryptoUtils.encrypt(plaintext, password, salt);
      const encryptedData = JSON.parse(encrypted);

      expect(encryptedData.salt).toBe(salt);
    });

    it('should fail to decrypt with wrong password', async () => {
      const plaintext = 'Secret message';
      const correctPassword = 'correctPassword123';
      const wrongPassword = 'wrongPassword123';

      const encrypted = await CryptoUtils.encrypt(plaintext, correctPassword);
      const decrypted = await CryptoUtils.decrypt(encrypted, wrongPassword);

      // With XOR cipher, wrong password produces different result
      expect(decrypted).not.toBe(plaintext);
    });

    it('should handle malformed encrypted data', async () => {
      const malformedData = 'invalid-json-data';
      const password = 'password123';

      await expect(
        CryptoUtils.decrypt(malformedData, password)
      ).rejects.toThrow('Decryption failed');
    });

    it('should handle empty text encryption', async () => {
      const plaintext = '';
      const password = 'password123';

      const encrypted = await CryptoUtils.encrypt(plaintext, password);
      const decrypted = await CryptoUtils.decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const text = 'test';

      const encrypted = await CryptoUtils.encrypt(text, longPassword);
      const decrypted = await CryptoUtils.decrypt(encrypted, longPassword);

      expect(decrypted).toBe(text);
    });

    it('should handle special characters in text', async () => {
      const specialText = '🔐 Special chars: äöü ñ 中文 🚀';
      const password = 'password123';

      const encrypted = await CryptoUtils.encrypt(specialText, password);
      const decrypted = await CryptoUtils.decrypt(encrypted, password);

      expect(decrypted).toBe(specialText);
    });

    it('should generate unique salts', () => {
      const salt1 = CryptoUtils.generateSalt();
      const salt2 = CryptoUtils.generateSalt();

      expect(salt1).not.toBe(salt2);
    });

    it('should generate unique recovery codes', () => {
      const codes1 = CryptoUtils.generateRecoveryCodes(5);
      const codes2 = CryptoUtils.generateRecoveryCodes(5);

      // All codes should be unique
      const allCodes = [...codes1, ...codes2];
      const uniqueCodes = [...new Set(allCodes)];
      expect(uniqueCodes.length).toBe(allCodes.length);
    });
  });
});

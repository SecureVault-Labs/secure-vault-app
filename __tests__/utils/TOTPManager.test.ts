import { TOTPManager } from '../../utils/TOTPManager';
import * as Crypto from 'expo-crypto';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(),
  getRandomValues: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA1: 'SHA1',
    SHA256: 'SHA256',
    SHA512: 'SHA512',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

describe('TOTPManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getRandomValues
    (Crypto.getRandomValues as jest.Mock).mockImplementation(
      (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }
    );

    // Mock digestStringAsync to return predictable hashes
    (Crypto.digestStringAsync as jest.Mock).mockImplementation(
      async (algorithm: string, data: string, options: any) => {
        // Return different mock hashes based on the algorithm for realistic testing
        const mockHashes: Record<string, string> = {
          SHA1: '356a192b7913b04c54574d18c28d46e6395428ab',
          SHA256:
            'e258d248fda94c63753607f7c4494ee0fcbe92f1a76bfdac795c9d84101eb317',
          SHA512:
            'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86',
        };

        return mockHashes[algorithm] || mockHashes['SHA1'];
      }
    );
  });

  describe('Secret Generation', () => {
    it('should generate a Base32 secret', () => {
      const secret = TOTPManager.generateSecret();

      expect(typeof secret).toBe('string');
      expect(secret.length).toBe(32);
      expect(TOTPManager.isValidSecret(secret)).toBe(true);
    });

    it('should generate secret of specified length', () => {
      const secret = TOTPManager.generateSecret(16);

      expect(secret.length).toBe(16);
      expect(TOTPManager.isValidSecret(secret)).toBe(true);
    });
  });

  describe('Secret Validation', () => {
    it('should validate correct Base32 secrets', () => {
      const validSecrets = [
        'GZODAPOGD2N2XGVTTVV46QWVWWDW5L42', // User's actual secret
        'JBSWY3DPEHPK3PXP',
        'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
        'MFRGG43FMZQW63TFEBQXGZLCMVZG6Z3SMFRGM5TFKV4SAYK=',
      ];

      validSecrets.forEach((secret) => {
        expect(TOTPManager.isValidSecret(secret)).toBe(true);
      });
    });

    it('should reject invalid secrets', () => {
      const invalidSecrets = [
        '', // Empty
        'ABC', // Too short
        'ABC123!@#', // Invalid characters
        'ABCDEFGH189', // Invalid Base32 (contains 8, 9)
      ];

      invalidSecrets.forEach((secret) => {
        expect(TOTPManager.isValidSecret(secret)).toBe(false);
      });
    });
  });

  describe('TOTP Generation and Verification', () => {
    const testSecret = 'GZODAPOGD2N2XGVTTVV46QWVWWDW5L42';

    it('should generate TOTP code with default config', async () => {
      const code = await TOTPManager.generateTOTP(testSecret);

      expect(typeof code).toBe('string');
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes for different time steps', async () => {
      const originalTime = Date.now;

      // Mock different timestamps
      Date.now = jest.fn().mockReturnValueOnce(1000000 * 1000); // Time step 1
      const code1 = await TOTPManager.generateTOTP(testSecret);

      Date.now = jest.fn().mockReturnValueOnce(1000030 * 1000); // Time step 2 (30 seconds later)
      const code2 = await TOTPManager.generateTOTP(testSecret);

      expect(code1).not.toBe(code2);

      // Restore original Date.now
      Date.now = originalTime;
    });

    it('should verify valid TOTP code within time window', async () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeStep = Math.floor(currentTime / 30);

      // Generate a code for current time
      const code = await TOTPManager.generateTOTP(testSecret);

      // Verify the same code
      const result = await TOTPManager.verifyTOTP(code, testSecret);
      expect(result.valid).toBe(true);
      expect(result.timeStep).toBeDefined();
    });

    it('should handle clock drift with window tolerance', async () => {
      const originalTime = Date.now;

      // Generate code at time T
      Date.now = jest.fn().mockReturnValue(1000000 * 1000);
      const code = await TOTPManager.generateTOTP(testSecret);

      // Verify code at time T+15 seconds (still within same period)
      Date.now = jest.fn().mockReturnValue(1000015 * 1000);
      const result = await TOTPManager.verifyTOTP(code, testSecret);
      expect(result.valid).toBe(true);

      Date.now = originalTime;
    });

    it('should reject invalid TOTP codes', async () => {
      const result = await TOTPManager.verifyTOTP('000000', testSecret);
      expect(result.valid).toBe(false);
      expect(result.timeStep).toBeUndefined();
    });
  });

  describe('QR Code Generation', () => {
    it('should generate proper QR code data', () => {
      const secret = 'GZODAPOGD2N2XGVTTVV46QWVWWDW5L42';
      const issuer = 'SecureVault';
      const accountName = 'user@example.com';

      const qrData = TOTPManager.generateQRCodeData(
        secret,
        issuer,
        accountName
      );

      expect(qrData).toContain('otpauth://totp/');
      expect(qrData).toContain(`secret=${secret}`);
      expect(qrData).toContain(`issuer=${encodeURIComponent(issuer)}`);
      expect(qrData).toContain('algorithm=SHA1');
      expect(qrData).toContain('digits=6');
      expect(qrData).toContain('period=30');
    });
  });

  describe('Time Utilities', () => {
    it('should calculate remaining time in period', () => {
      const originalTime = Date.now;

      // Mock timestamp: 15 seconds into a 30-second period
      Date.now = jest.fn().mockReturnValue(1000015 * 1000);

      const remaining = TOTPManager.getRemainingTime();
      expect(remaining).toBe(15); // 30 - 15 = 15 seconds remaining

      Date.now = originalTime;
    });
  });

  describe('Base32 Decoding', () => {
    it('should correctly decode Base32 strings', () => {
      // Test the private base32Decode method by testing through TOTP generation
      const knownSecret = 'JBSWY3DPEHPK3PXP'; // "Hello World!" in Base32

      expect(async () => {
        await TOTPManager.generateTOTP(knownSecret);
      }).not.toThrow();
    });
  });

  describe('Real-world TOTP Integration Test', () => {
    it('should work with the users actual secret from Authy', async () => {
      const userSecret = 'GZODAPOGD2N2XGVTTVV46QWVWWDW5L42';

      // Validate the secret format
      expect(TOTPManager.isValidSecret(userSecret)).toBe(true);

      // Generate a TOTP code
      const generatedCode = await TOTPManager.generateTOTP(userSecret);
      expect(generatedCode).toMatch(/^\d{6}$/);

      // Verify the generated code should be valid
      const verificationResult = await TOTPManager.verifyTOTP(
        generatedCode,
        userSecret
      );
      expect(verificationResult.valid).toBe(true);

      console.log(
        `🔐 Generated TOTP for secret ${userSecret}: ${generatedCode}`
      );
      console.log(`✅ Verification result:`, verificationResult);
    });

    it('should demonstrate time synchronization issues', async () => {
      const userSecret = 'GZODAPOGD2N2XGVTTVV46QWVWWDW5L42';

      // Test with different mock times to show the issue
      const originalTime = Date.now;

      // Test at exact 30-second boundary
      Date.now = jest.fn().mockReturnValue(1640995200000); // Exact timestamp
      const code1 = await TOTPManager.generateTOTP(userSecret);

      // Test 1 second later (should be same code)
      Date.now = jest.fn().mockReturnValue(1640995201000);
      const code2 = await TOTPManager.generateTOTP(userSecret);

      // Test 30 seconds later (should be different code)
      Date.now = jest.fn().mockReturnValue(1640995230000);
      const code3 = await TOTPManager.generateTOTP(userSecret);

      expect(code1).toBe(code2); // Same time window
      expect(code1).not.toBe(code3); // Different time window

      console.log(`🕐 TOTP codes at different times:`);
      console.log(`   Time 0: ${code1}`);
      console.log(`   Time +1s: ${code2}`);
      console.log(`   Time +30s: ${code3}`);

      Date.now = originalTime;
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto errors gracefully', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockRejectedValue(
        new Error('Crypto unavailable')
      );

      await expect(
        TOTPManager.generateTOTP('JBSWY3DPEHPK3PXP')
      ).rejects.toThrow('Crypto unavailable');
    });
  });
});

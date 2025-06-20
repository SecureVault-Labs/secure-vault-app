import * as Crypto from 'expo-crypto';

interface TOTPConfig {
  secret: string;
  digits: number;
  period: number;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
}

interface TOTPVerificationResult {
  valid: boolean;
  timeStep?: number;
}

export class TOTPManager {
  private static readonly DEFAULT_DIGITS = 6;
  private static readonly DEFAULT_PERIOD = 30;
  private static readonly DEFAULT_ALGORITHM = 'SHA1';
  private static readonly WINDOW_SIZE = 1; // Allow 1 time step before/after for clock drift

  /**
   * Generate a TOTP secret (Base32 encoded)
   */
  static generateSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 alphabet
    const randomBytes = new Uint8Array(length);
    Crypto.getRandomValues(randomBytes);

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes[i] % chars.length;
      const selectedChar = chars[randomIndex];
      result += selectedChar;
    }

    // Additional validation to ensure no invalid characters
    const base32Regex = /^[A-Z2-7]+$/;
    if (!base32Regex.test(result)) {
      console.error('❌ Generated invalid TOTP secret:', result);
      console.error('Invalid characters found. Regenerating...');
      // Recursively regenerate if invalid (should never happen with correct implementation)
      return this.generateSecret(length);
    }

    // Additional check for common problematic characters
    if (
      result.includes('0') ||
      result.includes('1') ||
      result.includes('8') ||
      result.includes('9')
    ) {
      console.error(
        '❌ Generated TOTP secret contains invalid characters:',
        result
      );
      console.error('Regenerating secret...');
      return this.generateSecret(length);
    }

    console.log('✅ Generated valid TOTP secret of length:', result.length);
    return result;
  }

  /**
   * Generate TOTP code for current time
   */
  static async generateTOTP(
    secret: string,
    config?: Partial<TOTPConfig>
  ): Promise<string> {
    const fullConfig: TOTPConfig = {
      secret,
      digits: config?.digits || this.DEFAULT_DIGITS,
      period: config?.period || this.DEFAULT_PERIOD,
      algorithm: config?.algorithm || this.DEFAULT_ALGORITHM,
    };

    const timeStep = Math.floor(Date.now() / 1000 / fullConfig.period);
    return this.generateTOTPForTimeStep(fullConfig, timeStep);
  }

  /**
   * Verify a TOTP code
   */
  static async verifyTOTP(
    token: string,
    secret: string,
    config?: Partial<TOTPConfig>
  ): Promise<TOTPVerificationResult> {
    const fullConfig: TOTPConfig = {
      secret,
      digits: config?.digits || this.DEFAULT_DIGITS,
      period: config?.period || this.DEFAULT_PERIOD,
      algorithm: config?.algorithm || this.DEFAULT_ALGORITHM,
    };

    const currentTime = Math.floor(Date.now() / 1000);
    const currentTimeStep = Math.floor(currentTime / fullConfig.period);

    // Check current time step and adjacent ones for clock drift tolerance
    for (let i = -this.WINDOW_SIZE; i <= this.WINDOW_SIZE; i++) {
      const timeStep = currentTimeStep + i;
      const expectedToken = await this.generateTOTPForTimeStep(
        fullConfig,
        timeStep
      );
      if (this.constantTimeCompare(token, expectedToken)) {
        return { valid: true, timeStep };
      }
    }

    return { valid: false };
  }

  /**
   * Generate QR code data for TOTP setup
   */
  static generateQRCodeData(
    secret: string,
    issuer: string,
    accountName: string,
    config?: Partial<TOTPConfig>
  ): string {
    const fullConfig: TOTPConfig = {
      secret,
      digits: config?.digits || this.DEFAULT_DIGITS,
      period: config?.period || this.DEFAULT_PERIOD,
      algorithm: config?.algorithm || this.DEFAULT_ALGORITHM,
    };

    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);

    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${fullConfig.algorithm}&digits=${fullConfig.digits}&period=${fullConfig.period}`;
  }

  /**
   * Generate TOTP for a specific time step (RFC 6238 compliant)
   */
  private static async generateTOTPForTimeStep(
    config: TOTPConfig,
    timeStep: number
  ): Promise<string> {
    // Convert secret from Base32 to bytes
    const secretBytes = this.base32Decode(config.secret);

    // Create 8-byte big-endian time counter (RFC 6238)
    const timeBuffer = new Uint8Array(8);
    // JavaScript bitwise operations work on 32-bit signed integers
    // For time steps > 2^32, we need to handle high and low parts separately
    const high = Math.floor(timeStep / 0x100000000);
    const low = timeStep & 0xffffffff;

    // Big-endian encoding
    timeBuffer[0] = (high >>> 24) & 0xff;
    timeBuffer[1] = (high >>> 16) & 0xff;
    timeBuffer[2] = (high >>> 8) & 0xff;
    timeBuffer[3] = high & 0xff;
    timeBuffer[4] = (low >>> 24) & 0xff;
    timeBuffer[5] = (low >>> 16) & 0xff;
    timeBuffer[6] = (low >>> 8) & 0xff;
    timeBuffer[7] = low & 0xff;

    // Generate HMAC-SHA1 (RFC 6238 uses SHA1 by default)
    const hmac = await this.hmac(secretBytes, timeBuffer, config.algorithm);

    // Dynamic truncation (RFC 4226 Section 5.3)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binaryCode =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    // Generate the final TOTP value
    const code = binaryCode % Math.pow(10, config.digits);

    return code.toString().padStart(config.digits, '0');
  }

  /**
   * RFC 6238 compliant HMAC-SHA1 implementation
   * Follows RFC 2104 specification exactly
   */
  private static async hmac(
    key: Uint8Array,
    data: Uint8Array,
    algorithm: string
  ): Promise<Uint8Array> {
    const blockSize = algorithm === 'SHA1' ? 64 : 64; // SHA-1 block size is 64 bytes
    let keyBytes: Uint8Array;

    // If key is longer than block size, hash it first
    if (key.length > blockSize) {
      keyBytes = await this.hash(key, algorithm);
    } else {
      keyBytes = new Uint8Array(key);
    }

    // Pad key to block size with zeros
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(keyBytes);

    // Create inner and outer padding
    const innerPad = new Uint8Array(blockSize);
    const outerPad = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
      innerPad[i] = paddedKey[i] ^ 0x36; // ipad
      outerPad[i] = paddedKey[i] ^ 0x5c; // opad
    }

    // Inner hash: H(K ⊕ ipad || message)
    const innerData = new Uint8Array(innerPad.length + data.length);
    innerData.set(innerPad, 0);
    innerData.set(data, innerPad.length);
    const innerHash = await this.hash(innerData, algorithm);

    // Outer hash: H(K ⊕ opad || H(K ⊕ ipad || message))
    const outerData = new Uint8Array(outerPad.length + innerHash.length);
    outerData.set(outerPad, 0);
    outerData.set(innerHash, outerPad.length);

    return await this.hash(outerData, algorithm);
  }

  /**
   * Convert Uint8Array to Base64 string
   */
  private static uint8ArrayToBase64(data: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert hex string to Uint8Array
   */
  private static hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Hash function using expo-crypto - properly handles binary data
   */
  private static async hash(
    data: Uint8Array,
    algorithm: string
  ): Promise<Uint8Array> {
    let cryptoAlgorithm: Crypto.CryptoDigestAlgorithm;

    switch (algorithm) {
      case 'SHA1':
        cryptoAlgorithm = Crypto.CryptoDigestAlgorithm.SHA1;
        break;
      case 'SHA256':
        cryptoAlgorithm = Crypto.CryptoDigestAlgorithm.SHA256;
        break;
      case 'SHA512':
        cryptoAlgorithm = Crypto.CryptoDigestAlgorithm.SHA512;
        break;
      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    // Use Crypto.digest for binary data (not digestStringAsync)
    const hashBuffer = await Crypto.digest(cryptoAlgorithm, data as any);

    // Convert ArrayBuffer to Uint8Array
    return new Uint8Array(hashBuffer);
  }

  /**
   * Base32 decode (RFC 4648)
   */
  private static base32Decode(encoded: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');

    let bits = '';
    for (const char of cleanInput) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      bits += index.toString(2).padStart(5, '0');
    }

    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      const byteBits = bits.substr(i * 8, 8);
      bytes[i] = parseInt(byteBits, 2);
    }

    return bytes;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get remaining time in current TOTP period
   */
  static getRemainingTime(period: number = 30): number {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
  }

  /**
   * Validate TOTP secret format
   */
  static isValidSecret(secret: string): boolean {
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret.toUpperCase()) && secret.length >= 16;
  }
}

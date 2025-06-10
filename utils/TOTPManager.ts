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
      result += chars[randomBytes[i] % chars.length];
    }
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

    const currentTimeStep = Math.floor(Date.now() / 1000 / fullConfig.period);

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
   * Generate TOTP for a specific time step
   */
  private static async generateTOTPForTimeStep(
    config: TOTPConfig,
    timeStep: number
  ): Promise<string> {
    // Convert secret from Base32 to bytes
    const secretBytes = this.base32Decode(config.secret);

    // Convert time step to 8-byte big-endian
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, timeStep, false); // Big-endian, high 32 bits are 0

    // Generate HMAC
    const hmac = await this.hmac(
      secretBytes,
      new Uint8Array(timeBuffer),
      config.algorithm
    );

    // Dynamic truncation (RFC 4226)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      (((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)) %
      Math.pow(10, config.digits);

    return code.toString().padStart(config.digits, '0');
  }

  /**
   * HMAC implementation using expo-crypto
   */
  private static async hmac(
    key: Uint8Array,
    data: Uint8Array,
    algorithm: string
  ): Promise<Uint8Array> {
    // For simplicity, we'll use a basic HMAC implementation
    // In production, you might want to use a more robust implementation

    const blockSize = 64; // SHA-1 and SHA-256 block size
    let keyBytes = key;

    // If key is longer than block size, hash it
    if (keyBytes.length > blockSize) {
      const hashedKey = await this.hash(keyBytes, algorithm);
      keyBytes = hashedKey;
    }

    // Pad key to block size
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(keyBytes);

    // Create inner and outer padding
    const innerPad = new Uint8Array(blockSize);
    const outerPad = new Uint8Array(blockSize);

    for (let i = 0; i < blockSize; i++) {
      innerPad[i] = paddedKey[i] ^ 0x36;
      outerPad[i] = paddedKey[i] ^ 0x5c;
    }

    // Inner hash: hash(innerPad + data)
    const innerData = new Uint8Array(innerPad.length + data.length);
    innerData.set(innerPad);
    innerData.set(data, innerPad.length);
    const innerHash = await this.hash(innerData, algorithm);

    // Outer hash: hash(outerPad + innerHash)
    const outerData = new Uint8Array(outerPad.length + innerHash.length);
    outerData.set(outerPad);
    outerData.set(innerHash, outerPad.length);

    return this.hash(outerData, algorithm);
  }

  /**
   * Hash function using expo-crypto
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

    // Convert Uint8Array to string for expo-crypto
    const dataString = Array.from(data)
      .map((b) => String.fromCharCode(b))
      .join('');

    const hashHex = await Crypto.digestStringAsync(
      cryptoAlgorithm,
      dataString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // Convert hex string back to Uint8Array
    const hashBytes = new Uint8Array(hashHex.length / 2);
    for (let i = 0; i < hashHex.length; i += 2) {
      hashBytes[i / 2] = parseInt(hashHex.substr(i, 2), 16);
    }

    return hashBytes;
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

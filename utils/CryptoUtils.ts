import * as Crypto from 'expo-crypto';

interface PasswordHashResult {
  hash: string;
  salt: string;
}

interface EncryptionResult {
  encrypted: string;
  salt: string;
}

export class CryptoUtils {
  // Generate secure random bytes
  static generateRandomBytes(length: number = 32): Uint8Array {
    console.log('🔢 generateRandomBytes started');
    console.log('📊 Byte array length:', length);

    const array = new Uint8Array(length);
    console.log('📦 Uint8Array created');

    console.log('🎲 Calling Crypto.getRandomValues...');
    const result = Crypto.getRandomValues(array);
    console.log('✅ generateRandomBytes completed');
    console.log('📊 Result length:', result.length);

    return result;
  }

  // Generate random string for secrets
  static generateRandomString(length: number = 32): string {
    console.log('🎲 generateRandomString started');
    console.log('📊 String length:', length);

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    console.log('📝 Character set length:', chars.length);

    console.log('🎲 Generating random bytes...');
    const randomBytes = this.generateRandomBytes(length);
    console.log('✅ Random bytes generated');

    console.log('🔤 Converting bytes to string...');
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    console.log('✅ generateRandomString completed');
    console.log('📊 Result length:', result.length);

    return result;
  }

  // Generate salt for password hashing
  static generateSalt(length: number = 32): string {
    console.log('🧂 generateSalt started');
    console.log('📊 Salt length:', length);

    const result = this.generateRandomString(length);

    console.log('✅ generateSalt completed');
    console.log('📊 Generated salt length:', result.length);

    return result;
  }

  // Simple PBKDF2 implementation using expo-crypto
  static async deriveKey(
    password: string,
    salt: string,
    iterations: number = 10000, // Reduced from 100,000 to 10,000 for mobile performance
    keyLength: number = 32
  ): Promise<string> {
    console.log('🔑 deriveKey started');
    console.log('📊 Parameters:', {
      passwordLength: password.length,
      saltLength: salt.length,
      iterations,
      keyLength,
    });

    console.log('📝 Converting password and salt to proper format...');
    // Convert password and salt to proper format
    const passwordData = new TextEncoder().encode(password);
    const saltData = new TextEncoder().encode(salt);
    console.log('✅ Password and salt encoded');
    console.log('📊 Encoded lengths:', {
      passwordData: passwordData.length,
      saltData: saltData.length,
    });

    console.log('🔗 Combining password and salt data...');
    // Use expo-crypto's digest function iteratively for PBKDF2-like behavior
    let derived = new Uint8Array([...passwordData, ...saltData]);
    console.log('✅ Initial derived data created');
    console.log('📊 Initial derived length:', derived.length);

    console.log(`🔄 Starting ${iterations} iterations...`);
    for (let i = 0; i < iterations; i++) {
      if (i % 1000 === 0) {
        console.log(
          `🔄 Iteration ${i}/${iterations} (${((i / iterations) * 100).toFixed(
            1
          )}%)`
        );
      }

      try {
        const dataString = Array.from(derived)
          .map((b) => String.fromCharCode(b))
          .join('');

        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          dataString,
          { encoding: Crypto.CryptoEncoding.HEX }
        );

        derived = new Uint8Array(
          hash.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
        );
      } catch (error) {
        console.log(`💥 Error at iteration ${i}:`, error);
        throw error;
      }
    }
    console.log('✅ All iterations completed');

    console.log('✂️ Slicing to key length...');
    const result = Array.from(derived.slice(0, keyLength))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    console.log('✅ deriveKey completed');
    console.log('📊 Result length:', result.length);

    return result;
  }

  // Simple AES encryption using a derived key
  static async encrypt(
    text: string,
    password: string,
    salt?: string
  ): Promise<string> {
    if (!salt) {
      salt = this.generateSalt();
    }

    const key = await this.deriveKey(password, salt);

    // For simplicity, we'll use base64 encoding with the key as a simple XOR cipher
    // In production, you'd want to use a proper AES implementation
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);

    const encrypted = textBytes.map(
      (byte, i) => byte ^ keyBytes[i % keyBytes.length]
    );

    const result: EncryptionResult = {
      encrypted: btoa(String.fromCharCode(...encrypted)),
      salt: salt,
    };

    return JSON.stringify(result);
  }

  // Simple AES decryption
  static async decrypt(
    encryptedData: string,
    password: string
  ): Promise<string> {
    try {
      const { encrypted, salt }: EncryptionResult = JSON.parse(encryptedData);
      const key = await this.deriveKey(password, salt);

      const encryptedBytes = new Uint8Array(
        atob(encrypted)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      const keyBytes = new TextEncoder().encode(key);

      const decrypted = encryptedBytes.map(
        (byte, i) => byte ^ keyBytes[i % keyBytes.length]
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: ' + (error as Error).message);
    }
  }

  // Hash password for storage
  static async hashPassword(
    password: string,
    salt?: string
  ): Promise<PasswordHashResult> {
    console.log('🔐 hashPassword started');
    console.log('📊 Parameters:', {
      passwordLength: password.length,
      hasSalt: !!salt,
      saltLength: salt?.length || 0,
    });

    if (!salt) {
      console.log('🧂 Generating new salt...');
      salt = this.generateSalt();
      console.log('✅ Salt generated');
      console.log('📊 Generated salt length:', salt.length);
    } else {
      console.log('✅ Using provided salt');
    }

    console.log('🔑 Calling deriveKey for password hashing...');
    const hash = await this.deriveKey(password, salt, 10000, 64); // Reduced iterations for mobile performance
    console.log('✅ Password hash derived');

    const result = {
      hash: hash,
      salt: salt,
    };

    console.log('🎉 hashPassword completed');
    console.log('📊 Result:', {
      hashLength: result.hash.length,
      saltLength: result.salt.length,
    });

    return result;
  }

  // Verify password against stored hash
  static async verifyPassword(
    password: string,
    storedHash: string,
    salt: string
  ): Promise<boolean> {
    const { hash } = await this.hashPassword(password, salt);
    return hash === storedHash;
  }

  // Generate TOTP secret
  static generateTOTPSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 characters
    const randomBytes = this.generateRandomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }
    return result;
  }

  // Generate recovery codes
  static generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      codes.push(this.generateRandomString(8).toUpperCase());
    }
    return codes;
  }

  // Generate session ID
  static generateSessionId(): string {
    return this.generateRandomString(64);
  }
}

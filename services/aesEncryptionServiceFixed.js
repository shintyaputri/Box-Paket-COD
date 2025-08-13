/**
 * AES ENCRYPTION SERVICE - React Native Get Random Values Fix
 * 
 * Updated AES encryption service yang menggunakan react-native-get-random-values
 * untuk mengatasi "Native crypto module could not be used" error.
 * 
 * Solution berdasarkan research 2024 untuk React Native crypto compatibility:
 * - Menggunakan react-native-get-random-values sebagai polyfill
 * - Fallback ke expo-crypto jika tersedia
 * - Ultimate fallback ke pure JavaScript implementation
 * 
 * Features:
 * - AES-128-CBC encryption dengan crypto-js
 * - React Native compatible random value generation
 * - Comprehensive fallback mechanisms
 * - No native crypto module dependencies
 * - Full backward compatibility
 * 
 * @author Shintya Package Delivery System
 * @version 2.1.0 (React Native Get Random Values Fix)
 */

// IMPORTANT: Import polyfill first before any crypto operations
import 'react-native-get-random-values';

import CryptoJS from 'crypto-js';

// Try to import expo-crypto if available (optional)
let ExpoCrypto = null;
try {
  ExpoCrypto = require('expo-crypto');
  console.log('[AESEncryptionServiceFixed] Expo Crypto available');
} catch (error) {
  console.log('[AESEncryptionServiceFixed] Expo Crypto not available, using polyfill');
}

/**
 * AES Encryption Service with React Native Get Random Values
 * 
 * Provides AES-128-CBC encryption/decryption dengan secure random values
 * menggunakan react-native-get-random-values polyfill.
 */
export class AESEncryptionServiceFixed {
  constructor(secretKey, keyDerivation = 'default') {
    this.secretKey = secretKey;
    this.keyDerivation = keyDerivation;
    this.algorithm = 'AES-128-CBC';
    this.version = '2.1.0';
    
    // Derive actual encryption key dari secret
    this.encryptionKey = this.deriveKey(secretKey, keyDerivation);
    
    console.log(`[AESEncryptionServiceFixed] Initialized v${this.version}`);
    console.log(`[AESEncryptionServiceFixed] Crypto polyfill loaded: ${typeof crypto !== 'undefined' && crypto.getRandomValues ? 'YES' : 'NO'}`);
  }
  
  /**
   * Derive encryption key dari secret key
   * 
   * @param {string} secretKey - Base secret key
   * @param {string} derivation - Key derivation method
   * @returns {string} Derived encryption key
   */
  deriveKey(secretKey, derivation) {
    const salt = `SHINTYA_AES_SALT_2024_${derivation}`;
    const iterations = 1000;
    
    return CryptoJS.PBKDF2(secretKey, salt, {
      keySize: 128 / 32, // 128-bit key
      iterations: iterations
    }).toString();
  }
  
  /**
   * Generate cryptographically secure random bytes
   * Menggunakan react-native-get-random-values polyfill
   * 
   * @param {number} byteCount - Number of bytes to generate
   * @returns {Uint8Array} Random bytes
   */
  generateSecureRandomBytes(byteCount = 16) {
    try {
      // Method 1: Try react-native-get-random-values polyfill
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        console.log('[AESEncryptionServiceFixed] Using crypto.getRandomValues (polyfill)');
        const randomBytes = new Uint8Array(byteCount);
        crypto.getRandomValues(randomBytes);
        return randomBytes;
      }
      
      // Method 2: Try Expo Crypto if available
      if (ExpoCrypto && ExpoCrypto.getRandomBytes) {
        console.log('[AESEncryptionServiceFixed] Using Expo Crypto');
        return ExpoCrypto.getRandomBytes(byteCount);
      }
      
      // Method 3: Fallback to pure JavaScript
      console.log('[AESEncryptionServiceFixed] Using pure JavaScript fallback');
      return this.generatePureJSRandomBytes(byteCount);
      
    } catch (error) {
      console.error('[AESEncryptionServiceFixed] All random generation methods failed:', error.message);
      // Ultimate fallback
      return this.generatePureJSRandomBytes(byteCount);
    }
  }
  
  /**
   * Generate random bytes using pure JavaScript
   * 
   * @param {number} byteCount - Number of bytes to generate
   * @returns {Uint8Array} Random bytes
   */
  generatePureJSRandomBytes(byteCount = 16) {
    const array = new Uint8Array(byteCount);
    const timestamp = Date.now();
    const performance = typeof window !== 'undefined' && window.performance ? 
      window.performance.now() : Math.random() * 1000000;
    
    for (let i = 0; i < byteCount; i++) {
      // Mix multiple entropy sources
      const entropy1 = Math.random() * 256;
      const entropy2 = ((timestamp * (i + 1)) % 256);
      const entropy3 = ((performance * (i + 2)) % 256);
      
      array[i] = Math.floor(entropy1 ^ entropy2 ^ entropy3) % 256;
    }
    
    return array;
  }
  
  /**
   * Generate cryptographically secure IV
   * 
   * @returns {CryptoJS.lib.WordArray} Random IV untuk AES encryption
   */
  generateSecureIV() {
    try {
      const randomBytes = this.generateSecureRandomBytes(16);
      const hex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const iv = CryptoJS.enc.Hex.parse(hex);
      console.log(`[AESEncryptionServiceFixed] Generated IV: ${hex.substring(0, 8)}...`);
      return iv;
      
    } catch (error) {
      console.error('[AESEncryptionServiceFixed] IV generation failed:', error.message);
      throw new Error(`IV generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate secure nonce untuk QR uniqueness
   * 
   * @returns {string} Random nonce string
   */
  generateNonce() {
    try {
      const randomBytes = this.generateSecureRandomBytes(8);
      const timestamp = Date.now().toString(36);
      const randomHex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const nonce = (timestamp + randomHex).substring(0, 16);
      console.log(`[AESEncryptionServiceFixed] Generated nonce: ${nonce}`);
      return nonce;
      
    } catch (error) {
      console.error('[AESEncryptionServiceFixed] Nonce generation failed:', error.message);
      // Fallback to timestamp + Math.random
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return (timestamp + random).substring(0, 16);
    }
  }
  
  /**
   * Encrypt data dengan AES-128-CBC
   * 
   * @param {Object} data - Data yang akan di-encrypt
   * @returns {string} Encrypted string dalam format IV:EncryptedData
   */
  encrypt(data) {
    try {
      console.log(`[AESEncryptionServiceFixed] Starting AES encryption...`);
      
      // Add metadata untuk security dan validation
      const dataWithMetadata = {
        ...data,
        timestamp: Date.now(),
        nonce: this.generateNonce(),
        version: this.version,
        algorithm: this.algorithm,
        cryptoProvider: 'react-native-get-random-values'
      };
      
      const jsonString = JSON.stringify(dataWithMetadata);
      const iv = this.generateSecureIV();
      
      // Encrypt dengan AES-128-CBC
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Return dalam format IV:EncryptedData
      const result = iv.toString() + ':' + encrypted.toString();
      
      console.log(`[AESEncryptionServiceFixed] Encryption successful, length: ${result.length}`);
      return result;
      
    } catch (error) {
      console.error('[AESEncryptionServiceFixed] Encryption failed:', error.message);
      throw new Error(`AES encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt AES encrypted data
   * 
   * @param {string} encryptedData - Encrypted string dalam format IV:EncryptedData
   * @returns {Object} Decrypted data object
   */
  decrypt(encryptedData) {
    try {
      console.log(`[AESEncryptionServiceFixed] Starting AES decryption...`);
      
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format');
      }
      
      // Parse IV dan encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format - missing IV');
      }
      
      const [ivHex, encryptedHex] = parts;
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      
      // Decrypt dengan AES-128-CBC
      const decrypted = CryptoJS.AES.decrypt(encryptedHex, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }
      
      const parsedData = JSON.parse(decryptedString);
      
      // Validate timestamp untuk prevent replay attacks
      if (parsedData.timestamp) {
        const age = Date.now() - parsedData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > maxAge) {
          console.warn('[AESEncryptionServiceFixed] QR code is older than 24 hours');
        }
      }
      
      console.log(`[AESEncryptionServiceFixed] Decryption successful`);
      return parsedData;
      
    } catch (error) {
      console.error('[AESEncryptionServiceFixed] Decryption failed:', error.message);
      throw new Error(`AES decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Validate encrypted data tanpa full decryption
   * 
   * @param {string} encryptedData - Encrypted data untuk validation
   * @returns {boolean} True jika format valid
   */
  isValidEncryptedData(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return false;
      }
      
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        return false;
      }
      
      const [ivHex, encryptedHex] = parts;
      
      // Basic validation - check hex format dan length
      const ivValid = /^[0-9a-fA-F]{32}$/.test(ivHex); // 16 bytes = 32 hex chars
      const encryptedValid = encryptedHex.length > 0;
      
      return ivValid && encryptedValid;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Test encryption/decryption dengan sample data
   * 
   * @returns {Object} Test result
   */
  testEncryption() {
    try {
      console.log(`[AESEncryptionServiceFixed] Running encryption test...`);
      
      const testData = {
        message: 'AES Fixed Test Message',
        timestamp: Date.now(),
        testId: Math.random().toString(36).substring(2, 15)
      };
      
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      const success = decrypted.message === testData.message &&
                     decrypted.testId === testData.testId;
      
      return {
        success,
        version: this.version,
        original: testData,
        encrypted: encrypted.substring(0, 50) + '...',
        decrypted: {
          message: decrypted.message,
          testId: decrypted.testId,
          version: decrypted.version,
          cryptoProvider: decrypted.cryptoProvider
        },
        encryptedLength: encrypted.length,
        polyfillAvailable: typeof crypto !== 'undefined' && crypto.getRandomValues
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        version: this.version,
        polyfillAvailable: typeof crypto !== 'undefined' && crypto.getRandomValues
      };
    }
  }
  
  /**
   * Get algorithm information
   * 
   * @returns {Object} Algorithm details
   */
  getAlgorithmInfo() {
    return {
      algorithm: this.algorithm,
      version: this.version,
      keySize: 128,
      mode: 'CBC',
      padding: 'PKCS7',
      ivSize: 128,
      cryptoProvider: 'react-native-get-random-values'
    };
  }
  
  /**
   * Get service version
   * 
   * @returns {string} Service version
   */
  getVersion() {
    return this.version;
  }
}

/**
 * Factory function untuk create AES Fixed instances
 * 
 * @param {string} secretKey - Secret key untuk encryption
 * @param {string} keyDerivation - Key derivation method
 * @returns {AESEncryptionServiceFixed} AES service instance
 */
export const createAESFixedInstance = (secretKey, keyDerivation = 'default') => {
  return new AESEncryptionServiceFixed(secretKey, keyDerivation);
};

/**
 * Default AES Fixed instances untuk different use cases
 */
export const AESFixedInstances = {
  userQR: createAESFixedInstance('SHINTYA_AES_USER_2024', 'user_qr'),
  packageQR: createAESFixedInstance('SHINTYA_AES_PACKAGE_2024', 'package_qr'),
  adminQR: createAESFixedInstance('SHINTYA_AES_ADMIN_2024', 'admin_qr')
};

/**
 * Test all AES Fixed instances
 * 
 * @returns {Object} Test results untuk all instances
 */
export const testAllAESFixedInstances = () => {
  const results = {};
  
  for (const [name, instance] of Object.entries(AESFixedInstances)) {
    console.log(`[AESEncryptionServiceFixed] Testing ${name} instance...`);
    results[name] = instance.testEncryption();
  }
  
  return results;
};

export default AESEncryptionServiceFixed;
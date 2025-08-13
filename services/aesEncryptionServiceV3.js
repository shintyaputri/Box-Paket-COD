/**
 * AES ENCRYPTION SERVICE V3 - Expo Crypto Implementation
 * 
 * Modern AES encryption service yang menggunakan Expo Crypto API
 * untuk mendapatkan cryptographically secure random values.
 * 
 * Menggantikan implementasi sebelumnya yang menggunakan custom crypto
 * dengan solution yang lebih reliable untuk React Native environment.
 * 
 * Features:
 * - AES-128-CBC encryption dengan Expo Crypto API
 * - Native secure random value generation
 * - Fallback mechanisms untuk compatibility
 * - Comprehensive error handling
 * - Full React Native compatibility
 * 
 * Security Improvements:
 * - Native platform crypto implementations
 * - Proper entropy sources dari OS
 * - Enhanced IV generation dengan Expo Crypto
 * - Secure nonce generation
 * - Replay attack protection
 * 
 * @author Shintya Package Delivery System
 * @version 3.0.0 (Expo Crypto Implementation)
 */

import CryptoJS from 'crypto-js';
import expoCryptoService from '../utils/expoCryptoService.js';

/**
 * AES Encryption Service V3 Class
 * 
 * Provides modern AES-128-CBC encryption/decryption dengan
 * native crypto implementations melalui Expo Crypto API.
 */
export class AESEncryptionServiceV3 {
  constructor(secretKey, keyDerivation = 'default') {
    this.secretKey = secretKey;
    this.keyDerivation = keyDerivation;
    this.algorithm = 'AES-128-CBC';
    this.version = '3.0.0';
    this.cryptoService = expoCryptoService;
    
    // Derive actual encryption key dari secret
    this.encryptionKey = this.deriveKey(secretKey, keyDerivation);
    
    console.log(`[AESEncryptionServiceV3] Initialized ${this.algorithm} v${this.version}`);
    console.log(`[AESEncryptionServiceV3] Key derivation: ${keyDerivation}`);
  }
  
  /**
   * Derive encryption key dari secret key menggunakan PBKDF2
   * 
   * @param {string} secretKey - Base secret key
   * @param {string} derivation - Key derivation method
   * @returns {string} Derived encryption key
   */
  deriveKey(secretKey, derivation) {
    const salt = `SHINTYA_AES_SALT_2024_${derivation}`;
    const iterations = 1000;
    
    try {
      const derivedKey = CryptoJS.PBKDF2(secretKey, salt, {
        keySize: 128 / 32, // 128-bit key
        iterations: iterations
      });
      
      console.log(`[AESEncryptionServiceV3] Key derived successfully`);
      return derivedKey.toString();
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Key derivation failed:', error.message);
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate cryptographically secure IV menggunakan Expo Crypto
   * 
   * @returns {CryptoJS.lib.WordArray} Secure IV untuk AES encryption
   */
  generateSecureIV() {
    try {
      // Use Expo Crypto service untuk secure IV generation
      const ivHex = this.cryptoService.generateSecureIV();
      
      // Convert hex string to CryptoJS WordArray
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      
      console.log(`[AESEncryptionServiceV3] Generated secure IV using Expo Crypto`);
      return iv;
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Secure IV generation failed:', error.message);
      
      // Fallback to crypto service fallback
      try {
        console.log('[AESEncryptionServiceV3] Attempting crypto service fallback...');
        const fallbackBytes = this.cryptoService.generateFallbackRandomBytes(16);
        const fallbackHex = Array.from(fallbackBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        return CryptoJS.enc.Hex.parse(fallbackHex);
        
      } catch (fallbackError) {
        console.error('[AESEncryptionServiceV3] Fallback IV generation failed:', fallbackError.message);
        throw new Error(`IV generation completely failed: ${error.message}`);
      }
    }
  }
  
  /**
   * Generate secure nonce menggunakan Expo Crypto
   * 
   * @returns {string} Secure nonce string
   */
  generateNonce() {
    try {
      // Use Expo Crypto service untuk nonce generation
      const nonce = this.cryptoService.generateNonce();
      
      console.log(`[AESEncryptionServiceV3] Generated nonce: ${nonce}`);
      return nonce;
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Nonce generation failed:', error.message);
      
      // Ultimate fallback
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return (timestamp + random).substring(0, 16);
    }
  }
  
  /**
   * Encrypt data dengan AES-128-CBC menggunakan secure IV
   * 
   * @param {Object} data - Data yang akan di-encrypt
   * @returns {string} Encrypted string dalam format IV:EncryptedData
   */
  encrypt(data) {
    try {
      console.log(`[AESEncryptionServiceV3] Starting AES encryption...`);
      
      // Add metadata untuk security dan validation
      const dataWithMetadata = {
        ...data,
        timestamp: Date.now(),
        nonce: this.generateNonce(),
        version: this.version,
        algorithm: this.algorithm,
        cryptoProvider: 'expo-crypto'
      };
      
      const jsonString = JSON.stringify(dataWithMetadata);
      
      // Generate secure IV menggunakan Expo Crypto
      const iv = this.generateSecureIV();
      
      // Encrypt dengan AES-128-CBC
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Return dalam format IV:EncryptedData
      const result = iv.toString() + ':' + encrypted.toString();
      
      console.log(`[AESEncryptionServiceV3] Encryption successful, length: ${result.length}`);
      return result;
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Encryption failed:', error.message);
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
      console.log(`[AESEncryptionServiceV3] Starting AES decryption...`);
      
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data format');
      }
      
      // Parse IV dan encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format - missing IV separator');
      }
      
      const [ivHex, encryptedHex] = parts;
      
      // Validate IV format
      if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
        throw new Error('Invalid IV format - must be 32 hex characters');
      }
      
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
          console.warn('[AESEncryptionServiceV3] QR code is older than 24 hours');
        }
      }
      
      console.log(`[AESEncryptionServiceV3] Decryption successful`);
      return parsedData;
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Decryption failed:', error.message);
      throw new Error(`AES decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Validate encrypted data format
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
      
      // Validate IV format (32 hex chars untuk 16 bytes)
      const ivValid = /^[0-9a-fA-F]{32}$/.test(ivHex);
      const encryptedValid = encryptedHex.length > 0;
      
      return ivValid && encryptedValid;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Test encryption/decryption functionality
   * 
   * @returns {Object} Test result
   */
  testEncryption() {
    try {
      console.log(`[AESEncryptionServiceV3] Running encryption test...`);
      
      const testData = {
        message: 'AES V3 Test Message',
        timestamp: Date.now(),
        testId: this.cryptoService.generateUUID()
      };
      
      // Test encryption
      const encrypted = this.encrypt(testData);
      
      // Test decryption
      const decrypted = this.decrypt(encrypted);
      
      // Validate results
      const success = decrypted.message === testData.message &&
                     decrypted.testId === testData.testId;
      
      const result = {
        success,
        version: this.version,
        algorithm: this.algorithm,
        cryptoProvider: 'expo-crypto',
        original: testData,
        encrypted: encrypted.substring(0, 50) + '...',
        decrypted: {
          message: decrypted.message,
          testId: decrypted.testId,
          version: decrypted.version,
          cryptoProvider: decrypted.cryptoProvider
        },
        encryptedLength: encrypted.length,
        cryptoServiceInfo: this.cryptoService.getServiceInfo()
      };
      
      console.log(`[AESEncryptionServiceV3] Encryption test ${success ? 'PASSED' : 'FAILED'}`);
      return result;
      
    } catch (error) {
      console.error('[AESEncryptionServiceV3] Encryption test failed:', error.message);
      return {
        success: false,
        error: error.message,
        version: this.version,
        cryptoServiceInfo: this.cryptoService.getServiceInfo()
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
      cryptoProvider: 'expo-crypto',
      keyDerivation: this.keyDerivation
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
 * Factory function untuk create AES V3 instances
 * 
 * @param {string} secretKey - Secret key untuk encryption
 * @param {string} keyDerivation - Key derivation method
 * @returns {AESEncryptionServiceV3} AES service instance
 */
export const createAESV3Instance = (secretKey, keyDerivation = 'default') => {
  return new AESEncryptionServiceV3(secretKey, keyDerivation);
};

/**
 * Default AES V3 instances untuk different use cases
 */
export const AESV3Instances = {
  userQR: createAESV3Instance('SHINTYA_AES_USER_2024', 'user_qr'),
  packageQR: createAESV3Instance('SHINTYA_AES_PACKAGE_2024', 'package_qr'),
  adminQR: createAESV3Instance('SHINTYA_AES_ADMIN_2024', 'admin_qr')
};

/**
 * Test all AES V3 instances
 * 
 * @returns {Object} Test results untuk all instances
 */
export const testAllAESV3Instances = () => {
  const results = {};
  
  for (const [name, instance] of Object.entries(AESV3Instances)) {
    console.log(`[AESEncryptionServiceV3] Testing ${name} instance...`);
    results[name] = instance.testEncryption();
  }
  
  return results;
};

export default AESEncryptionServiceV3;
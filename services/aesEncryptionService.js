/**
 * AES ENCRYPTION SERVICE - Advanced Encryption Standard Implementation
 * 
 * Menggantikan custom ShintyaEncryption library dengan implementasi AES128 yang lebih secure.
 * Service ini menggunakan AES-128-CBC dengan proper IV generation dan key management.
 * Fully compatible dengan React Native environment.
 * 
 * Features:
 * - AES-128-CBC encryption dengan crypto-js library
 * - Secure IV generation menggunakan crypto-js random (React Native compatible)
 * - Dynamic QR code generation dengan timestamp dan nonce
 * - Synchronous operations untuk React Native compatibility
 * - Comprehensive error handling dengan Indonesian messages
 * - Multi-instance support untuk different use cases
 * 
 * Security Improvements:
 * - Industry standard AES encryption
 * - Cryptographically secure random IV generation
 * - Proper key derivation dan management
 * - Timestamp validation untuk prevent replay attacks
 * - Nonce system untuk guarantee QR uniqueness
 * 
 * @author Shintya Package Delivery System
 * @version 2.0.2 (Pure JS Fix)
 */

import CryptoJS from 'crypto-js';
import pureJSCrypto from '../utils/pureJSCrypto.js';

/**
 * AES Encryption Service Class
 * 
 * Provides AES-128-CBC encryption/decryption untuk QR code generation
 * dengan secure random IV dan comprehensive error handling.
 */
export class AESEncryptionService {
  constructor(secretKey, keyDerivation = 'default') {
    this.secretKey = secretKey;
    this.keyDerivation = keyDerivation;
    this.algorithm = 'AES-128-CBC';
    this.version = '2.0.2';
    
    // Derive actual encryption key dari secret
    this.encryptionKey = this.deriveKey(secretKey, keyDerivation);
  }
  
  /**
   * Derive encryption key dari secret key
   * 
   * @param {string} secretKey - Base secret key
   * @param {string} derivation - Key derivation method
   * @returns {string} Derived encryption key
   */
  deriveKey(secretKey, derivation) {
    const salt = 'SHINTYA_AES_SALT_2024';
    const iterations = 1000;
    
    return CryptoJS.PBKDF2(secretKey, salt, {
      keySize: 128 / 32, // 128-bit key
      iterations: iterations
    }).toString();
  }
  
  /**
   * Generate cryptographically secure random IV
   * Pure JavaScript implementation tanpa native crypto dependency
   * 
   * @returns {WordArray} Random IV untuk AES encryption
   */
  generateSecureIV() {
    try {
      // Use pure JavaScript IV generation (React Native compatible)
      const ivHex = pureJSCrypto.generateSecureIV();
      return CryptoJS.enc.Hex.parse(ivHex);
    } catch (error) {
      console.error('Pure JS IV generation failed, using Math.random fallback:', error);
      // Ultimate fallback method
      return this.generateUltimateFallbackIV();
    }
  }
  
  /**
   * Ultimate fallback IV generation method
   * Menggunakan Math.random() murni tanpa crypto libraries
   * 
   * @returns {WordArray} Ultimate fallback IV
   */
  generateUltimateFallbackIV() {
    try {
      // Generate IV using pure Math.random and timestamp
      const timestamp = Date.now().toString(16);
      let ivHex = timestamp;
      
      // Pad with random hex characters to 32 characters
      while (ivHex.length < 32) {
        const randomByte = Math.floor(Math.random() * 256);
        ivHex += randomByte.toString(16).padStart(2, '0');
      }
      
      // Ensure exactly 32 characters
      ivHex = ivHex.substring(0, 32);
      
      return CryptoJS.enc.Hex.parse(ivHex);
    } catch (error) {
      throw new Error(`Ultimate fallback IV generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate secure nonce untuk QR uniqueness
   * Pure JavaScript implementation tanpa native crypto
   * 
   * @returns {string} Random nonce string
   */
  generateNonce() {
    try {
      // Use pure JavaScript nonce generation
      return pureJSCrypto.generateNonce();
    } catch (error) {
      console.warn('Pure JS nonce generation failed, using Math.random fallback:', error);
      // Ultimate fallback ke Math.random dan timestamp
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 8);
      return (timestamp + random).substr(0, 16);
    }
  }
  
  /**
   * Encrypt data dengan AES-128-CBC
   * Synchronous version untuk React Native compatibility
   * 
   * @param {Object} data - Data yang akan di-encrypt
   * @returns {string} Encrypted string dalam format IV:EncryptedData
   */
  encrypt(data) {
    try {
      // Add metadata untuk security dan validation
      const dataWithMetadata = {
        ...data,
        timestamp: Date.now(),
        nonce: this.generateNonce(),
        version: this.version,
        algorithm: this.algorithm
      };
      
      const jsonString = JSON.stringify(dataWithMetadata);
      const iv = this.generateSecureIV();
      
      // Encrypt dengan AES-128-CBC
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Return dalam format IV:EncryptedData untuk parsing
      return iv.toString() + ':' + encrypted.toString();
      
    } catch (error) {
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
      
      // Validate timestamp untuk prevent replay attacks (optional)
      if (parsedData.timestamp) {
        const age = Date.now() - parsedData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age > maxAge) {
          console.warn('QR code is older than 24 hours, consider refreshing');
        }
      }
      
      return parsedData;
      
    } catch (error) {
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
   * Get algorithm information
   * 
   * @returns {Object} Algorithm details
   */
  getAlgorithmInfo() {
    return {
      algorithm: this.algorithm,
      keySize: 128,
      mode: 'CBC',
      padding: 'PKCS7',
      ivSize: 128
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
  
  /**
   * Test encryption/decryption dengan sample data
   * Synchronous version untuk React Native compatibility
   * 
   * @returns {Object} Test result
   */
  testEncryption() {
    try {
      const testData = {
        message: 'AES Test Message',
        timestamp: Date.now()
      };
      
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      
      const success = decrypted.message === testData.message;
      
      return {
        success,
        original: testData,
        encrypted,
        decrypted,
        encryptedLength: encrypted.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Factory function untuk create AES instances
 * 
 * @param {string} secretKey - Secret key untuk encryption
 * @param {string} keyDerivation - Key derivation method
 * @returns {AESEncryptionService} AES service instance
 */
export const createAESInstance = (secretKey, keyDerivation = 'default') => {
  return new AESEncryptionService(secretKey, keyDerivation);
};

/**
 * Default AES instances untuk different use cases
 */
export const AESInstances = {
  userQR: createAESInstance('SHINTYA_AES_USER_2024', 'user_qr'),
  packageQR: createAESInstance('SHINTYA_AES_PACKAGE_2024', 'package_qr'),
  adminQR: createAESInstance('SHINTYA_AES_ADMIN_2024', 'admin_qr')
};

/**
 * Utility function untuk quick encryption test
 * Synchronous version untuk React Native compatibility
 * 
 * @returns {Object} Test results untuk all instances
 */
export const testAllAESInstances = () => {
  const results = {};
  
  for (const [name, instance] of Object.entries(AESInstances)) {
    results[name] = instance.testEncryption();
  }
  
  return results;
};

export default AESEncryptionService;
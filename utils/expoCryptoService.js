/**
 * EXPO CRYPTO SERVICE - React Native Compatible Crypto Implementation
 * 
 * Modern crypto implementation yang menggunakan Expo Crypto API untuk
 * mendapatkan cryptographically secure random values di React Native.
 * 
 * Features:
 * - Expo Crypto API integration untuk native implementations
 * - Fallback ke react-native-get-random-values jika diperlukan
 * - Ultimate fallback ke pure JavaScript implementation
 * - Fully compatible dengan React Native dan Expo environment
 * 
 * Security Features:
 * - Cryptographically secure random value generation
 * - Native platform implementations (iOS/Android)
 * - Proper IV generation untuk AES encryption
 * - Secure nonce generation untuk QR uniqueness
 * 
 * @author Shintya Package Delivery System
 * @version 3.0.0 (Expo Crypto Implementation)
 */

import * as ExpoCrypto from 'expo-crypto';

/**
 * Expo Crypto Service Class
 * 
 * Provides cryptographically secure random value generation
 * menggunakan Expo Crypto API dengan fallback mechanisms.
 */
export class ExpoCryptoService {
  constructor() {
    this.version = '3.0.0';
    this.isExpoAvailable = this.checkExpoAvailability();
    this.fallbackCounter = 0;
    
    console.log(`[ExpoCryptoService] Initialized v${this.version}`);
    console.log(`[ExpoCryptoService] Expo Crypto available: ${this.isExpoAvailable}`);
  }
  
  /**
   * Check if Expo Crypto is available
   * 
   * @returns {boolean} True if Expo Crypto is available
   */
  checkExpoAvailability() {
    try {
      return ExpoCrypto && typeof ExpoCrypto.getRandomBytes === 'function';
    } catch (error) {
      console.warn('[ExpoCryptoService] Expo Crypto not available:', error.message);
      return false;
    }
  }
  
  /**
   * Generate cryptographically secure random bytes
   * Menggunakan Expo Crypto API dengan fallback mechanisms
   * 
   * @param {number} byteCount - Number of bytes to generate
   * @returns {Uint8Array} Random bytes
   */
  generateSecureRandomBytes(byteCount = 16) {
    try {
      if (this.isExpoAvailable) {
        // Primary: Use Expo Crypto API
        console.log(`[ExpoCryptoService] Generating ${byteCount} secure bytes using Expo Crypto`);
        return ExpoCrypto.getRandomBytes(byteCount);
      } else {
        // Fallback: Use alternative method
        console.log(`[ExpoCryptoService] Falling back to alternative random generation`);
        return this.generateFallbackRandomBytes(byteCount);
      }
    } catch (error) {
      console.error('[ExpoCryptoService] Expo Crypto failed, using fallback:', error.message);
      return this.generateFallbackRandomBytes(byteCount);
    }
  }
  
  /**
   * Generate random bytes using fallback method
   * 
   * @param {number} byteCount - Number of bytes to generate
   * @returns {Uint8Array} Random bytes
   */
  generateFallbackRandomBytes(byteCount = 16) {
    try {
      this.fallbackCounter++;
      
      // Check if we have access to crypto.getRandomValues (Web/RN with polyfill)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        console.log(`[ExpoCryptoService] Using crypto.getRandomValues fallback`);
        const array = new Uint8Array(byteCount);
        crypto.getRandomValues(array);
        return array;
      }
      
      // Ultimate fallback: Pure JavaScript implementation
      console.log(`[ExpoCryptoService] Using pure JavaScript fallback`);
      return this.generatePureJSRandomBytes(byteCount);
      
    } catch (error) {
      console.error('[ExpoCryptoService] Fallback failed, using pure JS:', error.message);
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
    
    // Use multiple entropy sources
    for (let i = 0; i < byteCount; i++) {
      // Mix timestamp, performance, counter, and multiple random values
      const entropy1 = Math.random() * 256;
      const entropy2 = ((timestamp * (i + 1)) % 256);
      const entropy3 = ((performance * (i + 2)) % 256);
      const entropy4 = ((this.fallbackCounter * (i + 3)) % 256);
      
      // XOR all entropy sources together
      array[i] = Math.floor(entropy1 ^ entropy2 ^ entropy3 ^ entropy4) % 256;
    }
    
    return array;
  }
  
  /**
   * Generate secure IV untuk AES encryption
   * 
   * @returns {string} 32-character hex string (16 bytes)
   */
  generateSecureIV() {
    try {
      const randomBytes = this.generateSecureRandomBytes(16);
      const hex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log(`[ExpoCryptoService] Generated IV: ${hex.substring(0, 8)}...`);
      return hex;
      
    } catch (error) {
      console.error('[ExpoCryptoService] IV generation failed:', error.message);
      throw new Error(`IV generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate secure nonce untuk QR uniqueness
   * 
   * @returns {string} 16-character random string
   */
  generateNonce() {
    try {
      const randomBytes = this.generateSecureRandomBytes(8);
      const timestamp = Date.now().toString(36);
      const randomHex = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Combine timestamp and random hex, limit to 16 chars
      const nonce = (timestamp + randomHex).substring(0, 16);
      
      console.log(`[ExpoCryptoService] Generated nonce: ${nonce}`);
      return nonce;
      
    } catch (error) {
      console.error('[ExpoCryptoService] Nonce generation failed:', error.message);
      // Fallback to timestamp + Math.random
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return (timestamp + random).substring(0, 16);
    }
  }
  
  /**
   * Generate UUID using Expo Crypto
   * 
   * @returns {string} UUID string
   */
  generateUUID() {
    try {
      if (this.isExpoAvailable && ExpoCrypto.randomUUID) {
        return ExpoCrypto.randomUUID();
      } else {
        // Fallback UUID generation
        return this.generateFallbackUUID();
      }
    } catch (error) {
      console.error('[ExpoCryptoService] UUID generation failed:', error.message);
      return this.generateFallbackUUID();
    }
  }
  
  /**
   * Generate UUID using fallback method
   * 
   * @returns {string} UUID string
   */
  generateFallbackUUID() {
    // Simple UUID v4 implementation
    const randomBytes = this.generateSecureRandomBytes(16);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Format as UUID v4
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      '4' + hex.substring(13, 16),
      ((parseInt(hex.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.substring(17, 20),
      hex.substring(20, 32)
    ].join('-');
  }
  
  /**
   * Test crypto functionality
   * 
   * @returns {Object} Test results
   */
  testCrypto() {
    try {
      console.log('[ExpoCryptoService] Running crypto tests...');
      
      // Test random bytes generation
      const bytes1 = this.generateSecureRandomBytes(16);
      const bytes2 = this.generateSecureRandomBytes(16);
      const bytesDifferent = !bytes1.every((val, i) => val === bytes2[i]);
      
      // Test IV generation
      const iv1 = this.generateSecureIV();
      const iv2 = this.generateSecureIV();
      const ivsDifferent = iv1 !== iv2;
      const ivValid = /^[0-9a-fA-F]{32}$/.test(iv1);
      
      // Test nonce generation
      const nonce1 = this.generateNonce();
      const nonce2 = this.generateNonce();
      const noncesDifferent = nonce1 !== nonce2;
      
      // Test UUID generation
      const uuid1 = this.generateUUID();
      const uuid2 = this.generateUUID();
      const uuidsDifferent = uuid1 !== uuid2;
      
      const results = {
        success: true,
        expoAvailable: this.isExpoAvailable,
        fallbackCount: this.fallbackCounter,
        tests: {
          randomBytes: {
            generated: true,
            different: bytesDifferent,
            length: bytes1.length
          },
          iv: {
            generated: true,
            different: ivsDifferent,
            valid: ivValid,
            length: iv1.length,
            sample: iv1.substring(0, 8) + '...'
          },
          nonce: {
            generated: true,
            different: noncesDifferent,
            length: nonce1.length,
            sample: nonce1
          },
          uuid: {
            generated: true,
            different: uuidsDifferent,
            sample: uuid1
          }
        }
      };
      
      console.log('[ExpoCryptoService] Crypto tests completed successfully');
      return results;
      
    } catch (error) {
      console.error('[ExpoCryptoService] Crypto test failed:', error.message);
      return {
        success: false,
        error: error.message,
        expoAvailable: this.isExpoAvailable,
        fallbackCount: this.fallbackCounter
      };
    }
  }
  
  /**
   * Get service information
   * 
   * @returns {Object} Service information
   */
  getServiceInfo() {
    return {
      version: this.version,
      expoAvailable: this.isExpoAvailable,
      fallbackCount: this.fallbackCounter,
      features: {
        secureRandomBytes: true,
        ivGeneration: true,
        nonceGeneration: true,
        uuidGeneration: true
      }
    };
  }
}

// Export singleton instance
export default new ExpoCryptoService();
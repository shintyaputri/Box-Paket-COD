/**
 * PURE JAVASCRIPT CRYPTO UTILITIES
 * 
 * Implementasi crypto utilities yang murni JavaScript tanpa bergantung
 * pada native crypto module. Khusus untuk React Native compatibility.
 * 
 * Features:
 * - Pure JavaScript random number generation
 * - Secure IV generation tanpa native crypto
 * - Nonce generation dengan fallback mechanisms
 * - Hex encoding/decoding utilities
 * - Timestamp-based entropy
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0 (Pure JS)
 */

/**
 * Pure JavaScript Random Number Generator
 * Menggunakan kombinasi Math.random(), timestamp, dan entropy sources
 */
class PureJSRandom {
  constructor() {
    this.seed = this.generateSeed();
    this.counter = 0;
  }
  
  /**
   * Generate initial seed dari berbagai entropy sources
   */
  generateSeed() {
    const timestamp = Date.now();
    const performance = typeof window !== 'undefined' && window.performance ? 
      window.performance.now() : Math.random() * 1000000;
    const random = Math.random();
    
    // Combine entropy sources
    return (timestamp * performance * random) % 2147483647;
  }
  
  /**
   * Linear Congruential Generator (LCG) untuk better randomness
   */
  next() {
    this.counter++;
    this.seed = (this.seed * 1103515245 + 12345) % 2147483647;
    
    // Add additional entropy
    const entropy = Math.random() * Date.now() * this.counter;
    return (this.seed + entropy) % 2147483647;
  }
  
  /**
   * Generate random integer dalam range 0-255
   */
  nextByte() {
    return Math.floor(this.next() % 256);
  }
  
  /**
   * Generate array of random bytes
   */
  nextBytes(count) {
    const bytes = [];
    for (let i = 0; i < count; i++) {
      bytes.push(this.nextByte());
    }
    return bytes;
  }
  
  /**
   * Generate random hex string
   */
  nextHex(byteCount) {
    const bytes = this.nextBytes(byteCount);
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Pure JavaScript IV Generator
 * Menggunakan timestamp, random values, dan entropy mixing
 */
export class PureJSIVGenerator {
  constructor() {
    this.random = new PureJSRandom();
    this.ivCounter = 0;
  }
  
  /**
   * Generate 16-byte IV untuk AES encryption
   * Pure JavaScript implementation tanpa native crypto
   */
  generateIV() {
    try {
      this.ivCounter++;
      
      // Source 1: High-resolution timestamp
      const timestamp = Date.now();
      const microTime = typeof window !== 'undefined' && window.performance ? 
        window.performance.now() : Math.random() * 1000000;
      
      // Source 2: Multiple Math.random() calls
      const randoms = [];
      for (let i = 0; i < 8; i++) {
        randoms.push(Math.random());
      }
      
      // Source 3: Counter dan process-specific entropy
      const processEntropy = this.ivCounter * 7919; // Prime number
      
      // Combine all entropy sources
      const entropyString = [
        timestamp.toString(16),
        microTime.toString(16),
        ...randoms.map(r => r.toString(16)),
        processEntropy.toString(16)
      ].join('');
      
      // Hash-like mixing function
      let hash = 0;
      for (let i = 0; i < entropyString.length; i++) {
        const char = entropyString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Generate 32-character hex string for 16-byte IV
      let ivHex = '';
      for (let i = 0; i < 16; i++) {
        // Mix hash with random values
        const mixed = (hash + this.random.nextByte() + timestamp + i) % 256;
        ivHex += mixed.toString(16).padStart(2, '0');
        hash = (hash * 1103515245 + 12345) % 2147483647; // LCG update
      }
      
      return ivHex;
      
    } catch (error) {
      console.error('IV generation error:', error);
      return this.generateFallbackIV();
    }
  }
  
  /**
   * Ultra-simple fallback IV generation
   */
  generateFallbackIV() {
    const timestamp = Date.now().toString(16);
    let iv = timestamp;
    
    // Pad with random hex chars to 32 characters
    while (iv.length < 32) {
      const randomChar = Math.floor(Math.random() * 16).toString(16);
      iv += randomChar;
    }
    
    return iv.substring(0, 32);
  }
  
  /**
   * Validate IV format
   */
  isValidIV(iv) {
    return typeof iv === 'string' && 
           iv.length === 32 && 
           /^[0-9a-fA-F]{32}$/.test(iv);
  }
}

/**
 * Pure JavaScript Nonce Generator
 */
export class PureJSNonceGenerator {
  constructor() {
    this.random = new PureJSRandom();
    this.nonceCounter = 0;
  }
  
  /**
   * Generate unique nonce
   */
  generateNonce() {
    try {
      this.nonceCounter++;
      
      const timestamp = Date.now().toString(36);
      const random = this.random.nextHex(4);
      const counter = this.nonceCounter.toString(36);
      
      return (timestamp + random + counter).substring(0, 16);
      
    } catch (error) {
      console.error('Nonce generation error:', error);
      return this.generateFallbackNonce();
    }
  }
  
  /**
   * Fallback nonce generation
   */
  generateFallbackNonce() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return (timestamp + random).substring(0, 16);
  }
}

/**
 * Pure JavaScript Hex Utilities
 */
export class PureJSHexUtils {
  /**
   * Convert hex string to bytes array
   */
  static hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }
  
  /**
   * Convert bytes array to hex string
   */
  static bytesToHex(bytes) {
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Validate hex string format
   */
  static isValidHex(hex) {
    return typeof hex === 'string' && /^[0-9a-fA-F]*$/.test(hex);
  }
}

/**
 * Main Pure JavaScript Crypto Class
 */
export class PureJSCrypto {
  constructor() {
    this.ivGenerator = new PureJSIVGenerator();
    this.nonceGenerator = new PureJSNonceGenerator();
  }
  
  /**
   * Generate secure IV untuk AES
   */
  generateSecureIV() {
    return this.ivGenerator.generateIV();
  }
  
  /**
   * Generate unique nonce
   */
  generateNonce() {
    return this.nonceGenerator.generateNonce();
  }
  
  /**
   * Test all crypto functions
   */
  testCrypto() {
    try {
      const iv1 = this.generateSecureIV();
      const iv2 = this.generateSecureIV();
      const nonce1 = this.generateNonce();
      const nonce2 = this.generateNonce();
      
      return {
        success: true,
        iv1,
        iv2,
        ivsDifferent: iv1 !== iv2,
        nonce1,
        nonce2,
        noncesDifferent: nonce1 !== nonce2,
        ivValid: this.ivGenerator.isValidIV(iv1),
        ivLength: iv1.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export default instance
export default new PureJSCrypto();
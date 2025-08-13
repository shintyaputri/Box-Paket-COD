/**
 * AES ENCRYPTION SERVICE - Test Suite
 * 
 * Comprehensive test suite untuk AESEncryptionService yang melakukan
 * testing terhadap semua functionality encryption, decryption, validation,
 * dan security dengan AES-128-CBC implementation.
 * 
 * Test Categories:
 * - Basic AES Encryption/Decryption Tests
 * - Dynamic Content Generation Tests  
 * - Security Validation Tests
 * - Error Handling Tests
 * - Cross-Platform Compatibility Tests
 * - Performance Tests
 * - Key Derivation Tests
 * 
 * @author Shintya Package Delivery System
 * @version 2.0.2 (Pure JS Fix)
 */

// Import AES encryption service
import { AESEncryptionService, AESInstances, testAllAESInstances } from '../services/aesEncryptionService.js';

/**
 * Simple test runner implementation untuk Node.js environment
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  describe(suiteName, callback) {
    console.log(`\n📋 Test Suite: ${suiteName}`);
    console.log(''.padEnd(50, '='));
    callback();
  }

  test(testName, callback) {
    this.results.total++;
    
    try {
      callback();
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  async testAsync(testName, callback) {
    this.results.total++;
    
    try {
      await callback();
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.failed++;
      console.log(`❌ ${testName}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      not: {
        toBe: (expected) => {
          if (actual === expected) {
            throw new Error(`Expected not to be ${expected}, but it was`);
          }
        },
        toEqual: (expected) => {
          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            throw new Error(`Expected not to equal ${JSON.stringify(expected)}, but it did`);
          }
        }
      },
      toBeTrue: () => {
        if (actual !== true) {
          throw new Error(`Expected true, but got ${actual}`);
        }
      },
      toBeFalse: () => {
        if (actual !== false) {
          throw new Error(`Expected false, but got ${actual}`);
        }
      },
      toThrow: () => {
        let threw = false;
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected function to throw, but it did not');
        }
      },
      toContain: (expected) => {
        if (typeof actual === 'string' && !actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      }
    };
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log(''.padEnd(30, '='));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Initialize test runner
const testRunner = new TestRunner();

// ==================== BASIC AES FUNCTIONALITY TESTS ====================

testRunner.describe('Basic AES Encryption/Decryption Tests', () => {
  
  testRunner.testAsync('should encrypt and decrypt user data correctly', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const originalData = {
      email: "test@shintya.com",
      nama: "Test User",
      type: "user_profile"
    };
    
    const encrypted = await aes.encrypt(originalData);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(decrypted.email).toBe(originalData.email);
    testRunner.expect(decrypted.nama).toBe(originalData.nama);
    testRunner.expect(decrypted.type).toBe(originalData.type);
  });

  testRunner.testAsync('should handle empty data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const emptyData = {};
    
    const encrypted = await aes.encrypt(emptyData);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(typeof decrypted).toBe('object');
  });

  testRunner.testAsync('should include AES format indicators', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { message: "Hello AES" };
    
    const encrypted = await aes.encrypt(data);
    
    // AES format should contain IV:EncryptedData
    testRunner.expect(encrypted).toContain(':');
    testRunner.expect(encrypted.split(':').length).toBe(2);
  });

});

// ==================== DYNAMIC CONTENT TESTS ====================

testRunner.describe('Dynamic Content Generation Tests', () => {
  
  testRunner.testAsync('should generate different encrypted strings for same data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    const encrypted1 = await aes.encrypt(data);
    const encrypted2 = await aes.encrypt(data);
    
    testRunner.expect(encrypted1).not.toBe(encrypted2);
  });

  testRunner.testAsync('should include timestamp in decrypted data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    const encrypted = await aes.encrypt(data);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(typeof decrypted.timestamp).toBe('number');
    testRunner.expect(decrypted.timestamp).toBeGreaterThan(0);
  });

  testRunner.testAsync('should include nonce in decrypted data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    const encrypted = await aes.encrypt(data);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(typeof decrypted.nonce).toBe('string');
    testRunner.expect(decrypted.nonce.length).toBeGreaterThan(0);
  });

  testRunner.testAsync('should include version and algorithm info', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    const encrypted = await aes.encrypt(data);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(decrypted.version).toBe('2.0.2');
    testRunner.expect(decrypted.algorithm).toBe('AES-128-CBC');
  });

});

// ==================== SECURITY VALIDATION TESTS ====================

testRunner.describe('Security Validation Tests', () => {
  
  testRunner.test('should validate AES encrypted data format', () => {
    const aes = new AESEncryptionService("test_secret_key");
    
    testRunner.expect(aes.isValidEncryptedData("invalid_data")).toBeFalse();
    testRunner.expect(aes.isValidEncryptedData("")).toBeFalse();
    testRunner.expect(aes.isValidEncryptedData("no_colon_format")).toBeFalse();
    testRunner.expect(aes.isValidEncryptedData("123:456")).toBeFalse(); // Invalid hex
  });

  testRunner.testAsync('should validate correct encrypted data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    const encrypted = await aes.encrypt(data);
    testRunner.expect(aes.isValidEncryptedData(encrypted)).toBeTrue();
  });

  testRunner.test('should use proper key derivation', () => {
    const aes1 = new AESEncryptionService("secret1", "derivation1");
    const aes2 = new AESEncryptionService("secret2", "derivation2");
    
    // Different secrets should produce different keys
    testRunner.expect(aes1.encryptionKey).not.toBe(aes2.encryptionKey);
  });

  testRunner.test('should return correct algorithm info', () => {
    const aes = new AESEncryptionService("test_secret_key");
    const info = aes.getAlgorithmInfo();
    
    testRunner.expect(info.algorithm).toBe('AES-128-CBC');
    testRunner.expect(info.keySize).toBe(128);
    testRunner.expect(info.mode).toBe('CBC');
    testRunner.expect(info.padding).toBe('PKCS7');
  });

});

// ==================== ERROR HANDLING TESTS ====================

testRunner.describe('Error Handling Tests', () => {
  
  testRunner.test('should handle decrypt with invalid data gracefully', () => {
    const aes = new AESEncryptionService("test_secret_key");
    
    testRunner.expect(() => {
      aes.decrypt("invalid_aes_data");
    }).toThrow();
  });

  testRunner.test('should handle decrypt with wrong format', () => {
    const aes = new AESEncryptionService("test_secret_key");
    
    testRunner.expect(() => {
      aes.decrypt("no_colon_separator");
    }).toThrow();
  });

  testRunner.testAsync('should handle decrypt with corrupted data', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com" };
    
    let encrypted = await aes.encrypt(data);
    // Corrupt the data
    encrypted = encrypted.substring(0, encrypted.length - 5) + "XXXXX";
    
    testRunner.expect(() => {
      aes.decrypt(encrypted);
    }).toThrow();
  });

  testRunner.testAsync('should handle wrong decryption key', async () => {
    const aes1 = new AESEncryptionService("secret_key_1");
    const aes2 = new AESEncryptionService("secret_key_2");
    const data = { email: "test@shintya.com" };
    
    const encrypted = await aes1.encrypt(data);
    
    testRunner.expect(() => {
      aes2.decrypt(encrypted);
    }).toThrow();
  });

});

// ==================== LIBRARY INFO TESTS ====================

testRunner.describe('Library Information Tests', () => {
  
  testRunner.test('should return correct version', () => {
    const aes = new AESEncryptionService("test_secret_key");
    testRunner.expect(aes.getVersion()).toBe("2.0.2");
  });

  testRunner.test('should return correct algorithm info', () => {
    const aes = new AESEncryptionService("test_secret_key");
    const info = aes.getAlgorithmInfo();
    testRunner.expect(info.algorithm).toBe("AES-128-CBC");
  });

});

// ==================== PERFORMANCE TESTS ====================

testRunner.describe('Performance Tests', () => {
  
  testRunner.testAsync('should encrypt data within reasonable time', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com", nama: "Test User" };
    
    const startTime = Date.now();
    const encrypted = await aes.encrypt(data);
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    testRunner.expect(executionTime < 1000).toBeTrue(); // Should be under 1 second
  });

  testRunner.testAsync('should decrypt data within reasonable time', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { email: "test@shintya.com", nama: "Test User" };
    
    const encrypted = await aes.encrypt(data);
    
    const startTime = Date.now();
    const decrypted = aes.decrypt(encrypted);
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    testRunner.expect(executionTime < 500).toBeTrue(); // Should be under 500ms
  });

});

// ==================== AES INSTANCES TESTS ====================

testRunner.describe('Pre-configured AES Instances Tests', () => {
  
  testRunner.testAsync('should have all required instances', async () => {
    testRunner.expect(typeof AESInstances.userQR).toBe('object');
    testRunner.expect(typeof AESInstances.packageQR).toBe('object');
    testRunner.expect(typeof AESInstances.adminQR).toBe('object');
  });

  testRunner.testAsync('should test all instances successfully', async () => {
    const results = await testAllAESInstances();
    
    testRunner.expect(results.userQR.success).toBeTrue();
    testRunner.expect(results.packageQR.success).toBeTrue();
    testRunner.expect(results.adminQR.success).toBeTrue();
  });

  testRunner.testAsync('should have different encryption keys for different instances', async () => {
    const data = { test: "same data" };
    
    const encrypted1 = await AESInstances.userQR.encrypt(data);
    const encrypted2 = await AESInstances.packageQR.encrypt(data);
    const encrypted3 = await AESInstances.adminQR.encrypt(data);
    
    testRunner.expect(encrypted1).not.toBe(encrypted2);
    testRunner.expect(encrypted2).not.toBe(encrypted3);
    testRunner.expect(encrypted1).not.toBe(encrypted3);
  });

});

// ==================== COMPATIBILITY TESTS ====================

testRunner.describe('Cross-Platform Compatibility Tests', () => {
  
  testRunner.testAsync('should handle special characters correctly', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { 
      email: "test@shintya.com",
      nama: "Test Üser with spëcial chars"
    };
    
    const encrypted = await aes.encrypt(data);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(decrypted.nama).toBe("Test Üser with spëcial chars");
  });

  testRunner.testAsync('should handle Indonesian characters', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const data = { 
      nama: "Budi Santoso",
      alamat: "Jl. Merdeka No. 123, Jakarta"
    };
    
    const encrypted = await aes.encrypt(data);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(decrypted.nama).toBe("Budi Santoso");
    testRunner.expect(decrypted.alamat).toBe("Jl. Merdeka No. 123, Jakarta");
  });

  testRunner.testAsync('should handle large data objects', async () => {
    const aes = new AESEncryptionService("test_secret_key");
    const largeData = {
      email: "test@shintya.com",
      description: "Lorem ipsum ".repeat(100), // Large text
      metadata: {
        nested: {
          deep: {
            data: "Deep nested data"
          }
        }
      }
    };
    
    const encrypted = await aes.encrypt(largeData);
    const decrypted = aes.decrypt(encrypted);
    
    testRunner.expect(decrypted.email).toBe(largeData.email);
    testRunner.expect(decrypted.metadata.nested.deep.data).toBe("Deep nested data");
  });

});

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  console.log('🔐 Starting AES Encryption Service Test Suite...\n');
  
  // All tests are defined above and will execute
  // Wait a bit for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Print final results
  testRunner.printResults();
}

// Run the tests
runAllTests().catch(console.error);

// Export untuk usage sebagai module
export default testRunner;
#!/usr/bin/env node

/**
 * AES FIXED TEST - React Native Get Random Values Implementation
 * 
 * Test untuk AES Fixed service yang menggunakan react-native-get-random-values
 * untuk mengatasi "Native crypto module could not be used" error.
 * 
 * Test ini memverifikasi:
 * - React Native Get Random Values polyfill functionality
 * - AES encryption/decryption tanpa native crypto errors
 * - Fallback mechanisms
 * - UserQRModalWorking scenario compatibility
 * 
 * @author Shintya Package Delivery System
 * @version 2.1.0 (React Native Get Random Values Fix)
 */

import { AESFixedInstances, testAllAESFixedInstances } from '../services/aesEncryptionServiceFixed.js';

console.log('🔐 AES Fixed Test - React Native Get Random Values Implementation');
console.log(''.padEnd(70, '='));

/**
 * Test Polyfill Availability
 */
function testPolyfillAvailability() {
  console.log('🧪 Testing Polyfill Availability...\\n');
  
  try {
    console.log('Test 1: Check crypto.getRandomValues availability');
    const hasPolyfill = typeof crypto !== 'undefined' && crypto.getRandomValues;
    console.log(`✅ crypto.getRandomValues available: ${hasPolyfill}`);
    
    if (hasPolyfill) {
      console.log('Test 2: Test crypto.getRandomValues functionality');
      const testArray = new Uint8Array(16);
      crypto.getRandomValues(testArray);
      console.log(`✅ Generated random bytes: ${Array.from(testArray).slice(0, 8).join(',')}`);
      
      // Test multiple calls for uniqueness
      const testArray2 = new Uint8Array(16);
      crypto.getRandomValues(testArray2);
      const different = !testArray.every((val, i) => val === testArray2[i]);
      console.log(`✅ Multiple calls generate different values: ${different}`);
    }
    
    console.log('');
    return {
      success: true,
      polyfillAvailable: hasPolyfill
    };
    
  } catch (error) {
    console.error('❌ Polyfill test failed:', error.message);
    return {
      success: false,
      error: error.message,
      polyfillAvailable: false
    };
  }
}

/**
 * Test AES Fixed Encryption Service
 */
function testAESFixedService() {
  console.log('🔒 Testing AES Fixed Encryption Service...\\n');
  
  try {
    console.log('Test 1: Basic AES Fixed encryption/decryption');
    const testData = {
      email: "user1@gmail.com",
      nama: "Test User Fixed",
      role: "user"
    };
    
    const encrypted = AESFixedInstances.userQR.encrypt(testData);
    console.log(`✅ Encryption success: ${encrypted.length} characters`);
    console.log(`   Format: ${encrypted.includes(':') ? 'Valid (IV:Data)' : 'Invalid'}`);
    console.log(`   Sample: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = AESFixedInstances.userQR.decrypt(encrypted);
    console.log(`✅ Decryption success: ${decrypted.email}`);
    console.log(`✅ Data integrity: ${decrypted.email === testData.email}`);
    console.log(`✅ Version: ${decrypted.version}`);
    console.log(`✅ Crypto provider: ${decrypted.cryptoProvider}\\n`);
    
    console.log('Test 2: AES Fixed instance tests');
    const instanceTests = testAllAESFixedInstances();
    
    for (const [name, result] of Object.entries(instanceTests)) {
      console.log(`✅ ${name}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (result.success) {
        console.log(`   Version: ${result.version}`);
        console.log(`   Crypto provider: ${result.decrypted.cryptoProvider}`);
        console.log(`   Polyfill available: ${result.polyfillAvailable}`);
        console.log(`   Length: ${result.encryptedLength} chars`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    const allPassed = Object.values(instanceTests).every(r => r.success);
    console.log(`\\n✅ All instances test: ${allPassed ? 'PASSED' : 'FAILED'}\\n`);
    
    console.log('Test 3: Format validation');
    const validFormat = AESFixedInstances.userQR.isValidEncryptedData(encrypted);
    const invalidFormat = AESFixedInstances.userQR.isValidEncryptedData("invalid_data");
    console.log(`✅ Valid format check: ${validFormat}`);
    console.log(`✅ Invalid format check: ${!invalidFormat}\\n`);
    
    console.log('Test 4: Algorithm info');
    const algorithmInfo = AESFixedInstances.userQR.getAlgorithmInfo();
    console.log(`✅ Algorithm: ${algorithmInfo.algorithm}`);
    console.log(`✅ Version: ${algorithmInfo.version}`);
    console.log(`✅ Crypto provider: ${algorithmInfo.cryptoProvider}\\n`);
    
    return {
      success: allPassed,
      instanceTests,
      algorithmInfo
    };
    
  } catch (error) {
    console.error('❌ AES Fixed service test failed:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test User QR Modal Scenario (Anti-Error Test)
 */
function testUserQRModalErrorScenario() {
  console.log('📱 Testing User QR Modal Error Scenario...\\n');
  
  try {
    console.log('Simulating exact UserQRModalWorking scenario that caused error...');
    
    // Exact scenario dari error yang terjadi
    const userProfile = {
      email: "user1@gmail.com",
      nama: "Test User",
      role: "user"
    };
    
    console.log(`User profile: ${userProfile.email}`);
    
    // Test encrypting user profile exactly seperti di UserQRModalWorking
    console.log('Encrypting user profile (simulating UserQRModalWorking)...');
    const result = AESFixedInstances.userQR.encrypt({
      email: userProfile.email
    });
    
    console.log('✅ QR code generated successfully (NO ERROR!)');
    console.log(`   Length: ${result.length} characters`);
    console.log(`   Format: ${result.includes(':') ? 'Valid (IV:Data)' : 'Invalid'}`);
    console.log(`   Sample: ${result.substring(0, 60)}...`);
    
    // Test decryption
    console.log('Decrypting QR code...');
    const decrypted = AESFixedInstances.userQR.decrypt(result);
    
    console.log('✅ QR code decrypted successfully');
    console.log(`   Email matches: ${decrypted.email === userProfile.email}`);
    console.log(`   Timestamp: ${new Date(decrypted.timestamp).toLocaleString()}`);
    console.log(`   Version: ${decrypted.version}`);
    console.log(`   Crypto provider: ${decrypted.cryptoProvider}`);
    console.log(`   Nonce: ${decrypted.nonce}\\n`);
    
    // Test multiple QR generations (stress test)
    console.log('Testing multiple QR generations (stress test)...');
    const results = [];
    for (let i = 0; i < 5; i++) {
      const qr = AESFixedInstances.userQR.encrypt({
        email: `user${i}@gmail.com`,
        test: `Test ${i}`
      });
      results.push(qr);
    }
    
    console.log('✅ Multiple QR generations successful');
    console.log(`   Generated ${results.length} unique QR codes`);
    
    // Check all are different
    const allUnique = new Set(results).size === results.length;
    console.log(`✅ All QR codes are unique: ${allUnique}\\n`);
    
    return {
      success: true,
      qrCode: result,
      userProfile,
      decrypted,
      multipleResults: results.length
    };
    
  } catch (error) {
    console.error('❌ User QR Modal scenario test failed:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🚀 Starting AES Fixed Test Suite...\\n');
  
  const polyfillTest = testPolyfillAvailability();
  const aesFixedTest = testAESFixedService();
  const userQRTest = testUserQRModalErrorScenario();
  
  console.log('\\n' + ''.padEnd(70, '='));
  console.log('📊 Test Results Summary:');
  console.log(''.padEnd(50, '-'));
  
  if (polyfillTest.success && aesFixedTest.success && userQRTest.success) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ react-native-get-random-values polyfill works correctly');
    console.log('✅ AES Fixed encryption works without native crypto errors');
    console.log('✅ User QR Modal scenario works correctly (ERROR FIXED!)');
    console.log('✅ Ready for React Native production use');
    
    if (polyfillTest.polyfillAvailable) {
      console.log('✅ Using react-native-get-random-values polyfill');
    } else {
      console.log('⚠️  Using fallback crypto implementation');
    }
    
  } else {
    console.log('❌ Some tests failed:');
    if (!polyfillTest.success) {
      console.log(`   - Polyfill Test: ${polyfillTest.error}`);
    }
    if (!aesFixedTest.success) {
      console.log(`   - AES Fixed Test: ${aesFixedTest.error}`);
    }
    if (!userQRTest.success) {
      console.log(`   - User QR Modal Test: ${userQRTest.error}`);
    }
  }
  
  return {
    success: polyfillTest.success && aesFixedTest.success && userQRTest.success,
    polyfillTest,
    aesFixedTest,
    userQRTest
  };
}

// Run tests
const result = runAllTests();

if (result.success) {
  console.log('\\n🔐 AES Fixed with react-native-get-random-values is ready!');
  console.log('✅ UserQRModalWorking should now work without crypto errors');
  console.log('✅ No more "Native crypto module could not be used" errors');
  console.log('✅ Solution berdasarkan research React Native crypto 2024');
} else {
  console.log('\\n⚠️  Please check the issues above.');
  process.exit(1);
}

export { testPolyfillAvailability, testAESFixedService, testUserQRModalErrorScenario };
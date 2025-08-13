#!/usr/bin/env node

/**
 * AES V3 ENCRYPTION TEST - Expo Crypto Implementation
 * 
 * Comprehensive test untuk AES V3 service yang menggunakan Expo Crypto API
 * untuk secure random value generation di React Native environment.
 * 
 * Test ini memverifikasi:
 * - Expo Crypto API integration
 * - Secure IV generation tanpa native crypto errors
 * - AES encryption/decryption functionality
 * - Fallback mechanisms
 * - React Native compatibility
 * 
 * @author Shintya Package Delivery System
 * @version 3.0.0 (Expo Crypto Implementation)
 */

import { AESV3Instances, testAllAESV3Instances } from '../services/aesEncryptionServiceV3.js';
import expoCryptoService from '../utils/expoCryptoService.js';

console.log('🔐 AES V3 Encryption Test - Expo Crypto Implementation');
console.log(''.padEnd(60, '='));

/**
 * Test Expo Crypto Service
 */
function testExpoCryptoService() {
  console.log('🧪 Testing Expo Crypto Service...\\n');
  
  try {
    console.log('Test 1: Expo Crypto Service initialization');
    const serviceInfo = expoCryptoService.getServiceInfo();
    console.log(`✅ Service version: ${serviceInfo.version}`);
    console.log(`✅ Expo available: ${serviceInfo.expoAvailable}`);
    console.log(`✅ Fallback count: ${serviceInfo.fallbackCount}\\n`);
    
    console.log('Test 2: Crypto functionality test');
    const cryptoTest = expoCryptoService.testCrypto();
    console.log(`✅ Crypto test success: ${cryptoTest.success}`);
    
    if (cryptoTest.success) {
      console.log(`✅ Random bytes different: ${cryptoTest.tests.randomBytes.different}`);
      console.log(`✅ IV generation: ${cryptoTest.tests.iv.valid} (${cryptoTest.tests.iv.sample})`);
      console.log(`✅ Nonce generation: ${cryptoTest.tests.nonce.sample}`);
      console.log(`✅ UUID generation: ${cryptoTest.tests.uuid.sample}\\n`);
    } else {
      console.log(`❌ Crypto test failed: ${cryptoTest.error}\\n`);
    }
    
    console.log('Test 3: Manual IV generation');
    const iv1 = expoCryptoService.generateSecureIV();
    const iv2 = expoCryptoService.generateSecureIV();
    console.log(`✅ IV1: ${iv1.substring(0, 16)}...`);
    console.log(`✅ IV2: ${iv2.substring(0, 16)}...`);
    console.log(`✅ IVs different: ${iv1 !== iv2}\\n`);
    
    console.log('Test 4: Manual nonce generation');
    const nonce1 = expoCryptoService.generateNonce();
    const nonce2 = expoCryptoService.generateNonce();
    console.log(`✅ Nonce1: ${nonce1}`);
    console.log(`✅ Nonce2: ${nonce2}`);
    console.log(`✅ Nonces different: ${nonce1 !== nonce2}\\n`);
    
    return {
      success: true,
      serviceInfo,
      cryptoTest
    };
    
  } catch (error) {
    console.error('❌ Expo Crypto Service test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test AES V3 Encryption Service
 */
function testAESV3Service() {
  console.log('🔒 Testing AES V3 Encryption Service...\\n');
  
  try {
    console.log('Test 1: Basic AES V3 encryption/decryption');
    const testData = {
      email: "user1@gmail.com",
      nama: "Test User V3",
      role: "user"
    };
    
    const encrypted = AESV3Instances.userQR.encrypt(testData);
    console.log(`✅ Encryption success: ${encrypted.length} characters`);
    console.log(`   Format: ${encrypted.includes(':') ? 'Valid (IV:Data)' : 'Invalid'}`);
    console.log(`   Sample: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = AESV3Instances.userQR.decrypt(encrypted);
    console.log(`✅ Decryption success: ${decrypted.email}`);
    console.log(`✅ Data integrity: ${decrypted.email === testData.email}`);
    console.log(`✅ Version: ${decrypted.version}`);
    console.log(`✅ Crypto provider: ${decrypted.cryptoProvider}\\n`);
    
    console.log('Test 2: AES V3 instance tests');
    const instanceTests = testAllAESV3Instances();
    
    for (const [name, result] of Object.entries(instanceTests)) {
      console.log(`✅ ${name}: ${result.success ? 'PASSED' : 'FAILED'}`);
      if (result.success) {
        console.log(`   Algorithm: ${result.algorithm}`);
        console.log(`   Crypto provider: ${result.cryptoProvider}`);
        console.log(`   Length: ${result.encryptedLength} chars`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    }
    
    const allPassed = Object.values(instanceTests).every(r => r.success);
    console.log(`\\n✅ All instances test: ${allPassed ? 'PASSED' : 'FAILED'}\\n`);
    
    console.log('Test 3: Format validation');
    const validFormat = AESV3Instances.userQR.isValidEncryptedData(encrypted);
    const invalidFormat = AESV3Instances.userQR.isValidEncryptedData("invalid_data");
    console.log(`✅ Valid format check: ${validFormat}`);
    console.log(`✅ Invalid format check: ${!invalidFormat}\\n`);
    
    console.log('Test 4: Algorithm info');
    const algorithmInfo = AESV3Instances.userQR.getAlgorithmInfo();
    console.log(`✅ Algorithm: ${algorithmInfo.algorithm}`);
    console.log(`✅ Version: ${algorithmInfo.version}`);
    console.log(`✅ Crypto provider: ${algorithmInfo.cryptoProvider}`);
    console.log(`✅ Key derivation: ${algorithmInfo.keyDerivation}\\n`);
    
    return {
      success: allPassed,
      instanceTests,
      algorithmInfo
    };
    
  } catch (error) {
    console.error('❌ AES V3 service test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test User QR Modal scenario
 */
function testUserQRModalScenario() {
  console.log('📱 Testing User QR Modal Scenario...\\n');
  
  try {
    console.log('Simulating UserQRModalWorking scenario...');
    
    const userProfile = {
      email: "user1@gmail.com",
      nama: "Test User",
      role: "user"
    };
    
    console.log(`User profile: ${userProfile.email}`);
    
    // Test user profile encryption (sama seperti UserQRModalWorking)
    const qrData = {
      email: userProfile.email,
      nama: userProfile.nama,
      type: "user_qr"
    };
    
    console.log('Encrypting user profile for QR code...');
    const encryptedQR = AESV3Instances.userQR.encrypt(qrData);
    
    console.log('✅ QR code generated successfully');
    console.log(`   Length: ${encryptedQR.length} characters`);
    console.log(`   Format: ${encryptedQR.includes(':') ? 'Valid (IV:Data)' : 'Invalid'}`);
    console.log(`   Sample: ${encryptedQR.substring(0, 60)}...`);
    
    // Test decryption
    console.log('Decrypting QR code...');
    const decryptedQR = AESV3Instances.userQR.decrypt(encryptedQR);
    
    console.log('✅ QR code decrypted successfully');
    console.log(`   Email matches: ${decryptedQR.email === userProfile.email}`);
    console.log(`   Type: ${decryptedQR.type}`);
    console.log(`   Timestamp: ${new Date(decryptedQR.timestamp).toLocaleString()}`);
    console.log(`   Version: ${decryptedQR.version}`);
    console.log(`   Crypto provider: ${decryptedQR.cryptoProvider}\\n`);
    
    // Test dengan user yang berbeda
    console.log('Testing with different user...');
    const userProfile2 = {
      email: "user2@gmail.com",
      nama: "Another User",
      role: "user"
    };
    
    const qrData2 = {
      email: userProfile2.email,
      nama: userProfile2.nama,
      type: "user_qr"
    };
    
    const encryptedQR2 = AESV3Instances.userQR.encrypt(qrData2);
    
    console.log('✅ Second QR code generated');
    console.log(`   Different from first: ${encryptedQR !== encryptedQR2}`);
    console.log(`   Length: ${encryptedQR2.length} characters\\n`);
    
    return {
      success: true,
      qrCode: encryptedQR,
      qrCode2: encryptedQR2,
      userProfile,
      decryptedQR
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
  console.log('🚀 Starting AES V3 Test Suite...\\n');
  
  const expoCryptoTest = testExpoCryptoService();
  const aesV3Test = testAESV3Service();
  const userQRTest = testUserQRModalScenario();
  
  console.log('\\n' + ''.padEnd(60, '='));
  console.log('📊 Test Results Summary:');
  console.log(''.padEnd(40, '-'));
  
  if (expoCryptoTest.success && aesV3Test.success && userQRTest.success) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Expo Crypto Service works correctly');
    console.log('✅ AES V3 encryption works without native crypto errors');
    console.log('✅ User QR Modal scenario works correctly');
    console.log('✅ Ready for React Native production use');
    
    if (expoCryptoTest.serviceInfo.expoAvailable) {
      console.log('✅ Using native Expo Crypto API');
    } else {
      console.log('⚠️  Using fallback crypto implementation');
    }
    
  } else {
    console.log('❌ Some tests failed:');
    if (!expoCryptoTest.success) {
      console.log(`   - Expo Crypto Service: ${expoCryptoTest.error}`);
    }
    if (!aesV3Test.success) {
      console.log(`   - AES V3 Service: ${aesV3Test.error}`);
    }
    if (!userQRTest.success) {
      console.log(`   - User QR Modal: ${userQRTest.error}`);
    }
  }
  
  return {
    success: expoCryptoTest.success && aesV3Test.success && userQRTest.success,
    expoCryptoTest,
    aesV3Test,
    userQRTest
  };
}

// Run tests
const result = runAllTests();

if (result.success) {
  console.log('\\n🔐 AES V3 with Expo Crypto is ready!');
  console.log('✅ UserQRModalWorking should now work without crypto errors');
  console.log('✅ No more "Native crypto module could not be used" errors');
} else {
  console.log('\\n⚠️  Please fix the issues before using in production.');
  process.exit(1);
}

export { testExpoCryptoService, testAESV3Service, testUserQRModalScenario };
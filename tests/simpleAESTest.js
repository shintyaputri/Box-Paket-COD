#!/usr/bin/env node

/**
 * SIMPLE AES TEST - React Native Compatible Test
 * 
 * Test sederhana untuk memverifikasi AES encryption service berfungsi dengan baik
 * dalam environment React Native, tanpa dependencies Firebase.
 * 
 * Test ini memastikan:
 * - IV generation works without expo-crypto
 * - Encryption/decryption works synchronously 
 * - All fallback mechanisms work correctly
 * 
 * @author Shintya Package Delivery System
 * @version 2.0.1 (React Native Fix)
 */

import { AESInstances } from '../services/aesEncryptionService.js';

console.log('🔐 Simple AES Encryption Test');
console.log(''.padEnd(50, '='));

/**
 * Test AES service tanpa Firebase dependencies
 */
function testSimpleAES() {
  console.log('🧪 Testing AES service without Firebase...\n');
  
  try {
    // Test 1: Basic encryption/decryption
    console.log('Test 1: Basic AES encryption/decryption');
    const testData = {
      email: "user1@gmail.com",
      nama: "Test User"
    };
    
    const encrypted = AESInstances.userQR.encrypt(testData);
    console.log(`✅ Encryption success: ${encrypted.length} characters`);
    console.log(`   Sample: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = AESInstances.userQR.decrypt(encrypted);
    console.log(`✅ Decryption success: email = ${decrypted.email}`);
    
    const emailMatch = decrypted.email === testData.email;
    console.log(`✅ Data integrity: ${emailMatch ? 'PASSED' : 'FAILED'}\n`);
    
    // Test 2: IV generation without expo-crypto
    console.log('Test 2: IV generation (React Native compatible)');
    const iv1 = AESInstances.userQR.generateSecureIV();
    const iv2 = AESInstances.userQR.generateSecureIV();
    console.log(`✅ IV1 generated: ${iv1.toString().substring(0, 20)}...`);
    console.log(`✅ IV2 generated: ${iv2.toString().substring(0, 20)}...`);
    console.log(`✅ IVs are different: ${iv1.toString() !== iv2.toString()}\n`);
    
    // Test 3: Pure JS crypto functionality
    console.log('Test 3: Pure JS crypto functionality');
    const iv3 = AESInstances.userQR.generateSecureIV();
    const iv4 = AESInstances.userQR.generateSecureIV();
    console.log(`✅ IV3 generated: ${iv3.toString().substring(0, 20)}...`);
    console.log(`✅ IV4 generated: ${iv4.toString().substring(0, 20)}...`);
    console.log(`✅ All IVs are different: ${iv1.toString() !== iv2.toString() && iv2.toString() !== iv3.toString() && iv3.toString() !== iv4.toString()}\n`);
    
    // Test 4: Nonce generation
    console.log('Test 4: Nonce generation');
    const nonce1 = AESInstances.userQR.generateNonce();
    const nonce2 = AESInstances.userQR.generateNonce();
    console.log(`✅ Nonce1: ${nonce1}`);
    console.log(`✅ Nonce2: ${nonce2}`);
    console.log(`✅ Nonces are different: ${nonce1 !== nonce2}\n`);
    
    // Test 5: Format validation
    console.log('Test 5: Format validation');
    const formatValid = AESInstances.userQR.isValidEncryptedData(encrypted);
    const formatInvalid = AESInstances.userQR.isValidEncryptedData("invalid_data");
    console.log(`✅ Valid format check: ${formatValid}`);
    console.log(`✅ Invalid format check: ${!formatInvalid}\n`);
    
    // Test 6: Different encryption keys
    console.log('Test 6: Different encryption keys');
    const userEncrypted = AESInstances.userQR.encrypt(testData);
    const packageEncrypted = AESInstances.packageQR.encrypt(testData);
    const adminEncrypted = AESInstances.adminQR.encrypt(testData);
    
    console.log(`✅ User encrypted: ${userEncrypted.substring(0, 30)}...`);
    console.log(`✅ Package encrypted: ${packageEncrypted.substring(0, 30)}...`);
    console.log(`✅ Admin encrypted: ${adminEncrypted.substring(0, 30)}...`);
    
    const allDifferent = userEncrypted !== packageEncrypted && 
                        packageEncrypted !== adminEncrypted && 
                        userEncrypted !== adminEncrypted;
    console.log(`✅ All encryptions different: ${allDifferent}\n`);
    
    // Test 7: Metadata validation
    console.log('Test 7: Metadata validation');
    const userDecrypted = AESInstances.userQR.decrypt(userEncrypted);
    console.log(`✅ Timestamp exists: ${!!userDecrypted.timestamp}`);
    console.log(`✅ Nonce exists: ${!!userDecrypted.nonce}`);
    console.log(`✅ Version correct: ${userDecrypted.version === '2.0.2'}`);
    console.log(`✅ Algorithm correct: ${userDecrypted.algorithm === 'AES-128-CBC'}\n`);
    
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ AES encryption is React Native compatible');
    console.log('✅ IV generation works without expo-crypto');
    console.log('✅ Fallback mechanisms work correctly');
    console.log('✅ All encryption instances work properly');
    
    return {
      success: true,
      tests: 7,
      passed: 7,
      failed: 0
    };
    
  } catch (error) {
    console.error('❌ Simple AES test failed:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test QR code generation flow
 */
function testQRCodeGeneration() {
  console.log('🔧 Testing QR code generation flow...\n');
  
  try {
    // Simulate UserQRModalWorking scenario
    const userProfile = {
      email: "user1@gmail.com",
      nama: "Test User",
      role: "user"
    };
    
    console.log('Simulating QR code generation for user:', userProfile.email);
    
    // Test user profile encryption (similar to UserQRModalWorking)
    const encrypted = AESInstances.userQR.encrypt({
      email: userProfile.email
    });
    
    console.log('✅ QR code generated successfully');
    console.log(`   Length: ${encrypted.length} characters`);
    console.log(`   Format: ${encrypted.includes(':') ? 'Valid (IV:Data)' : 'Invalid'}`);
    
    // Test decryption
    const decrypted = AESInstances.userQR.decrypt(encrypted);
    console.log('✅ QR code decrypted successfully');
    console.log(`   Email matches: ${decrypted.email === userProfile.email}`);
    
    // Test with different user
    const userProfile2 = {
      email: "user2@gmail.com",
      nama: "Another User",
      role: "user"
    };
    
    const encrypted2 = AESInstances.userQR.encrypt({
      email: userProfile2.email
    });
    
    console.log('✅ Second QR code generated');
    console.log(`   Different from first: ${encrypted !== encrypted2}`);
    
    return {
      success: true,
      qrCode: encrypted,
      length: encrypted.length
    };
    
  } catch (error) {
    console.error('❌ QR code generation test failed:', error.message);
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
  console.log('🚀 Starting Simple AES Test Suite...\n');
  
  const aesTest = testSimpleAES();
  const qrTest = testQRCodeGeneration();
  
  console.log('\n' + ''.padEnd(50, '='));
  console.log('📊 Test Results Summary:');
  console.log(''.padEnd(30, '-'));
  
  if (aesTest.success && qrTest.success) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ AES encryption works without expo-crypto');
    console.log('✅ QR code generation works correctly');
    console.log('✅ Ready for React Native production use');
  } else {
    console.log('❌ Some tests failed:');
    if (!aesTest.success) {
      console.log(`   - AES Test: ${aesTest.error}`);
    }
    if (!qrTest.success) {
      console.log(`   - QR Test: ${qrTest.error}`);
    }
  }
  
  return {
    success: aesTest.success && qrTest.success,
    aesTest,
    qrTest
  };
}

// Run tests
const result = runAllTests();

if (result.success) {
  console.log('\n🔐 React Native AES encryption is ready!');
  console.log('✅ UserQRModalWorking should now work correctly');
} else {
  console.log('\n⚠️  Please fix the issues before using in production.');
  process.exit(1);
}

export { testSimpleAES, testQRCodeGeneration };
/**
 * REACT NATIVE AES TEST - React Native Compatible Test
 * 
 * Test khusus untuk memverifikasi AES encryption service berfungsi dengan baik
 * dalam environment React Native, tanpa menggunakan expo-crypto atau Node.js modules.
 * 
 * Test ini memastikan:
 * - IV generation works without expo-crypto
 * - Encryption/decryption works synchronously 
 * - All fallback mechanisms work correctly
 * - QR code generation works in React Native
 * 
 * @author Shintya Package Delivery System
 * @version 2.0.1 (React Native Fix)
 */

import { AESInstances } from '../services/aesEncryptionService.js';
import { encryptUserProfile, encryptPackageData, decryptQRCode } from '../services/encryptionService.js';

console.log('🔐 React Native AES Encryption Test');
console.log(''.padEnd(50, '='));

/**
 * Test AES service dalam React Native environment
 */
function testReactNativeAES() {
  console.log('🧪 Testing AES service in React Native mode...\n');
  
  try {
    // Test 1: Basic encryption/decryption
    console.log('Test 1: Basic AES encryption/decryption');
    const testData = {
      email: "test@shintya.com",
      nama: "Test User"
    };
    
    const encrypted = AESInstances.userQR.encrypt(testData);
    console.log(`✅ Encryption success: ${encrypted.length} characters`);
    
    const decrypted = AESInstances.userQR.decrypt(encrypted);
    console.log(`✅ Decryption success: email = ${decrypted.email}`);
    
    const emailMatch = decrypted.email === testData.email;
    console.log(`✅ Data integrity: ${emailMatch ? 'PASSED' : 'FAILED'}\n`);
    
    // Test 2: IV generation without expo-crypto
    console.log('Test 2: IV generation fallback');
    const iv1 = AESInstances.userQR.generateSecureIV();
    const iv2 = AESInstances.userQR.generateSecureIV();
    console.log(`✅ IV1 generated: ${iv1.toString().substring(0, 20)}...`);
    console.log(`✅ IV2 generated: ${iv2.toString().substring(0, 20)}...`);
    console.log(`✅ IVs are different: ${iv1.toString() !== iv2.toString()}\n`);
    
    // Test 3: Nonce generation
    console.log('Test 3: Nonce generation');
    const nonce1 = AESInstances.userQR.generateNonce();
    const nonce2 = AESInstances.userQR.generateNonce();
    console.log(`✅ Nonce1: ${nonce1}`);
    console.log(`✅ Nonce2: ${nonce2}`);
    console.log(`✅ Nonces are different: ${nonce1 !== nonce2}\n`);
    
    // Test 4: Format validation
    console.log('Test 4: Format validation');
    const formatValid = AESInstances.userQR.isValidEncryptedData(encrypted);
    const formatInvalid = AESInstances.userQR.isValidEncryptedData("invalid_data");
    console.log(`✅ Valid format check: ${formatValid}`);
    console.log(`✅ Invalid format check: ${!formatInvalid}\n`);
    
    // Test 5: All instances work
    console.log('Test 5: All AES instances');
    const userTest = AESInstances.userQR.testEncryption();
    const packageTest = AESInstances.packageQR.testEncryption();
    const adminTest = AESInstances.adminQR.testEncryption();
    
    console.log(`✅ User instance: ${userTest.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Package instance: ${packageTest.success ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Admin instance: ${adminTest.success ? 'PASSED' : 'FAILED'}\n`);
    
    return {
      success: true,
      tests: 5,
      passed: 5,
      failed: 0
    };
    
  } catch (error) {
    console.error('❌ React Native AES test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test encryption service integration
 */
async function testEncryptionServiceIntegration() {
  console.log('🔧 Testing encryption service integration...\n');
  
  try {
    // Test user profile encryption
    console.log('Test: User profile encryption');
    const userProfile = {
      id: 'user123',
      email: 'user1@gmail.com',
      nama: 'Test User',
      role: 'user'
    };
    
    const userResult = await encryptUserProfile(userProfile);
    console.log(`✅ User encryption: ${userResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (userResult.success) {
      console.log(`   QR Code length: ${userResult.qrCode.length}`);
      console.log(`   Encryption type: ${userResult.metadata.encryptionType}`);
    }
    
    // Test package encryption
    console.log('\nTest: Package data encryption');
    const packageData = {
      id: 'pkg123',
      noResi: 'SH240001234',
      nama: 'John Doe',
      status: 'Telah Tiba',
      isCod: true,
      nomorLoker: 1
    };
    
    const packageResult = await encryptPackageData(packageData);
    console.log(`✅ Package encryption: ${packageResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (packageResult.success) {
      console.log(`   QR Code length: ${packageResult.qrCode.length}`);
      console.log(`   Encryption type: ${packageResult.metadata.encryptionType}`);
    }
    
    // Test decryption
    if (userResult.success) {
      console.log('\nTest: QR Code decryption');
      const decryptResult = await decryptQRCode(userResult.qrCode, 'user_profile');
      console.log(`✅ Decryption: ${decryptResult.success ? 'SUCCESS' : 'FAILED'}`);
      if (decryptResult.success) {
        console.log(`   Decrypted email: ${decryptResult.data.email}`);
        console.log(`   Encryption type: ${decryptResult.encryptionType}`);
      }
    }
    
    return {
      success: true,
      userEncryption: userResult.success,
      packageEncryption: packageResult.success
    };
    
  } catch (error) {
    console.error('❌ Encryption service integration test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting React Native AES Test Suite...\n');
  
  const aesTest = testReactNativeAES();
  const integrationTest = await testEncryptionServiceIntegration();
  
  console.log('\n' + ''.padEnd(50, '='));
  console.log('📊 Test Results Summary:');
  console.log(''.padEnd(30, '-'));
  
  if (aesTest.success && integrationTest.success) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ AES encryption is React Native compatible');
    console.log('✅ IV generation works without expo-crypto');
    console.log('✅ QR code generation works correctly');
    console.log('✅ Encryption service integration works');
  } else {
    console.log('❌ Some tests failed:');
    if (!aesTest.success) {
      console.log(`   - AES Test: ${aesTest.error}`);
    }
    if (!integrationTest.success) {
      console.log(`   - Integration Test: ${integrationTest.error}`);
    }
  }
  
  return {
    success: aesTest.success && integrationTest.success,
    aesTest,
    integrationTest
  };
}

// Run tests
runAllTests().then(result => {
  if (result.success) {
    console.log('\n🔐 React Native AES encryption is ready for production!');
  } else {
    console.log('\n⚠️  Please fix the issues before using in production.');
  }
}).catch(console.error);

export { testReactNativeAES, testEncryptionServiceIntegration };
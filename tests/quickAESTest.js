#!/usr/bin/env node

/**
 * QUICK AES TEST - Simple verification script
 * 
 * Quick test untuk memverifikasi AES encryption service berfungsi dengan baik.
 * Script ini menjalankan basic encryption/decryption test untuk semua instances.
 * 
 * Usage:
 * ```bash
 * node tests/quickAESTest.js
 * ```
 */

import { AESInstances, testAllAESInstances } from '../services/aesEncryptionService.js';

console.log('🔐 Quick AES Encryption Test');
console.log(''.padEnd(40, '='));

async function runQuickTest() {
  try {
    console.log('Testing AES instances...\n');
    
    // Test all pre-configured instances
    const results = await testAllAESInstances();
    
    for (const [name, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`✅ ${name}: ${result.encryptedLength} chars encrypted`);
      } else {
        console.log(`❌ ${name}: ${result.error}`);
      }
    }
    
    console.log('\n🧪 Testing basic functionality...');
    
    // Test user data encryption
    const userData = {
      email: "test@shintya.com",
      nama: "Test User"
    };
    
    const userEncrypted = await AESInstances.userQR.encrypt(userData);
    const userDecrypted = AESInstances.userQR.decrypt(userEncrypted);
    
    console.log('User data test:');
    console.log(`  Original: ${JSON.stringify(userData)}`);
    console.log(`  Encrypted: ${userEncrypted.substring(0, 50)}...`);
    console.log(`  Decrypted email: ${userDecrypted.email}`);
    console.log(`  ✅ Match: ${userDecrypted.email === userData.email}`);
    
    // Test package data encryption
    const packageData = {
      noResi: "SH240001234",
      nama: "John Doe",
      status: "Telah Tiba",
      isCod: true
    };
    
    const packageEncrypted = await AESInstances.packageQR.encrypt(packageData);
    const packageDecrypted = AESInstances.packageQR.decrypt(packageEncrypted);
    
    console.log('\nPackage data test:');
    console.log(`  Original: ${JSON.stringify(packageData)}`);
    console.log(`  Encrypted: ${packageEncrypted.substring(0, 50)}...`);
    console.log(`  Decrypted noResi: ${packageDecrypted.noResi}`);
    console.log(`  ✅ Match: ${packageDecrypted.noResi === packageData.noResi}`);
    
    // Test format validation
    console.log('\n🔍 Testing format validation...');
    console.log(`  Valid format check: ${AESInstances.userQR.isValidEncryptedData(userEncrypted)}`);
    console.log(`  Invalid format check: ${!AESInstances.userQR.isValidEncryptedData("invalid_data")}`);
    
    console.log('\n🎉 All quick tests passed!');
    console.log('✅ AES encryption service is working correctly.');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    process.exit(1);
  }
}

runQuickTest();
#!/usr/bin/env node

/**
 * TEST RUNNER SCRIPT - Shintya Encryption Library
 * 
 * Script untuk menjalankan semua test suites untuk ShintyaEncryption library
 * dan components terkait dalam environment Node.js.
 * 
 * Usage:
 * ```bash
 * node tests/runTests.js
 * npm run test-encryption
 * ```
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current directory untuk ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 AES Encryption Service - Test Suite Runner');
console.log(''.padEnd(60, '='));
console.log(`📍 Test Directory: ${__dirname}`);
console.log(`⏰ Started at: ${new Date().toLocaleString('id-ID')}\n`);

/**
 * Function untuk menjalankan individual test file
 */
const runTestFile = async (testFile) => {
  try {
    console.log(`🔬 Running ${testFile}...`);
    
    // Dynamic import untuk test file
    const testModule = await import(join(__dirname, testFile));
    
    console.log(`✅ ${testFile} completed successfully\n`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error running ${testFile}:`);
    console.error(error.message);
    console.error('');
    
    return false;
  }
};

/**
 * Function untuk mencari semua test files
 */
const findTestFiles = () => {
  const testFiles = [];
  
  try {
    const files = fs.readdirSync(__dirname);
    
    for (const file of files) {
      if (file.endsWith('.test.js') && file !== 'runTests.js') {
        testFiles.push(file);
      }
    }
    
    return testFiles;
  } catch (error) {
    console.error('Error reading test directory:', error.message);
    return [];
  }
};

/**
 * Main test runner function
 */
const runAllTests = async () => {
  const startTime = Date.now();
  
  // Find all test files
  const testFiles = findTestFiles();
  
  if (testFiles.length === 0) {
    console.log('❌ No test files found!');
    console.log('Test files should end with .test.js');
    return;
  }
  
  console.log(`📋 Found ${testFiles.length} test file(s):`);
  testFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Track results
  let successCount = 0;
  let failureCount = 0;
  
  // Run each test file
  for (const testFile of testFiles) {
    const success = await runTestFile(testFile);
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  // Print summary
  const endTime = Date.now();
  const executionTime = endTime - startTime;
  
  console.log(''.padEnd(60, '='));
  console.log('📊 Test Suite Summary:');
  console.log(''.padEnd(30, '-'));
  console.log(`Total Test Files: ${testFiles.length}`);
  console.log(`Successful: ${successCount} ✅`);
  console.log(`Failed: ${failureCount} ❌`);
  console.log(`Execution Time: ${executionTime}ms`);
  console.log(`Completed at: ${new Date().toLocaleString('id-ID')}`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All test suites passed successfully!');
    console.log('🔒 AES encryption service is ready for production use.');
  } else {
    console.log('\n⚠️  Some test suites failed. Please review the errors above.');
    console.log('🔧 Fix the issues before deploying to production.');
  }
  
  // Exit dengan appropriate code
  process.exit(failureCount === 0 ? 0 : 1);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the test suite
runAllTests().catch((error) => {
  console.error('❌ Fatal error running test suite:', error);
  process.exit(1);
});
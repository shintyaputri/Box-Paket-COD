/**
 * MIGRATION SCRIPT WITH AUTHENTICATION - Firestore to RTDB Dual Mirroring Migration
 * 
 * Script untuk mengcopy semua data dari Firestore ke Realtime Database (RTDB)
 * dengan dukungan dual mirroring dan authentication menggunakan admin credentials.
 * 
 * IMPORTANT: Script ini memerlukan login terlebih dahulu atau service account
 * 
 * Collections yang akan dimigrate:
 * - receipts (Package receipts) → receipts/ dan sequence/receipts/
 * - users (User profiles) → users/ dan sequence/users/
 * - lokerControl (Loker control commands) → lokerControl/ dan sequence/lokerControl/
 * 
 * Dual Mirroring:
 * - Original path: collection/firebaseId (untuk app compatibility)
 * - Sequence path: sequence/collection/1,2,3 (untuk ESP32 compatibility)
 * 
 * Cara menjalankan:
 * 1. Login ke Firebase terlebih dahulu di browser
 * 2. npm install (jika belum)
 * 3. node scripts/migrateWithAuth.js
 * 
 * ATAU gunakan service account key:
 * 1. Download service account key dari Firebase Console
 * 2. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 * 3. node scripts/migrateWithAuth.js
 * 
 * @author Shintya Package Delivery System
 * @version 2.0.0
 */

// Import Firebase modules
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs,
  connectFirestoreEmulator 
} = require('firebase/firestore');
const { 
  getDatabase, 
  ref, 
  set,
  get,
  runTransaction,
  connectDatabaseEmulator 
} = require('firebase/database');
const { 
  getAuth, 
  signInWithEmailAndPassword,
  signInAnonymously 
} = require('firebase/auth');

// Firebase configuration (menggunakan config yang sama dengan aplikasi)
const firebaseConfig = {
  apiKey: "AIzaSyA5Lsxqplxa4eQ9H8Zap3e95R_-SFGe2yU",
  authDomain: "alien-outrider-453003-g8.firebaseapp.com",
  databaseURL: "https://alien-outrider-453003-g8-default-rtdb.firebaseio.com",
  projectId: "alien-outrider-453003-g8",
  storageBucket: "alien-outrider-453003-g8.firebasestorage.app",
  messagingSenderId: "398044917472",
  appId: "1:398044917472:web:4ec00f19fafe5523442a85",
  measurementId: "G-J6BPHF1V0Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const auth = getAuth(app);

// Configuration
const CONFIG = {
  DRY_RUN: false,          // Set true untuk testing tanpa write data
  BATCH_SIZE: 25,         // Kurangi batch size untuk menghindari rate limit
  DELAY_BETWEEN_BATCHES: 2000, // Delay antar batch (ms)
  ADMIN_EMAIL: "admin@gmail.com",  // Email admin untuk login
  ADMIN_PASSWORD: "admin123",      // Password admin yang benar
  USE_ANONYMOUS_AUTH: false,       // Set true untuk anonymous auth
  ENABLE_DUAL_MIRRORING: true,     // Enable dual mirroring (original + sequence paths)
  COLLECTIONS_TO_MIGRATE: [
    { 
      firestore: 'receipts', 
      rtdb: 'original/receipts',
      sequence: 'receipts',
      description: 'Package receipts and tracking data'
    },
    { 
      firestore: 'users', 
      rtdb: 'original/users',
      sequence: 'users',
      description: 'User profiles and data'
    },
    { 
      firestore: 'lokerControl', 
      rtdb: 'original/lokerControl',
      sequence: 'lokerControl',
      description: 'Loker control commands and status'
    },
    { 
      firestore: 'globalActivities', 
      rtdb: 'original/globalActivities',
      sequence: 'globalActivities',
      description: 'User activity logs and audit trail'
    },
    { 
      firestore: 'capacity', 
      rtdb: 'original/capacity',
      sequence: 'capacity',
      description: 'Ultrasonic sensor capacity data'
    },
    { 
      firestore: 'scannerModeHistory', 
      rtdb: 'original/scannerModeHistory',
      sequence: 'scannerModeHistory',
      description: 'ESP32 scanner mode change history'
    }
  ]
};

/**
 * Helper function untuk convert Firestore timestamp ke Unix timestamp
 */
function convertTimestamp(firestoreData) {
  const converted = { ...firestoreData };
  
  // Convert semua field timestamp yang umum
  const timestampFields = ['createdAt', 'updatedAt', 'deletedAt', 'restoredAt', 'timestamp'];
  
  timestampFields.forEach(field => {
    if (converted[field] && converted[field].toDate) {
      // Firestore Timestamp object
      converted[field] = converted[field].toDate().getTime();
    } else if (converted[field] instanceof Date) {
      // JavaScript Date object
      converted[field] = converted[field].getTime();
    }
  });
  
  return converted;
}

/**
 * Helper function untuk delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate sequential ID untuk collection
 */
async function generateSequentialId(collectionName) {
  try {
    const metaRef = ref(realtimeDb, `sequence/${collectionName}/meta/lastId`);
    
    // Atomic increment untuk avoid collision
    const result = await runTransaction(metaRef, (currentValue) => {
      return (currentValue || 0) + 1;
    });
    
    if (result.committed) {
      // Update count juga
      const countRef = ref(realtimeDb, `sequence/${collectionName}/meta/count`);
      await set(countRef, result.snapshot.val());
      
      return result.snapshot.val();
    } else {
      throw new Error('Failed to generate sequential ID');
    }
  } catch (error) {
    console.error(`Error generating sequential ID for ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Initialize sequence meta untuk collection
 */
async function initializeSequenceMeta(collectionName) {
  try {
    const metaRef = ref(realtimeDb, `sequence/${collectionName}/meta`);
    const snapshot = await get(metaRef);
    
    if (!snapshot.exists()) {
      await set(metaRef, { count: 0, lastId: 0 });
      console.log(`   ✅ Initialized sequence meta for ${collectionName}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  Failed to initialize sequence meta for ${collectionName}:`, error.message);
  }
}

/**
 * Helper function untuk format angka dengan separator
 */
function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

/**
 * Authenticate user sebelum migration
 */
async function authenticateUser() {
  console.log('🔐 Authenticating user...');
  
  try {
    if (CONFIG.USE_ANONYMOUS_AUTH) {
      console.log('📱 Using anonymous authentication...');
      const userCredential = await signInAnonymously(auth);
      console.log('✅ Anonymous authentication successful');
      return userCredential.user;
    } else {
      console.log('📧 Using email/password authentication...');
      console.log(`   Email: ${CONFIG.ADMIN_EMAIL}`);
      
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        CONFIG.ADMIN_EMAIL, 
        CONFIG.ADMIN_PASSWORD
      );
      
      console.log('✅ Email authentication successful');
      console.log(`   User: ${userCredential.user.email}`);
      return userCredential.user;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   1. Check if email/password is correct');
    console.log('   2. Try setting USE_ANONYMOUS_AUTH to true');
    console.log('   3. Check Firebase Auth settings in console');
    console.log('   4. Ensure Firebase Security Rules allow read access');
    throw error;
  }
}

/**
 * Fungsi utama untuk migrate satu collection dengan dual mirroring
 */
async function migrateCollection(collectionConfig) {
  console.log(`\n🔄 Migrating ${collectionConfig.firestore} → ${collectionConfig.rtdb}`);
  console.log(`📝 ${collectionConfig.description}`);
  
  if (CONFIG.ENABLE_DUAL_MIRRORING) {
    console.log(`🔀 Dual mirroring enabled: sequence/${collectionConfig.sequence}/`);
  }
  
  try {
    // Initialize sequence meta jika dual mirroring enabled
    if (CONFIG.ENABLE_DUAL_MIRRORING && !CONFIG.DRY_RUN) {
      await initializeSequenceMeta(collectionConfig.sequence);
    }
    
    // Get semua dokumen dari Firestore collection
    console.log(`📊 Fetching data from Firestore collection: ${collectionConfig.firestore}...`);
    const firestoreRef = collection(db, collectionConfig.firestore);
    const snapshot = await getDocs(firestoreRef);
    
    const totalDocs = snapshot.size;
    console.log(`📈 Found ${formatNumber(totalDocs)} documents to migrate`);
    
    if (totalDocs === 0) {
      console.log(`⚠️  No documents found in ${collectionConfig.firestore}, skipping...`);
      return { success: true, migrated: 0, errors: 0 };
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process documents dalam batch
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, data: doc.data() });
    });
    
    const totalBatches = Math.ceil(docs.length / CONFIG.BATCH_SIZE);
    console.log(`🔢 Processing in ${totalBatches} batches of ${CONFIG.BATCH_SIZE} documents each`);
    
    for (let i = 0; i < docs.length; i += CONFIG.BATCH_SIZE) {
      const batch = docs.slice(i, i + CONFIG.BATCH_SIZE);
      const currentBatch = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      
      console.log(`\n📦 Processing batch ${currentBatch}/${totalBatches} (${batch.length} documents)...`);
      
      // Process setiap dokumen dalam batch
      for (const doc of batch) {
        try {
          // Convert timestamps
          const convertedData = convertTimestamp(doc.data);
          
          if (CONFIG.DRY_RUN) {
            console.log(`🧪 [DRY RUN] Would migrate: ${doc.id}`);
            if (CONFIG.ENABLE_DUAL_MIRRORING) {
              console.log(`🧪 [DRY RUN] Would also create sequence entry`);
            }
            migratedCount++;
          } else {
            // Write to original RTDB path
            const rtdbRef = ref(realtimeDb, `${collectionConfig.rtdb}/${doc.id}`);
            await set(rtdbRef, {
              ...convertedData,
              firestoreId: doc.id
            });
            
            // Write to sequence path jika dual mirroring enabled
            if (CONFIG.ENABLE_DUAL_MIRRORING) {
              try {
                const sequentialId = await generateSequentialId(collectionConfig.sequence);
                const sequenceRef = ref(realtimeDb, `sequence/${collectionConfig.sequence}/${sequentialId}`);
                await set(sequenceRef, {
                  ...convertedData,
                  firebaseId: doc.id,
                  sequenceId: sequentialId
                });
                
                // Save mapping Firebase ID → Sequential ID
                const mappingRef = ref(realtimeDb, `mapping/${collectionConfig.sequence}/${doc.id}`);
                await set(mappingRef, sequentialId);
              } catch (sequenceError) {
                console.warn(`\n⚠️  Failed to create sequence entry for ${doc.id}:`, sequenceError.message);
              }
            }
            
            migratedCount++;
            
            // Progress indicator
            const progress = Math.round((migratedCount / totalDocs) * 100);
            process.stdout.write(`\r   Progress: ${progress}% (${formatNumber(migratedCount)}/${formatNumber(totalDocs)})`);
          }
        } catch (error) {
          errorCount++;
          const errorInfo = {
            docId: doc.id,
            error: error.message,
            data: doc.data
          };
          errors.push(errorInfo);
          console.error(`\n❌ Error migrating document ${doc.id}:`, error.message);
        }
      }
      
      // Delay antar batch untuk menghindari rate limiting
      if (i + CONFIG.BATCH_SIZE < docs.length && CONFIG.DELAY_BETWEEN_BATCHES > 0) {
        console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(CONFIG.DELAY_BETWEEN_BATCHES);
      }
    }
    
    console.log(`\n✅ Migration completed for ${collectionConfig.firestore}`);
    console.log(`📊 Results:`);
    console.log(`   - Migrated: ${formatNumber(migratedCount)} documents`);
    console.log(`   - Errors: ${formatNumber(errorCount)} documents`);
    
    if (CONFIG.ENABLE_DUAL_MIRRORING && !CONFIG.DRY_RUN) {
      console.log(`   - Dual mirroring: Original + Sequence paths`);
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ Error Details:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Document ${error.docId}: ${error.error}`);
      });
    }
    
    return { 
      success: errorCount === 0, 
      migrated: migratedCount, 
      errors: errorCount,
      errorDetails: errors
    };
    
  } catch (error) {
    console.error(`❌ Failed to migrate collection ${collectionConfig.firestore}:`, error);
    return { 
      success: false, 
      migrated: 0, 
      errors: 1,
      errorDetails: [{ collection: collectionConfig.firestore, error: error.message }]
    };
  }
}

/**
 * Fungsi utama untuk menjalankan migrasi
 */
async function runMigration() {
  console.log('🚀 Starting Firestore to RTDB Dual Mirroring Migration Script (With Authentication)');
  console.log('='.repeat(70));
  
  if (CONFIG.DRY_RUN) {
    console.log('🧪 DRY RUN MODE: No data will be written to RTDB');
  }
  
  if (CONFIG.ENABLE_DUAL_MIRRORING) {
    console.log('🔀 DUAL MIRRORING ENABLED: Data will be mirrored to both original and sequence paths');
  }
  
  try {
    // Step 1: Authenticate user
    const user = await authenticateUser();
    
    console.log(`\n📋 Collections to migrate: ${CONFIG.COLLECTIONS_TO_MIGRATE.length}`);
    CONFIG.COLLECTIONS_TO_MIGRATE.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.firestore} → ${config.rtdb}`);
    });
    
    const startTime = Date.now();
    const results = {
      totalCollections: CONFIG.COLLECTIONS_TO_MIGRATE.length,
      successfulCollections: 0,
      failedCollections: 0,
      totalMigrated: 0,
      totalErrors: 0,
      details: []
    };
    
    // Migrate setiap collection
    for (const collectionConfig of CONFIG.COLLECTIONS_TO_MIGRATE) {
      const result = await migrateCollection(collectionConfig);
      
      results.details.push({
        collection: collectionConfig.firestore,
        ...result
      });
      
      if (result.success) {
        results.successfulCollections++;
      } else {
        results.failedCollections++;
      }
      
      results.totalMigrated += result.migrated;
      results.totalErrors += result.errors;
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    // Summary report
    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY REPORT');
    console.log('='.repeat(70));
    console.log(`👤 Authenticated User: ${user.email || 'Anonymous'}`);
    console.log(`⏱️  Total Duration: ${duration} seconds`);
    console.log(`📂 Collections Processed: ${results.totalCollections}`);
    console.log(`✅ Successful Collections: ${results.successfulCollections}`);
    console.log(`❌ Failed Collections: ${results.failedCollections}`);
    console.log(`📄 Total Documents Migrated: ${formatNumber(results.totalMigrated)}`);
    console.log(`⚠️  Total Errors: ${formatNumber(results.totalErrors)}`);
    
    if (results.totalMigrated > 0) {
      const docsPerSecond = Math.round(results.totalMigrated / duration);
      console.log(`🚀 Migration Speed: ${formatNumber(docsPerSecond)} docs/second`);
    }
    
    // Detailed results per collection
    console.log('\n📋 Per-Collection Results:');
    results.details.forEach((detail, index) => {
      const status = detail.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${detail.collection}: ${formatNumber(detail.migrated)} migrated, ${formatNumber(detail.errors)} errors`);
    });
    
    if (CONFIG.DRY_RUN) {
      console.log('\n🧪 This was a DRY RUN - no data was actually written to RTDB');
      console.log('   Set CONFIG.DRY_RUN = false to perform actual migration');
    }
    
    if (results.failedCollections === 0 && results.totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ All Firestore data has been mirrored to RTDB');
    } else {
      console.log('\n⚠️  Migration completed with some issues');
      console.log('❗ Please check the error details above');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify data in Firebase Console → Realtime Database');
    console.log('      - Original paths: original/receipts/, original/users/, original/lokerControl/');
    if (CONFIG.ENABLE_DUAL_MIRRORING) {
      console.log('      - Sequence paths: sequence/receipts/, sequence/users/, sequence/lokerControl/');
      console.log('      - Mapping paths: mapping/receipts/, mapping/users/, mapping/lokerControl/');
    }
    console.log('   2. Test your application with the mirrored data');
    console.log('   3. Test ESP32 compatibility with sequence paths (1,2,3 IDs)');
    console.log('   4. Monitor RTDB usage and performance');
    
    // Sign out user
    await auth.signOut();
    console.log('🔓 User signed out successfully');
    
    process.exit(results.failedCollections > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    console.log('\n💡 Troubleshooting Guide:');
    console.log('1. Check Firebase Console → Authentication');
    console.log('   - Ensure Email/Password provider is enabled');
    console.log('   - Check if admin@gmail.com account exists');
    console.log('');
    console.log('2. Check Firebase Console → Firestore → Rules');
    console.log('   - Ensure read access is allowed for authenticated users');
    console.log('   - Current rules should allow: allow read: if request.auth != null;');
    console.log('');
    console.log('3. Check Firebase Console → Realtime Database → Rules');
    console.log('   - Ensure write access is allowed for authenticated users');
    console.log('   - Current rules should allow: ".write": "auth != null"');
    console.log('');
    console.log('4. Alternative Solutions:');
    console.log('   - Set USE_ANONYMOUS_AUTH = true for anonymous access');
    console.log('   - Create admin account: admin@gmail.com with any password');
    console.log('   - Run migration from within React Native app context');
    
    process.exit(1);
  }
}

/**
 * Handle uncaught errors
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run migration
if (require.main === module) {
  runMigration().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigration,
  migrateCollection,
  convertTimestamp,
  authenticateUser
};
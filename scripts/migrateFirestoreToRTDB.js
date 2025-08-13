/**
 * MIGRATION SCRIPT - Firestore to RTDB Data Migration
 * 
 * Script untuk mengcopy semua data dari Firestore ke Realtime Database (RTDB)
 * sebagai mirror/backup dari data yang sudah ada.
 * 
 * Collections yang akan dimigrate:
 * - receipts (Package receipts)
 * - users (User profiles)  
 * - lokerControl (Loker control commands)
 * 
 * Cara menjalankan:
 * 1. Pastikan Firebase config sudah benar
 * 2. npm install (jika belum)
 * 3. node scripts/migrateFirestoreToRTDB.js
 * 
 * Fitur:
 * - Progress tracking dengan percentage
 * - Error handling comprehensive
 * - Batch processing untuk performa
 * - Timestamp conversion (Firestore Date ke Unix timestamp)
 * - Dry run mode untuk testing
 * - Detailed logging
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
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
  connectDatabaseEmulator 
} = require('firebase/database');

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

// Configuration
const CONFIG = {
  DRY_RUN: false,          // Set true untuk testing tanpa write data
  BATCH_SIZE: 50,          // Jumlah dokumen per batch
  DELAY_BETWEEN_BATCHES: 1000, // Delay antar batch (ms)
  COLLECTIONS_TO_MIGRATE: [
    { 
      firestore: 'receipts', 
      rtdb: 'receipts',
      description: 'Package receipts and tracking data'
    },
    { 
      firestore: 'users', 
      rtdb: 'users',
      description: 'User profiles and data'
    },
    { 
      firestore: 'lokerControl', 
      rtdb: 'lokerControl',
      description: 'Loker control commands and status'
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
 * Helper function untuk format angka dengan separator
 */
function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

/**
 * Helper function untuk format ukuran byte
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Fungsi utama untuk migrate satu collection
 */
async function migrateCollection(collectionConfig) {
  console.log(`\n🔄 Migrating ${collectionConfig.firestore} → ${collectionConfig.rtdb}`);
  console.log(`📝 ${collectionConfig.description}`);
  
  try {
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
            migratedCount++;
          } else {
            // Write to RTDB
            const rtdbRef = ref(realtimeDb, `${collectionConfig.rtdb}/${doc.id}`);
            await set(rtdbRef, convertedData);
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
  console.log('🚀 Starting Firestore to RTDB Migration Script');
  console.log('='.repeat(60));
  
  if (CONFIG.DRY_RUN) {
    console.log('🧪 DRY RUN MODE: No data will be written to RTDB');
  }
  
  console.log(`📋 Collections to migrate: ${CONFIG.COLLECTIONS_TO_MIGRATE.length}`);
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
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY REPORT');
  console.log('='.repeat(60));
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
  console.log('   2. Test your application with the mirrored data');
  console.log('   3. Monitor RTDB usage and performance');
  
  process.exit(results.failedCollections > 0 ? 1 : 0);
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
  convertTimestamp
};
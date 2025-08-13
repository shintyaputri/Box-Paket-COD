/**
 * SEQUENCE SERVICE - Sequential ID Management for RTDB
 * 
 * Service untuk mengelola sequential IDs (1, 2, 3) di Firebase Realtime Database.
 * Digunakan untuk membuat structure yang ESP32-friendly dengan ID yang predictable.
 * 
 * Structure RTDB:
 * sequence/
 * ├── users/
 * │   ├── 1/ {userData + firebaseId}
 * │   ├── 2/ {userData + firebaseId}
 * │   └── meta/ {count, lastId}
 * ├── receipts/
 * │   ├── 1/ {receiptData + firebaseId}
 * │   ├── 2/ {receiptData + firebaseId}
 * │   └── meta/ {count, lastId}
 * └── lokerControl/
 *     ├── 1/ {lokerData + firebaseId}
 *     ├── 2/ {lokerData + firebaseId}
 *     └── meta/ {count, lastId}
 * 
 * Fitur:
 * - Atomic ID increment untuk avoid collision
 * - Mapping table Firestore ID ↔ Sequence ID
 * - Meta information (count, lastId) untuk setiap collection
 * - Efficient lookup dan management functions
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { 
  ref, 
  set, 
  get, 
  update, 
  remove,
  runTransaction,
  serverTimestamp 
} from 'firebase/database';
import { realtimeDb } from './firebase';

// Base paths untuk sequence structure
const SEQUENCE_BASE = 'sequence';
const MAPPING_BASE = 'mapping';

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
 * Service untuk mengelola sequential IDs di RTDB
 */
export const sequenceService = {
  
  /**
   * Generate sequential ID baru untuk collection tertentu
   * 
   * @param {string} collectionName - Nama collection (users, receipts, lokerControl)
   * @returns {Promise<number>} Sequential ID yang baru
   */
  async generateSequentialId(collectionName) {
    try {
      const metaRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta/lastId`);
      
      // Atomic increment untuk avoid collision
      const result = await runTransaction(metaRef, (currentValue) => {
        return (currentValue || 0) + 1;
      });
      
      if (result.committed) {
        // Update count juga
        const countRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta/count`);
        await set(countRef, result.snapshot.val());
        
        return result.snapshot.val();
      } else {
        throw new Error('Failed to generate sequential ID');
      }
    } catch (error) {
      console.error(`Error generating sequential ID for ${collectionName}:`, error);
      throw error;
    }
  },

  /**
   * Add data baru dengan sequential ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {string} firebaseId - Firebase document ID
   * @param {Object} data - Data yang akan disimpan
   * @returns {Promise<number>} Sequential ID yang di-assign
   */
  async addWithSequentialId(collectionName, firebaseId, data) {
    try {
      // Generate sequential ID
      const sequentialId = await this.generateSequentialId(collectionName);
      
      // Convert timestamps untuk RTDB
      const rtdbData = convertTimestamp(data);
      
      // Add firebaseId reference
      rtdbData.firebaseId = firebaseId;
      rtdbData.sequenceId = sequentialId;
      
      // Save data dengan sequential ID
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/${sequentialId}`);
      await set(dataRef, rtdbData);
      
      // Save mapping Firestore ID → Sequential ID
      const mappingRef = ref(realtimeDb, `${MAPPING_BASE}/${collectionName}/${firebaseId}`);
      await set(mappingRef, sequentialId);
      
      console.log(`Added ${collectionName} with sequential ID: ${sequentialId}`);
      return sequentialId;
    } catch (error) {
      console.error(`Error adding ${collectionName} with sequential ID:`, error);
      throw error;
    }
  },

  /**
   * Update data existing berdasarkan Firebase ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {string} firebaseId - Firebase document ID
   * @param {Object} updates - Data yang akan diupdate
   * @returns {Promise<boolean>} Success status
   */
  async updateByFirebaseId(collectionName, firebaseId, updates) {
    try {
      // Get sequential ID dari mapping
      const sequentialId = await this.getSequentialIdByFirebaseId(collectionName, firebaseId);
      
      if (!sequentialId) {
        console.warn(`No sequential ID found for Firebase ID: ${firebaseId}`);
        return false;
      }
      
      // Convert timestamps
      const rtdbUpdates = convertTimestamp(updates);
      
      // Update data
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/${sequentialId}`);
      await update(dataRef, rtdbUpdates);
      
      console.log(`Updated ${collectionName} sequential ID ${sequentialId}`);
      return true;
    } catch (error) {
      console.error(`Error updating ${collectionName} by Firebase ID:`, error);
      throw error;
    }
  },

  /**
   * Delete data berdasarkan Firebase ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {string} firebaseId - Firebase document ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteByFirebaseId(collectionName, firebaseId) {
    try {
      // Get sequential ID dari mapping
      const sequentialId = await this.getSequentialIdByFirebaseId(collectionName, firebaseId);
      
      if (!sequentialId) {
        console.warn(`No sequential ID found for Firebase ID: ${firebaseId}`);
        return false;
      }
      
      // Delete data
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/${sequentialId}`);
      await remove(dataRef);
      
      // Delete mapping
      const mappingRef = ref(realtimeDb, `${MAPPING_BASE}/${collectionName}/${firebaseId}`);
      await remove(mappingRef);
      
      // Update count in meta (FIXED: Count should decrease on delete)
      await this.decrementCount(collectionName);
      
      console.log(`Deleted ${collectionName} sequential ID ${sequentialId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${collectionName} by Firebase ID:`, error);
      throw error;
    }
  },

  /**
   * Get sequential ID berdasarkan Firebase ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {string} firebaseId - Firebase document ID
   * @returns {Promise<number|null>} Sequential ID atau null jika tidak ditemukan
   */
  async getSequentialIdByFirebaseId(collectionName, firebaseId) {
    try {
      const mappingRef = ref(realtimeDb, `${MAPPING_BASE}/${collectionName}/${firebaseId}`);
      const snapshot = await get(mappingRef);
      
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Error getting sequential ID for ${firebaseId}:`, error);
      return null;
    }
  },

  /**
   * Get Firebase ID berdasarkan sequential ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {number} sequentialId - Sequential ID
   * @returns {Promise<string|null>} Firebase ID atau null jika tidak ditemukan
   */
  async getFirebaseIdBySequentialId(collectionName, sequentialId) {
    try {
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/${sequentialId}/firebaseId`);
      const snapshot = await get(dataRef);
      
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Error getting Firebase ID for sequential ID ${sequentialId}:`, error);
      return null;
    }
  },

  /**
   * Get data berdasarkan sequential ID
   * 
   * @param {string} collectionName - Nama collection
   * @param {number} sequentialId - Sequential ID
   * @returns {Promise<Object|null>} Data atau null jika tidak ditemukan
   */
  async getDataBySequentialId(collectionName, sequentialId) {
    try {
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/${sequentialId}`);
      const snapshot = await get(dataRef);
      
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error(`Error getting data for sequential ID ${sequentialId}:`, error);
      return null;
    }
  },

  /**
   * Get meta information untuk collection
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<Object>} Meta info {count, lastId}
   */
  async getMetaInfo(collectionName) {
    try {
      const metaRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta`);
      const snapshot = await get(metaRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        // Initialize meta jika belum ada
        const defaultMeta = { count: 0, lastId: 0 };
        await set(metaRef, defaultMeta);
        return defaultMeta;
      }
    } catch (error) {
      console.error(`Error getting meta info for ${collectionName}:`, error);
      return { count: 0, lastId: 0 };
    }
  },

  /**
   * Get semua data untuk collection dengan sequential IDs
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<Array>} Array data dengan sequential IDs
   */
  async getAllDataWithSequentialIds(collectionName) {
    try {
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}`);
      const snapshot = await get(dataRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const data = snapshot.val();
      const result = [];
      
      // Convert object ke array, exclude meta
      Object.keys(data).forEach(key => {
        if (key !== 'meta' && !isNaN(parseInt(key))) {
          result.push({
            sequenceId: parseInt(key),
            ...data[key]
          });
        }
      });
      
      // Sort berdasarkan sequenceId
      result.sort((a, b) => a.sequenceId - b.sequenceId);
      
      return result;
    } catch (error) {
      console.error(`Error getting all data for ${collectionName}:`, error);
      return [];
    }
  },

  /**
   * Decrement count in meta when item is deleted
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<boolean>} Success status
   */
  async decrementCount(collectionName) {
    try {
      const countRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta/count`);
      
      // Atomic decrement untuk avoid race conditions
      const result = await runTransaction(countRef, (currentCount) => {
        return Math.max((currentCount || 0) - 1, 0); // Never go below 0
      });
      
      if (result.committed) {
        console.log(`Decremented count for ${collectionName}: ${result.snapshot.val()}`);
        return true;
      } else {
        throw new Error('Failed to decrement count');
      }
    } catch (error) {
      console.error(`Error decrementing count for ${collectionName}:`, error);
      throw error;
    }
  },

  /**
   * Recalculate and sync meta count with actual data count
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<boolean>} Success status
   */
  async recalculateMetaCount(collectionName) {
    try {
      // Get all data untuk count actual items
      const dataRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}`);
      const snapshot = await get(dataRef);
      
      let actualCount = 0;
      let maxSequenceId = 0;
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Count actual items (exclude meta)
        Object.keys(data).forEach(key => {
          if (key !== 'meta' && !isNaN(parseInt(key))) {
            actualCount++;
            maxSequenceId = Math.max(maxSequenceId, parseInt(key));
          }
        });
      }
      
      // Update meta dengan actual count
      const metaRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta`);
      await set(metaRef, { 
        count: actualCount,
        lastId: maxSequenceId 
      });
      
      console.log(`Recalculated meta for ${collectionName}: count=${actualCount}, lastId=${maxSequenceId}`);
      return true;
    } catch (error) {
      console.error(`Error recalculating meta for ${collectionName}:`, error);
      throw error;
    }
  },

  /**
   * Reset sequence untuk start fresh dengan count 0
   * Berguna ketika semua data dihapus dan user ingin mulai dari 1 lagi
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<boolean>} Success status
   */
  async resetSequence(collectionName) {
    try {
      // Clear all data (keep structure)
      const collectionRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}`);
      await remove(collectionRef);
      
      // Clear all mappings
      const mappingRef = ref(realtimeDb, `${MAPPING_BASE}/${collectionName}`);
      await remove(mappingRef);
      
      // Initialize fresh meta
      await this.initializeCollection(collectionName);
      
      console.log(`Reset sequence for ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Error resetting sequence for ${collectionName}:`, error);
      throw error;
    }
  },

  /**
   * Bulk delete all items in collection dan reset sequence
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<boolean>} Success status
   */
  async bulkDeleteAll(collectionName) {
    try {
      await this.resetSequence(collectionName);
      console.log(`Bulk deleted all items in ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Error bulk deleting ${collectionName}:`, error);
      throw error;
    }
  },

  /**
   * Initialize collection dengan meta default
   * 
   * @param {string} collectionName - Nama collection
   * @returns {Promise<boolean>} Success status
   */
  async initializeCollection(collectionName) {
    try {
      const metaRef = ref(realtimeDb, `${SEQUENCE_BASE}/${collectionName}/meta`);
      const snapshot = await get(metaRef);
      
      if (!snapshot.exists()) {
        await set(metaRef, { count: 0, lastId: 0 });
        console.log(`Initialized collection: ${collectionName}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error initializing collection ${collectionName}:`, error);
      return false;
    }
  },

  /**
   * Utility function untuk find user by RFID (khusus untuk ESP32)
   * 
   * @param {string} rfidCode - RFID code yang dicari
   * @returns {Promise<Object|null>} User data atau null
   */
  async findUserByRfid(rfidCode) {
    try {
      const usersRef = ref(realtimeDb, `${SEQUENCE_BASE}/users`);
      const snapshot = await get(usersRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const users = snapshot.val();
      
      // Iterate through sequential IDs untuk find matching RFID
      for (const sequenceId of Object.keys(users)) {
        if (sequenceId !== 'meta' && !isNaN(parseInt(sequenceId))) {
          const user = users[sequenceId];
          if (user.rfidCode === rfidCode) {
            return {
              sequenceId: parseInt(sequenceId),
              ...user
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by RFID:', error);
      return null;
    }
  },

  /**
   * Utility function untuk get packages by loker number (khusus untuk ESP32)
   * 
   * @param {number} lokerNumber - Nomor loker
   * @returns {Promise<Array>} Array packages di loker tersebut
   */
  async getPackagesByLoker(lokerNumber) {
    try {
      const receiptsRef = ref(realtimeDb, `${SEQUENCE_BASE}/receipts`);
      const snapshot = await get(receiptsRef);
      
      if (!snapshot.exists()) {
        return [];
      }
      
      const receipts = snapshot.val();
      const packages = [];
      
      // Iterate through sequential IDs untuk find packages di loker ini
      for (const sequenceId of Object.keys(receipts)) {
        if (sequenceId !== 'meta' && !isNaN(parseInt(sequenceId))) {
          const receipt = receipts[sequenceId];
          if (receipt.nomorLoker === lokerNumber) {
            packages.push({
              sequenceId: parseInt(sequenceId),
              ...receipt
            });
          }
        }
      }
      
      return packages;
    } catch (error) {
      console.error('Error getting packages by loker:', error);
      return [];
    }
  }
};

export default sequenceService;
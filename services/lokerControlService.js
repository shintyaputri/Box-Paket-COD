import { db, realtimeDb } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  set,
  onValue,
  off,
} from "firebase/database";
import { sequenceService } from './sequenceService';

const COLLECTION_NAME = "lokerControl";
const RTDB_PATH = "original/lokerControl";

export const lokerControlService = {
  async sendLokerCommand(nomorLoker, command) {
    try {
      const docRef = doc(db, COLLECTION_NAME, `loker_${nomorLoker}`);
      
      const commandData = {
        buka: command === "buka" ? 1 : 0,
        tutup: command === "tutup" ? 1 : 0,
        timestamp: serverTimestamp(),
        lastCommand: command,
        nomorLoker: nomorLoker,
      };
      
      // Simpan ke Firestore
      await setDoc(docRef, commandData, { merge: true });
      
      // Mirror ke RTDB dengan timestamp yang consistent
      const rtdbCommandData = {
        buka: command === "buka" ? 1 : 0,
        tutup: command === "tutup" ? 1 : 0,
        timestamp: Date.now(),
        lastCommand: command,
        nomorLoker: nomorLoker,
      };
      
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/loker_${nomorLoker}`);
      await set(rtdbRef, rtdbCommandData);
      
      // Mirror to sequence path (create if not exists)
      try {
        await sequenceService.updateByFirebaseId('lokerControl', `loker_${nomorLoker}`, rtdbCommandData);
      } catch (error) {
        // If not exists, create new entry
        await sequenceService.addWithSequentialId('lokerControl', `loker_${nomorLoker}`, rtdbCommandData);
      }
      
      // Auto-reset after 10 seconds
      setTimeout(async () => {
        try {
          const resetData = {
            buka: 0,
            tutup: 0,
            timestamp: serverTimestamp(),
            lastCommand: "reset",
          };
          
          // Reset di Firestore
          await setDoc(docRef, resetData, { merge: true });
          
          // Mirror reset ke RTDB
          const rtdbResetData = {
            buka: 0,
            tutup: 0,
            timestamp: Date.now(),
            lastCommand: "reset",
          };
          
          await set(rtdbRef, rtdbResetData);
          
          // Mirror reset to sequence path
          try {
            await sequenceService.updateByFirebaseId('lokerControl', `loker_${nomorLoker}`, rtdbResetData);
          } catch (error) {
            console.error("Error resetting sequence loker:", error);
          }
        } catch (error) {
          console.error("Error resetting loker command:", error);
        }
      }, 10000);
      
      return { success: true };
    } catch (error) {
      console.error("Error sending loker command:", error);
      return { success: false, error: error.message };
    }
  },

  async openLoker(nomorLoker) {
    return this.sendLokerCommand(nomorLoker, "buka");
  },

  async closeLoker(nomorLoker) {
    return this.sendLokerCommand(nomorLoker, "tutup");
  },

  subscribeToLokerStatus(nomorLoker, callback) {
    const docRef = doc(db, COLLECTION_NAME, `loker_${nomorLoker}`);
    
    return onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          callback({ success: true, data: doc.data() });
        } else {
          callback({ 
            success: true, 
            data: { 
              buka: 0, 
              tutup: 0, 
              nomorLoker: nomorLoker,
              lastCommand: "none" 
            } 
          });
        }
      },
      (error) => {
        console.error("Error listening to loker status:", error);
        callback({ success: false, error: error.message });
      }
    );
  },

  /**
   * Subscription real-time untuk monitoring semua loker sekaligus.
   * 
   * Membuat listener untuk ke-5 loker secara bersamaan dan mengirim
   * update gabungan ke callback. Berguna untuk dashboard admin yang
   * memerlukan overview status semua loker dalam satu tampilan.
   * 
   * Fitur Monitoring:
   * - Status real-time ke-5 loker (1-5)
   * - Aggregated data dalam satu callback
   * - Efficient multiple listeners management
   * - Auto-cleanup semua listeners sekaligus
   * 
   * Structure Data Callback:
   * {
   *   1: { buka: 0, tutup: 0, nomorLoker: 1, lastCommand: "none" },
   *   2: { buka: 1, tutup: 0, nomorLoker: 2, lastCommand: "buka" },
   *   3: { buka: 0, tutup: 0, nomorLoker: 3, lastCommand: "reset" },
   *   4: { buka: 0, tutup: 1, nomorLoker: 4, lastCommand: "tutup" },
   *   5: { buka: 0, tutup: 0, nomorLoker: 5, lastCommand: "none" }
   * }
   * 
   * @method subscribeToAllLokers
   * @param {Function} callback - Function yang dipanggil saat ada update
   *   Callback menerima parameter:
   *   - success: boolean - Status keberhasilan monitoring
   *   - data: Object - Data status semua loker (key: nomor loker)
   *   - error: string - Pesan error jika monitoring gagal
   * @returns {Function} Unsubscribe function untuk menghentikan semua listener
   * 
   * @example
   * const unsubscribeAll = lokerControlService.subscribeToAllLokers((result) => {
   *   if (result.success) {
   *     const allLokers = result.data;
   *     for (let i = 1; i <= 5; i++) {
   *       const loker = allLokers[i];
   *       console.log(`Loker ${i}: ${loker.lastCommand}`);
   *     }
   *     updateDashboard(allLokers);
   *   }
   * });
   * 
   * // Cleanup semua listeners saat tidak diperlukan
   * // unsubscribeAll();
   */
  subscribeToAllLokers(callback) {
    const promises = [];        // Array untuk menyimpan unsubscribe functions
    const lokerData = {};       // Object untuk menyimpan data semua loker
    
    // Setup listener untuk setiap loker (1-5)
    for (let i = 1; i <= 5; i++) {
      const docRef = doc(db, COLLECTION_NAME, `loker_${i}`);
      
      // Buat listener untuk loker ke-i
      const unsubscribe = onSnapshot(
        docRef,
        (doc) => {
          if (doc.exists()) {
            // Dokumen ada, simpan data loker
            lokerData[i] = doc.data();
          } else {
            // Dokumen belum ada, buat data default
            lokerData[i] = { 
              buka: 0,                    // Default tidak ada perintah buka
              tutup: 0,                   // Default tidak ada perintah tutup
              nomorLoker: i,              // Nomor loker
              lastCommand: "none"         // Belum ada perintah
            };
          }
          
          // Kirim data gabungan semua loker ke callback
          callback({ success: true, data: lokerData });
        },
        (error) => {
          // Error pada listener loker tertentu
          console.error(`Error listening to loker ${i}:`, error);
          callback({ success: false, error: error.message });
        }
      );
      
      // Simpan unsubscribe function untuk cleanup
      promises.push(unsubscribe);
    }
    
    // Return function untuk unsubscribe semua listeners sekaligus
    return () => {
      promises.forEach(unsubscribe => unsubscribe());
      console.log('Semua listener loker berhasil di-unsubscribe');
    };
  },
};
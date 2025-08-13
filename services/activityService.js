/**
 * Service untuk logging aktivitas pengguna dan audit trail sistem.
 * 
 * Service ini mengelola pencatatan semua aktivitas pengguna dalam sistem
 * package tracking, termasuk interaksi dengan hardware ESP32, perubahan
 * status paket, dan aktivitas RFID. Berfungsi sebagai audit trail lengkap.
 * 
 * Jenis Aktivitas yang Dicatat:
 * - Perubahan status paket (Sedang Dikirim → Telah Tiba → Sudah Diambil)
 * - Penambahan paket baru ke sistem
 * - Akses loker melalui RFID atau aplikasi
 * - Pembayaran COD dan transaksi
 * - Pairing RFID card dengan akun user
 * - Monitoring kapasitas dan sensor readings
 * 
 * Format Data Aktivitas:
 * {
 *   userId: string,        // ID user yang melakukan aktivitas
 *   type: string,          // Jenis aktivitas (status_change, package_added, dll)
 *   message: string,       // Deskripsi aktivitas dalam Bahasa Indonesia
 *   resiNumber: string,    // Nomor resi paket (jika terkait paket)
 *   status: string,        // Status paket saat ini (jika applicable)
 *   icon: string,          // Emoji icon untuk UI (📦, ✅, 🚚, dll)
 *   createdAt: timestamp,  // Waktu aktivitas dengan server timestamp
 *   metadata: object       // Data tambahan spesifik aktivitas
 * }
 * 
 * Sistem Optimasi:
 * - Hanya menyimpan 3 aktivitas terbaru per user
 * - Auto-cleanup aktivitas lama untuk efisiensi storage
 * - Query tanpa composite index untuk performa
 * - In-memory sorting untuk mengurangi Firebase costs
 * 
 * Integration dengan Hardware:
 * - Log akses RFID dari ESP32
 * - Track sensor readings dan capacity updates
 * - Monitoring loker control commands
 * - Audit trail untuk keamanan sistem
 * 
 * @author Package Tracking System
 * @version 1.0.0
 */

import { db, realtimeDb } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  where,
  limit,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  ref,
  set,
  remove,
} from "firebase/database";
import { sequenceService } from './sequenceService';

// Konstanta nama collection untuk aktivitas global pengguna
const COLLECTION_NAME = "globalActivities";
const RTDB_PATH = "original/globalActivities";

export const activityService = {
  /**
   * Menambahkan aktivitas baru ke log audit trail pengguna.
   * 
   * Fungsi ini mencatat setiap aktivitas pengguna ke Firebase untuk
   * audit trail dan monitoring. Setelah menambah aktivitas baru,
   * otomatis melakukan cleanup untuk mempertahankan performa.
   * 
   * Alur Proses:
   * 1. Tambah aktivitas baru dengan server timestamp
   * 2. Simpan ke global activities collection
   * 3. Auto-cleanup aktivitas lama (hanya simpan 3 terbaru per user)
   * 4. Return confirmation dengan document ID
   * 
   * Data Aktivitas Otomatis Ditambahkan:
   * - createdAt: Server timestamp Firebase
   * - Validasi struktur data sebelum penyimpanan
   * 
   * @async
   * @method addActivity
   * @param {Object} activityData - Data aktivitas yang akan dicatat
   *   Struktur required:
   *   - userId: string - ID user yang melakukan aktivitas
   *   - type: string - Jenis aktivitas
   *   - message: string - Deskripsi aktivitas
   *   Optional:
   *   - resiNumber: string - Nomor resi paket
   *   - status: string - Status paket
   *   - icon: string - Emoji untuk UI
   *   - metadata: object - Data tambahan
   * @returns {Promise<Object>} Response object dengan format:
   *   - success: boolean - Status keberhasilan penambahan
   *   - id: string - Document ID aktivitas baru (jika berhasil)
   *   - error: string - Pesan error (jika gagal)
   * 
   * @example
   * const activity = {
   *   userId: 'user123',
   *   type: 'package_pickup',
   *   message: 'Paket berhasil diambil dari loker 3',
   *   resiNumber: 'REG123456',
   *   status: 'Sudah Diambil',
   *   icon: '✅'
   * };
   * const result = await activityService.addActivity(activity);
   */
  async addActivity(activityData) {
    try {
      // Tambah aktivitas baru ke collection global dengan timestamp server
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...activityData,                    // Spread data aktivitas dari parameter
        createdAt: serverTimestamp(),      // Timestamp server Firebase untuk konsistensi
      });
      
      // Mirror to original RTDB path
      const rtdbData = {
        ...activityData,
        createdAt: Date.now(),
        firestoreId: docRef.id
      };
      
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${docRef.id}`);
      await set(rtdbRef, rtdbData);
      
      // Mirror to sequence path dengan sequential ID
      await sequenceService.addWithSequentialId('globalActivities', docRef.id, activityData);

      // Auto-cleanup aktivitas lama untuk menjaga performa (max 3 per user)
      await this.cleanupOldActivities(activityData.userId);
      
      console.log('Activity berhasil ditambahkan dan dimirror ke RTDB');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error adding activity:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Membersihkan aktivitas lama untuk menjaga performa dan storage efficiency.
   * 
   * Fungsi ini mempertahankan hanya 3 aktivitas terbaru per user untuk
   * menghindari bloating database dan menjaga query performance. Aktivitas
   * lama otomatis dihapus dengan tetap mempertahankan audit trail penting.
   * 
   * Strategi Cleanup:
   * - Query semua aktivitas user tanpa composite index
   * - Sort in-memory berdasarkan timestamp (newest first)
   * - Hapus aktivitas di luar 3 terbaru
   * - Batch delete untuk efisiensi
   * 
   * Optimasi Firebase:
   * - Tidak menggunakan orderBy untuk menghindari index requirement
   * - In-memory sorting untuk mengurangi Firebase costs
   * - Batch operations untuk efisiensi network
   * 
   * @async
   * @method cleanupOldActivities
   * @param {string} userId - ID user yang aktivitasnya akan dibersihkan
   * @returns {Promise<void>} Function tidak mengembalikan nilai
   * 
   * @example
   * // Otomatis dipanggil setelah addActivity
   * await activityService.cleanupOldActivities('user123');
   * console.log('Aktivitas lama berhasil dibersihkan');
   */
  async cleanupOldActivities(userId) {
    try {
      // Query semua aktivitas user tanpa orderBy untuk menghindari composite index
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId)
      );
      
      // Ambil semua dokumen aktivitas user
      const querySnapshot = await getDocs(q);
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });

      // Sort in-memory berdasarkan timestamp (terbaru di depan)
      const sortedActivities = activities.sort((a, b) => {
        // Handle berbagai format timestamp untuk kompatibilitas
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime - aTime;  // Descending order (newest first)
      });

      // Hapus aktivitas di luar 3 terbaru untuk efisiensi storage
      if (sortedActivities.length > 3) {
        const activitiesToDelete = sortedActivities.slice(3);  // Aktivitas ke-4 dst
        
        // Batch delete untuk efisiensi network dan atomic operation
        const deletePromises = activitiesToDelete.map(async (activity) => {
          // Delete from Firestore
          await deleteDoc(doc(db, COLLECTION_NAME, activity.id));
          
          // Mirror deletion to original RTDB path
          const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${activity.id}`);
          await remove(rtdbRef);
          
          // Mirror deletion to sequence path
          await sequenceService.deleteByFirebaseId('globalActivities', activity.id);
        });
        
        await Promise.all(deletePromises);
        console.log(`Cleanup: ${activitiesToDelete.length} aktivitas lama dihapus untuk user ${userId}`);
      }
    } catch (error) {
      console.error("Error cleaning up old activities:", error);
    }
  },

  /**
   * Mengambil daftar aktivitas terbaru untuk user tertentu.
   * 
   * Fungsi ini mengembalikan maksimal 3 aktivitas terbaru user untuk
   * ditampilkan di UI aplikasi. Menggunakan in-memory sorting untuk
   * menghindari kebutuhan composite index Firebase.
   * 
   * Data yang Dikembalikan:
   * - Maksimal 3 aktivitas terbaru
   * - Sorted berdasarkan timestamp (terbaru di depan)
   * - Include semua metadata aktivitas
   * - Format siap pakai untuk UI
   * 
   * Optimasi Query:
   * - Simple where clause tanpa orderBy
   * - In-memory sorting untuk efisiensi
   * - Limit hasil di aplikasi, bukan di query
   * 
   * @async
   * @method getUserActivities
   * @param {string} userId - ID user yang aktivitasnya akan diambil
   * @returns {Promise<Object>} Response object dengan format:
   *   - success: boolean - Status keberhasilan query
   *   - data: Array - Array aktivitas terbaru (max 3 items)
   *   - error: string - Pesan error jika query gagal
   * 
   * @example
   * const result = await activityService.getUserActivities('user123');
   * if (result.success) {
   *   result.data.forEach(activity => {
   *     console.log(activity.message, activity.createdAt);
   *   });
   *   displayActivities(result.data);
   * }
   */
  async getUserActivities(userId) {
    try {
      // Query simple tanpa composite index untuk mendapatkan semua aktivitas user
      const userActivitiesQuery = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId)
      );
      
      // Eksekusi query dan kumpulkan data
      const querySnapshot = await getDocs(userActivitiesQuery);
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort in-memory dan ambil hanya 3 terbaru untuk performa UI
      const sortedActivities = activities
        .sort((a, b) => {
          // Handle berbagai format timestamp untuk backward compatibility
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime - aTime;  // Descending order (newest first)
        })
        .slice(0, 3);  // Limit to 3 most recent activities
      
      return { success: true, data: sortedActivities };
    } catch (error) {
      console.error("Error getting user activities:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subscription real-time untuk monitoring aktivitas user secara live.
   * 
   * Membuat listener Firebase yang akan memberikan update real-time
   * setiap kali ada aktivitas baru dari user. Berguna untuk update
   * UI secara otomatis dan notifikasi real-time.
   * 
   * Fitur Real-time:
   * - Auto-update saat ada aktivitas baru
   * - Sort otomatis aktivitas terbaru di depan
   * - Limit maksimal 3 aktivitas untuk performa UI
   * - Immediate callback saat ada perubahan
   * 
   * Use Cases:
   * - Dashboard aktivitas real-time
   * - Notifikasi aktivitas baru
   * - Monitoring user behavior
   * - Update status paket secara live
   * 
   * @method subscribeToUserActivities
   * @param {string} userId - ID user yang aktivitasnya akan dimonitor
   * @param {Function} callback - Function yang dipanggil saat ada update
   *   Callback menerima parameter:
   *   - success: boolean - Status keberhasilan monitoring
   *   - data: Array - Array aktivitas terbaru (max 3 items)
   *   - error: string - Pesan error jika monitoring gagal
   * @returns {Function} Unsubscribe function untuk menghentikan monitoring
   * 
   * @example
   * const unsubscribe = activityService.subscribeToUserActivities('user123', (result) => {
   *   if (result.success) {
   *     console.log('Aktivitas terbaru:', result.data.length);
   *     updateActivityFeed(result.data);
   *     
   *     // Show notification untuk aktivitas terbaru
   *     if (result.data.length > 0) {
   *       const latest = result.data[0];
   *       showNotification(latest.message, latest.icon);
   *     }
   *   }
   * });
   * 
   * // Cleanup saat component unmount
   * // unsubscribe();
   */
  subscribeToUserActivities(userId, callback) {
    // Query simple untuk menghindari composite index requirement
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    
    // Setup listener Firebase untuk real-time updates
    return onSnapshot(
      q,
      (snapshot) => {
        const activities = [];
        
        // Kumpulkan semua aktivitas dari snapshot
        snapshot.forEach((doc) => {
          activities.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort in-memory dan limit untuk performa UI
        const sortedActivities = activities
          .sort((a, b) => {
            // Handle berbagai format timestamp
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return bTime - aTime;  // Newest first
          })
          .slice(0, 3);  // Max 3 aktivitas untuk UI
        
        // Kirim data terbaru ke callback
        callback({ success: true, data: sortedActivities });
      },
      (error) => {
        // Error listener, log dan kirim ke callback
        console.error("Error listening to user activities:", error);
        callback({ success: false, error: error.message });
      }
    );
  },

  /**
   * Mencatat perubahan status paket dalam audit trail.
   * 
   * Fungsi khusus untuk tracking perubahan status paket sepanjang
   * delivery lifecycle. Menghasilkan message yang user-friendly
   * dalam Bahasa Indonesia dengan icon yang sesuai.
   * 
   * Status Lifecycle yang Didukung:
   * - "Sedang Dikirim" → "sedang dalam perjalanan" (🚚)
   * - "Telah Tiba" → "telah tiba di tujuan" (📦)
   * - "Telah Diambil" → "telah diambil" (✅)
   * 
   * Data yang Dicatat:
   * - User ID yang terkait dengan paket
   * - Nomor resi untuk tracking
   * - Status lama dan baru (untuk audit)
   * - Nama paket untuk konteks
   * - Timestamp otomatis dari server
   * 
   * @async
   * @method trackStatusChange
   * @param {string} userId - ID user pemilik paket
   * @param {string} resiNumber - Nomor resi paket
   * @param {string} oldStatus - Status paket sebelumnya
   * @param {string} newStatus - Status paket yang baru
   * @param {string} packageName - Nama atau deskripsi paket
   * @returns {Promise<Object>} Response dari addActivity
   * 
   * @example
   * // Paket berubah status dari "Sedang Dikirim" ke "Telah Tiba"
   * const result = await activityService.trackStatusChange(
   *   'user123', 
   *   'REG123456', 
   *   'Sedang Dikirim', 
   *   'Telah Tiba', 
   *   'Smartphone Samsung'
   * );
   * // Message: "Paket Smartphone Samsung telah tiba di tujuan"
   */
  async trackStatusChange(userId, resiNumber, oldStatus, newStatus, packageName) {
    // Mapping status ke message yang user-friendly dalam Bahasa Indonesia
    const statusMessages = {
      "Sedang Dikirim": "sedang dalam perjalanan",
      "Telah Tiba": "telah tiba di tujuan", 
      "Telah Diambil": "telah diambil"
    };

    // Struktur data aktivitas untuk perubahan status paket
    const activity = {
      userId,
      type: "status_change",                                    // Jenis aktivitas
      resiNumber: resiNumber || "N/A",                         // Nomor resi paket
      message: `Paket ${packageName || resiNumber || "Unknown"} ${statusMessages[newStatus] || newStatus.toLowerCase()}`,
      status: newStatus,                                        // Status paket saat ini
      // Icon emoji berdasarkan status untuk UI yang menarik
      icon: newStatus === "Telah Tiba" ? "📦" : 
            newStatus === "Telah Diambil" ? "✅" : "🚚"
    };

    // Simpan aktivitas ke audit trail
    return await this.addActivity(activity);
  },

  /**
   * Mencatat penambahan paket baru ke dalam sistem.
   * 
   * Fungsi khusus untuk tracking saat user atau admin menambahkan
   * paket baru ke sistem. Akan otomatis set status awal "Sedang Dikirim"
   * dan menggunakan icon paket untuk konsistensi UI.
   * 
   * Data yang Dicatat:
   * - User ID yang menambahkan paket
   * - Nomor resi paket baru
   * - Nama/deskripsi paket
   * - Status awal "Sedang Dikirim"
   * - Icon 📦 untuk paket baru
   * - Timestamp server otomatis
   * 
   * Integration Points:
   * - Dipanggil dari AddResiModal saat user tambah paket
   * - Dipanggil dari admin panel saat input paket baru
   * - Terintegrasi dengan real-time UI updates
   * 
   * @async
   * @method trackPackageAdded
   * @param {string} userId - ID user yang menambahkan paket
   * @param {string} resiNumber - Nomor resi paket baru
   * @param {string} packageName - Nama atau deskripsi paket
   * @returns {Promise<Object>} Response dari addActivity
   * 
   * @example
   * // User menambahkan paket baru melalui AddResiModal
   * const result = await activityService.trackPackageAdded(
   *   'user123',
   *   'REG789012',
   *   'Laptop Asus ROG'
   * );
   * // Message: "Paket baru ditambahkan: Laptop Asus ROG"
   */
  async trackPackageAdded(userId, resiNumber, packageName) {
    // Struktur data aktivitas untuk paket baru
    const activity = {
      userId,
      type: "package_added",                                    // Jenis aktivitas penambahan paket
      resiNumber: resiNumber || "N/A",                         // Nomor resi paket baru
      message: `Paket baru ditambahkan: ${packageName || resiNumber || "Unknown"}`,
      status: "Sedang Dikirim",                                // Status awal paket
      icon: "📦"                                               // Icon paket untuk UI
    };

    // Simpan aktivitas ke audit trail
    return await this.addActivity(activity);
  },

  /**
   * Bulk delete semua activity dan reset sequence
   * Berguna untuk testing atau cleanup
   * 
   * @returns {Promise<Object>} Result dengan success status
   */
  async bulkDeleteAllActivities() {
    try {
      // Get semua activity untuk delete satu-satu dari Firestore
      const q = query(collection(db, "globalActivities"));
      const snapshot = await getDocs(q);
      
      const deletePromises = [];
      const activityIds = [];
      
      // Collect all activity IDs
      snapshot.forEach((doc) => {
        activityIds.push(doc.id);
      });
      
      // Delete all from Firestore
      activityIds.forEach((activityId) => {
        deletePromises.push(deleteDoc(doc(db, "globalActivities", activityId)));
      });
      
      // Wait untuk semua Firestore deletions selesai
      await Promise.all(deletePromises);
      
      // Clear original RTDB path
      const rtdbRef = ref(realtimeDb, "original/globalActivities");
      await remove(rtdbRef);
      
      // Reset sequence (this will clear sequence data dan reset meta ke 0)
      await sequenceService.resetSequence('globalActivities');
      
      console.log(`Bulk deleted ${activityIds.length} activities and reset sequence`);
      return { success: true, deletedCount: activityIds.length };
    } catch (error) {
      console.error("Error bulk deleting all activities:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Recalculate meta count untuk sync RTDB sequence dengan Firestore
   * 
   * @returns {Promise<Object>} Result dengan success status
   */
  async syncSequenceMeta() {
    try {
      await sequenceService.recalculateMetaCount('globalActivities');
      console.log('Successfully synced activities sequence meta');
      return { success: true };
    } catch (error) {
      console.error("Error syncing sequence meta:", error);
      return { success: false, error: error.message };
    }
  }
};

/**
 * Named export untuk backward compatibility dengan service lain
 * yang mengimport logActivity sebagai named export
 */
export const logActivity = async (activityData) => {
  return await activityService.addActivity(activityData);
};
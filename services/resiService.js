/**
 * RESI SERVICE - Layanan Manajemen Paket/Receipt
 * 
 * Service ini menangani semua operasi manajemen paket dalam sistem:
 * - Penambahan resi/paket baru dengan validasi
 * - Pengambilan daftar resi dengan sorting dan filtering
 * - Update status paket (Sedang Dikirim → Telah Tiba → Sudah Diambil)
 * - Penghapusan data resi (admin only)
 * - Statistik paket user (total, COD, pending, arrived) 
 * - Manajemen loker COD (assignment dan occupancy tracking)
 * - Real-time subscription untuk live updates
 * - Integrasi dengan activity logging
 * 
 * Fitur COD (Cash on Delivery):
 * - Automatic loker assignment (1-5) untuk paket COD
 * - Maximum 5 paket COD aktif secara bersamaan
 * - Tracking occupancy loker untuk hardware control
 * - QR code generation untuk akses loker
 * 
 * Status Flow Paket:
 * "Sedang Dikirim" → "Telah Tiba" → "Sudah Diambil"
 * 
 * Database Structure:
 * Collection: 'receipts'
 * Fields: noResi, nama, alamat, noHp, jenisBarang, beratBarang, 
 *         biayaKirim, isCod, nominalCod, tipePaket, nomorLoker, 
 *         status, userId, timestamps
 * 
 * @author Shintya Package Delivery System
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
  deleteDoc,
  doc,
  where,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  set,
  push,
  get,
  remove,
  update,
  orderByChild,
  query as rtdbQuery,
  onValue,
  off,
} from "firebase/database";
import { activityService } from "./activityService";
import { sequenceService } from './sequenceService';

// Nama collection di Firestore untuk menyimpan data resi/paket
const COLLECTION_NAME = "receipts";

// Path untuk RTDB mirroring data resi/paket
const RTDB_PATH = "original/receipts";

export const resiService = {
  /**
   * Fungsi untuk menambahkan resi/paket baru ke sistem
   * 
   * Membuat dokumen resi baru di Firestore dengan status default
   * "Sedang Dikirim" dan tracking aktivitas user.
   * 
   * @param {Object} resiData - Data resi yang akan ditambahkan
   * @param {string} resiData.noResi - Nomor resi unik
   * @param {string} resiData.nama - Nama penerima paket
   * @param {string} resiData.alamat - Alamat pengiriman
   * @param {string} resiData.noHp - Nomor HP penerima
   * @param {string} resiData.jenisBarang - Jenis barang yang dikirim
   * @param {number} resiData.beratBarang - Berat barang dalam kg
   * @param {number} resiData.biayaKirim - Biaya pengiriman dalam IDR
   * @param {boolean} resiData.isCod - Apakah paket COD
   * @param {number} resiData.nominalCod - Nominal COD (jika isCod true)
   * @param {string} resiData.tipePaket - Tipe paket (Normal/COD)
   * @param {number} resiData.nomorLoker - Nomor loker (1-5 untuk COD)
   * @param {string} resiData.userId - ID user pemilik paket
   * @returns {Promise<Object>} Result dengan status dan ID dokumen
   * 
   * Fitur:
   * - Auto-generate timestamps dengan serverTimestamp()
   * - Default status "Sedang Dikirim" untuk paket baru
   * - Activity logging otomatis untuk audit trail
   * - Validasi data dan error handling
   */
  async addResi(resiData) {
    try {
      // Siapkan data dengan metadata
      const dataToAdd = {
        ...resiData,
        status: "Sedang Dikirim", // Default status untuk paket baru
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Tambahkan resi ke Firestore dengan metadata otomatis
      const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToAdd);
      
      // Mirror data ke RTDB dengan timestamp yang consistent
      const rtdbData = {
        ...resiData,
        status: "Sedang Dikirim",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        firestoreId: docRef.id // Reference ke document Firestore
      };
      
      // Mirror to original RTDB path
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${docRef.id}`);
      await set(rtdbRef, rtdbData);
      
      // Mirror to sequence path dengan sequential ID
      await sequenceService.addWithSequentialId('receipts', docRef.id, resiData);
      
      // Log aktivitas penambahan paket untuk audit trail
      await activityService.trackPackageAdded(
        resiData.userId,
        resiData.noResi,
        resiData.nama
      );
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error adding resi:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk mengambil daftar semua resi/paket
   * 
   * Mengambil semua dokumen resi dari Firestore dengan
   * sorting berdasarkan tanggal pembuatan (terbaru dulu).
   * 
   * @returns {Promise<Object>} Result dengan status dan data resi
   * @returns {boolean} returns.success - Apakah pengambilan berhasil
   * @returns {Array} returns.data - Array berisi data resi (jika berhasil)
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * Data yang dikembalikan:
   * - id: Document ID dari Firestore
   * - noResi: Nomor resi unik
   * - nama: Nama penerima
   * - status: Status paket saat ini
   * - tipePaket: Tipe paket (Normal/COD)
   * - timestamps: createdAt, updatedAt
   * - dan field lainnya sesuai struktur data
   */
  async getResiList() {
    try {
      // Query untuk mengambil semua resi, diurutkan berdasarkan tanggal terbaru
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc")  // Paket terbaru ditampilkan dulu
      );
      const querySnapshot = await getDocs(q);
      
      // Konversi snapshot menjadi array object
      const resiList = [];
      querySnapshot.forEach((doc) => {
        resiList.push({ 
          id: doc.id,    // Document ID dari Firestore
          ...doc.data()  // Semua field dari dokumen
        });
      });
      
      return { success: true, data: resiList };
    } catch (error) {
      console.error("Error getting resi list:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk menghitung jumlah resi/paket milik user tertentu
   * 
   * Mengambil count total paket yang dimiliki oleh user
   * tanpa mengambil seluruh data (efisien untuk statistik).
   * 
   * @param {string} userId - Firebase Auth UID user
   * @returns {Promise<Object>} Result dengan status dan count
   * @returns {boolean} returns.success - Apakah penghitungan berhasil
   * @returns {number} returns.count - Jumlah paket milik user
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * Kegunaan:
   * - Dashboard user untuk menampilkan total paket
   * - Statistik untuk admin
   * - Validasi sebelum menambah paket baru
   */
  async getUserResiCount(userId) {
    try {
      // Query untuk mengambil paket milik user tertentu
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      
      // Return jumlah dokumen (tidak perlu data detailnya)
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      console.error("Error getting user resi count:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk mengambil statistik paket milik user
   * 
   * Menganalisis semua paket milik user dan memberikan
   * breakdown statistik berdasarkan tipe dan status paket.
   * 
   * @param {string} userId - Firebase Auth UID user
   * @returns {Promise<Object>} Result dengan status dan statistik
   * @returns {boolean} returns.success - Apakah pengambilan berhasil
   * @returns {Object} returns.stats - Object berisi statistik paket
   * @returns {number} returns.stats.total - Total semua paket
   * @returns {number} returns.stats.cod - Jumlah paket COD
   * @returns {number} returns.stats.pending - Paket yang belum diambil
   * @returns {number} returns.stats.arrived - Paket yang sudah tiba
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * Kategori Status:
   * - pending: "Sedang Dikirim" atau "Telah Tiba" (belum diambil)
   * - arrived: "Telah Tiba" (sudah sampai tapi belum diambil)
   * - cod: Paket dengan tipePaket === "COD"
   * 
   * Kegunaan:
   * - Dashboard user untuk menampilkan ringkasan paket
   * - Notifikasi untuk paket yang sudah tiba
   * - Analisis pattern penggunaan user
   */
  async getUserPackageStats(userId) {
    try {
      // Query untuk mengambil semua paket milik user
      const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      
      // Inisialisasi counter untuk berbagai kategori
      let totalPackages = 0;
      let codPackages = 0;
      let pendingPackages = 0;  // Paket yang masih dalam proses atau belum diambil
      let arrivedPackages = 0;  // Paket yang sudah tiba tapi belum diambil
      
      // Iterasi setiap dokumen untuk menghitung statistik
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalPackages++;
        
        // Hitung paket COD
        if (data.tipePaket === "COD") {
          codPackages++;
        }
        
        // Hitung paket yang masih pending (belum diambil)
        if (data.status === "Sedang Dikirim" || data.status === "Telah Tiba") {
          pendingPackages++;
        }
        
        // Hitung paket yang sudah tiba tapi belum diambil
        if (data.status === "Telah Tiba") {
          arrivedPackages++;
        }
      });
      
      return { 
        success: true, 
        stats: {
          total: totalPackages,      // Total semua paket
          cod: codPackages,          // Total paket COD
          pending: pendingPackages,  // Paket yang belum selesai
          arrived: arrivedPackages   // Paket siap diambil
        }
      };
    } catch (error) {
      console.error("Error getting user package stats:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk mengupdate data resi/paket
   * 
   * Melakukan update pada dokumen resi dengan tracking
   * perubahan status untuk activity logging.
   * 
   * @param {string} resiId - Document ID resi yang akan diupdate
   * @param {Object} resiData - Data yang akan diupdate
   * @param {string} resiData.status - Status baru paket (opsional)
   * @param {string} resiData.nama - Nama penerima (opsional)
   * @param {string} resiData.alamat - Alamat (opsional)
   * @param {number} resiData.nominalCod - Nominal COD (opsional)
   * @returns {Promise<Object>} Result dengan status operasi
   * @returns {boolean} returns.success - Apakah update berhasil
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * Fitur:
   * - Automatic timestamp update (updatedAt)
   * - Activity logging untuk perubahan status
   * - Partial update (hanya field yang diubah)
   * - Validasi data sebelum update
   * 
   * Status Flow:
   * "Sedang Dikirim" → "Telah Tiba" → "Sudah Diambil"
   */
  async updateResi(resiId, resiData) {
    try {
      const resiRef = doc(db, COLLECTION_NAME, resiId);
      
      // Ambil data saat ini untuk perbandingan (terutama status)
      const currentDoc = await getDoc(resiRef);
      if (!currentDoc.exists()) {
        return { success: false, error: "Document not found" };
      }
      
      const currentData = currentDoc.data();
      
      // Update dokumen dengan timestamp otomatis
      const updateData = {
        ...resiData,
        updatedAt: serverTimestamp(),  // Timestamp update untuk audit
      };
      
      // Update di Firestore
      await updateDoc(resiRef, updateData);
      
      // Mirror update to original RTDB path
      const rtdbUpdateData = {
        ...resiData,
        updatedAt: Date.now(),
      };
      
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${resiId}`);
      await update(rtdbRef, rtdbUpdateData);
      
      // Mirror update to sequence path
      await sequenceService.updateByFirebaseId('receipts', resiId, resiData);
      
      // Log aktivitas jika ada perubahan status
      if (resiData.status && currentData.status !== resiData.status) {
        await activityService.trackStatusChange(
          currentData.userId,
          currentData.noResi,
          currentData.status,    // Status lama
          resiData.status,       // Status baru
          currentData.nama
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error updating resi:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk menghapus resi/paket secara permanen
   * 
   * Menghapus dokumen resi dari Firestore. Operasi ini
   * irreversible dan biasanya hanya digunakan oleh admin.
   * 
   * @param {string} resiId - Document ID resi yang akan dihapus
   * @returns {Promise<Object>} Result dengan status operasi
   * @returns {boolean} returns.success - Apakah penghapusan berhasil
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * PERINGATAN:
   * - Operasi ini tidak bisa dibatalkan
   * - Data resi akan hilang permanen
   * - Pastikan backup data jika diperlukan
   * - Pertimbangkan soft delete untuk keamanan
   * 
   * Alternatif: Update status menjadi "Dibatalkan" atau "Dihapus"
   * untuk soft delete yang lebih aman.
   */
  async deleteResi(resiId) {
    try {
      // Hapus dokumen resi secara permanen dari Firestore
      await deleteDoc(doc(db, COLLECTION_NAME, resiId));
      
      // Mirror deletion to original RTDB path
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${resiId}`);
      await remove(rtdbRef);
      
      // Mirror deletion to sequence path
      await sequenceService.deleteByFirebaseId('receipts', resiId);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting resi:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk berlangganan real-time updates daftar resi
   * 
   * Membuat listener Firebase yang akan mengirim callback
   * setiap kali ada perubahan pada collection receipts.
   * 
   * @param {Function} callback - Fungsi yang dipanggil saat ada update
   * @param {Object} callback.result - Parameter yang dikirim ke callback
   * @param {boolean} callback.result.success - Status operasi
   * @param {Array} callback.result.data - Data resi terbaru (jika success)
   * @param {string} callback.result.error - Error message (jika gagal)
   * @returns {Function} Unsubscribe function untuk menghentikan listener
   * 
   * Fitur:
   * - Real-time updates tanpa perlu refresh
   * - Auto-sorting berdasarkan tanggal terbaru
   * - Error handling dengan callback
   * - Unsubscribe function untuk cleanup
   * 
   * Penggunaan:
   * ```javascript
   * const unsubscribe = resiService.subscribeToResiList((result) => {
   *   if (result.success) {
   *     setResiList(result.data);
   *   }
   * });
   * // Cleanup saat component unmount
   * return () => unsubscribe();
   * ```
   */
  subscribeToResiList(callback) {
    // Query untuk real-time subscription dengan sorting
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc")  // Urutkan berdasarkan tanggal terbaru
    );
    
    // Return unsubscribe function dari onSnapshot
    return onSnapshot(
      q,
      (snapshot) => {
        // Proses snapshot menjadi array data
        const resiList = [];
        snapshot.forEach((doc) => {
          resiList.push({ 
            id: doc.id,    // Document ID
            ...doc.data()  // Data dokumen
          });
        });
        
        // Panggil callback dengan data terbaru
        callback({ success: true, data: resiList });
      },
      (error) => {
        console.error("Error listening to resi changes:", error);
        // Panggil callback dengan error
        callback({ success: false, error: error.message });
      }
    );
  },

  /**
   * Fungsi untuk berlangganan real-time statistik paket user
   * 
   * Membuat listener Firebase untuk memantau perubahan statistik
   * paket milik user tertentu secara real-time.
   * 
   * @param {string} userId - Firebase Auth UID user
   * @param {Function} callback - Fungsi yang dipanggil saat statistik berubah
   * @param {Object} callback.result - Parameter yang dikirim ke callback
   * @param {boolean} callback.result.success - Status operasi
   * @param {Object} callback.result.stats - Statistik paket (jika success)
   * @param {string} callback.result.error - Error message (jika gagal)
   * @returns {Function} Unsubscribe function untuk menghentikan listener
   * 
   * Statistik yang dipantau:
   * - total: Total semua paket user
   * - cod: Jumlah paket COD
   * - pending: Paket yang belum diambil (Sedang Dikirim + Telah Tiba)
   * - arrived: Paket yang sudah tiba tapi belum diambil
   * 
   * Kegunaan:
   * - Dashboard user dengan statistik real-time
   * - Notifikasi badge untuk paket baru
   * - Monitoring perubahan status paket
   * 
   * Penggunaan:
   * ```javascript
   * const unsubscribe = resiService.subscribeToUserPackageStats(userId, (result) => {
   *   if (result.success) {
   *     setPackageStats(result.stats);
   *   }
   * });
   * ```
   */
  subscribeToUserPackageStats(userId, callback) {
    // Query untuk paket milik user tertentu
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    
    // Return unsubscribe function dari onSnapshot
    return onSnapshot(
      q,
      (snapshot) => {
        // Inisialisasi counter untuk statistik
        let totalPackages = 0;
        let codPackages = 0;
        let pendingPackages = 0;
        let arrivedPackages = 0;
        
        // Hitung statistik dari setiap dokumen
        snapshot.forEach((doc) => {
          const data = doc.data();
          totalPackages++;
          
          // Hitung paket COD
          if (data.tipePaket === "COD") {
            codPackages++;
          }
          
          // Hitung paket pending (masih dalam proses)
          if (data.status === "Sedang Dikirim" || data.status === "Telah Tiba") {
            pendingPackages++;
          }
          
          // Hitung paket yang sudah tiba
          if (data.status === "Telah Tiba") {
            arrivedPackages++;
          }
        });
        
        // Panggil callback dengan statistik terbaru
        callback({ 
          success: true, 
          stats: {
            total: totalPackages,      // Total semua paket
            cod: codPackages,          // Total paket COD
            pending: pendingPackages,  // Paket belum selesai
            arrived: arrivedPackages   // Paket siap diambil
          }
        });
      },
      (error) => {
        console.error("Error listening to user package stats:", error);
        // Panggil callback dengan error
        callback({ success: false, error: error.message });
      }
    );
  },

  /**
   * Fungsi untuk mengambil daftar loker yang sedang terpakai
   * 
   * Mengambil nomor-nomor loker yang sedang digunakan oleh
   * paket COD yang masih aktif (belum diambil).
   * 
   * @returns {Promise<Object>} Result dengan status dan data loker
   * @returns {boolean} returns.success - Apakah pengambilan berhasil
   * @returns {Array<number>} returns.data - Array nomor loker terpakai
   * @returns {string} returns.error - Pesan error (jika gagal)
   * 
   * Kriteria Loker Terpakai:
   * - Paket dengan tipePaket === "COD"
   * - Status paket: "Sedang Dikirim" atau "Telah Tiba"
   * - Field nomorLoker tidak null/kosong
   * 
   * Kegunaan:
   * - Validasi assignment loker baru (hindari bentrok)
   * - Monitoring kapasitas loker tersedia
   * - Dashboard admin untuk melihat occupancy
   * - Logic auto-assignment loker (cari slot kosong)
   * 
   * Sistem Loker:
   * - Total 5 loker (nomor 1-5)
   * - Maksimal 5 paket COD aktif bersamaan
   * - Auto-assignment mencari slot kosong
   */
  async getOccupiedLokers() {
    try {
      // Query untuk paket COD yang masih aktif
      const q = query(
        collection(db, COLLECTION_NAME),
        where("tipePaket", "==", "COD"),                              // Hanya paket COD
        where("status", "in", ["Sedang Dikirim", "Telah Tiba"])      // Status aktif
      );
      const querySnapshot = await getDocs(q);
      
      // Kumpulkan nomor loker yang terpakai
      const occupiedLokers = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Pastikan paket punya nomor loker yang valid
        if (data.nomorLoker) {
          occupiedLokers.push(data.nomorLoker);
        }
      });
      
      return { success: true, data: occupiedLokers };
    } catch (error) {
      console.error("Error getting occupied lokers:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fungsi untuk berlangganan real-time updates loker yang terpakai
   * 
   * Membuat listener Firebase untuk memantau perubahan occupancy
   * loker COD secara real-time.
   * 
   * @param {Function} callback - Fungsi yang dipanggil saat occupancy berubah
   * @param {Object} callback.result - Parameter yang dikirim ke callback
   * @param {boolean} callback.result.success - Status operasi
   * @param {Array<number>} callback.result.data - Array nomor loker terpakai
   * @param {string} callback.result.error - Error message (jika gagal)
   * @returns {Function} Unsubscribe function untuk menghentikan listener
   * 
   * Update Trigger:
   * - Paket COD baru ditambahkan (loker baru terpakai)
   * - Status paket COD berubah ke "Sudah Diambil" (loker kosong)
   * - Paket COD dihapus atau dibatalkan
   * - Nomor loker paket diubah
   * 
   * Kegunaan:
   * - Real-time monitoring dashboard admin
   * - Auto-update UI availability loker
   * - Validasi real-time saat assignment
   * - Notifikasi loker penuh/kosong
   * 
   * Penggunaan:
   * ```javascript
   * const unsubscribe = resiService.subscribeToOccupiedLokers((result) => {
   *   if (result.success) {
   *     setOccupiedLokers(result.data);
   *     const availableLokers = [1,2,3,4,5].filter(n => !result.data.includes(n));
   *   }
   * });
   * ```
   */
  subscribeToOccupiedLokers(callback) {
    // Query untuk paket COD aktif (real-time)
    const q = query(
      collection(db, COLLECTION_NAME),
      where("tipePaket", "==", "COD"),                              // Hanya paket COD
      where("status", "in", ["Sedang Dikirim", "Telah Tiba"])      // Status aktif
    );
    
    // Return unsubscribe function dari onSnapshot
    return onSnapshot(
      q,
      (snapshot) => {
        // Kumpulkan nomor loker terpakai dari snapshot
        const occupiedLokers = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.nomorLoker) {
            occupiedLokers.push(data.nomorLoker);
          }
        });
        
        // Panggil callback dengan data occupancy terbaru
        callback({ success: true, data: occupiedLokers });
      },
      (error) => {
        console.error("Error listening to occupied lokers:", error);
        // Panggil callback dengan error
        callback({ success: false, error: error.message });
      }
    );
  },

  /**
   * Bulk delete semua resi dan reset sequence
   * Berguna untuk testing atau cleanup
   * 
   * @returns {Promise<Object>} Result dengan success status
   */
  async bulkDeleteAllResi() {
    try {
      // Get semua resi untuk delete satu-satu dari Firestore
      const q = query(collection(db, COLLECTION_NAME));
      const snapshot = await getDocs(q);
      
      const deletePromises = [];
      const resiIds = [];
      
      // Collect all resi IDs
      snapshot.forEach((doc) => {
        resiIds.push(doc.id);
      });
      
      // Delete all from Firestore
      resiIds.forEach((resiId) => {
        deletePromises.push(deleteDoc(doc(db, COLLECTION_NAME, resiId)));
      });
      
      // Wait untuk semua Firestore deletions selesai
      await Promise.all(deletePromises);
      
      // Clear original RTDB path
      const rtdbRef = ref(realtimeDb, RTDB_PATH);
      await remove(rtdbRef);
      
      // Reset sequence (this will clear sequence data dan reset meta ke 0)
      await sequenceService.resetSequence('receipts');
      
      console.log(`Bulk deleted ${resiIds.length} resi and reset sequence`);
      return { success: true, deletedCount: resiIds.length };
    } catch (error) {
      console.error("Error bulk deleting all resi:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Recalculate meta count untuk sync RTDB sequence dengan Firestore
   * Berguna untuk fix inconsistencies
   * 
   * @returns {Promise<Object>} Result dengan success status
   */
  async syncSequenceMeta() {
    try {
      await sequenceService.recalculateMetaCount('receipts');
      console.log('Successfully synced receipts sequence meta');
      return { success: true };
    } catch (error) {
      console.error("Error syncing sequence meta:", error);
      return { success: false, error: error.message };
    }
  },
};
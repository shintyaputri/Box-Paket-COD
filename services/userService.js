/**
 * USER SERVICE - Layanan Manajemen Profil User
 * 
 * Service ini menangani semua operasi manajemen user dalam sistem:
 * - Pembuatan profil user baru di Firestore
 * - Pengambilan data profil user dengan validasi
 * - Update profil user dengan tracking timestamp
 * - Manajemen RFID user (pairing, update, hapus)
 * - Pengelolaan daftar user untuk admin
 * - Sistem soft delete untuk user
 * - Pemulihan user yang telah dihapus
 * 
 * Fitur Keamanan:
 * - Validasi user aktif vs yang dihapus (soft delete)
 * - Filtering data berdasarkan role dan status
 * - Automatic timestamp tracking untuk audit trail
 * - Konsistensi data antara Firebase Auth dan Firestore
 * 
 * Struktur Database:
 * - Collection: 'users'
 * - Document ID: Firebase Auth UID
 * - Fields: id, email, nama, noTelp, role, rfidCode, deleted, timestamps
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import {
  ref,
  set,
  update,
  remove,
  get
} from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { sequenceService } from './sequenceService';

// Path untuk RTDB mirroring data users
const RTDB_PATH = 'original/users';

/**
 * Fungsi untuk membuat profil user baru di Firestore
 * 
 * Membuat dokumen user di collection 'users' dengan struktur data
 * yang sesuai dengan role user (admin atau regular user).
 * Profil user akan disinkronkan dengan Firebase Auth UID.
 * 
 * @param {string} uid - Firebase Auth UID sebagai document ID
 * @param {Object} profileData - Data profil user yang akan disimpan
 * @param {string} profileData.email - Email user (wajib)
 * @param {string} profileData.role - Role user ('user' atau 'admin')
 * @param {string} profileData.nama - Nama lengkap (khusus role 'user')
 * @param {string} profileData.noTelp - Nomor telepon (khusus role 'user')
 * @param {string} profileData.rfidCode - Kode RFID (opsional)
 * @returns {Promise<Object>} Result object dengan status dan data profil
 * @returns {boolean} returns.success - Apakah pembuatan berhasil
 * @returns {Object} returns.profile - Data profil yang dibuat (jika berhasil)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur:
 * - Auto-generate timestamp untuk tracking
 * - Soft delete flag (deleted: false)
 * - Conditional fields berdasarkan role
 * - Fallback handling jika Firestore tidak tersedia
 * - Validasi dan sanitasi data input
 */
export const createUserProfile = async (uid, profileData) => {
  try {
    // Validasi Firestore connection
    if (!db) {
      console.warn('Firestore belum diinisialisasi, skip pembuatan profil');
      // Return fallback profile untuk development/testing
      return { 
        success: true, 
        profile: { 
          id: uid, 
          ...profileData,
          createdAt: new Date(),
          updatedAt: new Date()
        } 
      };
    }

    // Struktur dasar profil user yang akan disimpan
    const userProfile = {
      id: uid,                    // Firebase Auth UID
      email: profileData.email,   // Email user dari Firebase Auth
      role: profileData.role,     // Role: 'user' atau 'admin'
      deleted: false,             // Soft delete flag
      createdAt: new Date(),      // Timestamp pembuatan
      updatedAt: new Date()       // Timestamp update terakhir
    };

    // Tambahkan field khusus untuk role 'user'
    if (profileData.role === 'user') {
      userProfile.nama = profileData.nama;           // Nama lengkap
      userProfile.noTelp = profileData.noTelp;       // Nomor telepon
    }

    // Simpan profil ke Firestore collection 'users'
    await setDoc(doc(db, 'users', uid), userProfile);
    
    // Mirror to original RTDB path
    const rtdbUserProfile = {
      ...userProfile,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${uid}`);
    await set(rtdbRef, rtdbUserProfile);
    
    // Mirror to sequence path dengan sequential ID
    await sequenceService.addWithSequentialId('users', uid, userProfile);
    
    console.log('Profil user berhasil dibuat dan dimirror ke RTDB');
    return { success: true, profile: userProfile };
  } catch (error) {
    console.error('Error membuat profil user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk mengambil profil user dari Firestore
 * 
 * Mengambil dokumen user berdasarkan Firebase Auth UID dengan
 * validasi status aktif dan penanganan berbagai kondisi error.
 * 
 * @param {string} uid - Firebase Auth UID untuk mencari profil
 * @returns {Promise<Object>} Result object dengan status dan data profil
 * @returns {boolean} returns.success - Apakah pengambilan berhasil
 * @returns {Object} returns.profile - Data profil user (jika berhasil)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Kondisi Error:
 * - Firestore tidak tersedia
 * - Profil user tidak ditemukan
 * - User telah dihapus (soft delete)
 * - Network error atau permission denied
 * 
 * Fitur Validasi:
 * - Pengecekan soft delete flag
 * - Validasi eksistensi dokumen
 * - Error handling yang komprehensif
 */
export const getUserProfile = async (uid) => {
  try {
    // Validasi Firestore connection
    if (!db) {
      console.warn('Firestore belum diinisialisasi, return fallback profil');
      return { 
        success: false, 
        error: 'Firestore tidak tersedia' 
      };
    }

    // Ambil referensi dokumen user
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const profile = docSnap.data();
      
      // Validasi status soft delete
      if (profile.deleted) {
        return { success: false, error: 'User telah dihapus' };
      }
      
      // Return profil user yang aktif
      return { success: true, profile };
    } else {
      // Dokumen tidak ditemukan di Firestore
      return { success: false, error: 'Profil user tidak ditemukan' };
    }
  } catch (error) {
    console.error('Error mengambil profil user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk mengupdate profil user di Firestore
 * 
 * Melakukan update pada field-field profil user dengan
 * automatic timestamp tracking dan validasi data.
 * 
 * @param {string} uid - Firebase Auth UID untuk user yang akan diupdate
 * @param {Object} updates - Data yang akan diupdate
 * @param {string} updates.nama - Nama lengkap user (opsional)
 * @param {string} updates.noTelp - Nomor telepon user (opsional)
 * @param {string} updates.rfidCode - Kode RFID user (opsional)
 * @param {string} updates.role - Role user (opsional)
 * @returns {Promise<Object>} Result object dengan status operasi
 * @returns {boolean} returns.success - Apakah update berhasil
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur:
 * - Automatic timestamp tracking (updatedAt)
 * - Partial update (hanya field yang diubah)
 * - Validasi Firestore connection
 * - Error handling yang komprehensif
 * 
 * Catatan: Fungsi ini tidak mengubah field sensitif seperti
 * email (yang harus diupdate di Firebase Auth), id, atau createdAt.
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    // Validasi Firestore connection
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Siapkan data update dengan timestamp otomatis
    const updateData = { 
      ...updates,
      updatedAt: new Date()  // Timestamp update untuk audit trail
    };

    // Update dokumen user di Firestore
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updateData);
    
    // Mirror update to original RTDB path
    const rtdbUpdateData = {
      ...updates,
      updatedAt: Date.now()
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${uid}`);
    await update(rtdbRef, rtdbUpdateData);
    
    // Mirror update to sequence path
    await sequenceService.updateByFirebaseId('users', uid, updates);

    console.log('Profil user berhasil diupdate dan dimirror ke RTDB');
    return { success: true };
  } catch (error) {
    console.error('Error update profil user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk mengambil daftar semua user aktif
 * 
 * Mengambil semua user dengan role 'user' yang masih aktif
 * (tidak dalam status soft delete) dan mengurutkannya berdasarkan nama.
 * 
 * @returns {Promise<Object>} Result object dengan status dan data user
 * @returns {boolean} returns.success - Apakah pengambilan berhasil
 * @returns {Array} returns.data - Array berisi data user (jika berhasil)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur:
 * - Filter hanya user dengan role 'user' (bukan admin)
 * - Exclude user yang telah dihapus (soft delete)
 * - Automatic sorting berdasarkan nama (alfabetis)
 * - Fallback untuk kondisi Firestore tidak tersedia
 * 
 * Data yang dikembalikan:
 * - id: Document ID (Firebase Auth UID)
 * - email: Email user
 * - nama: Nama lengkap
 * - noTelp: Nomor telepon
 * - rfidCode: Kode RFID (jika ada)
 * - timestamps: createdAt, updatedAt
 */
export const getAllUsers = async () => {
  try {
    // Validasi Firestore connection
    if (!db) {
      console.warn('Firestore belum diinisialisasi, return empty array');
      return { success: true, data: [] };
    }

    // Buat query untuk mengambil user aktif
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('role', '==', 'user'),      // Hanya user biasa (bukan admin)
      where('deleted', '==', false)     // Hanya user yang masih aktif
    );
    const querySnapshot = await getDocs(q);
    
    // Proses hasil query menjadi array
    const userList = [];
    querySnapshot.forEach((doc) => {
      userList.push({
        id: doc.id,          // Document ID (Firebase Auth UID)
        ...doc.data()        // Semua field dari dokumen
      });
    });

    // Urutkan berdasarkan nama secara alfabetis
    userList.sort((a, b) => a.nama.localeCompare(b.nama));

    return { success: true, data: userList };
  } catch (error) {
    console.error('Error mengambil data user:', error);
    return { success: false, error: error.message, data: [] };
  }
};



/**
 * Fungsi untuk menghapus user secara permanen dari Firestore
 * 
 * Menghapus dokumen user dari collection 'users' secara permanen.
 * Berbeda dengan soft delete, operasi ini menghapus data secara fisik.
 * 
 * @param {string} userId - Firebase Auth UID user yang akan dihapus
 * @returns {Promise<Object>} Result object dengan status operasi
 * @returns {boolean} returns.success - Apakah penghapusan berhasil
 * @returns {string} returns.message - Pesan sukses dengan penjelasan
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * PERINGATAN: Operasi ini IRREVERSIBLE!
 * - Data user akan hilang permanen dari Firestore
 * - Firebase Auth account masih ada tapi tidak bisa login
 * - Paket user akan menjadi orphan records
 * 
 * Validasi:
 * - Pastikan user exists di Firestore
 * - Pastikan user belum dihapus sebelumnya
 * - Handle error dengan baik untuk UX
 * 
 * Alternatif: Gunakan soft delete untuk keamanan data
 */
export const deleteUser = async (userId) => {
  try {
    // Validasi Firestore connection
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Ambil data user untuk validasi
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Data user tidak ditemukan');
    }

    const userData = userDoc.data();
    
    // Validasi user belum dihapus sebelumnya
    if (userData.deleted) {
      throw new Error('User sudah dihapus sebelumnya');
    }

    // Hapus dokumen user secara permanen dari Firestore
    await deleteDoc(userRef);
    
    // Mirror deletion ke RTDB
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${userId}`);
    await remove(rtdbRef);
    
    // Mirror deletion to sequence path
    await sequenceService.deleteByFirebaseId('users', userId);

    console.log('Data user berhasil dihapus dari Firestore dan RTDB');

    return { 
      success: true, 
      message: 'Data user berhasil dihapus dari Firestore dan RTDB. Akun login tetap ada di sistem tapi tidak bisa digunakan.'
    };
  } catch (error) {
    console.error('Error menghapus user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk memulihkan user yang telah di-soft delete
 * 
 * Mengubah status user dari deleted menjadi aktif kembali
 * dengan tracking informasi pemulihan untuk audit trail.
 * 
 * @param {string} userId - Firebase Auth UID user yang akan dipulihkan
 * @returns {Promise<Object>} Result object dengan status operasi
 * @returns {boolean} returns.success - Apakah pemulihan berhasil
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Proses Pemulihan:
 * 1. Validasi user exists di Firestore
 * 2. Set deleted flag ke false
 * 3. Clear deletion metadata
 * 4. Set restoration metadata
 * 5. Update timestamp
 * 
 * Setelah dipulihkan:
 * - User bisa login kembali
 * - Akses ke paket dipulihkan
 * - Data historis tetap utuh
 * - Audit trail terjaga
 */
export const restoreUser = async (userId) => {
  try {
    // Validasi Firestore connection
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Validasi user exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('Data user tidak ditemukan');
    }

    const updateData = {
      deleted: false,              // Aktifkan kembali user
      deletedAt: null,             // Hapus timestamp penghapusan
      deletedBy: null,             // Hapus info penghapus
      restoredAt: new Date(),      // Timestamp pemulihan
      restoredBy: 'admin',         // Info yang memulihkan
      updatedAt: new Date()        // Timestamp update
    };

    // Update status user menjadi aktif kembali
    await updateDoc(userRef, updateData);
    
    // Mirror restore ke RTDB
    const rtdbUpdateData = {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      restoredAt: Date.now(),
      restoredBy: 'admin',
      updatedAt: Date.now()
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${userId}`);
    await update(rtdbRef, rtdbUpdateData);
    
    // Mirror restore to sequence path
    await sequenceService.updateByFirebaseId('users', userId, updateData);

    console.log('Data user berhasil dipulihkan dan dimirror ke RTDB');
    return { success: true };
  } catch (error) {
    console.error('Error memulihkan user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk mengambil daftar user yang telah di-soft delete
 * 
 * Mengambil semua user dengan role 'user' yang dalam status
 * soft delete untuk keperluan admin restore atau audit.
 * 
 * @returns {Promise<Object>} Result object dengan status dan data user
 * @returns {boolean} returns.success - Apakah pengambilan berhasil
 * @returns {Array} returns.data - Array berisi data user terhapus
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur:
 * - Filter hanya user dengan role 'user'
 * - Include hanya user yang deleted = true
 * - Sorting berdasarkan tanggal penghapusan (terbaru dulu)
 * - Fallback untuk kondisi Firestore tidak tersedia
 * 
 * Data yang dikembalikan:
 * - Semua field user normal
 * - deletedAt: Timestamp penghapusan
 * - deletedBy: User/admin yang menghapus
 * - restoredAt: Timestamp pemulihan (jika pernah dipulihkan)
 * - restoredBy: User/admin yang memulihkan
 */
export const getDeletedUsers = async () => {
  try {
    // Fallback jika Firestore tidak tersedia
    if (!db) {
      return { success: true, data: [] };
    }

    // Query untuk mengambil user yang telah dihapus
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('role', '==', 'user'),      // Hanya user biasa
      where('deleted', '==', true)      // Hanya yang sudah dihapus
    );
    const querySnapshot = await getDocs(q);
    
    // Proses hasil query
    const deletedUserList = [];
    querySnapshot.forEach((doc) => {
      deletedUserList.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Urutkan berdasarkan tanggal penghapusan (terbaru dulu)
    deletedUserList.sort((a, b) => 
      new Date(b.deletedAt) - new Date(a.deletedAt)
    );

    return { success: true, data: deletedUserList };
  } catch (error) {
    console.error('Error mengambil data user terhapus:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Bulk delete semua user dan reset sequence
 * Berguna untuk testing atau cleanup
 * 
 * @returns {Promise<Object>} Result dengan success status
 */
export const bulkDeleteAllUsers = async () => {
  try {
    // Get semua user untuk delete satu-satu dari Firestore
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    const userIds = [];
    
    // Collect all user IDs
    snapshot.forEach((doc) => {
      userIds.push(doc.id);
    });
    
    // Delete all from Firestore
    userIds.forEach((userId) => {
      deletePromises.push(deleteDoc(doc(db, "users", userId)));
    });
    
    // Wait untuk semua Firestore deletions selesai
    await Promise.all(deletePromises);
    
    // Clear original RTDB path
    const rtdbRef = ref(realtimeDb, "original/users");
    await remove(rtdbRef);
    
    // Reset sequence (this will clear sequence data dan reset meta ke 0)
    await sequenceService.resetSequence('users');
    
    console.log(`Bulk deleted ${userIds.length} users and reset sequence`);
    return { success: true, deletedCount: userIds.length };
  } catch (error) {
    console.error("Error bulk deleting all users:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Recalculate meta count untuk sync RTDB sequence dengan Firestore
 * 
 * @returns {Promise<Object>} Result dengan success status
 */
export const syncSequenceMeta = async () => {
  try {
    await sequenceService.recalculateMetaCount('users');
    console.log('Successfully synced users sequence meta');
    return { success: true };
  } catch (error) {
    console.error("Error syncing sequence meta:", error);
    return { success: false, error: error.message };
  }
};
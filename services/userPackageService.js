/**
 * USER PACKAGE SERVICE - Manajemen Paket Berbasis Timeline untuk User
 * 
 * Service ini bertanggung jawab untuk:
 * - Manajemen riwayat paket user berdasarkan timeline aktif
 * - Caching system untuk optimasi performa dengan TTL 30 detik
 * - Update status paket user dengan auto-create jika belum ada
 * - Kalkulasi ringkasan paket (delivered, pending, weight, progress)
 * - Manajemen prioritas user dan dampaknya terhadap paket
 * - Proses pickup paket dengan logging metode akses
 * - Real-time sync dengan timeline service untuk konsistensi data
 * 
 * Fitur Caching:
 * - Map-based cache dengan user ID sebagai key
 * - TTL (Time To Live) 30 detik untuk cache freshness
 * - Automatic cache invalidation saat ada update
 * - Timeline caching untuk mengurangi Firebase calls
 * 
 * Struktur Data Paket:
 * - Setiap user memiliki paket untuk setiap periode aktif timeline
 * - Status: pending, delivered, picked_up, returned, overdue
 * - Auto-generated jika belum ada saat pertama kali diakses
 * - Sorting berdasarkan nomor periode untuk konsistensi
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { getActiveTimeline, calculatePackageStatus } from './timelineService';
import { toISOString } from '../utils/dateUtils';

// === CACHING SYSTEM ===
// Cache untuk menyimpan data paket user dengan Map untuk O(1) access
let cachedPackages = new Map();
// Cache untuk timeline aktif yang sering digunakan
let cachedTimeline = null; 
// Timestamp cache untuk TTL checking
let cacheTimestamp = null;
// Durasi cache 30 detik (30000ms) untuk balance antara performa dan freshness
const CACHE_DURATION = 30000;

/**
 * Memeriksa apakah cache masih valid berdasarkan TTL
 * 
 * @returns {boolean} True jika cache masih valid, false jika sudah expired
 */
const isCacheValid = () => {
  return cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION;
};

/**
 * Mengambil riwayat paket lengkap untuk user berdasarkan timeline aktif
 * 
 * Fungsi utama untuk mendapatkan semua paket user across semua periode
 * timeline yang aktif. Menggunakan caching system untuk optimasi performa
 * dan auto-generate paket jika belum ada di database.
 * 
 * Fitur:
 * - Smart caching dengan TTL 30 detik
 * - Auto-generation paket untuk periode yang belum ada
 * - Real-time status calculation berdasarkan timeline
 * - Sorting paket berdasarkan urutan periode
 * - Graceful error handling untuk periode yang bermasalah
 * 
 * @param {string} userId - ID user yang akan diambil riwayat paketnya
 * 
 * @returns {Promise<Object>} Result object dengan packages dan timeline
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Array<Object>} returns.packages - Array paket user yang sudah disort
 * @returns {Object|null} returns.timeline - Data timeline aktif
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const getUserPackageHistory = async (userId) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      return { success: true, packages: [], timeline: null };
    }

    // Validasi parameter userId
    if (!userId) {
      return { success: false, error: 'User ID tidak ditemukan', packages: [], timeline: null };
    }

    let timeline;
    const cacheKey = userId;

    // === CACHE CHECK ===
    // Periksa cache jika masih valid untuk user ini
    if (isCacheValid() && cachedTimeline && cachedPackages.has(cacheKey)) {
      return {
        success: true,
        packages: cachedPackages.get(cacheKey),
        timeline: cachedTimeline
      };
    }

    // === FETCH TIMELINE ===
    // Ambil timeline aktif sebagai basis periode paket
    const timelineResult = await getActiveTimeline();
    if (!timelineResult.success) {
      return { 
        success: false, 
        error: 'Timeline aktif tidak ditemukan', 
        packages: [], 
        timeline: null 
      };
    }

    timeline = timelineResult.timeline;
    
    // Filter hanya periode yang aktif (bukan hari libur)
    const activePeriods = Object.keys(timeline.periods).filter(
      periodKey => timeline.periods[periodKey].active
    );

    // === FETCH PACKAGES PER PERIOD ===
    // Promise array untuk fetch semua periode secara paralel
    const packagePromises = activePeriods.map(async (periodKey) => {
      try {
        // Referensi koleksi user_packages untuk periode ini
        const packagesRef = collection(
          db, 
          'packages', 
          timeline.id, 
          'periods', 
          periodKey, 
          'user_packages'
        );
        
        // Query paket untuk user ini pada periode ini
        const q = query(packagesRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        const period = timeline.periods[periodKey];
        
        // === AUTO-GENERATE JIKA BELUM ADA ===
        if (querySnapshot.empty) {
          // Buat data paket virtual jika belum ada di database
          const packageData = {
            id: `${userId}_${periodKey}`,
            userId: userId,
            period: periodKey,
            periodLabel: period.label,
            packageId: `PKG${Date.now()}`,
            deliveryDate: period.dueDate,
            status: 'pending',
            pickupDate: null,
            accessMethod: null,
            notes: '',
            periodData: period, // Data periode untuk referensi
            periodKey: periodKey,
            weight: 0,
            dimensions: '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          // Kalkulasi status real-time berdasarkan timeline
          packageData.status = calculatePackageStatus(packageData, timeline);
          return packageData;
        } else {
          // Ambil data paket yang sudah ada
          const packageInfo = querySnapshot.docs[0].data();
          const packageData = {
            id: querySnapshot.docs[0].id,
            ...packageInfo,
            periodData: period, // Tambahkan data periode
            periodKey: periodKey
          };
          
          // Update status berdasarkan kondisi terkini
          packageData.status = calculatePackageStatus(packageData, timeline);
          return packageData;
        }
      } catch (periodError) {
        // === GRACEFUL ERROR HANDLING ===
        console.warn(`Error loading period ${periodKey}:`, periodError);
        
        // Buat fallback package data jika ada error
        const period = timeline.periods[periodKey];
        const packageData = {
          id: `${userId}_${periodKey}`,
          userId: userId,
          period: periodKey,
          periodLabel: period.label,
          packageId: `PKG${Date.now()}`,
          deliveryDate: period.dueDate,
          status: 'pending',
          pickupDate: null,
          accessMethod: null,
          notes: '',
          periodData: period,
          periodKey: periodKey,
          weight: 0,
          dimensions: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        packageData.status = calculatePackageStatus(packageData, timeline);
        return packageData;
      }
    });

    // Tunggu semua periode selesai diprocess
    const allPackages = await Promise.all(packagePromises);

    // === SORTING ===
    // Sort paket berdasarkan nomor periode untuk konsistensi tampilan
    allPackages.sort((a, b) => {
      const periodA = parseInt(a.periodKey.replace('period_', ''));
      const periodB = parseInt(b.periodKey.replace('period_', ''));
      return periodA - periodB;
    });

    // === UPDATE CACHE ===
    // Simpan hasil ke cache untuk request berikutnya
    cachedPackages.set(cacheKey, allPackages);
    cachedTimeline = timeline;
    cacheTimestamp = Date.now();

    return { success: true, packages: allPackages, timeline };
  } catch (error) {
    console.error('Error getting user package history:', error);
    return { success: false, error: error.message, packages: [], timeline: null };
  }
};

/**
 * Update status dan data paket user dengan auto-create jika belum ada
 * 
 * Fungsi ini mengupdate data paket user seperti status, pickup date,
 * access method, dll. Jika paket belum ada di database, akan otomatis
 * membuat paket baru dengan data timeline.
 * 
 * Fitur:
 * - Auto-create paket jika document tidak ditemukan
 * - Cache invalidation setelah update
 * - Comprehensive error handling
 * - Automatic timestamp management
 * 
 * @param {string} timelineId - ID timeline yang berisi paket
 * @param {string} periodKey - Key periode paket (format: 'period_1', dst)
 * @param {string} userId - ID user pemilik paket
 * @param {Object} updateData - Data yang akan diupdate
 * @param {string} [updateData.status] - Status baru paket
 * @param {string} [updateData.pickupDate] - Tanggal pickup dalam ISO string
 * @param {string} [updateData.accessMethod] - Metode akses (RFID, manual, QR)
 * @param {string} [updateData.notes] - Catatan tambahan
 * @param {number} [updateData.weight] - Berat paket dalam kg
 * @param {string} [updateData.dimensions] - Dimensi paket
 * @param {string} [updateData.priority] - Prioritas user
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const updateUserPackageStatus = async (timelineId, periodKey, userId, updateData) => {
  try {
    // === VALIDASI PARAMETER ===
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    if (!timelineId || !periodKey || !userId) {
      throw new Error('Parameter tidak lengkap untuk update package');
    }

    // Referensi ke dokumen paket user
    const packageRef = doc(
      db, 
      'packages', 
      timelineId, 
      'periods', 
      periodKey, 
      'user_packages', 
      userId
    );

    // Siapkan payload dengan timestamp otomatis
    const updatePayload = {
      ...updateData,
      updatedAt: new Date() // Selalu update timestamp
    };

    try {
      // === UPDATE DOCUMENT ===
      // Coba update dokumen yang sudah ada
      await updateDoc(packageRef, updatePayload);
    } catch (updateError) {
      // === AUTO-CREATE JIKA TIDAK ADA ===
      if (updateError.code === 'not-found') {
        // Ambil timeline data untuk buat paket baru
        const timeline = cachedTimeline || (await getActiveTimeline()).timeline;
        
        if (timeline) {
          const period = timeline.periods[periodKey];
          
          if (period) {
            // Buat paket baru dengan data lengkap
            const newPackageData = {
              id: `${userId}_${periodKey}`,
              userId: userId,
              period: periodKey,
              periodLabel: period.label,
              packageId: `PKG${Date.now()}`,
              deliveryDate: period.dueDate,
              ...updatePayload, // Merge dengan data update
              createdAt: new Date()
            };

            // Gunakan setDoc untuk membuat dokumen baru
            await setDoc(packageRef, newPackageData);
          } else {
            throw new Error('Period tidak ditemukan dalam timeline');
          }
        } else {
          throw new Error('Timeline aktif tidak ditemukan');
        }
      } else {
        // Error lain selain not-found, throw ulang
        throw updateError;
      }
    }

    // === CACHE INVALIDATION ===
    // Hapus cache user ini karena ada perubahan data
    cachedPackages.delete(userId);
    cacheTimestamp = null; // Reset cache timestamp

    return { success: true };
  } catch (error) {
    console.error('Error updating user package status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Menghitung ringkasan statistik paket user
 * 
 * Fungsi untuk mengkalkulasi berbagai metrik dari array paket user
 * seperti jumlah per status, total berat, dan persentase progress.
 * Berguna untuk dashboard dan analytics.
 * 
 * @param {Array<Object>} packages - Array paket user
 * @param {string} packages[].status - Status paket (pending/delivered/picked_up/returned/overdue)
 * @param {number} [packages[].weight] - Berat paket dalam kg (default: 0)
 * 
 * @returns {Object} Ringkasan statistik paket
 * @returns {number} returns.total - Total jumlah paket
 * @returns {number} returns.delivered - Jumlah paket delivered
 * @returns {number} returns.pending - Jumlah paket pending
 * @returns {number} returns.pickedUp - Jumlah paket picked_up
 * @returns {number} returns.returned - Jumlah paket returned
 * @returns {number} returns.totalWeight - Total berat semua paket (kg)
 * @returns {number} returns.deliveredWeight - Total berat paket delivered (kg)
 * @returns {number} returns.pendingWeight - Total berat paket pending (kg)
 * @returns {number} returns.progressPercentage - Persentase progress delivery (0-100)
 */
export const getPackageSummary = (packages) => {
  // === HITUNG JUMLAH PER STATUS ===
  const total = packages.length;
  const delivered = packages.filter(p => p.status === 'delivered').length;
  const pending = packages.filter(p => p.status === 'pending').length;
  const pickedUp = packages.filter(p => p.status === 'picked_up').length;
  const returned = packages.filter(p => p.status === 'returned').length;
  
  // === HITUNG TOTAL BERAT ===
  // Total berat semua paket (fallback ke 0 jika weight undefined)
  const totalWeight = packages.reduce((sum, p) => sum + (p.weight || 0), 0);
  
  // Berat paket yang sudah delivered
  const deliveredWeight = packages
    .filter(p => p.status === 'delivered')
    .reduce((sum, p) => sum + (p.weight || 0), 0);
  
  // Berat paket yang masih pending
  const pendingWeight = totalWeight - deliveredWeight;

  // === HITUNG PERSENTASE PROGRESS ===
  // Persentase delivery berdasarkan jumlah paket (bukan berat)
  const progressPercentage = total > 0 ? Math.round((delivered / total) * 100) : 0;

  return {
    total,
    delivered,
    pending,
    pickedUp,
    returned,
    totalWeight,
    deliveredWeight,
    pendingWeight,
    progressPercentage
  };
};

/**
 * Mengambil tingkat prioritas user dari database
 * 
 * Fungsi untuk mendapatkan prioritas user yang mempengaruhi
 * estimasi delivery dan urutan penanganan paket.
 * 
 * Priority levels:
 * - 'normal': Prioritas standar (default)
 * - 'high': Prioritas tinggi (delivery lebih cepat)
 * 
 * @param {string} userId - ID user yang akan dicek prioritasnya
 * 
 * @returns {Promise<Object>} Result object dengan data prioritas
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} returns.priority - Level prioritas user ('normal' atau 'high')
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const getUserPriority = async (userId) => {
  try {
    // Validasi parameter dan koneksi
    if (!db || !userId) {
      return { success: false, priority: 'normal' };
    }

    // Ambil document user dari Firestore
    const userDocRef = doc(db, 'users', userId);
    const userData = await getDoc(userDocRef);
    
    // Periksa apakah user ada
    if (userData.exists()) {
      const data = userData.data();
      return {
        success: true,
        priority: data.priority || 'normal' // Default ke 'normal' jika tidak ada
      };
    }
    
    // User tidak ditemukan, return default priority
    return { success: true, priority: 'normal' };
  } catch (error) {
    console.error('Error getting user priority:', error);
    return { success: false, priority: 'normal', error: error.message };
  }
};

/**
 * Mengupdate tingkat prioritas user
 * 
 * Fungsi untuk mengubah prioritas user yang akan mempengaruhi
 * estimasi delivery time dan urutan penanganan paket.
 * 
 * @param {string} userId - ID user yang akan diupdate prioritasnya
 * @param {string} newPriority - Prioritas baru ('normal' atau 'high')
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const updateUserPriority = async (userId, newPriority) => {
  try {
    // Validasi parameter
    if (!db || !userId) {
      throw new Error('Parameter tidak lengkap');
    }

    // Update prioritas user dengan timestamp
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      priority: newPriority,
      updatedAt: new Date() // Track kapan prioritas diubah
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user priority:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Menerapkan prioritas user ke paket-paket untuk kalkulasi estimasi delivery
 * 
 * Fungsi ini mengupdate paket-paket user dengan informasi prioritas
 * dan estimasi delivery time berdasarkan level prioritas.
 * 
 * Business Logic:
 * - High priority: Estimasi delivery 1 hari
 * - Normal priority: Estimasi delivery 3 hari
 * - Hanya berlaku untuk paket dengan status 'pending'
 * 
 * @param {Array<Object>} packages - Array paket user
 * @param {string} userPriority - Prioritas user ('normal' atau 'high')
 * 
 * @returns {Object} Object dengan packages yang sudah diupdate
 * @returns {Array<Object>} returns.packages - Packages dengan prioritas dan estimasi
 */
export const applyPriorityToPackages = (packages, userPriority) => {
  // Clone array untuk immutability
  const updatedPackages = [...packages];

  // Loop setiap paket untuk apply prioritas
  for (let i = 0; i < updatedPackages.length; i++) {
    const packageData = updatedPackages[i];
    
    // === APPLY PRIORITAS HIGH ===
    if (packageData.status === 'pending' && userPriority === 'high') {
      updatedPackages[i] = {
        ...packageData,
        priority: 'high',
        // High priority: estimasi 1 hari dari sekarang
        estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    } 
    // === APPLY PRIORITAS NORMAL ===
    else if (packageData.status === 'pending') {
      updatedPackages[i] = {
        ...packageData,
        priority: 'normal',
        // Normal priority: estimasi 3 hari dari sekarang
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      };
    }
    // Paket dengan status selain 'pending' tidak diubah
  }

  return {
    packages: updatedPackages
  };
};

/**
 * Memproses pickup paket user dengan logging lengkap
 * 
 * Fungsi comprehensive untuk memproses pengambilan paket oleh user.
 * Melakukan validasi, update status, logging metode akses, dan
 * mengembalikan informasi pickup yang lengkap.
 * 
 * Flow Process:
 * 1. Validasi parameter dan koneksi
 * 2. Ambil prioritas user untuk logging
 * 3. Validasi keberadaan paket
 * 4. Update status paket ke 'picked_up'
 * 5. Log metode akses dan timestamp
 * 6. Return confirmation data
 * 
 * @param {string} timelineId - ID timeline yang berisi paket
 * @param {string} periodKey - Key periode paket yang diambil
 * @param {string} userId - ID user yang mengambil paket
 * @param {string} accessMethod - Metode akses (RFID, QR, manual)
 * 
 * @returns {Promise<Object>} Result object dengan informasi pickup
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.packageStatus] - Status paket setelah pickup
 * @returns {string} [returns.pickupDate] - Timestamp pickup dalam ISO format
 * @returns {string} [returns.accessMethod] - Metode akses yang digunakan
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const processPackagePickup = async (timelineId, periodKey, userId, accessMethod) => {
  try {
    // === VALIDASI PARAMETER ===
    if (!db || !timelineId || !periodKey || !userId) {
      throw new Error('Parameter tidak lengkap');
    }

    // === AMBIL PRIORITAS USER ===
    // Untuk logging dan tracking
    const priorityResult = await getUserPriority(userId);
    if (!priorityResult.success) {
      throw new Error('Gagal mengambil prioritas user');
    }

    const userPriority = priorityResult.priority;
    
    // === VALIDASI KEBERADAAN PAKET ===
    // Ambil riwayat paket user untuk verifikasi
    const packageHistory = await getUserPackageHistory(userId);
    
    if (!packageHistory.success) {
      throw new Error('Gagal mengambil riwayat paket');
    }

    // Cari paket untuk periode yang diminta
    const targetPackage = packageHistory.packages.find(p => p.periodKey === periodKey);
    if (!targetPackage) {
      throw new Error('Paket tidak ditemukan');
    }

    // === UPDATE STATUS PAKET ===
    // Siapkan data update dengan informasi lengkap
    const updateData = {
      status: 'picked_up', // Status baru setelah pickup
      pickupDate: toISOString(), // Timestamp pickup saat ini
      accessMethod: accessMethod, // Metode akses (RFID/QR/manual)
      priority: userPriority, // Priority user untuk audit trail
      notes: `Paket diambil via ${accessMethod}` // Catatan otomatis
    };

    // Lakukan update dengan auto-create jika belum ada
    const packageResult = await updateUserPackageStatus(timelineId, periodKey, userId, updateData);
    if (!packageResult.success) {
      throw new Error('Gagal update status paket');
    }

    // === RETURN CONFIRMATION ===
    return {
      success: true,
      packageStatus: 'picked_up',
      pickupDate: updateData.pickupDate,
      accessMethod: accessMethod
    };
  } catch (error) {
    console.error('Error processing package pickup:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Membersihkan semua cache user package
 * 
 * Fungsi utility untuk menghapus semua cache yang tersimpan.
 * Berguna untuk force refresh data atau saat ada perubahan besar
 * pada timeline yang memerlukan reload data fresh.
 * 
 * Cache yang dibersihkan:
 * - cachedPackages Map (semua user packages)
 * - cachedTimeline (timeline aktif)
 * - cacheTimestamp (TTL timestamp)
 */
export const clearUserCache = () => {
  // Hapus semua cache packages dari Map
  cachedPackages.clear();
  // Reset cache timeline
  cachedTimeline = null;
  // Reset timestamp untuk TTL
  cacheTimestamp = null;
};
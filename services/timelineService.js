/**
 * TIMELINE SERVICE - Manajemen Timeline Pengiriman dan Periode Paket
 * 
 * Service ini bertanggung jawab untuk:
 * - Pembuatan dan manajemen template timeline pengiriman
 * - Pengaturan timeline aktif dengan periode-periode tertentu
 * - Generasi otomatis paket untuk setiap periode timeline
 * - Manajemen status paket berdasarkan timeline yang berjalan
 * - Kalkulasi tanggal jatuh tempo dan status pengiriman
 * - Simulasi timeline manual untuk testing dan development
 * 
 * Timeline dapat dikonfigurasi dengan berbagai tipe:
 * - yearly: Timeline tahunan
 * - monthly: Timeline bulanan
 * - weekly: Timeline mingguan  
 * - daily: Timeline harian
 * - hourly: Timeline per jam
 * - minute: Timeline per menit
 * 
 * Fitur khusus:
 * - Support untuk hari libur (holiday) yang dapat dilewati
 * - Mode simulasi manual untuk testing
 * - Batch operations untuk performa optimal
 * - Auto-generation paket untuk semua user
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
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Membuat template timeline baru untuk pengiriman paket
 * 
 * Template ini dapat digunakan sebagai basis untuk membuat timeline aktif.
 * Template berisi konfigurasi dasar seperti durasi, tipe, dan hari pengiriman.
 * 
 * @param {Object} templateData - Data template timeline
 * @param {string} templateData.name - Nama template
 * @param {string} templateData.type - Tipe timeline (yearly/monthly/weekly/daily/hourly/minute)
 * @param {number} templateData.duration - Durasi timeline dalam unit sesuai tipe
 * @param {number} templateData.baseWeight - Bobot dasar untuk kalkulasi
 * @param {Array<number>} templateData.deliveryDays - Hari-hari pengiriman (opsional)
 * 
 * @returns {Promise<Object>} Result object dengan success status dan template data
 */
export const createTimelineTemplate = async (templateData) => {
  try {
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    const templateId = `template_${Date.now()}`;
    const template = {
      id: templateId,
      name: templateData.name,
      type: templateData.type,
      duration: templateData.duration,
      baseWeight: templateData.baseWeight,
      deliveryDays: templateData.deliveryDays || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'timeline_templates', templateId), template);
    return { success: true, template };
  } catch (error) {
    console.error('Error creating timeline template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mengambil semua template timeline yang tersimpan
 * 
 * Fungsi ini mengambil seluruh template timeline dari Firestore untuk
 * ditampilkan dalam daftar pilihan atau untuk digunakan sebagai basis
 * pembuatan timeline aktif.
 * 
 * @returns {Promise<Object>} Result object dengan array templates
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Array<Object>} returns.templates - Array template timeline
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const getTimelineTemplates = async () => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      return { success: true, templates: [] };
    }

    // Ambil referensi koleksi template timeline
    const templatesRef = collection(db, 'timeline_templates');
    const querySnapshot = await getDocs(templatesRef);
    
    // Konversi snapshot menjadi array template
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, templates };
  } catch (error) {
    console.error('Error getting timeline templates:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Membuat timeline aktif baru berdasarkan data konfigurasi
 * 
 * Timeline aktif adalah timeline yang sedang berjalan dan digunakan untuk
 * mengatur pengiriman paket. Hanya boleh ada satu timeline aktif pada satu waktu.
 * 
 * @param {Object} timelineData - Data konfigurasi timeline
 * @param {string} timelineData.id - ID unik timeline
 * @param {string} timelineData.name - Nama timeline
 * @param {string} timelineData.type - Tipe timeline (yearly/monthly/weekly/daily/hourly/minute)
 * @param {number} timelineData.duration - Durasi timeline (jumlah periode)
 * @param {number} timelineData.baseAmount - Jumlah dasar paket per periode
 * @param {number} timelineData.totalAmount - Total jumlah paket keseluruhan
 * @param {number} timelineData.amountPerPeriod - Jumlah paket per periode
 * @param {string} timelineData.startDate - Tanggal mulai timeline (ISO string)
 * @param {string} timelineData.mode - Mode timeline ('auto' atau 'manual')
 * @param {string} [timelineData.simulationDate] - Tanggal simulasi untuk mode manual
 * @param {Array<number>} [timelineData.holidays] - Array nomor periode yang merupakan hari libur
 * 
 * @returns {Promise<Object>} Result object dengan timeline yang dibuat
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Object} [returns.timeline] - Data timeline yang berhasil dibuat
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const createActiveTimeline = async (timelineData) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Generate periode-periode berdasarkan konfigurasi timeline
    const periods = generatePeriods(timelineData);
    
    // Buat objek timeline aktif dengan semua konfigurasi
    const activeTimeline = {
      id: timelineData.id,
      name: timelineData.name,
      type: timelineData.type,
      duration: timelineData.duration,
      baseAmount: timelineData.baseAmount,
      totalAmount: timelineData.totalAmount,
      amountPerPeriod: timelineData.amountPerPeriod,
      startDate: timelineData.startDate,
      mode: timelineData.mode, // 'auto' untuk waktu real, 'manual' untuk simulasi
      simulationDate: timelineData.mode === 'manual' ? timelineData.simulationDate : null,
      holidays: timelineData.holidays || [],
      periods: periods,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Simpan timeline ke Firestore dengan ID tetap 'current'
    await setDoc(doc(db, 'active_timeline', 'current'), activeTimeline);
    return { success: true, timeline: activeTimeline };
  } catch (error) {
    console.error('Error creating active timeline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mengambil timeline aktif yang sedang berjalan
 * 
 * Fungsi ini mengambil timeline yang sedang aktif dari Firestore.
 * Timeline aktif digunakan untuk menentukan periode pengiriman,
 * tanggal jatuh tempo, dan kalkulasi status paket.
 * 
 * @returns {Promise<Object>} Result object dengan timeline aktif
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Object} [returns.timeline] - Data timeline aktif
 * @returns {string} [returns.error] - Pesan error jika timeline tidak ditemukan atau operasi gagal
 */
export const getActiveTimeline = async () => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      return { success: false, error: 'Firestore tidak tersedia' };
    }

    // Ambil dokumen timeline aktif dengan ID tetap 'current'
    const docRef = doc(db, 'active_timeline', 'current');
    const docSnap = await getDoc(docRef);

    // Periksa apakah timeline aktif ada
    if (docSnap.exists()) {
      return { success: true, timeline: docSnap.data() };
    } else {
      return { success: false, error: 'Timeline aktif tidak ditemukan' };
    }
  } catch (error) {
    console.error('Error getting active timeline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mendapatkan tanggal saat ini berdasarkan mode timeline
 * 
 * Fungsi ini mengembalikan tanggal yang tepat berdasarkan mode timeline:
 * - Mode 'auto': mengembalikan tanggal sistem saat ini
 * - Mode 'manual': mengembalikan tanggal simulasi yang telah diatur
 * 
 * @param {Object} timeline - Data timeline aktif
 * @param {string} timeline.mode - Mode timeline ('auto' atau 'manual')
 * @param {string} [timeline.simulationDate] - Tanggal simulasi untuk mode manual
 * 
 * @returns {Date} Tanggal saat ini sesuai mode timeline
 */
export const getCurrentDate = (timeline) => {
  // Jika mode manual dan ada tanggal simulasi, gunakan tanggal simulasi
  if (timeline && timeline.mode === 'manual' && timeline.simulationDate) {
    return new Date(timeline.simulationDate);
  }
  // Jika mode auto atau tidak ada tanggal simulasi, gunakan tanggal sistem
  return new Date();
};

/**
 * Memperbarui tanggal simulasi pada timeline aktif
 * 
 * Fungsi ini digunakan untuk mengubah tanggal simulasi pada timeline
 * yang berjalan dalam mode manual. Berguna untuk testing dan simulasi
 * pengiriman paket pada tanggal tertentu.
 * 
 * @param {string|Date} simulationDateTime - Tanggal dan waktu simulasi baru
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const updateTimelineSimulationDate = async (simulationDateTime) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    const timelineRef = doc(db, 'active_timeline', 'current');
    
    // Normalisasi format tanggal simulasi
    let simulationDate;
    if (typeof simulationDateTime === 'string') {
      // Jika sudah string, gunakan langsung (baik format ISO maupun date string)
      if (simulationDateTime.includes('T')) {
        simulationDate = simulationDateTime; // Format ISO
      } else {
        simulationDate = simulationDateTime; // Format date string
      }
    } else {
      // Jika Date object, konversi ke ISO string
      simulationDate = new Date(simulationDateTime).toISOString();
    }

    // Update tanggal simulasi pada timeline aktif
    await updateDoc(timelineRef, {
      simulationDate: simulationDate,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating simulation date:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Menghapus timeline aktif dan opsional data paket terkait
 * 
 * Fungsi ini menghapus timeline yang sedang aktif dengan opsi untuk
 * menghapus semua data paket yang terkait atau mempertahankannya.
 * Juga dapat mereset prioritas user ke normal.
 * 
 * @param {boolean} [deletePackageData=false] - Apakah ikut menghapus data paket
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.message] - Pesan konfirmasi operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const deleteActiveTimeline = async (deletePackageData = false) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Ambil timeline aktif yang akan dihapus
    const timelineResult = await getActiveTimeline();
    if (!timelineResult.success) {
      throw new Error('Timeline aktif tidak ditemukan');
    }

    const timeline = timelineResult.timeline;
    const batch = writeBatch(db); // Gunakan batch untuk operasi atomik

    // Jika diminta hapus data paket, lakukan cleanup menyeluruh
    if (deletePackageData) {
      // Hapus semua data paket untuk setiap periode timeline
      for (const periodKey of Object.keys(timeline.periods)) {
        // Ambil semua user packages untuk periode ini
        const userPackagesRef = collection(db, 'packages', timeline.id, 'periods', periodKey, 'user_packages');
        const userSnapshot = await getDocs(userPackagesRef);
        
        // Hapus setiap user package
        userSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        // Hapus dokumen periode
        const periodRef = doc(db, 'packages', timeline.id, 'periods', periodKey);
        batch.delete(periodRef);
      }

      // Hapus dokumen utama packages collection
      const packagesRef = doc(db, 'packages', timeline.id);
      batch.delete(packagesRef);

      // Opsional: Reset prioritas semua user ke normal
      // Ambil semua user untuk reset prioritas
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      usersSnapshot.docs.forEach(userDoc => {
        const userData = userDoc.data();
        // Reset prioritas jika bukan normal
        if (userData.priority && userData.priority !== 'normal') {
          batch.update(userDoc.ref, { 
            priority: 'normal',
            updatedAt: new Date()
          });
        }
      });
    }

    // Selalu hapus timeline itu sendiri
    const timelineRef = doc(db, 'active_timeline', 'current');
    batch.delete(timelineRef);

    // Commit semua operasi sekaligus (atomik)
    await batch.commit();
    
    return { 
      success: true, 
      message: deletePackageData 
        ? 'Timeline dan data paket berhasil dihapus'
        : 'Timeline berhasil dihapus, data paket dipertahankan'
    };
  } catch (error) {
    console.error('Error deleting active timeline:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate paket untuk semua user pada setiap periode timeline aktif
 * 
 * Fungsi ini membuat paket untuk setiap user pada setiap periode yang aktif
 * dalam timeline. Paket dibuat dengan status 'pending' dan siap untuk dikelola.
 * 
 * @param {string} timelineId - ID timeline untuk generate paket
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const generatePackagesForTimeline = async (timelineId) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Ambil timeline aktif untuk mendapatkan periode-periode
    const timelineResult = await getActiveTimeline();
    if (!timelineResult.success) {
      throw new Error('Timeline aktif tidak ditemukan');
    }

    const timeline = timelineResult.timeline;
    
    // Ambil semua user yang akan dibuatkan paket
    const userResult = await getAllUsers();
    if (!userResult.success) {
      throw new Error('Gagal mengambil data user');
    }

    const batch = writeBatch(db); // Batch untuk operasi atomik
    const userList = userResult.data;

    // Loop untuk setiap periode dalam timeline
    Object.keys(timeline.periods).forEach(periodKey => {
      const period = timeline.periods[periodKey];
      
      // Hanya buat paket untuk periode yang aktif (bukan hari libur)
      if (period.active) {
        // Buat paket untuk setiap user pada periode ini
        userList.forEach(user => {
          const packageId = `${user.id}_${periodKey}`;
          const packageRef = doc(db, 'packages', timelineId, 'periods', periodKey, 'user_packages', user.id);
          
          // Data paket dengan status awal 'pending'
          const packageData = {
            id: packageId,
            userId: user.id,
            userName: user.nama,
            period: periodKey,
            periodLabel: period.label,
            packageId: `PKG${Date.now()}_${user.id}`, // Package ID unik
            deliveryDate: period.dueDate, // Tanggal jatuh tempo dari periode
            status: 'pending', // Status awal paket
            pickupDate: null, // Belum diambil
            accessMethod: null, // Belum ada metode akses
            notes: '', // Catatan kosong
            weight: 0, // Berat awal 0
            dimensions: '', // Dimensi kosong
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Tambahkan ke batch operation
          batch.set(packageRef, packageData);
        });
      }
    });

    // Commit semua operasi sekaligus untuk performa optimal
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error generating packages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mengambil semua paket untuk periode tertentu dalam timeline
 * 
 * Fungsi ini mengambil semua paket user untuk satu periode spesifik
 * dalam timeline yang diberikan. Berguna untuk menampilkan paket
 * per periode atau analisis periode tertentu.
 * 
 * @param {string} timelineId - ID timeline yang akan diambil paketnya
 * @param {string} periodKey - Key periode (format: 'period_1', 'period_2', dst)
 * 
 * @returns {Promise<Object>} Result object dengan array paket
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Array<Object>} returns.packages - Array paket untuk periode tersebut
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const getPackagesByPeriod = async (timelineId, periodKey) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      return { success: true, packages: [] };
    }

    // Ambil referensi koleksi user_packages untuk periode tertentu
    const packagesRef = collection(db, 'packages', timelineId, 'periods', periodKey, 'user_packages');
    const querySnapshot = await getDocs(packagesRef);
    
    // Konversi snapshot menjadi array paket
    const packages = [];
    querySnapshot.forEach((doc) => {
      packages.push({
        id: doc.id, // Document ID (biasanya sama dengan userId)
        ...doc.data() // Semua data paket
      });
    });

    return { success: true, packages };
  } catch (error) {
    console.error('Error getting packages by period:', error);
    return { success: false, error: error.message, packages: [] };
  }
};

/**
 * Memperbarui status dan data paket untuk user tertentu pada periode tertentu
 * 
 * Fungsi ini mengupdate data paket user seperti status, tanggal pickup,
 * metode akses, catatan, dan informasi lainnya.
 * 
 * @param {string} timelineId - ID timeline yang berisi paket
 * @param {string} periodKey - Key periode paket (format: 'period_1', 'period_2', dst)
 * @param {string} userId - ID user pemilik paket
 * @param {Object} updateData - Data yang akan diupdate
 * @param {string} [updateData.status] - Status baru paket
 * @param {string} [updateData.pickupDate] - Tanggal pickup
 * @param {string} [updateData.accessMethod] - Metode akses (RFID, manual, dll)
 * @param {string} [updateData.notes] - Catatan tambahan
 * @param {number} [updateData.weight] - Berat paket
 * @param {string} [updateData.dimensions] - Dimensi paket
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const updatePackageStatus = async (timelineId, periodKey, userId, updateData) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Referensi ke dokumen paket spesifik user
    const packageRef = doc(db, 'packages', timelineId, 'periods', periodKey, 'user_packages', userId);
    
    // Siapkan data update dengan timestamp
    const updatePayload = {
      ...updateData,
      updatedAt: new Date() // Selalu update timestamp
    };

    // Update dokumen paket
    await updateDoc(packageRef, updatePayload);
    return { success: true };
  } catch (error) {
    console.error('Error updating package status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset semua paket dalam timeline (hapus semua data paket)
 * 
 * Fungsi ini menghapus semua data paket dari timeline tanpa menghapus
 * timeline itu sendiri. Berguna untuk reset data paket sambil mempertahankan
 * konfigurasi timeline.
 * 
 * @param {string} timelineId - ID timeline yang paketnya akan direset
 * 
 * @returns {Promise<Object>} Result object status operasi
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
export const resetTimelinePackages = async (timelineId) => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      throw new Error('Firestore belum diinisialisasi');
    }

    // Ambil timeline aktif untuk mendapatkan periode-periode yang ada
    const timelineResult = await getActiveTimeline();
    if (!timelineResult.success) {
      throw new Error('Timeline aktif tidak ditemukan');
    }

    const timeline = timelineResult.timeline;
    const batch = writeBatch(db); // Batch untuk operasi atomik

    // Hapus semua periode beserta paket-paketnya
    Object.keys(timeline.periods).forEach(periodKey => {
      const periodRef = doc(db, 'packages', timelineId, 'periods', periodKey);
      batch.delete(periodRef);
    });

    // Commit semua operasi sekaligus
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error resetting timeline packages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Kalkulasi status paket berdasarkan timeline dan kondisi saat ini
 * 
 * Fungsi ini menentukan status aktual paket berdasarkan status tersimpan,
 * tanggal jatuh tempo, dan tanggal saat ini (atau simulasi). Status yang
 * dapat dihitung: pending, delivered, picked_up, returned, overdue.
 * 
 * @param {Object} packageData - Data paket yang akan dihitung statusnya
 * @param {string} packageData.status - Status tersimpan paket
 * @param {string} packageData.deliveryDate - Tanggal jatuh tempo paket
 * @param {Object} timeline - Data timeline aktif
 * @param {string} timeline.mode - Mode timeline untuk menentukan tanggal saat ini
 * 
 * @returns {string} Status paket yang sudah dikalkulasi
 */
export const calculatePackageStatus = (packageData, timeline) => {
  // Validasi input data
  if (!packageData || !timeline) return packageData?.status || 'pending';
  
  // Status final yang tidak perlu kalkulasi ulang
  if (packageData.status === 'delivered') return 'delivered';
  if (packageData.status === 'picked_up') return 'picked_up';
  if (packageData.status === 'returned') return 'returned';
  
  // Kalkulasi untuk status yang bisa berubah berdasarkan waktu
  const currentDate = getCurrentDate(timeline); // Tanggal saat ini atau simulasi
  const dueDate = new Date(packageData.deliveryDate);
  
  // Jika sudah lewat tanggal jatuh tempo dan masih pending, maka overdue
  if (currentDate > dueDate && packageData.status === 'pending') {
    return 'overdue';
  }
  
  // Default tetap pending jika belum lewat jatuh tempo
  return 'pending';
};

/**
 * Generate periode-periode untuk timeline berdasarkan konfigurasi
 * 
 * Fungsi internal yang membuat semua periode dalam timeline dengan
 * menghitung tanggal jatuh tempo, jumlah paket per periode, dan
 * menandai periode yang merupakan hari libur.
 * 
 * @param {Object} timelineData - Data konfigurasi timeline
 * @param {string} timelineData.type - Tipe timeline untuk kalkulasi tanggal
 * @param {number} timelineData.duration - Jumlah total periode
 * @param {number} timelineData.totalAmount - Total jumlah paket keseluruhan
 * @param {string} timelineData.startDate - Tanggal mulai timeline
 * @param {Array<number>} [timelineData.holidays] - Array nomor periode hari libur
 * 
 * @returns {Object} Object periode dengan key 'period_1', 'period_2', dst
 */
const generatePeriods = (timelineData) => {
  const periods = {};
  
  // Hitung periode aktif (tidak termasuk hari libur)
  const activePeriods = timelineData.duration - (timelineData.holidays?.length || 0);
  // Bagi rata jumlah paket ke periode aktif (pembulatan ke atas)
  const amountPerPeriod = Math.ceil(timelineData.totalAmount / activePeriods);

  // Generate setiap periode dari 1 sampai durasi timeline
  for (let i = 1; i <= timelineData.duration; i++) {
    const isHoliday = timelineData.holidays?.includes(i) || false;
    const periodKey = `period_${i}`;
    
    periods[periodKey] = {
      number: i, // Nomor urut periode
      label: getPeriodLabel(timelineData.type, i, timelineData.startDate), // Label tampilan
      dueDate: calculateDueDate(timelineData.type, i, timelineData.startDate), // Tanggal jatuh tempo
      active: !isHoliday, // Status aktif (false jika hari libur)
      amount: isHoliday ? 0 : amountPerPeriod, // Jumlah paket (0 jika hari libur)
      isHoliday: isHoliday // Flag hari libur
    };
  }

  return periods;
};

/**
 * Generate label tampilan untuk periode berdasarkan tipe timeline
 * 
 * Fungsi helper untuk membuat label yang user-friendly dalam bahasa Indonesia
 * untuk setiap periode timeline.
 * 
 * @param {string} type - Tipe timeline
 * @param {number} number - Nomor urut periode
 * @param {string} startDate - Tanggal mulai timeline (tidak digunakan saat ini)
 * 
 * @returns {string} Label periode dalam bahasa Indonesia
 */
const getPeriodLabel = (type, number, startDate) => {
  // Mapping tipe timeline ke label bahasa Indonesia
  const typeLabels = {
    yearly: 'Tahun',
    monthly: 'Bulan', 
    weekly: 'Minggu',
    daily: 'Hari',
    hourly: 'Jam',
    minute: 'Menit'
  };
  
  // Gabungkan label tipe dengan nomor urut
  return `${typeLabels[type]} ${number}`;
};

/**
 * Kalkulasi tanggal jatuh tempo untuk setiap periode timeline
 * 
 * Fungsi ini menghitung tanggal jatuh tempo berdasarkan tipe timeline
 * dan nomor periode. Setiap tipe memiliki cara kalkulasi yang berbeda.
 * 
 * @param {string} type - Tipe timeline (yearly/monthly/weekly/daily/hourly/minute)
 * @param {number} periodNumber - Nomor urut periode (mulai dari 1)
 * @param {string} startDate - Tanggal mulai timeline (ISO string)
 * 
 * @returns {string} Tanggal jatuh tempo dalam format ISO string
 */
const calculateDueDate = (type, periodNumber, startDate) => {
  const start = new Date(startDate);
  let dueDate = new Date(start);

  // Kalkulasi berdasarkan tipe timeline
  switch (type) {
    case 'yearly':
      // Tambahkan periodNumber tahun dari tanggal mulai
      dueDate.setFullYear(start.getFullYear() + periodNumber);
      break;
    case 'monthly':
      // Tambahkan periodNumber bulan dari tanggal mulai
      dueDate.setMonth(start.getMonth() + periodNumber);
      break;
    case 'weekly':
      // Tambahkan periodNumber minggu (x7 hari) dari tanggal mulai
      dueDate.setDate(start.getDate() + (periodNumber * 7));
      break;
    case 'daily':
      // Tambahkan periodNumber hari dari tanggal mulai
      dueDate.setDate(start.getDate() + periodNumber);
      break;
    case 'hourly':
      // Tambahkan periodNumber jam dari tanggal mulai
      dueDate.setHours(start.getHours() + periodNumber);
      break;
    case 'minute':
      // Tambahkan periodNumber menit dari tanggal mulai
      dueDate.setMinutes(start.getMinutes() + periodNumber);
      break;
    default:
      // Default fallback ke tipe daily
      dueDate.setDate(start.getDate() + periodNumber);
  }

  // Kembalikan dalam format ISO string untuk konsistensi
  return dueDate.toISOString();
};

/**
 * Mengambil semua user dengan role 'user' dari Firestore
 * 
 * Fungsi helper internal untuk mendapatkan daftar semua user
 * yang akan dibuatkan paket pada setiap periode timeline.
 * Hanya mengambil user dengan role 'user', tidak termasuk admin.
 * 
 * @returns {Promise<Object>} Result object dengan data user
 * @returns {boolean} returns.success - Status berhasil/gagal operasi
 * @returns {Array<Object>} returns.data - Array data user
 * @returns {string} [returns.error] - Pesan error jika operasi gagal
 */
const getAllUsers = async () => {
  try {
    // Validasi koneksi Firebase
    if (!db) {
      return { success: true, data: [] };
    }

    // Query untuk mengambil hanya user dengan role 'user'
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'user'));
    const querySnapshot = await getDocs(q);
    
    // Konversi snapshot menjadi array user
    const userList = [];
    querySnapshot.forEach((doc) => {
      userList.push({
        id: doc.id, // Document ID sebagai user ID
        ...doc.data() // Semua data user lainnya
      });
    });

    return { success: true, data: userList };
  } catch (error) {
    console.error('Error getting user data:', error);
    return { success: false, error: error.message, data: [] };
  }
};
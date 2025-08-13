/**
 * Service untuk integrasi sensor ultrasonik ESP32 dengan sistem monitoring kapasitas kotak paket.
 * 
 * Service ini mengelola komunikasi real-time dengan ESP32 untuk:
 * - Monitoring ketinggian paket dalam kotak menggunakan sensor ultrasonik HC-SR04
 * - Sinkronisasi data sensor dengan Firebase Firestore
 * - Kalkulasi status kapasitas berdasarkan pembacaan sensor
 * - Subscription real-time untuk update otomatis UI
 * 
 * Spesifikasi Hardware:
 * - ESP32 dengan sensor ultrasonik HC-SR04
 * - Range pengukuran: 0-30cm (default maxHeight)
 * - Protokol komunikasi: WiFi ke Firebase
 * - Device ID: ESP32_001 (default)
 * 
 * Format Data Sensor:
 * {
 *   height: number,        // Ketinggian terukur dalam cm
 *   maxHeight: number,     // Kapasitas maksimum kotak (cm)
 *   lastUpdated: timestamp,// Waktu pembacaan terakhir
 *   deviceId: string       // ID perangkat ESP32
 * }
 * 
 * @author Package Tracking System
 * @version 1.0.0
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import {
  ref,
  set,
  update,
} from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { sequenceService } from './sequenceService';

// Konstanta konfigurasi Firebase untuk data sensor kapasitas
const CAPACITY_COLLECTION = 'capacity';
const CAPACITY_DOC_ID = 'box_sensor';
const RTDB_PATH = 'original/capacity';

/**
 * Mengambil data kapasitas terkini dari sensor ultrasonik ESP32.
 * 
 * Fungsi ini membaca data sensor dari Firebase Firestore dan mengembalikan
 * informasi ketinggian paket dalam kotak serta status perangkat ESP32.
 * Jika dokumen belum ada, akan membuat dokumen default dengan konfigurasi awal.
 * 
 * Alur Kerja:
 * 1. Query dokumen sensor dari Firebase
 * 2. Jika dokumen ada, return data sensor
 * 3. Jika tidak ada, buat dokumen default dengan:
 *    - height: 0cm (kotak kosong)
 *    - maxHeight: 30cm (kapasitas maksimum)
 *    - deviceId: ESP32_001
 *    - timestamp server Firebase
 * 
 * @async
 * @function getCapacityData
 * @returns {Promise<Object>} Response object dengan format:
 *   - success: boolean - Status keberhasilan operasi
 *   - data: Object - Data sensor (height, maxHeight, lastUpdated, deviceId)
 *   - error: string - Pesan error jika operasi gagal
 * 
 * @example
 * const result = await getCapacityData();
 * if (result.success) {
 *   console.log('Ketinggian:', result.data.height, 'cm');
 *   console.log('Status:', calculateCapacityStatus(result.data.height).status);
 * }
 */
export const getCapacityData = async () => {
  try {
    // Referensi dokumen sensor di Firebase Firestore
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Return data sensor yang sudah ada
      return {
        success: true,
        data: docSnap.data()
      };
    } else {
      // Buat dokumen default jika belum ada (inisialisasi pertama kali)
      const defaultData = {
        height: 0,                    // Kotak kosong (0cm)
        percentage: 0,               // Persentase langsung dari ESP32 (0%)
        maxHeight: 30,               // Kapasitas maksimum 30cm
        lastUpdated: serverTimestamp(), // Timestamp server Firebase
        deviceId: 'ESP32_001'        // ID perangkat ESP32 default
      };
      
      // Simpan konfigurasi default ke Firebase
      await setDoc(docRef, defaultData);
      
      // Mirror to original RTDB path
      const rtdbData = {
        ...defaultData,
        lastUpdated: Date.now(),
        firestoreId: CAPACITY_DOC_ID
      };
      
      const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${CAPACITY_DOC_ID}`);
      await set(rtdbRef, rtdbData);
      
      // Mirror to sequence path dengan sequential ID
      await sequenceService.addWithSequentialId('capacity', CAPACITY_DOC_ID, defaultData);
      
      console.log('Capacity data berhasil diinisialisasi dan dimirror ke RTDB');
      return {
        success: true,
        data: defaultData
      };
    }
  } catch (error) {
    console.error('Error getting capacity data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update ketinggian paket dari pembacaan sensor ultrasonik ESP32.
 * 
 * Fungsi ini dipanggil oleh ESP32 setiap kali sensor ultrasonik HC-SR04
 * melakukan pembacaan jarak. Data ketinggian akan disinkronkan ke Firebase
 * untuk update real-time pada aplikasi mobile.
 * 
 * Protokol Komunikasi ESP32:
 * 1. ESP32 membaca sensor ultrasonik (HC-SR04)
 * 2. Konversi jarak ke ketinggian paket (30cm - jarak_terukur)
 * 3. Kirim data ke Firebase melalui WiFi
 * 4. Update timestamp untuk tracking pembacaan terakhir
 * 
 * @async
 * @function updateCapacityHeight
 * @param {number} height - Ketinggian paket dalam cm (0-30)
 * @param {string} [deviceId='ESP32_001'] - ID perangkat ESP32 yang mengirim data
 * @returns {Promise<Object>} Response object dengan format:
 *   - success: boolean - Status keberhasilan update
 *   - message: string - Pesan konfirmasi jika berhasil
 *   - error: string - Pesan error jika operasi gagal
 * 
 * @example
 * // ESP32 mengirim data ketinggian 15cm
 * const result = await updateCapacityHeight(15, 'ESP32_001');
 * if (result.success) {
 *   console.log('Data sensor berhasil diupdate');
 * }
 */
export const updateCapacityHeight = async (height, deviceId = 'ESP32_001') => {
  try {
    // Referensi dokumen sensor untuk update real-time
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    
    // Update data sensor dengan pembacaan terbaru dari ESP32
    const updateData = {
      height: height,                    // Ketinggian dari sensor ultrasonik
      lastUpdated: serverTimestamp(),   // Timestamp pembacaan untuk tracking
      deviceId: deviceId                // ID ESP32 untuk identifikasi perangkat
    };
    
    await updateDoc(docRef, updateData);
    
    // Mirror update to original RTDB path
    const rtdbUpdateData = {
      height: height,
      lastUpdated: Date.now(),
      deviceId: deviceId
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${CAPACITY_DOC_ID}`);
    await update(rtdbRef, rtdbUpdateData);
    
    // Mirror update to sequence path
    await sequenceService.updateByFirebaseId('capacity', CAPACITY_DOC_ID, {
      height: height,
      deviceId: deviceId
    });
    
    return {
      success: true,
      message: 'Height updated successfully'
    };
  } catch (error) {
    console.error('Error updating capacity height:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update persentase kapasitas langsung dari ESP32.
 * 
 * Fungsi ini dipanggil oleh ESP32 ketika dalam mode persentase.
 * ESP32 mengirim persentase yang sudah dihitung langsung tanpa
 * perlu konversi dari ketinggian.
 * 
 * Mode Persentase ESP32:
 * 1. ESP32 membaca sensor ultrasonik (HC-SR04)
 * 2. ESP32 melakukan kalkulasi persentase internal
 * 3. Kirim persentase langsung ke Firebase
 * 4. Update timestamp untuk tracking pembacaan terakhir
 * 
 * @async
 * @function updateCapacityPercentage
 * @param {number} percentage - Persentase kapasitas dalam % (0-100)
 * @param {string} [deviceId='ESP32_001'] - ID perangkat ESP32 yang mengirim data
 * @returns {Promise<Object>} Response object dengan format:
 *   - success: boolean - Status keberhasilan update
 *   - message: string - Pesan konfirmasi jika berhasil
 *   - error: string - Pesan error jika operasi gagal
 * 
 * @example
 * // ESP32 mengirim data persentase 75%
 * const result = await updateCapacityPercentage(75, 'ESP32_001');
 * if (result.success) {
 *   console.log('Data persentase berhasil diupdate');
 * }
 */
export const updateCapacityPercentage = async (percentage, deviceId = 'ESP32_001') => {
  try {
    // Referensi dokumen sensor untuk update real-time
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    
    // Update data sensor dengan persentase terbaru dari ESP32
    const updateData = {
      percentage: percentage,            // Persentase langsung dari ESP32
      lastUpdated: serverTimestamp(),   // Timestamp pembacaan untuk tracking
      deviceId: deviceId                // ID ESP32 untuk identifikasi perangkat
    };
    
    await updateDoc(docRef, updateData);
    
    // Mirror update to original RTDB path
    const rtdbUpdateData = {
      percentage: percentage,
      lastUpdated: Date.now(),
      deviceId: deviceId
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${CAPACITY_DOC_ID}`);
    await update(rtdbRef, rtdbUpdateData);
    
    // Mirror update to sequence path
    await sequenceService.updateByFirebaseId('capacity', CAPACITY_DOC_ID, {
      percentage: percentage,
      deviceId: deviceId
    });
    
    return {
      success: true,
      message: 'Percentage updated successfully'
    };
  } catch (error) {
    console.error('Error updating capacity percentage:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update kapasitas maksimum kotak paket untuk kalibrasi sensor.
 * 
 * Fungsi ini digunakan untuk mengatur ulang batas maksimum ketinggian kotak
 * paket. Biasanya dipanggil saat konfigurasi awal atau saat pergantian
 * ukuran kotak fisik dalam sistem.
 * 
 * Skenario Penggunaan:
 * - Kalibrasi awal sistem dengan kotak baru
 * - Penyesuaian sensor setelah maintenance hardware
 * - Konfigurasi untuk kotak dengan ukuran berbeda
 * 
 * @async
 * @function updateMaxHeight
 * @param {number} maxHeight - Kapasitas maksimum kotak dalam cm
 * @param {string} [deviceId='ESP32_001'] - ID perangkat ESP32
 * @returns {Promise<Object>} Response object dengan format:
 *   - success: boolean - Status keberhasilan update
 *   - message: string - Pesan konfirmasi jika berhasil  
 *   - error: string - Pesan error jika operasi gagal
 * 
 * @example
 * // Set kapasitas maksimum ke 25cm untuk kotak yang lebih kecil
 * const result = await updateMaxHeight(25, 'ESP32_001');
 * if (result.success) {
 *   console.log('Kapasitas maksimum berhasil diupdate');
 * }
 */
export const updateMaxHeight = async (maxHeight, deviceId = 'ESP32_001') => {
  try {
    // Referensi dokumen untuk update konfigurasi sensor
    const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
    
    // Update kapasitas maksimum untuk kalibrasi sistem
    const updateData = {
      maxHeight: maxHeight,             // Batas maksimum kotak dalam cm
      lastUpdated: serverTimestamp(),  // Timestamp konfigurasi untuk audit
      deviceId: deviceId               // ID ESP32 yang dikonfigurasi
    };
    
    await updateDoc(docRef, updateData);
    
    // Mirror update to original RTDB path
    const rtdbUpdateData = {
      maxHeight: maxHeight,
      lastUpdated: Date.now(),
      deviceId: deviceId
    };
    
    const rtdbRef = ref(realtimeDb, `${RTDB_PATH}/${CAPACITY_DOC_ID}`);
    await update(rtdbRef, rtdbUpdateData);
    
    // Mirror update to sequence path
    await sequenceService.updateByFirebaseId('capacity', CAPACITY_DOC_ID, {
      maxHeight: maxHeight,
      deviceId: deviceId
    });
    
    return {
      success: true,
      message: 'Max height updated successfully'
    };
  } catch (error) {
    console.error('Error updating max height:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subscription real-time untuk monitoring perubahan data sensor kapasitas.
 * 
 * Fungsi ini membuat listener Firebase yang akan memanggil callback setiap kali
 * ESP32 mengirim data sensor baru. Digunakan untuk update UI secara real-time
 * tanpa perlu polling manual.
 * 
 * Alur Real-time Communication:
 * 1. ESP32 membaca sensor ultrasonik setiap X detik
 * 2. Data dikirim ke Firebase melalui WiFi
 * 3. Firebase trigger onSnapshot listener
 * 4. Callback dipanggil dengan data terbaru
 * 5. UI aplikasi mobile update otomatis
 * 
 * @function subscribeToCapacityUpdates
 * @param {Function} callback - Function yang dipanggil saat ada update data
 *   Callback menerima parameter:
 *   - success: boolean - Status keberhasilan
 *   - data: Object - Data sensor terbaru (jika berhasil)
 *   - error: string - Pesan error (jika gagal)
 * @returns {Function} Unsubscribe function untuk menghentikan listener
 * 
 * @example
 * const unsubscribe = subscribeToCapacityUpdates((result) => {
 *   if (result.success) {
 *     const { height, maxHeight } = result.data;
 *     const status = calculateCapacityStatus(height, maxHeight);
 *     console.log('Status kotak:', status.status);
 *     updateUI(status);
 *   }
 * });
 * 
 * // Hentikan subscription saat component unmount
 * // unsubscribe();
 */
export const subscribeToCapacityUpdates = (callback) => {
  // Referensi dokumen sensor untuk real-time listening
  const docRef = doc(db, CAPACITY_COLLECTION, CAPACITY_DOC_ID);
  
  // Setup listener Firebase untuk perubahan data sensor
  return onSnapshot(
    docRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        // Dokumen ditemukan, kirim data sensor ke callback
        callback({
          success: true,
          data: docSnapshot.data()
        });
      } else {
        // Dokumen tidak ada, kirim error ke callback
        callback({
          success: false,
          error: 'Document does not exist'
        });
      }
    },
    (error) => {
      // Error listener, log dan kirim ke callback
      console.error('Error in capacity subscription:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  );
};

/**
 * Kalkulasi status kapasitas kotak berdasarkan data dari ESP32.
 * 
 * Fungsi ini mengkonversi data sensor (ketinggian atau persentase langsung)
 * menjadi status yang mudah dipahami pengguna dengan indikator visual dan pesan.
 * Mendukung dual mode symmetric dengan opsi konversi untuk kedua mode.
 * 
 * Logika Kalkulasi Status:
 * - 90-100%: PENUH (Merah) - Kotak hampir penuh, perlu dikosongkan
 * - 70-89%:  HAMPIR PENUH (Kuning) - Kotak mulai terisi, perhatikan kapasitas
 * - 30-69%:  TERISI SEBAGIAN (Biru) - Kotak tersedia untuk paket baru
 * - 0-29%:   KOSONG (Hijau) - Kotak kosong, siap menerima paket
 * 
 * Mode Operasi Symmetric:
 * - Height Mode: Height dari ESP32 + optional konversi ke percentage
 * - Height Mode + Conversion: Height ESP32 + percentage hasil konversi
 * - Percentage Mode: Percentage dari ESP32 + optional konversi ke height
 * - Percentage Mode + Conversion: Percentage ESP32 + height hasil konversi
 * 
 * @function calculateCapacityStatus
 * @param {number} height - Ketinggian paket terukur dalam cm (optional jika ada percentage)
 * @param {number} [maxHeight=30] - Kapasitas maksimum kotak dalam cm
 * @param {number} [directPercentage] - Persentase langsung dari ESP32 (0-100)
 * @param {boolean} [enableHeightConversion=true] - Aktifkan konversi percentage → height
 * @param {boolean} [enablePercentageConversion=true] - Aktifkan konversi height → percentage
 * @returns {Object} Status object dengan format:
 *   - percentage: number - Persentase kapasitas (0-100)
 *   - height: number - Ketinggian (dari sensor atau hasil konversi)
 *   - calculatedHeight: number - Ketinggian hasil konversi balik (jika ada)
 *   - calculatedPercentage: number - Persentase hasil konversi (jika ada)
 *   - status: string - Status dalam bahasa Indonesia
 *   - message: string - Pesan deskriptif untuk pengguna
 *   - color: string - Kode warna hex untuk indikator visual
 * 
 * @example
 * // Mode Height: Sensor membaca ketinggian 25cm dari kotak 30cm
 * const status1 = calculateCapacityStatus(25, 30, null, true, true);
 * console.log(status1.percentage); // 83.33 (calculated)
 * 
 * // Mode Height tanpa konversi: Hanya tampilkan height
 * const status2 = calculateCapacityStatus(25, 30, null, true, false);
 * console.log(status2.calculatedPercentage); // null
 * 
 * // Mode Percentage: ESP32 mengirim persentase langsung 75%
 * const status3 = calculateCapacityStatus(null, 30, 75, true, true);
 * console.log(status3.calculatedHeight); // 22.5
 * 
 * // Mode Percentage tanpa konversi: Hanya tampilkan percentage
 * const status4 = calculateCapacityStatus(null, 30, 75, false, true);
 * console.log(status4.calculatedHeight); // null
 */
export const calculateCapacityStatus = (height, maxHeight = 30, directPercentage = null, enableHeightConversion = true, enablePercentageConversion = true) => {
  let percentage;
  let actualHeight = height;
  let calculatedHeight = null;
  let calculatedPercentage = null;
  
  // Tentukan persentase berdasarkan mode yang digunakan
  if (directPercentage !== null && directPercentage !== undefined) {
    // Mode Persentase: Gunakan nilai langsung dari ESP32
    percentage = directPercentage;
    
    // Konversi balik ke ketinggian jika diaktifkan
    if (enableHeightConversion) {
      calculatedHeight = (percentage / 100) * maxHeight;
      // Jika tidak ada height asli, gunakan hasil konversi
      if (actualHeight === null || actualHeight === undefined) {
        actualHeight = calculatedHeight;
      }
    }
  } else if (height !== null && height !== undefined) {
    // Mode Ketinggian: Gunakan nilai tinggi dari ESP32
    actualHeight = height;
    
    // Konversi ke persentase jika diaktifkan
    if (enablePercentageConversion) {
      calculatedPercentage = (height / maxHeight) * 100;
      percentage = calculatedPercentage;
    } else {
      // Jika konversi tidak aktif, tetap hitung percentage untuk status tapi tidak ditampilkan
      percentage = (height / maxHeight) * 100;
    }
  } else {
    // Fallback: Default ke 0% jika tidak ada data
    percentage = 0;
    actualHeight = 0;
  }
  
  let status, message, color;
  
  // Logika penentuan status berdasarkan threshold yang telah ditentukan
  if (percentage >= 90) {
    // Status PENUH - Kotak hampir penuh (90-100%)
    status = 'Penuh';
    message = 'Box hampir penuh, segera kosongkan';
    color = '#EF4444'; // Merah - Status kritis
  } else if (percentage >= 70) {
    // Status HAMPIR PENUH - Kotak mulai terisi (70-89%)
    status = 'Hampir Penuh';
    message = 'Box mulai terisi, perhatikan kapasitas';
    color = '#F59E0B'; // Kuning - Status peringatan
  } else if (percentage >= 30) {
    // Status TERISI SEBAGIAN - Kotak masih bisa menampung (30-69%)
    status = 'Terisi Sebagian';
    message = 'Box tersedia untuk paket';
    color = '#3B82F6'; // Biru - Status normal
  } else {
    // Status KOSONG - Kotak kosong atau hampir kosong (0-29%)
    status = 'Kosong';
    message = 'Box kosong, siap menerima paket';
    color = '#22C55E'; // Hijau - Status optimal
  }
  
  return {
    percentage: Math.min(Math.max(percentage, 0), 100), // Clamp antara 0-100% untuk konsistensi UI
    height: actualHeight, // Ketinggian (asli atau hasil konversi)
    calculatedHeight, // Ketinggian hasil konversi balik (null jika tidak ada)
    calculatedPercentage, // Persentase hasil konversi (null jika tidak ada)
    status,
    message,
    color
  };
};
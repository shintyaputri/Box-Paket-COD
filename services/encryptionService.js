/**
 * ENCRYPTION SERVICE - Layanan Enkripsi QR Code Dinamis (React Native Fixed)
 * 
 * Service ini menangani semua operasi enkripsi dan dekripsi untuk QR code dinamis
 * dalam sistem Shintya Package Delivery. Telah dimigrasi dari custom library
 * ke implementasi AES128 dengan react-native-get-random-values untuk fix crypto error.
 * 
 * Features:
 * - Dynamic QR code generation dengan AES-128-CBC encryption
 * - User profile encryption dengan timestamp dan nonce validation
 * - Package data encryption untuk resi tracking
 * - Scanner mode management untuk ESP32 hardware
 * - Comprehensive error handling dengan Indonesian messages
 * - Activity logging untuk audit trail
 * - React Native compatibility dengan polyfill
 * 
 * Security Improvements:
 * - AES-128-CBC encryption (industry standard)
 * - Cryptographically secure random IV generation dengan polyfill
 * - Proper key derivation dengan PBKDF2
 * - Timestamp validation untuk prevent replay attacks
 * - Nonce system untuk guarantee QR uniqueness
 * - Enhanced data integrity validation
 * - Fixed "Native crypto module could not be used" error
 * 
 * @author Shintya Package Delivery System
 * @version 2.1.0 (React Native Get Random Values Fix)
 */

// IMPORTANT: Import polyfill untuk fix crypto module error
import 'react-native-get-random-values';

import { AESFixedInstances } from './aesEncryptionServiceFixed.js';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, set, onValue, off } from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { logActivity } from './activityService';

// AES Fixed Encryption instances untuk different use cases (React Native compatible)
const { userQR: userQREncryption, packageQR: packageEncryption, adminQR: adminEncryption } = AESFixedInstances;

// Feature flag untuk gradual migration (set to true untuk full AES)
const USE_AES_ENCRYPTION = true;

/**
 * Encrypt user profile data untuk QR code generation
 * 
 * Generates dynamic QR code yang selalu berbeda setiap kali dipanggil,
 * meskipun user data sama. QR code berisi user email, timestamp, dan
 * metadata lain untuk validation di ESP32.
 * 
 * @param {Object} userProfile - User profile object dari AuthContext
 * @returns {Object} Result object dengan encrypted QR dan metadata
 * 
 * @example
 * const result = await encryptUserProfile({
 *   email: "user@gmail.com",
 *   nama: "John Doe",
 *   role: "user"
 * });
 * console.log(result.qrCode); // Encrypted string untuk QR
 */
export const encryptUserProfile = async (userProfile) => {
  try {
    if (!userProfile || !userProfile.email) {
      throw new Error('User profile atau email tidak valid');
    }

    // Check Firebase initialization
    if (!db) {
      throw new Error('Firebase Firestore belum diinisialisasi');
    }
    
    // Prepare data untuk encryption - email only
    const userData = {
      email: userProfile.email
    };
    
    // Select encryption instance berdasarkan role
    const encryptionInstance = userProfile.role === 'admin' ? adminEncryption : userQREncryption;
    
    // Encrypt data dengan AES (synchronous)
    const encrypted = encryptionInstance.encrypt(userData);
    
    // Generate metadata untuk tracking
    const metadata = {
      generatedAt: Date.now(),
      userEmail: userProfile.email,
      userRole: userProfile.role,
      qrType: "user_profile",
      encryptionType: "AES128",
      encryptionVersion: encryptionInstance.getVersion(),
      algorithm: encryptionInstance.getAlgorithmInfo()
    };
    
    // Skip activity logging untuk QR dinamis - tidak perlu masuk aktivitas
    // QR Code generation is frequent and dynamic, no need to log in activities
    
    return {
      success: true,
      qrCode: encrypted,
      metadata,
      displayData: {
        email: userProfile.email,
        nama: userProfile.nama,
        role: userProfile.role === 'admin' ? 'Administrator' : 'Pengguna',
        generatedAt: new Date(metadata.generatedAt).toLocaleString('id-ID')
      }
    };
    
  } catch (error) {
    console.error('Error encrypting user profile:', error);
    return {
      success: false,
      error: `Gagal membuat QR Code: ${error.message}`,
      qrCode: null,
      metadata: null
    };
  }
};

/**
 * Encrypt package data untuk resi tracking QR
 * 
 * @param {Object} packageData - Package data object
 * @returns {Object} Result object dengan encrypted QR
 */
export const encryptPackageData = async (packageData) => {
  try {
    if (!packageData || !packageData.noResi) {
      throw new Error('Data paket atau nomor resi tidak valid');
    }
    
    // Prepare package data untuk encryption
    const resiData = {
      noResi: packageData.noResi,
      nama: packageData.nama,
      status: packageData.status,
      type: "package_tracking",
      isCod: packageData.isCod || false,
      nomorLoker: packageData.nomorLoker || null
    };
    
    // Encrypt data dengan AES (synchronous)
    const encrypted = packageEncryption.encrypt(resiData);
    
    // Generate metadata
    const metadata = {
      generatedAt: Date.now(),
      packageId: packageData.id,
      noResi: packageData.noResi,
      qrType: "package_tracking",
      encryptionType: "AES128",
      encryptionVersion: packageEncryption.getVersion()
    };
    
    return {
      success: true,
      qrCode: encrypted,
      metadata,
      displayData: {
        noResi: packageData.noResi,
        nama: packageData.nama,
        status: packageData.status,
        generatedAt: new Date(metadata.generatedAt).toLocaleString('id-ID')
      }
    };
    
  } catch (error) {
    console.error('Error encrypting package data:', error);
    return {
      success: false,
      error: `Gagal membuat QR Code paket: ${error.message}`,
      qrCode: null,
      metadata: null
    };
  }
};

/**
 * Decrypt QR code data (untuk testing atau verification)
 * 
 * @param {string} encryptedQR - Encrypted QR string
 * @param {string} qrType - Type of QR ("user_profile" atau "package_tracking")
 * @returns {Object} Decrypted data object
 */
export const decryptQRCode = async (encryptedQR, qrType = "user_profile") => {
  try {
    if (!encryptedQR || encryptedQR.length === 0) {
      throw new Error('QR Code tidak valid');
    }
    
    // Select encryption instance berdasarkan type
    let encryptionInstance;
    switch (qrType) {
      case "user_profile":
        encryptionInstance = userQREncryption;
        break;
      case "package_tracking":
        encryptionInstance = packageEncryption;
        break;
      case "admin":
        encryptionInstance = adminEncryption;
        break;
      default:
        throw new Error('Tipe QR Code tidak valid');
    }
    
    // Decrypt data dengan AES
    const decrypted = encryptionInstance.decrypt(encryptedQR);
    
    return {
      success: true,
      data: decrypted,
      encryptionType: "AES128",
      qrType,
      decryptedAt: Date.now()
    };
    
  } catch (error) {
    console.error('Error decrypting QR code:', error);
    return {
      success: false,
      error: `Gagal decrypt QR Code: ${error.message}`,
      data: null
    };
  }
};

/**
 * Validate QR code tanpa full decryption
 * 
 * @param {string} encryptedQR - Encrypted QR string untuk validation
 * @returns {boolean} True jika QR valid
 */
export const validateQRCode = (encryptedQR) => {
  try {
    if (!encryptedQR || encryptedQR.length === 0) {
      return false;
    }
    
    // Check AES format (IV:EncryptedData)
    if (encryptedQR.includes(':')) {
      // Try dengan user encryption first
      if (userQREncryption.isValidEncryptedData(encryptedQR)) {
        return true;
      }
      
      // Try dengan package encryption
      if (packageEncryption.isValidEncryptedData(encryptedQR)) {
        return true;
      }
      
      // Try dengan admin encryption
      if (adminEncryption.isValidEncryptedData(encryptedQR)) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Error validating QR code:', error);
    return false;
  }
};

// ==================== SCANNER MODE MANAGEMENT ====================

/**
 * Set ESP32 scanner mode
 * 
 * Mengatur mode scanning ESP32 antara "resi" (package tracking) dan 
 * "user_qr" (user profile) untuk context-aware processing.
 * 
 * @param {string} mode - Scanner mode ("resi" atau "user_qr")
 * @param {string} userId - User ID yang initiating mode change
 * @param {number} durationMs - Duration mode dalam milliseconds (default: 5 minutes)
 * @returns {Object} Result object
 */
export const setScannerMode = async (mode, userId, durationMs = 300000) => {
  try {
    // Check Firebase Realtime Database initialization
    if (!realtimeDb) {
      throw new Error('Firebase Realtime Database belum diinisialisasi');
    }

    const validModes = ['resi', 'user_qr', 'idle'];
    
    if (!validModes.includes(mode)) {
      throw new Error('Mode scanner tidak valid');
    }
    
    const scannerModeData = {
      mode,
      isActive: mode !== 'idle',
      initiatedBy: userId,
      startTime: Date.now(),
      expiresAt: Date.now() + durationMs,
      lastUpdated: Date.now()
    };
    
    // Update di Firebase Realtime Database untuk ESP32
    await set(ref(realtimeDb, 'scannerMode'), scannerModeData);
    
    // Log activity
    await logActivity({
      userId,
      type: 'scanner_mode_changed',
      message: `Mode scanner diubah ke: ${mode}`,
      metadata: {
        mode,
        expiresAt: scannerModeData.expiresAt,
        durationMs
      }
    });
    
    return {
      success: true,
      mode,
      expiresAt: scannerModeData.expiresAt,
      message: `Mode scanner berhasil diubah ke: ${mode}`
    };
    
  } catch (error) {
    console.error('Error setting scanner mode:', error);
    return {
      success: false,
      error: `Gagal mengubah mode scanner: ${error.message}`
    };
  }
};

/**
 * Get current scanner mode dari ESP32
 * 
 * @returns {Promise<Object>} Current scanner mode data
 */
export const getScannerMode = async () => {
  try {
    // Check Firebase Realtime Database initialization
    if (!realtimeDb) {
      throw new Error('Firebase Realtime Database belum diinisialisasi');
    }

    const snapshot = await new Promise((resolve, reject) => {
      const modeRef = ref(realtimeDb, 'scannerMode');
      onValue(modeRef, (snapshot) => {
        resolve(snapshot);
      }, (error) => {
        reject(error);
      }, { onlyOnce: true });
    });
    
    if (snapshot.exists()) {
      const modeData = snapshot.val();
      
      // Check jika mode sudah expired
      if (modeData.expiresAt && Date.now() > modeData.expiresAt) {
        // Auto-reset ke idle jika expired
        await setScannerMode('idle', 'system', 0);
        return {
          success: true,
          mode: 'idle',
          isActive: false,
          expired: true
        };
      }
      
      return {
        success: true,
        ...modeData,
        expired: false
      };
    } else {
      // Default idle mode jika belum ada data
      return {
        success: true,
        mode: 'idle',
        isActive: false,
        expired: false
      };
    }
    
  } catch (error) {
    console.error('Error getting scanner mode:', error);
    return {
      success: false,
      error: `Gagal mendapatkan mode scanner: ${error.message}`
    };
  }
};

/**
 * Subscribe to scanner mode changes
 * 
 * @param {Function} callback - Callback function untuk mode changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeScannerMode = (callback) => {
  // Check Firebase Realtime Database initialization
  if (!realtimeDb) {
    callback({
      success: false,
      error: 'Firebase Realtime Database belum diinisialisasi'
    });
    return () => {}; // Return empty unsubscribe function
  }

  const modeRef = ref(realtimeDb, 'scannerMode');
  
  const unsubscribe = onValue(modeRef, (snapshot) => {
    try {
      if (snapshot.exists()) {
        const modeData = snapshot.val();
        
        // Check expired
        if (modeData.expiresAt && Date.now() > modeData.expiresAt) {
          callback({
            success: true,
            mode: 'idle',
            isActive: false,
            expired: true
          });
        } else {
          callback({
            success: true,
            ...modeData,
            expired: false
          });
        }
      } else {
        callback({
          success: true,
          mode: 'idle',
          isActive: false,
          expired: false
        });
      }
    } catch (error) {
      callback({
        success: false,
        error: error.message
      });
    }
  });
  
  return () => off(modeRef, 'value', unsubscribe);
};

// ==================== QR GENERATION STATISTICS ====================

/**
 * Track QR generation statistics
 * 
 * @param {string} userId - User ID
 * @param {string} qrType - Type of QR generated
 * @returns {Object} Statistics object
 */
export const trackQRGeneration = async (userId, qrType) => {
  try {
    const statsRef = doc(db, 'qrStatistics', userId);
    const statsSnapshot = await getDoc(statsRef);
    
    let stats = {
      userId,
      totalGenerated: 0,
      userProfileQR: 0,
      packageQR: 0,
      lastGenerated: null,
      createdAt: Date.now()
    };
    
    if (statsSnapshot.exists()) {
      stats = { ...stats, ...statsSnapshot.data() };
    }
    
    // Update statistics
    stats.totalGenerated += 1;
    stats.lastGenerated = Date.now();
    
    if (qrType === 'user_profile') {
      stats.userProfileQR = (stats.userProfileQR || 0) + 1;
    } else if (qrType === 'package_tracking') {
      stats.packageQR = (stats.packageQR || 0) + 1;
    }
    
    // Save ke Firestore
    await setDoc(statsRef, stats, { merge: true });
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error('Error tracking QR generation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get QR generation statistics untuk user
 * 
 * @param {string} userId - User ID
 * @returns {Object} Statistics object
 */
export const getQRStatistics = async (userId) => {
  try {
    const statsRef = doc(db, 'qrStatistics', userId);
    const snapshot = await getDoc(statsRef);
    
    if (snapshot.exists()) {
      return {
        success: true,
        stats: snapshot.data()
      };
    } else {
      return {
        success: true,
        stats: {
          userId,
          totalGenerated: 0,
          userProfileQR: 0,
          packageQR: 0,
          lastGenerated: null
        }
      };
    }
    
  } catch (error) {
    console.error('Error getting QR statistics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get encryption library info
 * 
 * @returns {Object} Library information
 */
export const getEncryptionInfo = () => {
  return {
    userQR: {
      version: userQREncryption.getVersion(),
      algorithm: userQREncryption.getAlgorithmInfo()
    },
    packageQR: {
      version: packageEncryption.getVersion(),
      algorithm: packageEncryption.getAlgorithmInfo()
    },
    adminQR: {
      version: adminEncryption.getVersion(),
      algorithm: adminEncryption.getAlgorithmInfo()
    }
  };
};

/**
 * Generate sample QR untuk testing
 * 
 * @param {string} type - Type of sample QR
 * @returns {Object} Sample QR data
 */
export const generateSampleQR = async (type = "user_profile") => {
  try {
    const sampleData = {
      user_profile: {
        email: "sample@shintya.com"
      },
      package_tracking: {
        noResi: "SH240001234",
        nama: "John Doe",
        status: "Telah Tiba",
        type: "package_tracking",
        isCod: false
      }
    };
    
    if (!sampleData[type]) {
      throw new Error('Invalid sample type');
    }
    
    const encryptionInstance = type === "user_profile" ? userQREncryption : packageEncryption;
    const encrypted = encryptionInstance.encrypt(sampleData[type]);
    
    return {
      success: true,
      qrCode: encrypted,
      sampleData: sampleData[type],
      encryptionType: "AES128",
      type
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
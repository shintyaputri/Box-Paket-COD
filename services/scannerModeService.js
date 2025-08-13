/**
 * SCANNER MODE SERVICE - Layanan Manajemen Mode Scanner ESP32
 * 
 * Service ini menangani real-time management mode scanner ESP32 untuk
 * context-aware QR code processing dalam sistem Shintya Package Delivery.
 * 
 * Features:
 * - Real-time mode switching (resi, user_qr, idle)
 * - Automatic mode expiration dengan timeout management
 * - Scanner status monitoring dan health checks
 * - Firebase Realtime Database integration untuk ESP32 communication
 * - Activity logging untuk audit trail
 * - Mode conflict resolution dan priority management
 * 
 * Scanner Modes:
 * - "resi": Scan mode untuk package tracking QR codes
 * - "user_qr": Scan mode untuk encrypted user profile QR codes
 * - "idle": Default standby mode, tidak ada scanning aktif
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { ref, set, get, onValue, off, update } from 'firebase/database';
import { doc, setDoc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { realtimeDb, db } from './firebase';
import { logActivity } from './activityService';
import { sequenceService } from './sequenceService';

// Scanner mode constants
export const SCANNER_MODES = {
  IDLE: 'idle',
  RESI: 'resi',
  USER_QR: 'user_qr'
};

// Default mode duration (5 minutes)
const DEFAULT_MODE_DURATION = 300000; // 5 minutes in milliseconds

// RTDB paths for dual mirroring
const RTDB_PATH = 'original/scannerMode';
const HISTORY_COLLECTION = 'scannerModeHistory';

/**
 * Set ESP32 scanner mode dengan validation dan expiration
 * 
 * @param {string} mode - Scanner mode (idle, resi, user_qr)
 * @param {string} userId - User ID yang initiating mode change
 * @param {number} durationMs - Duration mode dalam milliseconds
 * @param {string} reason - Reason untuk mode change (optional)
 * @returns {Promise<Object>} Result object
 */
export const setScannerMode = async (mode, userId, durationMs = DEFAULT_MODE_DURATION, reason = '') => {
  try {
    // Validate mode
    const validModes = Object.values(SCANNER_MODES);
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid scanner mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
    }

    // Validate user ID
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Validate duration
    if (durationMs < 0 || durationMs > 3600000) { // Max 1 hour
      throw new Error('Duration must be between 0 and 3600000ms (1 hour)');
    }

    const now = Date.now();
    const expiresAt = mode === SCANNER_MODES.IDLE ? null : now + durationMs;

    // Create scanner mode data
    const scannerModeData = {
      mode,
      isActive: mode !== SCANNER_MODES.IDLE,
      initiatedBy: userId,
      startTime: now,
      expiresAt,
      lastUpdated: now,
      reason: reason || `Mode changed to ${mode}`,
      version: '1.0.0'
    };

    // Update di Firebase Realtime Database untuk ESP32
    const scannerModeRef = ref(realtimeDb, 'scannerMode');
    await set(scannerModeRef, scannerModeData);
    
    // Mirror to original RTDB path untuk dual mirroring
    const rtdbData = {
      ...scannerModeData,
      firestoreId: 'scanner_mode_doc'
    };
    
    const originalRtdbRef = ref(realtimeDb, `${RTDB_PATH}/scanner_mode_doc`);
    await set(originalRtdbRef, rtdbData);
    
    // Mirror to sequence path (for consistency with other services)
    await sequenceService.addWithSequentialId('scannerMode', 'scanner_mode_doc', scannerModeData);

    // Log ke history untuk tracking
    await _logModeChange(userId, mode, reason, durationMs);

    // Log activity untuk audit
    await logActivity({
      userId,
      type: 'scanner_mode_changed',
      message: `Mode scanner ESP32 diubah ke: ${mode}${reason ? ` (${reason})` : ''}`,
      metadata: {
        mode,
        previousMode: await _getPreviousMode(),
        expiresAt,
        durationMs,
        reason
      }
    });

    return {
      success: true,
      mode,
      expiresAt,
      durationMs,
      message: `Scanner mode berhasil diubah ke: ${mode}`,
      scannerModeData
    };

  } catch (error) {
    console.error('Error setting scanner mode:', error);
    return {
      success: false,
      error: `Gagal mengubah mode scanner: ${error.message}`,
      mode: null
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
    const scannerModeRef = ref(realtimeDb, 'scannerMode');
    const snapshot = await get(scannerModeRef);

    if (snapshot.exists()) {
      const modeData = snapshot.val();
      
      // Check jika mode sudah expired
      if (modeData.expiresAt && Date.now() > modeData.expiresAt) {
        // Auto-reset ke idle jika expired
        await setScannerMode(SCANNER_MODES.IDLE, 'system', 0, 'Auto-expired');
        
        return {
          success: true,
          mode: SCANNER_MODES.IDLE,
          isActive: false,
          expired: true,
          expiredAt: modeData.expiresAt,
          previousMode: modeData.mode
        };
      }

      return {
        success: true,
        ...modeData,
        expired: false,
        timeRemaining: modeData.expiresAt ? Math.max(0, modeData.expiresAt - Date.now()) : null
      };
      
    } else {
      // Default idle mode jika belum ada data
      return {
        success: true,
        mode: SCANNER_MODES.IDLE,
        isActive: false,
        expired: false,
        timeRemaining: null,
        initiatedBy: null,
        startTime: null
      };
    }

  } catch (error) {
    console.error('Error getting scanner mode:', error);
    return {
      success: false,
      error: `Gagal mendapatkan mode scanner: ${error.message}`,
      mode: null
    };
  }
};

/**
 * Subscribe to real-time scanner mode changes
 * 
 * @param {Function} callback - Callback function untuk mode changes
 * @param {Object} options - Options untuk subscription
 * @returns {Function} Unsubscribe function
 */
export const subscribeScannerMode = (callback, options = {}) => {
  const { 
    includeExpiredCheck = true,
    autoResetExpired = true 
  } = options;

  const scannerModeRef = ref(realtimeDb, 'scannerMode');
  
  const handleModeChange = async (snapshot) => {
    try {
      if (snapshot.exists()) {
        const modeData = snapshot.val();
        
        // Check expired jika enabled
        if (includeExpiredCheck && modeData.expiresAt && Date.now() > modeData.expiresAt) {
          if (autoResetExpired) {
            // Auto-reset ke idle
            await setScannerMode(SCANNER_MODES.IDLE, 'system', 0, 'Auto-expired from subscription');
          }
          
          callback({
            success: true,
            mode: SCANNER_MODES.IDLE,
            isActive: false,
            expired: true,
            expiredAt: modeData.expiresAt,
            previousMode: modeData.mode
          });
        } else {
          callback({
            success: true,
            ...modeData,
            expired: false,
            timeRemaining: modeData.expiresAt ? Math.max(0, modeData.expiresAt - Date.now()) : null
          });
        }
      } else {
        callback({
          success: true,
          mode: SCANNER_MODES.IDLE,
          isActive: false,
          expired: false,
          timeRemaining: null
        });
      }
    } catch (error) {
      callback({
        success: false,
        error: error.message
      });
    }
  };

  // Setup listener
  onValue(scannerModeRef, handleModeChange);
  
  // Return unsubscribe function
  return () => off(scannerModeRef, 'value', handleModeChange);
};

/**
 * Force reset scanner mode ke idle
 * 
 * @param {string} userId - User ID yang melakukan reset
 * @param {string} reason - Reason untuk reset
 * @returns {Promise<Object>} Result object
 */
export const resetScannerMode = async (userId, reason = 'Manual reset') => {
  try {
    const result = await setScannerMode(SCANNER_MODES.IDLE, userId, 0, reason);
    
    if (result.success) {
      return {
        success: true,
        message: 'Scanner mode berhasil di-reset ke idle',
        previousMode: result.scannerModeData?.mode
      };
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('Error resetting scanner mode:', error);
    return {
      success: false,
      error: `Gagal reset scanner mode: ${error.message}`
    };
  }
};

/**
 * Extend current mode duration
 * 
 * @param {string} userId - User ID yang melakukan extend
 * @param {number} additionalMs - Additional time dalam milliseconds
 * @returns {Promise<Object>} Result object
 */
export const extendScannerMode = async (userId, additionalMs) => {
  try {
    const currentMode = await getScannerMode();
    
    if (!currentMode.success) {
      throw new Error('Gagal mendapatkan mode scanner saat ini');
    }

    if (currentMode.mode === SCANNER_MODES.IDLE) {
      throw new Error('Tidak bisa extend mode idle');
    }

    if (!currentMode.expiresAt) {
      throw new Error('Mode tidak memiliki expiration time');
    }

    // Calculate new expiration time
    const newExpiresAt = currentMode.expiresAt + additionalMs;
    const updateData = {
      expiresAt: newExpiresAt,
      lastUpdated: Date.now(),
      extendedBy: userId,
      extendedAt: Date.now(),
      extendedDuration: additionalMs
    };
    
    const scannerModeRef = ref(realtimeDb, 'scannerMode');
    await update(scannerModeRef, updateData);
    
    // Mirror update to original RTDB path
    const originalRtdbRef = ref(realtimeDb, `${RTDB_PATH}/scanner_mode_doc`);
    await update(originalRtdbRef, updateData);
    
    // Mirror update to sequence path
    await sequenceService.updateByFirebaseId('scannerMode', 'scanner_mode_doc', updateData);

    // Log activity
    await logActivity({
      userId,
      type: 'scanner_mode_extended',
      message: `Mode scanner ${currentMode.mode} diperpanjang ${additionalMs}ms`,
      metadata: {
        mode: currentMode.mode,
        additionalMs,
        newExpiresAt,
        previousExpiresAt: currentMode.expiresAt
      }
    });

    return {
      success: true,
      mode: currentMode.mode,
      newExpiresAt,
      additionalMs,
      message: `Mode ${currentMode.mode} berhasil diperpanjang`
    };

  } catch (error) {
    console.error('Error extending scanner mode:', error);
    return {
      success: false,
      error: `Gagal memperpanjang mode: ${error.message}`
    };
  }
};

/**
 * Get scanner mode history
 * 
 * @param {number} limit - Limit jumlah records (default: 10)
 * @returns {Promise<Object>} History data
 */
export const getScannerModeHistory = async (limit = 10) => {
  try {
    // Implementation akan depend on how we store history
    // Untuk sekarang, return empty array
    return {
      success: true,
      history: [],
      total: 0
    };

  } catch (error) {
    console.error('Error getting scanner mode history:', error);
    return {
      success: false,
      error: error.message,
      history: []
    };
  }
};

/**
 * Get scanner mode statistics
 * 
 * @param {string} timeframe - Timeframe untuk statistics ('day', 'week', 'month')
 * @returns {Promise<Object>} Statistics data
 */
export const getScannerModeStatistics = async (timeframe = 'day') => {
  try {
    // Basic implementation - bisa diperluas
    const stats = {
      totalModeChanges: 0,
      modeDistribution: {
        [SCANNER_MODES.IDLE]: 0,
        [SCANNER_MODES.RESI]: 0,
        [SCANNER_MODES.USER_QR]: 0
      },
      averageDuration: 0,
      mostUsedMode: SCANNER_MODES.IDLE,
      timeframe
    };

    return {
      success: true,
      statistics: stats
    };

  } catch (error) {
    console.error('Error getting scanner mode statistics:', error);
    return {
      success: false,
      error: error.message,
      statistics: null
    };
  }
};

// ==================== PRIVATE HELPER FUNCTIONS ====================

/**
 * Log mode change ke history collection
 * 
 * @private
 * @param {string} userId - User ID
 * @param {string} mode - New mode
 * @param {string} reason - Reason
 * @param {number} durationMs - Duration
 */
const _logModeChange = async (userId, mode, reason, durationMs) => {
  try {
    const historyData = {
      userId,
      mode,
      reason,
      durationMs,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    // Save to Firestore
    const historyRef = collection(db, HISTORY_COLLECTION);
    const docRef = await addDoc(historyRef, historyData);
    
    // Mirror to original RTDB path
    const rtdbData = {
      ...historyData,
      firestoreId: docRef.id
    };
    
    const rtdbRef = ref(realtimeDb, `original/${HISTORY_COLLECTION}/${docRef.id}`);
    await set(rtdbRef, rtdbData);
    
    // Mirror to sequence path
    await sequenceService.addWithSequentialId(HISTORY_COLLECTION, docRef.id, historyData);
    
  } catch (error) {
    console.error('Error logging mode change:', error);
    // Don't throw error, ini optional logging
  }
};

/**
 * Get previous mode untuk logging
 * 
 * @private
 * @returns {Promise<string>} Previous mode
 */
const _getPreviousMode = async () => {
  try {
    const currentMode = await getScannerMode();
    return currentMode.success ? currentMode.mode : SCANNER_MODES.IDLE;
  } catch (error) {
    return SCANNER_MODES.IDLE;
  }
};

// Export scanner mode constants
export { SCANNER_MODES as default };
/**
 * PACKAGE STATUS MANAGER - Sistem Caching dan Optimasi Status Paket
 * 
 * Class singleton yang mengelola caching, throttling, dan optimasi
 * untuk operasi package status dalam aplikasi. Dirancang untuk
 * mengurangi API calls ke Firebase dan meningkatkan performa.
 * 
 * Fitur Utama:
 * - Smart caching dengan TTL (Time To Live)
 * - Request throttling untuk mencegah spam API calls
 * - Background sync optimization
 * - Real-time status monitoring dan notification
 * - Memory management dengan automatic cleanup
 * - Listener pattern untuk event-driven updates
 * 
 * Throttling Settings:
 * - Per User: 5 menit (untuk menghindari excessive calls)
 * - Per Page: 2 menit (untuk page navigation)
 * - Background Resume: 30 menit (untuk app state changes)
 * 
 * Cache Management:
 * - In-memory caching dengan Map structure
 * - TTL-based cache invalidation
 * - Automatic cleanup untuk memory efficiency
 * - Cache key generation berdasarkan tipe dan user ID
 * 
 * Event System:
 * - Listener registration untuk UI updates
 * - Event notification untuk status changes
 * - Package overdue/upcoming detection
 * - App state change handling
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserPackageHistory } from './userPackageService';
import { getActiveTimeline } from './timelineService';

/**
 * PackageStatusManager Class - Singleton untuk manajemen status paket
 * 
 * Mengelola caching, throttling, dan optimasi operasi status paket
 * dengan focus pada performance dan user experience.
 */
class PackageStatusManager {
  /**
   * Constructor - Inisialisasi PackageStatusManager
   * 
   * Mengatur semua property yang diperlukan untuk caching,
   * throttling, dan event management.
   */
  constructor() {
    // In-memory cache untuk menyimpan data sementara
    this.cache = new Map();
    
    // Tracking waktu update terakhir untuk setiap key
    this.lastUpdateTimes = new Map();
    
    // Set untuk tracking operasi update yang sedang berjalan
    this.isUpdating = new Set();
    
    // Konfigurasi throttling dalam milliseconds
    this.throttleSettings = {
      perUser: 5 * 60 * 1000,        // 5 menit per user
      perPage: 2 * 60 * 1000,        // 2 menit per page
      backgroundResume: 30 * 60 * 1000  // 30 menit untuk background resume
    };
    
    // Timestamp saat app masuk background
    this.backgroundTime = null;
    
    // Set listeners untuk event notifications
    this.listeners = new Set();
  }

  /**
   * Menambahkan listener untuk event notifications
   * 
   * @param {Function} callback - Fungsi yang akan dipanggil saat ada event
   * @param {string} callback.type - Tipe event (user_package_updated, packages_overdue, dll)
   * @param {Object} callback.data - Data yang terkait dengan event
   * @returns {Function} Unsubscribe function untuk menghapus listener
   * 
   * Event Types:
   * - user_package_updated: Status paket user diupdate
   * - packages_overdue: Ada paket yang overdue
   * - packages_upcoming: Ada paket yang akan datang
   */
  addListener(callback) {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => this.listeners.delete(callback);
  }

  /**
   * Mengirim notifikasi ke semua registered listeners
   * 
   * @param {string} type - Tipe event yang terjadi
   * @param {Object} data - Data yang terkait dengan event
   * 
   * Error Handling:
   * - Try-catch untuk setiap listener
   * - Log error tanpa mengganggu listener lain
   * - Graceful degradation jika listener error
   */
  notifyListeners(type, data) {
    this.listeners.forEach(callback => {
      try {
        callback(type, data);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Generate cache key berdasarkan tipe dan user ID
   * 
   * @param {string} type - Tipe data yang akan di-cache
   * @param {string|null} userId - User ID (opsional)
   * @returns {string} Cache key yang unik
   * 
   * Format Cache Key:
   * - Dengan user: "user_packages_userID123"
   * - Tanpa user: "global_packages"
   */
  getCacheKey(type, userId = null) {
    return userId ? `${type}_${userId}` : type;
  }

  /**
   * Mengambil data dari cache dengan validasi TTL
   * 
   * @param {string} key - Cache key yang akan diambil
   * @returns {Object|null} Data dari cache atau null jika expired/tidak ada
   * 
   * TTL Validation:
   * - Cek timestamp cache vs waktu sekarang
   * - Return null jika data sudah expired
   * - Error handling untuk cache corruption
   */
  async getFromCache(key) {
    try {
      const cached = this.cache.get(key);
      // Validasi cache masih valid berdasarkan TTL
      if (cached && Date.now() - cached.timestamp < this.throttleSettings.perPage) {
        return cached.data;
      }
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Menyimpan data ke cache dengan timestamp
   * 
   * @param {string} key - Cache key untuk menyimpan data
   * @param {Object} data - Data yang akan disimpan
   * 
   * Cache Structure:
   * {
   *   data: Object,     // Data actual yang disimpan
   *   timestamp: number // Timestamp untuk TTL validation
   * }
   */
  setCache(key, data) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now()  // Timestamp saat ini untuk TTL
      });
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  /**
   * Mengecek apakah update harus di-skip karena throttling
   * 
   * @param {string} type - Tipe operasi yang akan dilakukan
   * @param {string|null} userId - User ID (opsional)
   * @returns {boolean} True jika update harus di-skip
   * 
   * Throttling Logic:
   * - Cek waktu update terakhir
   * - Skip jika belum melewati threshold (5 menit)
   * - Allow jika belum pernah update atau sudah melewati threshold
   */
  shouldSkipUpdate(type, userId = null) {
    const key = this.getCacheKey(type, userId);
    const lastUpdate = this.lastUpdateTimes.get(key);
    
    // Jika belum pernah update, allow
    if (!lastUpdate) return false;
    
    // Hitung selisih waktu sejak update terakhir
    const timeSinceUpdate = Date.now() - lastUpdate;
    
    // Skip jika masih dalam threshold throttling
    return timeSinceUpdate < this.throttleSettings.perUser;
  }

  /**
   * Menandai waktu update terakhir untuk throttling
   * 
   * @param {string} type - Tipe operasi yang baru selesai
   * @param {string|null} userId - User ID (opsional)
   * 
   * Digunakan setelah operasi update berhasil untuk
   * mencegah operasi serupa dalam waktu dekat.
   */
  markUpdateTime(type, userId = null) {
    const key = this.getCacheKey(type, userId);
    this.lastUpdateTimes.set(key, Date.now());
  }

  /**
   * Update status paket untuk user tertentu dengan optimasi caching
   * 
   * Fungsi utama untuk mengupdate status paket user dengan
   * intelligent caching, throttling, dan event notifications.
   * 
   * @param {string} userId - Firebase Auth UID user
   * @param {boolean} forceUpdate - Skip throttling dan force update
   * @param {string} source - Sumber update (manual, login, app_resume, dll)
   * @returns {Promise<Object>} Result dengan status dan data paket
   * 
   * Flow Execution:
   * 1. Validasi user ID
   * 2. Cek throttling (skip jika forceUpdate false)
   * 3. Cek duplicate operation (prevent race condition)
   * 4. Fetch data dari userPackageService
   * 5. Update cache dan mark timestamp
   * 6. Notify listeners dengan event
   * 7. Analisis overdue/upcoming packages
   * 8. Return result dengan metadata
   * 
   * Caching Strategy:
   * - Return cached data jika masih valid dan tidak force update
   * - Cache hasil baru setelah successful fetch
   * - TTL-based cache validation
   * 
   * Event Notifications:
   * - user_package_updated: Setiap kali data diupdate
   * - packages_overdue: Jika ada paket overdue
   * - packages_upcoming: Jika ada paket akan datang
   */
  async updateUserPackageStatus(userId, forceUpdate = false, source = 'manual') {
    // Validasi input parameter
    if (!userId) return { success: false, error: 'User ID required' };

    const key = this.getCacheKey('user_packages', userId);
    
    // Cek throttling jika bukan force update
    if (!forceUpdate && this.shouldSkipUpdate('user_packages', userId)) {
      console.log(`Skipping user package update for ${userId} due to throttling`);
      
      // Return cached data jika tersedia
      const cached = await this.getFromCache(key);
      if (cached) return { success: true, data: cached, fromCache: true };
    }

    // Prevent race condition - cek apakah update sedang berjalan
    if (this.isUpdating.has(key)) {
      console.log(`Update already in progress for ${userId}`);
      return { success: false, error: 'Update in progress' };
    }

    try {
      // Mark bahwa update sedang berjalan
      this.isUpdating.add(key);
      console.log(`Updating package status for user ${userId} (source: ${source})`);

      // Fetch data terbaru dari service
      const result = await getUserPackageHistory(userId);
      
      if (result.success) {
        // Cache hasil yang berhasil
        this.setCache(key, result);
        this.markUpdateTime('user_packages', userId);
        
        // Notify listeners tentang update
        this.notifyListeners('user_package_updated', {
          userId,
          data: result,
          source
        });

        // Analisis paket overdue dan upcoming
        const overduePackages = this.checkForOverduePackages(result.packages || []);
        const upcomingPackages = this.checkForUpcomingPackages(result.packages || []);
        
        // Notify jika ada paket overdue
        if (overduePackages.length > 0) {
          this.notifyListeners('packages_overdue', {
            userId,
            packages: overduePackages,
            count: overduePackages.length
          });
        }

        // Notify jika ada paket upcoming
        if (upcomingPackages.length > 0) {
          this.notifyListeners('packages_upcoming', {
            userId,
            packages: upcomingPackages,
            count: upcomingPackages.length
          });
        }

        return { success: true, data: result, source };
      }

      // Return result as-is jika tidak success
      return result;
    } catch (error) {
      console.error('Error updating user package status:', error);
      return { success: false, error: error.message };
    } finally {
      // Cleanup - hapus dari isUpdating set
      this.isUpdating.delete(key);
    }
  }

  /**
   * Update status paket untuk semua user (DEPRECATED)
   * 
   * Fungsi ini telah dihapus karena alasan performa dan keamanan.
   * Admin functionality tidak lagi tersedia di sistem ini.
   * 
   * @returns {Promise<Object>} Result dengan error message
   * @deprecated Admin functionality telah dihapus dari sistem
   * 
   * Alasan Penghapusan:
   * - Beban berlebih pada Firebase (quota dan performance)
   * - Potensi race condition dengan multiple users
   * - Admin scope terlalu luas untuk user app
   * - Security concern untuk bulk operations
   * 
   * Alternatif:
   * - Gunakan updateUserPackageStatus() untuk specific user
   * - Implementasi background job di server-side
   * - Cloud Functions untuk bulk operations
   */
  async updateAllUsersPackageStatus() {
    return { success: false, error: 'Admin functionality has been removed' };
  }

  /**
   * Mengecek paket yang overdue (lewat batas waktu)
   * 
   * @param {Array} packages - Array data paket yang akan dicek
   * @returns {Array} Array paket yang overdue
   * 
   * Kriteria Overdue:
   * - Status paket: 'returned' (sudah dikembalikan)
   * - Paket yang melewati batas waktu pengambilan
   * 
   * Kegunaan:
   * - Notifikasi user tentang paket yang terlewat
   * - Dashboard monitoring untuk admin
   * - Analisis pattern user behavior
   */
  checkForOverduePackages(packages) {
    return packages.filter(packageData => packageData.status === 'returned');
  }

  /**
   * Mengecek paket yang akan datang dalam 3 hari ke depan
   * 
   * @param {Array} packages - Array data paket yang akan dicek
   * @returns {Array} Array paket yang akan datang
   * 
   * Kriteria Upcoming:
   * - Status paket: 'pending' (masih dalam perjalanan)
   * - Delivery date dalam 3 hari ke depan
   * - Delivery date tidak boleh di masa lalu
   * 
   * Kegunaan:
   * - Notifikasi user untuk persiapan penerimaan
   * - Planning capacity loker
   * - User reminder system
   */
  checkForUpcomingPackages(packages) {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    return packages.filter(packageData => {
      // Hanya paket dengan status pending
      if (packageData.status !== 'pending') return false;
      
      const deliveryDate = new Date(packageData.deliveryDate);
      // Delivery date dalam rentang 3 hari ke depan
      return deliveryDate <= threeDaysFromNow && deliveryDate > now;
    });
  }

  /**
   * Handle perubahan state aplikasi (foreground/background)
   * 
   * Mengoptimalkan refresh data saat app kembali aktif setelah
   * lama di background untuk memastikan data tetap fresh.
   * 
   * @param {string} nextAppState - State baru app ('active'/'background')
   * @param {string|null} userId - User ID untuk update specific user
   * 
   * Logic:
   * - Saat app background: simpan timestamp
   * - Saat app active: cek berapa lama di background
   * - Jika > 30 menit: trigger update otomatis
   * - Skip jika background time singkat
   * 
   * Background Resume Threshold: 30 menit
   * Alasan: Data paket mungkin berubah saat user tidak aktif
   */
  async handleAppStateChange(nextAppState, userId = null) {
    if (nextAppState === 'active') {
      const now = Date.now();
      const timeSinceBackground = this.backgroundTime ? now - this.backgroundTime : 0;
      
      // Update jika app di background lebih dari 30 menit
      if (timeSinceBackground > this.throttleSettings.backgroundResume) {
        console.log('App resumed after long background, updating package status');
        
        if (userId) {
          // Update untuk user tertentu
          await this.updateUserPackageStatus(userId, false, 'app_resume');
        } else {
          // Note: updateAllUsersPackageStatus sudah deprecated
          await this.updateAllUsersPackageStatus(false, 'app_resume');
        }
      }
    } else if (nextAppState === 'background') {
      // Simpan timestamp saat app masuk background
      this.backgroundTime = Date.now();
    }
  }

  /**
   * Handle user login event
   * 
   * Trigger update paksan saat user login untuk memastikan
   * data paket terbaru tersedia di session baru.
   * 
   * @param {string} userId - Firebase Auth UID user yang login
   * @returns {Promise<Object>} Result dari update operation
   * 
   * Fitur:
   * - Force update (skip throttling)
   * - Source tracking untuk debugging
   * - Prioritas tinggi untuk user experience
   */
  async handleUserLogin(userId) {
    console.log('User logged in, updating package status');
    // Force update saat login (skip throttling)
    return await this.updateUserPackageStatus(userId, true, 'login');
  }

  /**
   * Handle page navigation event
   * 
   * Trigger update data saat user navigasi ke halaman
   * yang berkaitan dengan paket untuk memastikan data fresh.
   * 
   * @param {string} page - Nama halaman yang dikunjungi
   * @param {string|null} userId - User ID untuk update specific user
   * @returns {Promise<Object>} Result dari update operation
   * 
   * Package Pages:
   * - Halaman yang mengandung kata 'package', 'resi', atau 'status'
   * - Dashboard dengan statistik paket
   * - List resi, detail paket, dll
   * 
   * Optimization:
   * - Hanya update untuk halaman relevan
   * - Skip untuk halaman non-package
   * - Respect throttling settings
   */
  async handlePageNavigation(page, userId = null) {
    // Deteksi apakah halaman berkaitan dengan paket
    const isPackagePage = page.includes('package') || page.includes('resi') || page.includes('status');
    
    if (isPackagePage) {
      console.log(`Navigated to package page: ${page}`);
      
      if (userId) {
        // Update untuk user tertentu
        return await this.updateUserPackageStatus(userId, false, 'page_navigation');
      } else {
        // Note: updateAllUsersPackageStatus sudah deprecated
        return await this.updateAllUsersPackageStatus(false, 'page_navigation');
      }
    }
    
    // Skip update untuk halaman non-package
    return { success: true, skipped: true };
  }

  /**
   * Menghapus cache untuk user tertentu
   * 
   * Membersihkan semua cache dan timestamp yang berkaitan
   * dengan user tertentu untuk force refresh.
   * 
   * @param {string} userId - User ID yang cache-nya akan dihapus
   * 
   * Kegunaan:
   * - User logout (cleanup session)
   * - Force refresh data user
   * - Memory cleanup
   * - Development/debugging
   */
  async clearUserCache(userId) {
    if (userId) {
      const userKey = this.getCacheKey('user_packages', userId);
      // Hapus data cache
      this.cache.delete(userKey);
      // Hapus timestamp update terakhir
      this.lastUpdateTimes.delete(userKey);
    }
  }

  /**
   * Menghapus semua cache dan reset state manager
   * 
   * Membersihkan seluruh cache, timestamp, dan operation flags
   * untuk reset total sistem caching.
   * 
   * Kegunaan:
   * - App restart/reset
   * - Memory management
   * - Development/debugging
   * - Emergency cleanup
   * 
   * PERINGATAN: Operasi ini akan memaksa semua request
   * berikutnya untuk fetch dari server.
   */
  clearAllCache() {
    this.cache.clear();           // Hapus semua cached data
    this.lastUpdateTimes.clear(); // Hapus semua timestamp
    this.isUpdating.clear();      // Reset operation flags
  }

  /**
   * Mengambil informasi debug untuk monitoring dan troubleshooting
   * 
   * @returns {Object} Debug information object
   * @returns {number} returns.cacheSize - Jumlah item dalam cache
   * @returns {Object} returns.lastUpdateTimes - Timestamp update terakhir per key
   * @returns {Array} returns.isUpdating - List operasi yang sedang berjalan
   * @returns {Object} returns.throttleSettings - Konfigurasi throttling
   * 
   * Kegunaan:
   * - Development debugging
   * - Performance monitoring
   * - Cache analysis
   * - Troubleshooting throttling issues
   */
  getDebugInfo() {
    return {
      cacheSize: this.cache.size,                                    // Ukuran cache saat ini
      lastUpdateTimes: Object.fromEntries(this.lastUpdateTimes),     // Timestamp per key
      isUpdating: Array.from(this.isUpdating),                      // Operasi berjalan
      throttleSettings: this.throttleSettings                       // Konfigurasi throttling
    };
  }
}

/**
 * Singleton instance dari PackageStatusManager
 * 
 * Export instance tunggal yang digunakan di seluruh aplikasi
 * untuk memastikan konsistensi cache dan state management.
 * 
 * Penggunaan:
 * ```javascript
 * import { packageStatusManager } from './services/packageStatusManager';
 * 
 * // Update status paket user
 * const result = await packageStatusManager.updateUserPackageStatus(userId);
 * 
 * // Listen untuk updates
 * const unsubscribe = packageStatusManager.addListener((type, data) => {
 *   if (type === 'user_package_updated') {
 *     // Handle update
 *   }
 * });
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 * 
 * Singleton Pattern Benefits:
 * - Shared cache across components
 * - Consistent throttling behavior
 * - Single source of truth untuk package status
 * - Memory efficiency
 */
export const packageStatusManager = new PackageStatusManager();
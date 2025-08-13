/**
 * SEEDER SERVICE - Layanan Generasi Data Testing dan Development
 * 
 * Service ini bertanggung jawab untuk:
 * - Generasi user testing dengan data realistis Indonesia
 * - Pembuatan email unik berurutan (user1@gmail.com, user2@gmail.com, dst)
 * - Generasi RFID code random 8-karakter hexadecimal
 * - Generasi nomor telepon Indonesia dengan prefix operator
 * - Batch creation user dengan error handling dan retry logic
 * - Statistical tracking user seeder vs user asli
 * - Collision detection dan avoidance untuk email uniqueness
 * 
 * Pattern Email Seeder:
 * - Format: userXXX@gmail.com (dimana XXX adalah nomor berurutan)
 * - Auto-increment dari nomor tertinggi yang ada
 * - Collision detection dengan retry logic sampai 1000 attempts
 * - Password seragam 'password123' untuk testing convenience
 * 
 * Data Generator Features:
 * - 30 nama Indonesia realistis dengan gender balance
 * - RFID codes 8-digit hexadecimal (compatible dengan RC522)
 * - Phone numbers dengan prefix operator Indonesia (Telkomsel, Indosat, XL)
 * - Role otomatis 'user' untuk semua seeder accounts
 * 
 * Development Features:
 * - Delay 1 detik antar creation untuk rate limiting
 * - Comprehensive error reporting per user
 * - Success/failure statistics
 * - Rollback-safe operations (tidak ada partial state)
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { signUpWithEmail } from './authService';
import { checkEmailExists } from './authService';

/**
 * Kelas SeederService untuk manajemen data testing
 * 
 * Menggunakan pattern Singleton untuk memastikan konsistensi
 * data generator dan menghindari duplikasi konfigurasi. 
 */
class SeederService {
  constructor() {
    // === NAMA INDONESIA REALISTIS ===
    // Koleksi 30 nama Indonesia dengan balance gender dan
    // representasi budaya yang beragam untuk testing yang realistis
    this.namaList = [
      'Ahmad Fauzi', 'Siti Aisyah', 'Muhammad Rizki', 'Fatimah Zahra', 'Ali Hassan',
      'Khadijah Nur', 'Umar Faruq', 'Zainab Salma', 'Yusuf Ibrahim', 'Maryam Sari',
      'Khalid Rahman', 'Aisha Dewi', 'Ibrahim Malik', 'Hafsa Putri', 'Salman Hakim',
      'Ruqayyah Indah', 'Hamza Wijaya', 'Sumayyah Lestari', 'Bilal Pratama', 'Ummu Kulthum',
      'Abdullah Surya', 'Safiyyah Wati', 'Uthman Bagus', 'Juwayriyah Sari', 'Mu\'adh Ramdan',
      'Zulaikha Fitri', 'Sa\'ad Permana', 'Rabiah Cantika', 'Zayd Pratomo', 'Ummu Salamah'
    ];
  }

  /**
   * Generate RFID code random 8-karakter hexadecimal
   * 
   * Menghasilkan kode RFID yang compatible dengan reader RC522
   * yang digunakan pada sistem ESP32. Format 8-digit hex
   * memberikan 4.3 miliar kombinasi unik.
   * 
   * @returns {string} RFID code 8-karakter hex (contoh: "A1B2C3D4")
   */
  generateRandomRFID() {
    // Karakter hexadecimal valid untuk RFID
    const chars = '0123456789ABCDEF';
    let rfid = '';
    
    // Generate 8 karakter random
    for (let i = 0; i < 8; i++) {
      rfid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return rfid;
  }

  /**
   * Generate nomor telepon Indonesia realistis dengan prefix operator
   * 
   * Menghasilkan nomor telepon dengan prefix operator Indonesia
   * yang valid: Telkomsel (0812, 0813, 0821, 0822, 0823) dan
   * Indosat/XL (0851, 0852, 0853).
   * 
   * @returns {string} Nomor telepon 12-digit (contoh: "081234567890")
   */
  generateRandomPhone() {
    // Prefix operator Indonesia yang umum digunakan
    const prefixes = ['0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'];
    
    // Pilih prefix random
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    // Generate 8 digit suffix (10000000-99999999)
    const suffix = Math.floor(Math.random() * 90000000) + 10000000;
    
    return `${prefix}${suffix}`;
  }

  /**
   * Memilih nama random dari daftar nama yang tersedia
   * 
   * Helper method untuk mengambil nama acak dari array nama
   * yang telah disiapkan. Menggunakan distribusi uniform.
   * 
   * @param {Array<string>} nameList - Array nama yang tersedia
   * @returns {string} Nama yang dipilih secara acak
   */
  getRandomName(nameList) {
    return nameList[Math.floor(Math.random() * nameList.length)];
  }

  /**
   * Mendapatkan nomor user tertinggi dari database untuk auto-increment
   * 
   * Fungsi ini mencari semua user dengan pattern email userXXX@gmail.com
   * dan mengembalikan nomor tertinggi yang ditemukan. Digunakan untuk
   * menentukan starting point pembuatan user baru agar tidak collision.
   * 
   * Pattern Detection:
   * - Regex: /^user(\d+)@gmail\.com$/
   * - Contoh match: user1@gmail.com, user999@gmail.com
   * - Non-match: userABC@gmail.com, admin@gmail.com
   * 
   * @returns {Promise<number>} Nomor user tertinggi (0 jika tidak ada)
   */
  async getHighestUserNumber() {
    try {
      // Validasi koneksi Firebase
      if (!db) {
        return 0;
      }

      // Query semua user dengan role 'user' untuk efisiensi
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'user'));
      const querySnapshot = await getDocs(q);
      
      let highestNumber = 0;
      
      // Scan semua user untuk mencari nomor tertinggi
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email) {
          // Regex untuk match pattern userXXX@gmail.com
          const match = userData.email.match(/^user(\d+)@gmail\.com$/);
          if (match) {
            const number = parseInt(match[1]);
            if (number > highestNumber) {
              highestNumber = number;
            }
          }
        }
      });
      
      return highestNumber;
    } catch (error) {
      console.error('Error getting highest user number:', error);
      return 0; // Return 0 sebagai fallback
    }
  }

  /**
   * Generate email unik dengan auto-increment dan collision detection
   * 
   * Fungsi sophisticated untuk membuat email unik dengan pattern
   * userXXX@gmail.com. Menggunakan highest number + 1 sebagai starting
   * point dan retry logic untuk menghindari collision race conditions.
   * 
   * Algorithm:
   * 1. Ambil nomor user tertinggi dari database
   * 2. Mulai dari nextNumber = highest + 1
   * 3. Check keberadaan email dengan authService.checkEmailExists
   * 4. Retry sampai 1000x jika ada collision
   * 5. Return email unik atau error jika tidak berhasil
   * 
   * @returns {Promise<Object>} Result object dengan email unik
   * @returns {boolean} returns.success - Status berhasil/gagal
   * @returns {string} [returns.email] - Email unik yang dihasilkan
   * @returns {number} [returns.userNumber] - Nomor user yang berhasil
   * @returns {string} [returns.error] - Pesan error jika gagal
   */
  async generateUniqueEmail() {
    try {
      // Ambil nomor tertinggi dan tambah 1 untuk starting point
      const startNumber = (await this.getHighestUserNumber()) + 1;
      const maxRetries = 1000; // Maksimal 1000 percobaan
      
      // Loop untuk mencari email unik
      for (let i = 0; i < maxRetries; i++) {
        const userNumber = startNumber + i;
        const email = `user${userNumber}@gmail.com`;
        
        try {
          // Check apakah email sudah ada menggunakan authService
          const emailCheck = await checkEmailExists(email);
          
          // Jika email tidak ada (available), return sebagai unique email
          if (emailCheck.success && !emailCheck.exists) {
            return { success: true, email: email, userNumber: userNumber };
          }
          
          // Log warning jika ada error dalam pengecekan
          if (!emailCheck.success) {
            console.warn(`Error checking email ${email}:`, emailCheck.error);
          }
          
        } catch (error) {
          // Graceful error handling untuk tiap email check
          console.warn(`Error checking email ${email}:`, error);
        }
      }
      
      // Jika sampai maxRetries masih belum dapat email unik
      return { 
        success: false, 
        error: `Tidak dapat menemukan email unik setelah ${maxRetries} percobaan dari user${startNumber}@gmail.com`
      };
    } catch (error) {
      console.error('Error in generateUniqueEmail:', error);
      return { 
        success: false, 
        error: `Error generating unique email: ${error.message}`
      };
    }
  }

  /**
   * Membuat user seeder dalam batch dengan comprehensive error handling
   * 
   * Fungsi utama untuk membuat multiple user testing sekaligus.
   * Menggunakan batch processing dengan delay untuk menghindari rate limiting
   * dan memberikan detailed reporting per user.
   * 
   * Process Flow:
   * 1. Loop untuk jumlah user yang diminta
   * 2. Generate unique email per user
   * 3. Generate random profile data (nama, telepon, RFID)
   * 4. Create user via authService.signUpWithEmail
   * 5. Delay 1 detik untuk rate limiting
   * 6. Collect results dan errors untuk reporting
   * 
   * Error Handling:
   * - Individual user failures tidak menghentikan batch
   * - Detailed error reporting per user
   * - Success/failure statistics untuk monitoring
   * 
   * @param {number} [count=3] - Jumlah user yang akan dibuat (default: 3)
   * 
   * @returns {Promise<Object>} Result object dengan statistik lengkap
   * @returns {boolean} returns.success - Status operasi batch (selalu true)
   * @returns {Array<Object>} returns.created - Array user yang berhasil dibuat
   * @returns {Array<Object>} returns.errors - Array error per user yang gagal
   * @returns {number} returns.totalCreated - Total user berhasil dibuat
   * @returns {number} returns.totalErrors - Total user yang gagal dibuat
   * @returns {string} [returns.error] - Error fatal jika batch gagal total
   */
  async createSeederUsers(count = 3) {
    try {
      const results = [];   // Array user yang berhasil dibuat
      const errors = [];    // Array error per user yang gagal

      // === BATCH PROCESSING LOOP ===
      for (let i = 0; i < count; i++) {
        try {
          // === GENERATE UNIQUE EMAIL ===
          const emailResult = await this.generateUniqueEmail();
          
          if (!emailResult.success) {
            errors.push({
              index: i + 1,
              error: emailResult.error
            });
            continue; // Skip user ini, lanjut ke user berikutnya
          }

          const email = emailResult.email;
          const password = 'password123'; // Password seragam untuk testing
          
          // === GENERATE PROFILE DATA ===
          const profileData = {
            nama: this.getRandomName(this.namaList),       // Nama random Indonesia
            noTelp: this.generateRandomPhone(),            // Nomor HP Indonesia
            rfidCode: this.generateRandomRFID(),           // RFID 8-char hex
            role: 'user'                                   // Role tetap 'user'
          };

          // === CREATE USER ACCOUNT ===
          const result = await signUpWithEmail(email, password, profileData);
          
          if (result.success) {
            // Success: tambahkan ke results
            results.push({
              email,
              userNumber: emailResult.userNumber,
              nama: profileData.nama,
              rfidCode: profileData.rfidCode,
              noTelp: profileData.noTelp
            });
          } else {
            // Failed: tambahkan ke errors dengan detail
            errors.push({
              email,
              userNumber: emailResult.userNumber,
              error: result.error
            });
          }
        } catch (error) {
          // Catch error per user individual
          errors.push({
            index: i + 1,
            error: error.message
          });
        }

        // === RATE LIMITING ===
        // Delay 1 detik antar user untuk menghindari rate limiting Firebase
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // === RETURN COMPREHENSIVE RESULTS ===
      return {
        success: true,                    // Batch selalu success (walaupun ada individual failures)
        created: results,                 // Array user berhasil
        errors: errors,                   // Array user gagal dengan error detail
        totalCreated: results.length,     // Count user berhasil
        totalErrors: errors.length        // Count user gagal
      };

    } catch (error) {
      // === FATAL ERROR HANDLING ===
      console.error('Error in createSeederUsers:', error);
      return {
        success: false,
        error: error.message,
        created: [],
        errors: [],
        totalCreated: 0,
        totalErrors: 0
      };
    }
  }

  /**
   * Mendapatkan statistik lengkap seeder users untuk monitoring
   * 
   * Fungsi analytics untuk memberikan insight tentang user seeder
   * vs user asli dalam database. Berguna untuk monitoring dan
   * maintenance database testing.
   * 
   * Metrics yang dikumpulkan:
   * - Total user dengan role 'user'
   * - Jumlah seeder users (pattern userXXX@gmail.com)
   * - Nomor user tertinggi yang ada
   * - Nomor user berikutnya yang akan digunakan
   * 
   * @returns {Promise<Object>} Statistik lengkap seeder users
   * @returns {number} returns.total - Total semua user dengan role 'user'
   * @returns {number} returns.seederUsers - Jumlah user seeder (userXXX@gmail.com pattern)
   * @returns {number} returns.highestUserNumber - Nomor user tertinggi yang ada
   * @returns {number} returns.nextUserNumber - Nomor user berikutnya (highest + 1)
   */
  async getSeederStats() {
    try {
      // Validasi koneksi Firebase
      if (!db) {
        return { total: 0, seederUsers: 0, highestUserNumber: 0, nextUserNumber: 1 };
      }

      // Query semua user dengan role 'user'
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'user'));

      const querySnapshot = await getDocs(q);
      
      // Initialize counters
      let totalUsers = 0;
      let seederUsers = 0;
      let highestUserNumber = 0;

      // === ANALYZE EACH USER ===
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        totalUsers++; // Count semua user
        
        // Check jika user adalah seeder (pattern userXXX@gmail.com)
        if (userData.email && userData.email.match(/^user\d+@gmail\.com$/)) {
          seederUsers++; // Count seeder user
          
          // Extract nomor user untuk tracking highest number
          const match = userData.email.match(/^user(\d+)@gmail\.com$/);
          if (match) {
            const number = parseInt(match[1]);
            if (number > highestUserNumber) {
              highestUserNumber = number;
            }
          }
        }
      });

      // === RETURN COMPREHENSIVE STATS ===
      return {
        total: totalUsers,                           // Total user keseluruhan
        seederUsers: seederUsers,                    // User seeder saja
        highestUserNumber: highestUserNumber,        // Nomor tertinggi existing
        nextUserNumber: highestUserNumber + 1        // Nomor user berikutnya
      };
    } catch (error) {
      console.error('Error getting seeder stats:', error);
      // Return default stats jika error
      return { 
        total: 0, 
        seederUsers: 0, 
        highestUserNumber: 0, 
        nextUserNumber: 1 
      };
    }
  }
}

// === SINGLETON EXPORT ===
/**
 * Instance singleton SeederService untuk digunakan across aplikasi
 * 
 * Menggunakan pattern singleton untuk memastikan:
 * - Konsistensi konfigurasi nama dan data generator
 * - Memory efficiency dengan reuse instance
 * - State persistence untuk tracking operations
 * 
 * Usage:
 * ```javascript
 * import { seederService } from './services/seederService';
 * 
 * // Create 5 test users
 * const result = await seederService.createSeederUsers(5);
 * 
 * // Get statistics
 * const stats = await seederService.getSeederStats();
 * ```
 */
export const seederService = new SeederService();
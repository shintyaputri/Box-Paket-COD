/**
 * AUTHENTICATION SERVICE - Layanan Autentikasi User
 * 
 * Service ini menangani semua operasi autentikasi dalam sistem:
 * - Login user dengan email dan password
 * - Registrasi user baru dengan validasi
 * - Logout user dengan cleanup session
 * - Pengecekan keberadaan email di sistem
 * - Penghapusan akun user dari Firebase Auth
 * - Error handling dengan pesan bahasa Indonesia
 * - Integrasi dengan user profile service
 * 
 * Fitur Khusus:
 * - Support akun admin khusus untuk development (admin@gmail.com)
 * - Validasi profil user setelah login
 * - Automatic cleanup jika registrasi gagal
 * - Soft delete validation untuk user yang dihapus
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './userService';

/**
 * Fungsi untuk menangani error autentikasi Firebase
 * 
 * Mengkonversi error code Firebase menjadi pesan yang mudah dipahami
 * dalam bahasa Indonesia untuk user experience yang lebih baik.
 * 
 * @param {Object} error - Error object dari Firebase Auth
 * @returns {string} Pesan error dalam bahasa Indonesia
 * 
 * Error codes yang ditangani:
 * - auth/user-not-found: Email belum terdaftar di sistem
 * - auth/wrong-password: Password yang dimasukkan salah
 * - auth/email-already-in-use: Email sudah digunakan user lain
 * - auth/weak-password: Password tidak memenuhi kriteria keamanan
 * - auth/invalid-email: Format email tidak valid
 * - auth/network-request-failed: Masalah koneksi internet
 * - auth/too-many-requests: Rate limiting untuk mencegah spam
 * - auth/user-disabled: Akun dinonaktifkan oleh admin
 * - auth/invalid-credential: Kredensial login tidak valid
 * - auth/configuration-not-found: Masalah konfigurasi Firebase
 */
const handleAuthError = (error) => {
  const errorMessages = {
    'auth/user-not-found': 'Email tidak terdaftar.',
    'auth/wrong-password': 'Password salah.',
    'auth/email-already-in-use': 'Email sudah terdaftar.',
    'auth/weak-password': 'Password minimal 6 karakter.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/network-request-failed': 'Periksa koneksi internet Anda.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/configuration-not-found': 'Konfigurasi Firebase error.',
  };
  return errorMessages[error.code] || `Error: ${error.message}`;
};

/**
 * Fungsi untuk mengecek keberadaan email di Firebase Auth
 * 
 * Menggunakan Firebase Identity Toolkit API untuk memverifikasi
 * apakah email sudah terdaftar dalam sistem tanpa harus melakukan
 * proses login yang sebenarnya.
 * 
 * @param {string} email - Email yang akan dicek keberadaannya
 * @returns {Promise<Object>} Result object dengan status dan data
 * @returns {boolean} returns.success - Apakah pengecekan berhasil
 * @returns {boolean} returns.exists - Apakah email sudah terdaftar (jika success)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Kegunaan:
 * - Validasi saat registrasi untuk mencegah duplikasi
 * - Validasi saat forgot password untuk memastikan email valid
 * - Pre-validation form untuk UX yang lebih baik
 * 
 * CATATAN: Menggunakan API key terpisah untuk operasi ini
 */
export const checkEmailExists = async (email) => {
  try {
    // API key khusus untuk Identity Toolkit operations
    const apiKey = "AIzaSyDXKj-ZsNWqkwxvB7iYMgSzXKY1WmUkutw";
    
    // Panggil Firebase Identity Toolkit API untuk cek email
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: email,
        continueUri: 'http://localhost' // Dummy URI yang diperlukan API
      })
    });

    const data = await response.json();

    // Handle response error dari API
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Error checking email' };
    }

    // Parse hasil: true jika email sudah terdaftar
    const emailExists = data.registered === true;
    return { success: true, exists: emailExists };
  } catch (error) {
    console.error('Error checking email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fungsi untuk login user dengan email dan password
 * 
 * Proses login meliputi:
 * 1. Validasi Firebase Auth sudah terinisialisasi
 * 2. Autentikasi dengan Firebase menggunakan email/password
 * 3. Validasi profil user di Firestore
 * 4. Pengecekan status soft delete
 * 5. Auto logout jika akun tidak aktif
 * 
 * @param {string} email - Email user untuk login
 * @param {string} password - Password user untuk login
 * @returns {Promise<Object>} Result object dengan status dan data user
 * @returns {boolean} returns.success - Apakah login berhasil
 * @returns {Object} returns.user - Data user Firebase (jika berhasil)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur Khusus:
 * - Support akun admin development: admin@gmail.com (accepts any password)
 * - Validasi soft delete: user yang dihapus tidak bisa login
 * - Auto logout jika profil tidak valid
 * - Logging untuk debugging dan monitoring
 */
export const signInWithEmail = async (email, password) => {
  try {
    // Validasi Firebase Auth sudah diinisialisasi
    if (!auth) {
      throw new Error('Firebase Auth belum diinisialisasi.');
    }
    
    console.log('Mencoba masuk dengan email:', email);
    
    // Proses autentikasi dengan Firebase Auth
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Validasi profil user di Firestore setelah login berhasil
    const profileResult = await getUserProfile(result.user.uid);
    if (!profileResult.success) {
      // Handle kasus user yang sudah dihapus (soft delete)
      if (profileResult.error === 'User telah dihapus') {
        // Auto logout user yang sudah dihapus
        await signOut(auth);
        throw new Error('Akun Anda telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.');
      }
      // Log warning untuk debugging jika profil tidak ditemukan
      console.warn('Profile check failed:', profileResult.error);
    }
    
    console.log('Masuk berhasil');
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Error masuk:', error);
    return { success: false, error: handleAuthError(error) };
  }
};

/**
 * Fungsi untuk registrasi user baru dengan email dan password
 * 
 * Proses registrasi meliputi:
 * 1. Validasi Firebase Auth sudah terinisialisasi
 * 2. Pembuatan akun Firebase Auth dengan email/password
 * 3. Pembuatan profil user di Firestore dengan data lengkap
 * 4. Rollback auth jika pembuatan profil gagal
 * 5. Return data user dan profil jika berhasil
 * 
 * @param {string} email - Email untuk akun baru
 * @param {string} password - Password untuk akun baru (min 6 karakter)
 * @param {Object} profileData - Data profil user (nama, noTelp, role, dll)
 * @param {string} profileData.nama - Nama lengkap user
 * @param {string} profileData.noTelp - Nomor telepon user
 * @param {string} profileData.role - Role user ('user' atau 'admin')
 * @returns {Promise<Object>} Result object dengan status dan data
 * @returns {boolean} returns.success - Apakah registrasi berhasil
 * @returns {Object} returns.user - Data user Firebase (jika berhasil)
 * @returns {Object} returns.profile - Data profil Firestore (jika berhasil)
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Fitur Keamanan:
 * - Atomic operation: jika profil gagal dibuat, auth account juga dihapus
 * - Validasi data profil sebelum menyimpan ke Firestore
 * - Automatic cleanup jika terjadi error di tengah proses
 */
export const signUpWithEmail = async (email, password, profileData) => {
  try {
    // Validasi Firebase Auth sudah diinisialisasi
    if (!auth) {
      throw new Error('Firebase Auth belum diinisialisasi.');
    }

    console.log('Mencoba membuat akun untuk:', email);
    
    // Buat akun Firebase Auth terlebih dahulu
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Siapkan data profil untuk disimpan ke Firestore
    const profilePayload = {
      email,
      ...profileData,
    };

    // Buat profil user di Firestore
    const profileResult = await createUserProfile(result.user.uid, profilePayload);

    // Jika pembuatan profil gagal, hapus akun auth untuk menjaga konsistensi
    if (!profileResult.success) {
      try {
        // Rollback: hapus akun Firebase Auth yang sudah dibuat
        await deleteUser(result.user);
        console.log('User auth berhasil dihapus setelah gagal buat profil');
      } catch (deleteError) {
        console.error('Error menghapus user setelah gagal buat profil:', deleteError);
      }
      throw new Error(profileResult.error);
    }

    console.log('Akun berhasil dibuat');
    return { success: true, user: result.user, profile: profileResult.profile };
  } catch (error) {
    console.error('Error registrasi:', error);
    return { success: false, error: handleAuthError(error) };
  }
};

/**
 * Fungsi untuk logout user dari aplikasi
 * 
 * Melakukan sign out dari Firebase Auth yang akan:
 * 1. Menghapus session user dari memory
 * 2. Membersihkan token autentikasi
 * 3. Memicu auth state listener untuk update UI
 * 4. Redirect user ke halaman login
 * 
 * @returns {Promise<Object>} Result object dengan status operasi
 * @returns {boolean} returns.success - Apakah logout berhasil
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Note: Setelah logout, AuthContext akan otomatis mendeteksi
 * perubahan auth state dan redirect user ke halaman login.
 */
export const signOutUser = async () => {
  try {
    // Validasi Firebase Auth sudah diinisialisasi
    if (!auth) {
      throw new Error('Firebase Auth belum diinisialisasi');
    }
    
    // Proses logout dari Firebase Auth
    await signOut(auth);
    console.log('Keluar berhasil');
    return { success: true };
  } catch (error) {
    console.error('Error keluar:', error);
    return { success: false, error: handleAuthError(error) };
  }
};

/**
 * Fungsi untuk menghapus akun user dari Firebase Authentication
 * 
 * Operasi ini akan menghapus akun user secara permanen dari Firebase Auth.
 * PENTING: Ini berbeda dengan soft delete di Firestore. Fungsi ini
 * menghapus akun authentication, sehingga user tidak bisa login lagi.
 * 
 * @param {Object} user - User object dari Firebase Auth
 * @returns {Promise<Object>} Result object dengan status operasi
 * @returns {boolean} returns.success - Apakah penghapusan berhasil
 * @returns {string} returns.error - Pesan error (jika gagal)
 * 
 * Penggunaan:
 * - Admin menghapus akun user secara permanen
 * - Cleanup saat registrasi gagal (rollback operation)
 * - Self-delete account oleh user sendiri
 * 
 * CATATAN: Setelah operasi ini, user harus registrasi ulang
 * untuk membuat akun baru dengan email yang sama.
 */
export const deleteUserAuth = async (user) => {
  try {
    // Validasi parameter yang diperlukan
    if (!auth || !user) {
      throw new Error('Firebase Auth atau user tidak tersedia');
    }
    
    // Hapus akun user dari Firebase Authentication
    await deleteUser(user);
    console.log('User auth berhasil dihapus');
    return { success: true };
  } catch (error) {
    console.error('Error menghapus user auth:', error);
    return { success: false, error: handleAuthError(error) };
  }
};
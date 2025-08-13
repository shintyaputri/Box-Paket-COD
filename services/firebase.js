/**
 * FIREBASE SERVICE - Konfigurasi dan Inisialisasi Firebase
 * 
 * File ini bertanggung jawab untuk:
 * - Konfigurasi Firebase SDK dengan credentials project
 * - Inisialisasi Firebase Authentication dengan persistensi data
 * - Inisialisasi Firestore database untuk data storage
 * - Error handling untuk kasus inisialisasi yang gagal
 * - Ekspor instance Firebase untuk digunakan service lain
 * 
 * Firebase Project: alien-outrider-453003-g8
 * Struktur Aplikasi: React Native + Expo dengan Firebase v9 SDK
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Konfigurasi Firebase untuk proyek Shintya Package Delivery System
 * 
 * Berisi semua credentials dan endpoint yang diperlukan untuk:
 * - Firebase Authentication (login/register pengguna)
 * - Firestore Database (penyimpanan data paket dan user)
 * - Firebase Storage (untuk file upload jika diperlukan)
 * - Analytics dan monitoring sistem
 * 
 * PENTING: Dalam production, credentials ini sebaiknya menggunakan
 * environment variables untuk keamanan yang lebih baik.
 */
const firebaseConfig = {
  apiKey: "AIzaSyA5Lsxqplxa4eQ9H8Zap3e95R_-SFGe2yU",
  authDomain: "alien-outrider-453003-g8.firebaseapp.com",
  databaseURL: "https://alien-outrider-453003-g8-default-rtdb.firebaseio.com",
  projectId: "alien-outrider-453003-g8",
  storageBucket: "alien-outrider-453003-g8.firebasestorage.app",
  messagingSenderId: "398044917472",
  appId: "1:398044917472:web:4ec00f19fafe5523442a85",
  measurementId: "G-J6BPHF1V0Z"
};

// Instance global Firebase untuk digunakan di seluruh aplikasi
let app;        // Firebase App instance utama
let auth;       // Firebase Authentication instance
let db;         // Firestore Database instance
let realtimeDb; // Firebase Realtime Database instance

/**
 * Inisialisasi Firebase dengan error handling yang robust
 * 
 * Proses inisialisasi meliputi:
 * 1. Pengecekan apakah Firebase sudah diinisialisasi sebelumnya
 * 2. Inisialisasi Firebase App dengan konfigurasi yang telah ditetapkan
 * 3. Setup Firebase Auth dengan persistensi menggunakan AsyncStorage
 * 4. Inisialisasi Firestore database
 * 5. Error handling untuk setiap langkah dengan fallback yang aman
 */
try {
  // Cek apakah Firebase sudah diinisialisasi untuk menghindari duplikasi
  if (getApps().length === 0) {
    // Inisialisasi Firebase App baru dengan konfigurasi
    app = initializeApp(firebaseConfig);
  } else {
    // Gunakan instance Firebase yang sudah ada
    app = getApps()[0];
  }

  /**
   * Inisialisasi Firebase Authentication dengan persistensi
   * 
   * Menggunakan AsyncStorage untuk menyimpan session user secara lokal
   * sehingga user tidak perlu login ulang setiap kali buka aplikasi.
   */
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } catch (error) {
    // Handle kasus dimana Auth sudah diinisialisasi sebelumnya
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      console.warn('Auth initialization error:', error);
      // Fallback ke getAuth standar jika inisialisasi khusus gagal
      auth = getAuth(app);
    }
  }

  /**
   * Inisialisasi Firestore Database
   * 
   * Database utama untuk menyimpan:
   * - Data user dan profile
   * - Data paket dan resi
   * - Aktivitas sistem
   * - Konfigurasi RFID dan loker
   */
  try {
    db = getFirestore(app);
  } catch (error) {
    console.error('Firestore initialization error:', error);
    // Set null jika Firestore gagal diinisialisasi
    db = null;
  }

  /**
   * Inisialisasi Firebase Realtime Database
   * 
   * Database real-time untuk komunikasi dengan ESP32:
   * - Scanner mode management
   * - Hardware status monitoring
   * - Real-time control commands
   */
  try {
    realtimeDb = getDatabase(app);
  } catch (error) {
    console.error('Realtime Database initialization error:', error);
    // Set null jika Realtime Database gagal diinisialisasi
    realtimeDb = null;
  }
} catch (error) {
  // Fallback global jika seluruh proses inisialisasi gagal
  console.error('Firebase initialization error:', error);
  app = null;
  auth = null;
  db = null;
  realtimeDb = null;
}

/**
 * Export instance Firebase untuk digunakan di service lain
 * 
 * @exports {Object} auth - Firebase Authentication instance
 * @exports {Object} db - Firestore Database instance  
 * @exports {Object} realtimeDb - Firebase Realtime Database instance
 * @exports {Object} app - Firebase App instance utama
 * 
 * Semua service lain akan mengimport instance ini untuk
 * operasi database dan authentication.
 */
export { auth, db, realtimeDb, app };
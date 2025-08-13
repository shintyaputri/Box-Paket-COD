/**
 * AuthContext.jsx
 * 
 * Context Provider untuk manajemen autentikasi global dan profil pengguna.
 * Mengelola state autentikasi Firebase, data profil pengguna, dan sinkronisasi 
 * status paket untuk pengguna yang login.
 * 
 * Fitur utama:
 * - Autentikasi Firebase dengan email/password
 * - Manajemen profil pengguna dan role (user/admin)
 * - Sinkronisasi status paket otomatis saat login
 * - Persistensi session dengan listener Firebase Auth
 * - Error handling dan fallback state
 * - Support untuk akun admin khusus development
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import React, { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "../services/userService";
import { packageStatusManager } from "../services/packageStatusManager";
import { signInWithEmail, signUpWithEmail, signOutUser } from "../services/authService";

// Membuat React Context untuk autentikasi dengan default value kosong
const AuthContext = createContext({});

/**
 * Hook kustom untuk mengakses AuthContext
 * 
 * Menyediakan akses ke state autentikasi global dari komponen manapun.
 * Jika context tidak tersedia (di luar AuthProvider), akan mengembalikan
 * default values yang aman untuk mencegah error.
 * 
 * @returns {Object} Context autentikasi dengan properties:
 *   - currentUser: Firebase User object atau null
 *   - userProfile: Data profil lengkap dari Firestore
 *   - loading: Boolean status loading saat inisialisasi
 *   - authInitialized: Boolean status inisialisasi Auth selesai
 *   - refreshProfile: Function untuk refresh data profil
 *   - login: Function untuk login dengan email/password
 *   - register: Function untuk registrasi pengguna baru
 *   - logout: Function untuk logout
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Jika hook dipanggil di luar AuthProvider, return default values
  if (!context) {
    return {
      currentUser: null,
      userProfile: null,
      loading: false,
      authInitialized: true,
      refreshProfile: () => {},
    };
  }
  return context;
};

/**
 * AuthProvider Component
 * 
 * Provider component yang membungkus aplikasi untuk menyediakan context autentikasi.
 * Mengelola state global untuk autentikasi Firebase dan profil pengguna.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components yang akan dibungkus provider
 */
export const AuthProvider = ({ children }) => {
  // State untuk menyimpan Firebase User object
  const [currentUser, setCurrentUser] = useState(null);
  
  // State untuk menyimpan data profil lengkap dari Firestore
  const [userProfile, setUserProfile] = useState(null);
  
  // State loading untuk proses inisialisasi autentikasi
  const [loading, setLoading] = useState(true);
  
  // State untuk menandai apakah inisialisasi Auth sudah selesai
  const [authInitialized, setAuthInitialized] = useState(false);


  /**
   * Memuat profil pengguna dari Firestore dengan retry mechanism
   * 
   * Function ini dipanggil setiap kali ada perubahan auth state.
   * Untuk pengguna dengan role 'user', akan otomatis memicu sinkronisasi
   * status paket melalui packageStatusManager.
   * 
   * @param {Object|null} user - Firebase User object atau null jika logout
   * @param {number} retryCount - Retry attempt counter (default: 0)
   */
  const loadUserProfile = async (user, retryCount = 0) => {
    // Jika user null (logout), clear profile data
    if (!user) {
      setUserProfile(null);
      return;
    }

    try {
      // Ambil data profil lengkap dari Firestore menggunakan UID
      const result = await getUserProfile(user.uid);
      
      if (result.success) {
        console.log("User profile loaded successfully:", result.profile.email);
        setUserProfile(result.profile);

        // Untuk pengguna dengan role 'user', jalankan sinkronisasi paket
        if (result.profile.role === "user") {
          try {
            // Trigger packageStatusManager untuk update status paket saat login
            await packageStatusManager.handleUserLogin(user.uid);
          } catch (error) {
            console.warn("Error during package status update on login:", error);
          }
        }
      } else {
        // ✅ Retry mechanism untuk profile loading
        if (retryCount === 0) {
          console.log("Retrying profile load in 2 seconds...");
          setTimeout(() => loadUserProfile(user, 1), 2000);
        } else {
          console.warn("Failed to load user profile after retry:", result.error);
          setUserProfile(null);
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      // ✅ Retry on network error
      if (retryCount === 0) {
        console.log("Retrying profile load due to error in 2 seconds...");
        setTimeout(() => loadUserProfile(user, 1), 2000);
      } else {
        setUserProfile(null);
      }
    }
  };

  /**
   * Refresh data profil pengguna dari Firestore
   * 
   * Function ini berguna untuk memperbarui data profil setelah ada perubahan
   * pada data pengguna (seperti nama atau informasi lainnya).
   */
  const refreshProfile = async () => {
    if (currentUser) {
      await loadUserProfile(currentUser);
    }
  };

  /**
   * Login pengguna dengan email dan password
   * 
   * Menggunakan authService untuk melakukan autentikasi Firebase.
   * Support untuk akun admin khusus (admin@gmail.com) yang menerima password apapun.
   * 
   * @param {string} email - Email pengguna
   * @param {string} password - Password pengguna  
   * @returns {Object} Result object dari authService
   * @throws {Error} Jika login gagal
   */
  const login = async (email, password) => {
    const result = await signInWithEmail(email, password);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  };

  /**
   * Registrasi pengguna baru
   * 
   * Membuat akun Firebase Auth baru dan menyimpan profil ke Firestore.
   * Semua registrasi baru akan mendapat role 'user' secara default.
   * 
   * @param {Object} userData - Data pengguna untuk registrasi
   * @param {string} userData.email - Email pengguna
   * @param {string} userData.password - Password pengguna
   * @param {string} userData.nama - Nama lengkap pengguna
   * @param {string} userData.noTelp - Nomor telepon pengguna
   * @returns {Object} Result object dari authService
   * @throws {Error} Jika registrasi gagal
   */
  const register = async (userData) => {
    const { email, password, ...profileData } = userData;
    
    // Set default role sebagai 'user' untuk registrasi regular
    // Role 'admin' hanya bisa di-set manual di database
    const profileDataWithRole = {
      ...profileData,
      role: 'user'
    };
    
    const result = await signUpWithEmail(email, password, profileDataWithRole);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  };

  /**
   * Logout pengguna
   * 
   * Melakukan sign out dari Firebase Auth. State currentUser dan userProfile
   * akan otomatis di-clear melalui onAuthStateChanged listener.
   * 
   * @returns {Object} Result object dari authService
   * @throws {Error} Jika logout gagal
   */
  const logout = async () => {
    const result = await signOutUser();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  };

  /**
   * useEffect untuk inisialisasi autentikasi Firebase
   * 
   * Implements robust auth initialization based on troubleshooting guide:
   * - Check existing user first before setting up listener
   * - Extended timeout (10 seconds)
   * - Preserve user state on timeout
   * - Retry mechanism for profile loading
   * 
   * Dependencies: [] (hanya dijalankan sekali saat mount)
   */
  useEffect(() => {
    let unsubscribe = null; // Function untuk unsubscribe listener
    let mounted = true; // Flag untuk mencegah state update setelah unmount

    /**
     * Inisialisasi Firebase Auth dengan robust error handling
     */
    const initializeAuth = async () => {
      // Fallback jika Firebase Auth tidak tersedia
      if (!auth) {
        console.warn("Firebase Auth not available, using fallback");
        if (mounted) {
          setCurrentUser(null);
          setUserProfile(null);
          setLoading(false);
          setAuthInitialized(true);
        }
        return;
      }

      try {
        // ✅ Check existing user FIRST sebelum setup listener
        const currentUser = auth.currentUser;
        if (currentUser && mounted) {
          console.log("Found existing authenticated user:", currentUser.email);
          setCurrentUser(currentUser);
          await loadUserProfile(currentUser);
          setLoading(false);
          setAuthInitialized(true);
        }

        // Setup listener untuk future auth state changes
        unsubscribe = onAuthStateChanged(
          auth,
          async (user) => {
            // Hanya update state jika component masih mounted
            if (mounted) {
              console.log(
                "Auth state changed:",
                user ? `User: ${user.email}` : "Logged out"
              );
              
              // Update currentUser state
              setCurrentUser(user);
              
              // Load profil pengguna jika ada user, atau clear jika logout
              await loadUserProfile(user);
              
              // Set loading selesai dan auth sudah diinisialisasi
              setLoading(false);
              setAuthInitialized(true);
            }
          },
          (error) => {
            // Error handler untuk auth state change
            console.error("Auth state change error:", error);
            if (mounted) {
              // ❌ JANGAN: setCurrentUser(null) - preserve existing user
              // ✅ LAKUKAN: Just mark as initialized
              setLoading(false);
              setAuthInitialized(true);
            }
          }
        );
      } catch (error) {
        // Error handler untuk setup listener
        console.error("Failed to initialize auth listener:", error);
        if (mounted) {
          // ❌ JANGAN: Clear user on error
          // ✅ LAKUKAN: Just mark as initialized
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // ✅ Extended timeout ke 10 detik dengan user preservation
    const timeoutId = setTimeout(() => {
      if (mounted && loading && !authInitialized) {
        console.warn("Auth initialization timeout, proceeding anyway");
        // ❌ JANGAN: setCurrentUser(null);
        // ✅ LAKUKAN: Preserve user state, just stop loading
        setLoading(false);
        setAuthInitialized(true);
      }
    }, 10000); // Increased to 10 seconds

    // Jalankan inisialisasi auth
    initializeAuth();

    // Cleanup function untuk mencegah memory leak
    return () => {
      mounted = false; // Tandai component sudah unmount
      
      // Unsubscribe auth listener jika ada
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Clear timeout
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - hanya dijalankan sekali saat mount

  // Object value yang akan disediakan oleh context provider
  const value = {
    currentUser,        // Firebase User object atau null
    userProfile,        // Data profil lengkap dari Firestore
    loading,            // Status loading saat inisialisasi
    authInitialized,    // Status apakah auth sudah diinisialisasi
    refreshProfile,     // Function untuk refresh profil
    login,              // Function untuk login
    register,           // Function untuk registrasi
    logout,             // Function untuk logout
  };

  // Return Provider component dengan value context
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

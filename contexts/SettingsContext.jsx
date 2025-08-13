/**
 * SettingsContext.jsx
 * 
 * Context Provider untuk manajemen pengaturan aplikasi dan preferensi pengguna.
 * Mengelola tema aplikasi (light/dark mode) dan menyimpan preferensi pengguna
 * secara persisten menggunakan AsyncStorage.
 * 
 * Fitur utama:
 * - Manajemen tema light/dark mode
 * - Mode enkripsi QR Code (encrypted/plain)
 * - Persistensi pengaturan dengan AsyncStorage
 * - Loading state untuk proses inisialisasi
 * - Error handling untuk operasi storage
 * - Default fallback values yang aman
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Membuat React Context untuk pengaturan aplikasi
const SettingsContext = createContext();

/**
 * Hook kustom untuk mengakses SettingsContext
 * 
 * Menyediakan akses ke pengaturan aplikasi dari komponen manapun.
 * Jika context tidak tersedia (di luar SettingsProvider), akan mengembalikan
 * default values yang aman untuk mencegah error.
 * 
 * @returns {Object} Context pengaturan dengan properties:
 *   - theme: String tema saat ini ('light' atau 'dark')
 *   - encryptionMode: String mode enkripsi QR Code ('encrypted' atau 'plain')
 *   - loading: Boolean status loading saat inisialisasi
 *   - changeTheme: Function untuk mengubah tema
 *   - changeEncryptionMode: Function untuk mengubah mode enkripsi
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  
  // Jika hook dipanggil di luar SettingsProvider, return default values
  if (!context) {
    return {
      theme: "light",            // Default ke tema light
      encryptionMode: "plain",   // Default ke mode plain
      capacityDisplayMode: "height", // Default ke mode height
      enableHeightConversion: true, // Default ke konversi aktif
      enablePercentageConversion: true, // Default ke konversi percentage aktif
      loading: false,            // Tidak ada loading jika tidak ada context
      changeTheme: () => {},     // Function kosong sebagai fallback
      changeEncryptionMode: () => {}, // Function kosong sebagai fallback
      changeCapacityDisplayMode: () => {}, // Function kosong sebagai fallback
      changeHeightConversion: () => {}, // Function kosong sebagai fallback
      changePercentageConversion: () => {}, // Function kosong sebagai fallback
    };
  }
  return context;
};

/**
 * SettingsProvider Component
 * 
 * Provider component yang membungkus aplikasi untuk menyediakan context pengaturan.
 * Mengelola state global untuk tema dan pengaturan aplikasi lainnya.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components yang akan dibungkus provider
 */
export const SettingsProvider = ({ children }) => {
  // State untuk menyimpan tema saat ini ("light" atau "dark")
  const [theme, setTheme] = useState("light");
  
  // State untuk menyimpan mode enkripsi QR Code ("encrypted" atau "plain")
  const [encryptionMode, setEncryptionMode] = useState("plain");
  
  // State untuk menyimpan mode tampilan kapasitas ("height" atau "percentage")
  const [capacityDisplayMode, setCapacityDisplayMode] = useState("height");
  
  // State untuk menyimpan opsi konversi balik dari percentage ke height
  const [enableHeightConversion, setEnableHeightConversion] = useState(true);
  
  // State untuk menyimpan opsi konversi dari height ke percentage
  const [enablePercentageConversion, setEnablePercentageConversion] = useState(true);
  
  // State loading untuk proses inisialisasi pengaturan dari AsyncStorage
  const [loading, setLoading] = useState(true);

  /**
   * Memuat pengaturan aplikasi dari AsyncStorage
   * 
   * Function ini dipanggil saat komponen mount untuk memuat pengaturan
   * yang tersimpan secara persisten. Jika tidak ada pengaturan tersimpan
   * atau terjadi error, akan menggunakan tema "light" sebagai default.
   */
  const loadSettings = async () => {
    try {
      // Ambil tema yang tersimpan dari AsyncStorage
      const savedTheme = await AsyncStorage.getItem("app_theme");
      
      // Validasi nilai tema yang valid ("light" atau "dark")
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setTheme(savedTheme);
      }
      
      // Ambil mode enkripsi yang tersimpan dari AsyncStorage
      const savedEncryptionMode = await AsyncStorage.getItem("encryption_mode");
      
      // Validasi nilai mode enkripsi yang valid ("encrypted" atau "plain")
      if (savedEncryptionMode && (savedEncryptionMode === "encrypted" || savedEncryptionMode === "plain")) {
        setEncryptionMode(savedEncryptionMode);
      }
      
      // Ambil mode tampilan kapasitas yang tersimpan dari AsyncStorage
      const savedCapacityDisplayMode = await AsyncStorage.getItem("capacity_display_mode");
      
      // Validasi nilai mode tampilan kapasitas yang valid ("height" atau "percentage")
      if (savedCapacityDisplayMode && (savedCapacityDisplayMode === "height" || savedCapacityDisplayMode === "percentage")) {
        setCapacityDisplayMode(savedCapacityDisplayMode);
      }
      
      // Ambil opsi konversi height yang tersimpan dari AsyncStorage
      const savedEnableHeightConversion = await AsyncStorage.getItem("enable_height_conversion");
      
      // Validasi nilai boolean untuk konversi height
      if (savedEnableHeightConversion !== null) {
        setEnableHeightConversion(savedEnableHeightConversion === "true");
      }
      
      // Ambil opsi konversi percentage yang tersimpan dari AsyncStorage
      const savedEnablePercentageConversion = await AsyncStorage.getItem("enable_percentage_conversion");
      
      // Validasi nilai boolean untuk konversi percentage
      if (savedEnablePercentageConversion !== null) {
        setEnablePercentageConversion(savedEnablePercentageConversion === "true");
      }
      // Jika tidak ada pengaturan tersimpan atau nilai tidak valid, gunakan default values
    } catch (error) {
      // Error handling jika gagal membaca dari AsyncStorage
      console.error("Error loading settings:", error);
      setTheme("light"); // Fallback ke tema light
      setEncryptionMode("plain"); // Fallback ke mode plain
      setCapacityDisplayMode("height"); // Fallback ke mode height
      setEnableHeightConversion(true); // Fallback ke konversi aktif
      setEnablePercentageConversion(true); // Fallback ke konversi percentage aktif
    } finally {
      // Set loading selesai terlepas dari hasil operasi
      setLoading(false);
    }
  };

  /**
   * Mengubah tema aplikasi dan menyimpannya secara persisten
   * 
   * Function ini akan mengupdate state tema dan menyimpan pilihan
   * ke AsyncStorage agar tetap tersimpan setelah aplikasi ditutup.
   * 
   * @param {string} newTheme - Tema baru ("light" atau "dark")
   */
  const changeTheme = async (newTheme) => {
    try {
      // Validasi tema yang valid
      if (newTheme === "light" || newTheme === "dark") {
        // Update state tema untuk trigger re-render
        setTheme(newTheme);
        
        // Simpan pilihan tema ke AsyncStorage untuk persistensi
        await AsyncStorage.setItem("app_theme", newTheme);
      }
      // Jika tema tidak valid, abaikan permintaan
    } catch (error) {
      // Error handling jika gagal menyimpan ke AsyncStorage
      console.error("Error saving theme:", error);
      // Tetap update state meskipun gagal menyimpan ke storage
    }
  };

  /**
   * Mengubah mode enkripsi QR Code dan menyimpannya secara persisten
   * 
   * Function ini akan mengupdate state mode enkripsi dan menyimpan pilihan
   * ke AsyncStorage agar tetap tersimpan setelah aplikasi ditutup.
   * 
   * @param {string} newMode - Mode enkripsi baru ("encrypted" atau "plain")
   */
  const changeEncryptionMode = async (newMode) => {
    try {
      // Validasi mode enkripsi yang valid
      if (newMode === "encrypted" || newMode === "plain") {
        // Update state mode enkripsi untuk trigger re-render
        setEncryptionMode(newMode);
        
        // Simpan pilihan mode enkripsi ke AsyncStorage untuk persistensi
        await AsyncStorage.setItem("encryption_mode", newMode);
      }
      // Jika mode tidak valid, abaikan permintaan
    } catch (error) {
      // Error handling jika gagal menyimpan ke AsyncStorage
      console.error("Error saving encryption mode:", error);
      // Tetap update state meskipun gagal menyimpan ke storage
    }
  };

  /**
   * Mengubah mode tampilan kapasitas dan menyimpannya secara persisten
   * 
   * Function ini akan mengupdate state mode tampilan kapasitas dan menyimpan pilihan
   * ke AsyncStorage agar tetap tersimpan setelah aplikasi ditutup.
   * 
   * @param {string} newMode - Mode tampilan baru ("height" atau "percentage")
   */
  const changeCapacityDisplayMode = async (newMode) => {
    try {
      // Validasi mode tampilan kapasitas yang valid
      if (newMode === "height" || newMode === "percentage") {
        // Update state mode tampilan kapasitas untuk trigger re-render
        setCapacityDisplayMode(newMode);
        
        // Simpan pilihan mode tampilan kapasitas ke AsyncStorage untuk persistensi
        await AsyncStorage.setItem("capacity_display_mode", newMode);
      }
      // Jika mode tidak valid, abaikan permintaan
    } catch (error) {
      // Error handling jika gagal menyimpan ke AsyncStorage
      console.error("Error saving capacity display mode:", error);
      // Tetap update state meskipun gagal menyimpan ke storage
    }
  };

  /**
   * Mengubah opsi konversi height dan menyimpannya secara persisten
   * 
   * Function ini akan mengupdate state konversi height dan menyimpan pilihan
   * ke AsyncStorage agar tetap tersimpan setelah aplikasi ditutup.
   * 
   * @param {boolean} enabled - Status konversi height (true/false)
   */
  const changeHeightConversion = async (enabled) => {
    try {
      // Validasi nilai boolean
      if (typeof enabled === "boolean") {
        // Update state konversi height untuk trigger re-render
        setEnableHeightConversion(enabled);
        
        // Simpan pilihan konversi height ke AsyncStorage untuk persistensi
        await AsyncStorage.setItem("enable_height_conversion", enabled.toString());
      }
      // Jika nilai tidak valid, abaikan permintaan
    } catch (error) {
      // Error handling jika gagal menyimpan ke AsyncStorage
      console.error("Error saving height conversion setting:", error);
      // Tetap update state meskipun gagal menyimpan ke storage
    }
  };

  /**
   * Mengubah opsi konversi percentage dan menyimpannya secara persisten
   * 
   * Function ini akan mengupdate state konversi percentage dan menyimpan pilihan
   * ke AsyncStorage agar tetap tersimpan setelah aplikasi ditutup.
   * 
   * @param {boolean} enabled - Status konversi percentage (true/false)
   */
  const changePercentageConversion = async (enabled) => {
    try {
      // Validasi nilai boolean
      if (typeof enabled === "boolean") {
        // Update state konversi percentage untuk trigger re-render
        setEnablePercentageConversion(enabled);
        
        // Simpan pilihan konversi percentage ke AsyncStorage untuk persistensi
        await AsyncStorage.setItem("enable_percentage_conversion", enabled.toString());
      }
      // Jika nilai tidak valid, abaikan permintaan
    } catch (error) {
      // Error handling jika gagal menyimpan ke AsyncStorage
      console.error("Error saving percentage conversion setting:", error);
      // Tetap update state meskipun gagal menyimpan ke storage
    }
  };

  /**
   * useEffect untuk inisialisasi pengaturan
   * 
   * Memuat pengaturan tersimpan dari AsyncStorage saat komponen mount.
   * 
   * Dependencies: [] (hanya dijalankan sekali saat mount)
   */
  useEffect(() => {
    loadSettings();
  }, []); // Empty dependency array - hanya dijalankan sekali saat mount

  // Object value yang akan disediakan oleh context provider
  const value = {
    theme: theme || "light",                           // Pastikan selalu ada nilai tema (fallback ke "light")
    encryptionMode: encryptionMode || "plain",         // Pastikan selalu ada nilai mode enkripsi (fallback ke "plain")
    capacityDisplayMode: capacityDisplayMode || "height", // Pastikan selalu ada nilai mode tampilan kapasitas (fallback ke "height")
    enableHeightConversion: enableHeightConversion !== undefined ? enableHeightConversion : true, // Pastikan selalu ada nilai konversi height (fallback ke true)
    enablePercentageConversion: enablePercentageConversion !== undefined ? enablePercentageConversion : true, // Pastikan selalu ada nilai konversi percentage (fallback ke true)
    loading,                                           // Status loading untuk proses inisialisasi
    changeTheme,                                      // Function untuk mengubah tema
    changeEncryptionMode,                             // Function untuk mengubah mode enkripsi
    changeCapacityDisplayMode,                        // Function untuk mengubah mode tampilan kapasitas
    changeHeightConversion,                           // Function untuk mengubah opsi konversi height
    changePercentageConversion,                       // Function untuk mengubah opsi konversi percentage
  };

  // Return Provider component dengan value context
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

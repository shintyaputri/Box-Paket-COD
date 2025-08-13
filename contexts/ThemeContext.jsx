/**
 * ThemeContext.jsx
 * 
 * Context Provider untuk manajemen tema aplikasi berdasarkan role pengguna.
 * Menyediakan tema yang konsisten di seluruh aplikasi dengan warna yang
 * disesuaikan berdasarkan role pengguna (user/admin).
 * 
 * Fitur utama:
 * - Tema berdasarkan role pengguna (user vs admin)
 * - Integrasi dengan constants/Colors untuk konsistensi warna
 * - Context pattern untuk sharing tema global
 * - Static theme configuration (tidak ada toggle dinamis)
 * 
 * Note: Context ini menggunakan role-based theming, berbeda dengan
 * SettingsContext yang mengelola light/dark mode preference.
 * 
 * @author Shintya Package Delivery System
 * @version 1.0.0
 */

import React, { createContext, useContext } from "react";
import { getThemeByRole } from "../constants/Colors";
import { useAuth } from "./AuthContext";

// Membuat React Context untuk tema aplikasi
const ThemeContext = createContext({});

/**
 * Hook kustom untuk mengakses ThemeContext
 * 
 * Menyediakan akses ke tema aplikasi dari komponen manapun.
 * Wajib digunakan di dalam ThemeProvider, akan throw error jika tidak.
 * 
 * @returns {Object} Context tema dengan properties:
 *   - theme: Object tema lengkap dengan warna dan styling
 * @throws {Error} Jika digunakan di luar ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  // Throw error jika hook dipanggil di luar ThemeProvider
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

/**
 * ThemeProvider Component
 * 
 * Provider component yang menyediakan tema aplikasi berdasarkan role pengguna.
 * Menggunakan getThemeByRole dari constants/Colors untuk mendapatkan tema
 * yang sesuai dengan role pengguna.
 * 
 * Note: Saat ini menggunakan parameter false untuk getThemeByRole,
 * yang berarti menggunakan tema default. Implementasi role-based theming
 * dapat dikembangkan lebih lanjut dengan mengintegrasikan userProfile.role.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components yang akan dibungkus provider
 */
export const ThemeProvider = ({ children }) => {
  // Mendapatkan tema dari constants/Colors berdasarkan role
  // Parameter false berarti menggunakan tema default (bukan admin)
  // TODO: Integrasikan dengan userProfile.role untuk dynamic theming
  const theme = getThemeByRole(false);

  // Object value yang akan disediakan oleh context provider
  const value = {
    theme, // Object tema lengkap dengan warna dan styling constants
  };

  // Return Provider component dengan value context
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
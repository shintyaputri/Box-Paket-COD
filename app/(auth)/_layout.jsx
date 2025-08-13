/**
 * Auth Layout - Layout untuk halaman-halaman autentikasi
 * 
 * Layout ini mengatur navigasi untuk semua halaman yang terkait dengan
 * proses autentikasi pengguna, termasuk login, register, dan forgot password.
 * Semua halaman dalam group ini tidak memerlukan autentikasi untuk diakses.
 */

import React from "react";
import { Stack } from "expo-router";

/**
 * Komponen AuthLayout - Layout untuk grup halaman autentikasi
 * 
 * Mengatur stack navigation untuk:
 * - login: Halaman masuk untuk pengguna yang sudah terdaftar
 * - register: Halaman pendaftaran untuk pengguna baru
 * - forgot-password: Halaman pemulihan kata sandi
 * 
 * @returns {React.Component} Stack navigator untuk halaman autentikasi
 */
export default function AuthLayout() {
  return (
    // Stack navigator tanpa header untuk halaman autentikasi
    <Stack screenOptions={{ headerShown: false }}>
      {/* Halaman login */}
      <Stack.Screen name="login" />
      {/* Halaman registrasi */}
      <Stack.Screen name="register" />
      {/* Halaman lupa password */}
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}

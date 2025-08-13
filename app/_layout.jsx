/**
 * Root Layout - Layout utama aplikasi yang mengatur provider dan navigasi
 * 
 * Layout ini bertanggung jawab untuk:
 * - Mengatur semua provider context yang digunakan di seluruh aplikasi
 * - Menyediakan error boundary untuk menangani error global
 * - Mengkonfigurasi navigasi stack utama dengan Expo Router
 * - Menampilkan komponen notifikasi toast global
 */

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { AuthProvider } from "../contexts/AuthContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import ErrorBoundary from "../components/ErrorBoundary";
import ToastNotification from "../components/ui/ToastNotification";

/**
 * Komponen RootLayout - Layout root aplikasi
 * 
 * Menyediakan struktur provider berlapis yang dibutuhkan aplikasi:
 * 1. GluestackUIProvider - untuk komponen UI
 * 2. ErrorBoundary - untuk menangani error global
 * 3. SettingsProvider - untuk pengaturan aplikasi
 * 4. AuthProvider - untuk manajemen autentikasi
 * 5. NotificationProvider - untuk sistem notifikasi
 * 
 * @returns {React.Component} Layout root dengan semua provider dan navigasi
 */
export default function RootLayout() {
  return (
    // Provider UI library untuk styling dan komponen
    <GluestackUIProvider config={config}>
      {/* Error boundary untuk menangani crash aplikasi */}
      <ErrorBoundary>
        {/* Provider untuk pengaturan aplikasi (tema, preferensi, dll) */}
        <SettingsProvider>
          {/* Provider untuk autentikasi dan manajemen user */}
          <AuthProvider>
            {/* Provider untuk sistem notifikasi dan toast */}
            <NotificationProvider>
              {/* Konfigurasi status bar */}
              <StatusBar style="auto" />
              
              {/* Stack navigator utama dengan semua screen tersembunyi headernya */}
              <Stack screenOptions={{ headerShown: false }}>
                {/* Screen entry point aplikasi */}
                <Stack.Screen name="index" />
                {/* Stack untuk halaman autentikasi (login, register, forgot password) */}
                <Stack.Screen name="(auth)" />
                {/* Stack untuk halaman utama dengan tab navigation */}
                <Stack.Screen name="(tabs)" />
              </Stack>
              
              {/* Komponen toast notification global */}
              <ToastNotification />
            </NotificationProvider>
          </AuthProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </GluestackUIProvider>
  );
}

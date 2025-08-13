/**
 * TabsLayout - Layout komponen untuk navigasi tab utama aplikasi
 * 
 * File ini mengatur struktur navigasi tab bar dengan 4 tab utama:
 * - Beranda (index): Dashboard utama dengan statistik dan aktivitas
 * - List Resi: Manajemen paket dengan fitur COD dan Non-COD
 * - Kapasitas: Monitoring real-time kapasitas box dengan sensor ultrasonik
 * - Profil: Profil pengguna dan manajemen RFID
 * 
 * Features:
 * - Tab tersembunyi untuk edit-profile (tidak terlihat di tab bar)
 * - Theming dinamis berdasarkan pengaturan pengguna
 * - Loading state saat inisialisasi tema
 * - Icon emoji untuk setiap tab
 * 
 * @component TabsLayout
 * @returns {JSX.Element} Komponen layout navigasi tab
 */

import React from "react";
import { Text, ActivityIndicator, View } from "react-native";
import { Tabs } from "expo-router";
import { useSettings } from "../../contexts/SettingsContext";
import { getColors } from "../../constants/Colors";

/**
 * Komponen layout utama untuk navigasi tab
 * Mengatur struktur tab bar dan konfigurasi visual
 */
export default function TabsLayout() {
  // Mengambil tema dan status loading dari context pengaturan
  const { theme, loading } = useSettings();
  // Mendapatkan palet warna berdasarkan tema yang aktif
  const colors = getColors(theme);

  // Menampilkan loading screen saat tema sedang dimuat
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        {/* Indikator loading dengan warna sesuai tema */}
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Sembunyikan header default karena setiap screen memiliki header custom
        tabBarActiveTintColor: colors.primary, // Warna tab aktif sesuai tema
        tabBarInactiveTintColor: colors.gray500, // Warna tab tidak aktif
        tabBarStyle: {
          backgroundColor: colors.white, // Background tab bar
          borderTopColor: colors.border, // Warna border atas tab bar
        },
      }}
    >
      {/* Tab Beranda - Dashboard utama dengan statistik paket dan aktivitas */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      {/* Tab List Resi - Manajemen paket dengan sistem COD/Non-COD */}
      <Tabs.Screen
        name="list-resi"
        options={{
          title: "List Resi",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📋</Text>
          ),
        }}
      />
      {/* Tab Kapasitas - Monitoring real-time kapasitas box dengan ESP32 */}
      <Tabs.Screen
        name="kapasitas-paket"
        options={{
          title: "Kapasitas",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📦</Text>
          ),
        }}
      />
      {/* Tab Profil - Profil pengguna dan manajemen RFID */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
      {/* Tab Edit Profile - Tersembunyi dari tab bar, diakses melalui navigasi dari profil */}
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null, // href: null membuat tab tidak terlihat di tab bar
        }}
      />
    </Tabs>
  );
}

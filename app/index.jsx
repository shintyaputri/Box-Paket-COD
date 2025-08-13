/**
 * Komponen utama aplikasi yang menangani routing awal
 * berdasarkan status autentikasi pengguna.
 * 
 * Komponen ini berfungsi sebagai entry point aplikasi yang akan
 * mengarahkan pengguna ke halaman yang tepat berdasarkan:
 * - Status login pengguna
 * - Kelengkapan profil pengguna
 * - Status inisialisasi autentikasi
 */

import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { Colors } from "../constants/Colors";

/**
 * Komponen Index - Entry point aplikasi
 * 
 * @returns {React.Component} Komponen yang menampilkan loading spinner 
 * sambil menentukan routing awal berdasarkan status autentikasi
 */
export default function Index() {
  // Mengambil state autentikasi dari AuthContext
  const { currentUser, loading, authInitialized, userProfile } = useAuth();
  const router = useRouter();

  /**
   * Effect untuk menangani routing otomatis berdasarkan status autentikasi
   * 
   * Logic routing:
   * - Jika user sudah login dan memiliki profil lengkap → ke halaman utama (tabs)
   * - Jika user belum login atau profil tidak lengkap → ke halaman login
   */
  useEffect(() => {
    // Pastikan autentikasi sudah diinisialisasi dan tidak dalam proses loading
    if (authInitialized && !loading) {
      if (currentUser && userProfile) {
        // User sudah login dan memiliki profil lengkap
        router.replace("/(tabs)");
      } else {
        // User belum login atau profil tidak lengkap
        router.replace("/(auth)/login");
      }
    }
  }, [currentUser, loading, authInitialized, userProfile]);

  // Tampilkan loading spinner saat autentikasi belum diinisialisasi atau sedang loading
  if (!authInitialized || loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner text="Memuat..." />
      </View>
    );
  }

  // Tampilkan loading spinner saat sedang proses routing
  return (
    <View style={styles.container}>
      <LoadingSpinner text="Mengarahkan..." />
    </View>
  );
}

// Styles untuk komponen Index
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center", // Pusatkan konten secara vertikal
    alignItems: "center", // Pusatkan konten secara horizontal
    backgroundColor: Colors.background, // Gunakan warna background dari tema
  },
});

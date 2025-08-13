/**
 * Home Screen (Dashboard) - Halaman beranda aplikasi manajemen paket
 * 
 * Halaman ini menampilkan:
 * - Sambutan personal untuk pengguna
 * - Statistik paket real-time (total, COD, siap diambil)
 * - Notifikasi paket yang sudah tiba
 * - Menu cepat untuk navigasi ke fitur utama
 * - Aktivitas terakhir dengan tracking real-time
 * 
 * Features:
 * - Real-time updates menggunakan Firebase listeners
 * - Pull-to-refresh untuk update manual
 * - Statistik paket yang update otomatis
 * - Notifikasi smart untuk paket yang perlu diambil
 * - Quick actions untuk akses cepat ke fitur utama
 * 
 * @component Home
 * @returns {JSX.Element} Halaman dashboard utama
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from "../../contexts/SettingsContext";
import { getThemeByRole } from "../../constants/Colors";
import { resiService } from "../../services/resiService";
import { activityService } from "../../services/activityService";

/**
 * Mengformat timestamp menjadi format "waktu yang lalu" dalam bahasa Indonesia
 * 
 * @param {Date|Timestamp} timestamp - Timestamp Firebase atau Date object
 * @returns {string} String waktu yang diformat (contoh: "5 menit yang lalu")
 */
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  // Handle Firebase Timestamp dan Date object
  const activityTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInSeconds = Math.floor((now - activityTime) / 1000);
  
  // Format berdasarkan selisih waktu
  if (diffInSeconds < 60) {
    return 'Baru saja';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} menit yang lalu`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} jam yang lalu`;
  } else if (diffInSeconds < 172800) {
    return 'Kemarin';
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} hari yang lalu`;
  }
};

/**
 * Komponen utama halaman beranda
 * Mengelola state dan logika untuk dashboard utama
 */
export default function Home() {
  // Context dan hooks untuk autentikasi, tema, dan navigasi
  const { userProfile, refreshProfile, currentUser } = useAuth();
  const { theme } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = getThemeByRole(false); // Selalu menggunakan tema user (bukan admin)
  
  // State untuk pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk statistik paket real-time
  const [packageStats, setPackageStats] = useState({
    total: 0,      // Total semua paket
    cod: 0,        // Total paket COD
    pending: 0,    // Paket yang sedang dikirim
    arrived: 0     // Paket yang sudah tiba dan siap diambil
  });
  
  // State untuk aktivitas terbaru pengguna
  const [recentActivities, setRecentActivities] = useState([]);

  /**
   * Mengambil statistik paket untuk pengguna saat ini
   * Dipanggil manual saat refresh atau inisialisasi
   */
  const fetchPackageStats = async () => {
    if (currentUser?.uid) {
      const result = await resiService.getUserPackageStats(currentUser.uid);
      if (result.success) {
        setPackageStats(result.stats);
      }
    }
  };

  /**
   * Effect untuk setup real-time listeners
   * Mengatur subscription untuk statistik paket dan aktivitas pengguna
   */
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Subscribe ke update real-time untuk statistik paket
    // Akan otomatis update ketika ada perubahan data paket
    const unsubscribeStats = resiService.subscribeToUserPackageStats(
      currentUser.uid,
      (result) => {
        if (result.success) {
          setPackageStats(result.stats);
        }
      }
    );

    // Subscribe ke update real-time untuk aktivitas pengguna
    // Menampilkan aktivitas terbaru seperti update status paket
    const unsubscribeActivities = activityService.subscribeToUserActivities(
      currentUser.uid,
      (result) => {
        if (result.success) {
          setRecentActivities(result.data);
        }
      }
    );

    // Cleanup function - unsubscribe saat component unmount
    return () => {
      unsubscribeStats();
      unsubscribeActivities();
    };
  }, [currentUser]);

  /**
   * Handler untuk pull-to-refresh
   * Memperbarui profil pengguna dan statistik paket
   */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh profil pengguna jika fungsi tersedia
      if (refreshProfile) {
        await refreshProfile();
      }
      // Refresh statistik paket manual
      await fetchPackageStats();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  }, [refreshProfile, currentUser]);

  // Konfigurasi menu cepat untuk navigasi ke fitur utama
  const quickActions = [
    {
      id: 1,
      title: "List Resi",
      icon: "📋",
      route: "/(tabs)/list-resi", // Navigasi ke halaman manajemen paket
      color: colors.primary,
    },
    {
      id: 2,
      title: "Kapasitas",
      icon: "📦",
      route: "/(tabs)/kapasitas-paket", // Navigasi ke monitoring kapasitas
      color: "#FF6B6B",
    },
    {
      id: 3,
      title: "Profil",
      icon: "👤",
      route: "/(tabs)/profile", // Navigasi ke profil pengguna
      color: colors.gray600,
    },
  ];

  // Data statistik untuk ditampilkan di cards
  const statsData = [
    { label: "Total Paket", value: packageStats.total.toString(), icon: "📦" },
    { label: "Paket COD", value: packageStats.cod.toString(), icon: "💰" }, // Cash on Delivery
    { label: "Siap Diambil", value: packageStats.arrived.toString(), icon: "📍" }, // Paket yang sudah tiba
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header dengan sambutan personal */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.gray600 }]}>
            Selamat datang,
          </Text>
          <Text style={[styles.userName, { color: colors.gray900 }]}>
            {userProfile?.nama || "User"}
          </Text>
        </View>

        {/* Kartu Statistik - Menampilkan total paket, COD, dan siap diambil */}
        <View style={styles.statsContainer}>
          {statsData.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.white,
                  shadowColor: colors.shadow.color,
                },
              ]}
            >
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: colors.gray900 }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray600 }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Kartu Notifikasi - Hanya muncul jika ada paket yang siap diambil */}
        {packageStats.arrived > 0 && (
          <View
            style={[
              styles.notificationCard,
              {
                backgroundColor: "#FFF4E6", // Background kuning muda
                borderColor: "#FFB74D", // Border orange
              },
            ]}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            <View style={styles.notificationContent}>
              <Text style={[styles.notificationTitle, { color: "#F57C00" }]}>
                Pengingat
              </Text>
              <Text style={[styles.notificationText, { color: "#795548" }]}>
                Anda memiliki {packageStats.arrived} paket yang sudah tiba dan menunggu untuk diambil. Segera ambil paket Anda.
              </Text>
            </View>
          </View>
        )}

        {/* Menu Cepat - Akses cepat ke fitur utama aplikasi */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
            Menu Cepat
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionCard,
                  {
                    backgroundColor: colors.white,
                    shadowColor: colors.shadow.color,
                  },
                ]}
                onPress={() => router.push(action.route)} // Navigasi ke halaman terkait
              >
                <View
                  style={[
                    styles.quickActionIconContainer,
                    { backgroundColor: `${action.color}15` }, // Transparansi 15% untuk background icon
                  ]}
                >
                  <Text style={styles.quickActionIcon}>{action.icon}</Text>
                </View>
                <Text
                  style={[styles.quickActionTitle, { color: colors.gray900 }]}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Aktivitas Terakhir - Menampilkan riwayat aktivitas real-time */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
            Aktivitas Terakhir
          </Text>
          <View
            style={[
              styles.activityCard,
              {
                backgroundColor: colors.white,
                shadowColor: colors.shadow.color,
              },
            ]}
          >
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityIcon}>{activity.icon}</Text>
                    <View style={styles.activityContent}>
                      {/* Pesan aktivitas dari sistem */}
                      <Text style={[styles.activityText, { color: colors.gray900 }]}>
                        {activity.message}
                      </Text>
                      {/* Waktu dan nomor resi aktivitas */}
                      <Text style={[styles.activityTime, { color: colors.gray500 }]}>
                        {formatTimeAgo(activity.createdAt)} • {activity.resiNumber}
                      </Text>
                    </View>
                  </View>
                  {/* Divider antar aktivitas */}
                  {index < recentActivities.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
                  )}
                </React.Fragment>
              ))
            ) : (
              // State kosong ketika belum ada aktivitas
              <View style={styles.activityItem}>
                <Text style={styles.activityIcon}>📭</Text>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityText, { color: colors.gray900 }]}>
                    Belum ada aktivitas
                  </Text>
                  <Text style={[styles.activityTime, { color: colors.gray500 }]}>
                    Aktivitas paket akan muncul di sini
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  notificationCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
});

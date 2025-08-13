/**
 * Kapasitas Paket Screen - Halaman monitoring real-time kapasitas box paket
 * 
 * Halaman ini menampilkan:
 * - Status kapasitas box secara real-time dari sensor ESP32
 * - Progress bar visual dengan indikator warna
 * - Detail ketinggian, batas maksimal, dan persentase
 * - Informasi sensor (Device ID dan update terakhir)
 * - Auto-refresh ketika screen difokuskan
 * 
 * Features:
 * - Real-time monitoring menggunakan Firebase listeners
 * - Sensor ultrasonik ESP32 untuk pengukuran ketinggian
 * - Status dinamis (Kosong → Terisi Sebagian → Hampir Penuh → Penuh)
 * - Pull-to-refresh untuk update manual
 * - Visual feedback dengan warna berdasarkan status
 * 
 * Technical Details:
 * - Range sensor: 0-30cm (0cm = kosong, 30cm = penuh)
 * - Update otomatis dari ESP32 via Firebase Realtime Database
 * - Thresholds: <25% Kosong, 25-70% Terisi Sebagian, 70-90% Hampir Penuh, >90% Penuh
 * 
 * @component KapasitasPaket
 * @returns {JSX.Element} Halaman monitoring kapasitas
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { getThemeByRole } from "../../constants/Colors";
import { 
  getCapacityData, 
  subscribeToCapacityUpdates, 
  calculateCapacityStatus 
} from "../../services/capacityService";
import MaxCapacityModal from "../../components/ui/MaxCapacityModal";
import CapacitySettingsModal from "../../components/ui/CapacitySettingsModal";

/**
 * Komponen utama halaman Kapasitas Paket
 * Mengelola state dan logika untuk monitoring kapasitas box
 */
function KapasitasPaket() {
  // Context dan hooks untuk autentikasi, tema, dan safe area
  const { userProfile, refreshProfile } = useAuth();
  const { theme, capacityDisplayMode, enableHeightConversion, enablePercentageConversion, loading: settingsLoading } = useSettings();
  const insets = useSafeAreaInsets();
  const colors = getThemeByRole(false); // Selalu menggunakan tema user
  
  // State untuk pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk data kapasitas dengan nilai default
  const [kapasitasData, setKapasitasData] = useState({
    height: 0,           // Ketinggian saat ini dari sensor (cm) atau hasil konversi
    percentage: 0,       // Persentase langsung dari ESP32 atau terkalkulasi
    calculatedHeight: null, // Ketinggian hasil konversi balik (jika ada)
    calculatedPercentage: null, // Persentase hasil konversi (jika ada)
    maxHeight: 30,       // Batas maksimal box (cm)
    status: "Kosong",    // Status kapasitas (Kosong/Terisi Sebagian/Hampir Penuh/Penuh)
    message: "Box kosong, siap menerima paket", // Pesan deskriptif
    color: "#22C55E",    // Warna indikator (hijau untuk kosong)
    lastUpdated: null,   // Timestamp update terakhir dari sensor
    deviceId: null       // ID device ESP32
  });
  
  // State untuk loading inisialisasi
  const [loading, setLoading] = useState(true);
  
  // State untuk modal pengaturan kapasitas maksimal
  const [showMaxCapacityModal, setShowMaxCapacityModal] = useState(false);
  
  // State untuk modal pengaturan mode tampilan kapasitas
  const [showCapacitySettingsModal, setShowCapacitySettingsModal] = useState(false);

  /**
   * Memuat data kapasitas dari Firebase
   * Dipanggil manual saat refresh atau inisialisasi
   */
  const loadKapasitas = async () => {
    try {
      // Ambil data kapasitas dari service
      const result = await getCapacityData();
      if (result.success) {
        const { height, percentage: directPercentage, maxHeight, lastUpdated, deviceId } = result.data;
        
        // Hitung status berdasarkan mode tampilan yang dipilih
        let statusInfo;
        if (capacityDisplayMode === 'percentage' && directPercentage !== undefined) {
          // Mode Persentase: Gunakan persentase langsung dari ESP32 dengan opsi konversi
          statusInfo = calculateCapacityStatus(null, maxHeight, directPercentage, enableHeightConversion, enablePercentageConversion);
        } else {
          // Mode Ketinggian: Gunakan ketinggian dari ESP32 dengan opsi konversi
          statusInfo = calculateCapacityStatus(height, maxHeight, null, enableHeightConversion, enablePercentageConversion);
        }
        
        // Update state dengan data terbaru dan status yang dihitung
        setKapasitasData({
          height: statusInfo.height,          // Ketinggian (asli atau hasil konversi)
          percentage: directPercentage || statusInfo.percentage,  // Persentase dari ESP32 atau terkalkulasi
          calculatedHeight: statusInfo.calculatedHeight, // Ketinggian hasil konversi balik
          calculatedPercentage: statusInfo.calculatedPercentage, // Persentase hasil konversi
          maxHeight,
          status: statusInfo.status,          // Status dalam bahasa Indonesia
          message: statusInfo.message,        // Pesan deskriptif
          color: statusInfo.color,            // Warna untuk UI
          lastUpdated,
          deviceId
        });
      }
    } catch (error) {
      console.error('Error loading kapasitas:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Effect untuk setup real-time listener dan load data awal
   * Mengatur subscription untuk update kapasitas otomatis dari ESP32
   */
  useEffect(() => {
    // Load data kapasitas saat component mount
    loadKapasitas();
    
    // Setup real-time listener untuk update otomatis dari sensor ESP32
    const unsubscribe = subscribeToCapacityUpdates((result) => {
      if (result.success) {
        const { height, percentage: directPercentage, maxHeight, lastUpdated, deviceId } = result.data;
        
        // Hitung status berdasarkan mode tampilan yang dipilih
        let statusInfo;
        if (capacityDisplayMode === 'percentage' && directPercentage !== undefined) {
          // Mode Persentase: Gunakan persentase langsung dari ESP32 dengan opsi konversi
          statusInfo = calculateCapacityStatus(null, maxHeight, directPercentage, enableHeightConversion, enablePercentageConversion);
        } else {
          // Mode Ketinggian: Gunakan ketinggian dari ESP32 dengan opsi konversi
          statusInfo = calculateCapacityStatus(height, maxHeight, null, enableHeightConversion, enablePercentageConversion);
        }
        
        // Update state dengan data real-time dari ESP32
        setKapasitasData({
          height: statusInfo.height,          // Ketinggian (asli atau hasil konversi)
          percentage: directPercentage || statusInfo.percentage,
          calculatedHeight: statusInfo.calculatedHeight, // Ketinggian hasil konversi balik
          maxHeight,
          status: statusInfo.status,
          message: statusInfo.message,
          color: statusInfo.color,
          lastUpdated,
          deviceId
        });
      }
    });
    
    // Cleanup subscription saat component unmount
    return () => unsubscribe();
  }, [capacityDisplayMode, enableHeightConversion, enablePercentageConversion]); // Reload data when display mode or conversion setting changes

  /**
   * Effect untuk reload data saat screen difokuskan
   * Memastikan data selalu terbaru ketika user kembali ke halaman ini
   */
  useFocusEffect(
    React.useCallback(() => {
      loadKapasitas();
    }, [capacityDisplayMode, enableHeightConversion]) // Reload when display mode or conversion setting changes
  );

  /**
   * Handler untuk pull-to-refresh
   * Memperbarui data kapasitas dan profil pengguna
   */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh data kapasitas dari sensor
      await loadKapasitas();
      // Refresh profil pengguna jika tersedia
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  }, [refreshProfile]);

  /**
   * Mendapatkan emoji icon berdasarkan status kapasitas
   * 
   * @param {string} status - Status kapasitas ("Kosong", "Terisi Sebagian", "Hampir Penuh", "Penuh")
   * @returns {string} Emoji yang sesuai dengan status
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case "Penuh":
        return "🚫";      // Tanda dilarang - box penuh
      case "Hampir Penuh":
        return "⚠️";      // Warning - hampir penuh
      case "Terisi Sebagian":
        return "📦";      // Paket - ada isi tapi belum penuh
      case "Kosong":
        return "✅";      // Centang - kosong dan siap
      default:
        return "📏";      // Penggaris - status tidak diketahui
    }
  };

  /**
   * Memformat timestamp menjadi format tanggal dan waktu Indonesia
   * 
   * @param {Date|Timestamp} timestamp - Timestamp Firebase atau Date object
   * @returns {string} String tanggal yang diformat (DD/MM/YYYY HH:MM)
   */
  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Belum ada data';
    
    try {
      // Handle Firebase Timestamp dan Date object
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      // Format dengan locale Indonesia
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Waktu tidak valid';
    }
  };

  /**
   * Handle update kapasitas maksimal dari modal
   * 
   * @param {number} newMaxHeight - Kapasitas maksimal baru
   */
  const handleMaxCapacityUpdate = (newMaxHeight) => {
    setKapasitasData(prevData => ({
      ...prevData,
      maxHeight: newMaxHeight,
      percentage: (prevData.height / newMaxHeight) * 100
    }));
    
    // Hitung ulang status dengan kapasitas baru
    const statusInfo = calculateCapacityStatus(kapasitasData.height, newMaxHeight);
    setKapasitasData(prevData => ({
      ...prevData,
      maxHeight: newMaxHeight,
      percentage: statusInfo.percentage,
      status: statusInfo.status,
      message: statusInfo.message,
      color: statusInfo.color
    }));
  };

  if (settingsLoading || loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.gray600 }]}>
            Memuat kapasitas paket...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Header dengan judul, deskripsi, dan icon pengaturan */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTexts}>
              <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
                Kapasitas Paket
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.gray600 }]}>
                Monitoring ketinggian paket dengan sensor ultrasonik
              </Text>
            </View>
            {/* Icon Pengaturan Mode Kapasitas */}
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.gray100 }]}
              onPress={() => setShowCapacitySettingsModal(true)}
              activeOpacity={0.7}
            >
              <Settings 
                size={20} 
                color={colors.gray600} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Kartu Status Utama - Menampilkan status kapasitas dengan visual */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.white,
              shadowColor: colors.shadow.color,
            },
          ]}
        >
          {/* Header status dengan icon dan info */}
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>
              {getStatusIcon(kapasitasData.status)}
            </Text>
            <View style={styles.statusInfo}>
              {/* Status dengan warna dinamis */}
              <Text style={[styles.statusText, { color: kapasitasData.color }]}>
                {kapasitasData.status}
              </Text>
              {/* Pesan deskriptif status */}
              <Text style={[styles.statusMessage, { color: colors.gray600 }]}>
                {kapasitasData.message}
              </Text>
            </View>
          </View>

          {/* Progress bar visual */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
              {/* Fill progress dengan lebar dinamis berdasarkan persentase */}
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${kapasitasData.percentage}%`,
                    backgroundColor: kapasitasData.color, // Warna berdasarkan status
                  },
                ]}
              />
            </View>
            {/* Text persentase */}
            <Text style={[styles.progressText, { color: colors.gray600 }]}>
              {kapasitasData.percentage.toFixed(1)}% terisi
            </Text>
          </View>
        </View>

        {/* Kartu Detail Kapasitas - Menampilkan angka detail */}
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.white,
              shadowColor: colors.shadow.color,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            Detail Kapasitas
          </Text>

          {/* Detail Grid - Dynamic layout based on visible fields */}
          <View style={styles.detailGrid}>
            {/* Ketinggian saat ini - Conditional display based on mode and conversion settings */}
            {((capacityDisplayMode === 'height') || 
              (capacityDisplayMode === 'percentage' && enableHeightConversion)) && (
              <View style={[styles.detailItem, { borderColor: colors.gray100 }]}>
                <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                  Ketinggian Saat Ini
                </Text>
                <Text style={[styles.detailValue, { color: kapasitasData.color }]}>
                  {kapasitasData.height ? kapasitasData.height.toFixed(1) : '0.0'}
                </Text>
                <Text style={[styles.detailUnit, { color: colors.gray500 }]}>
                  cm
                </Text>
              </View>
            )}

            {/* Batas maksimal box (biasanya 30cm) - Always visible and clickable */}
            <TouchableOpacity 
              style={[styles.detailItem, styles.clickableItem, { borderColor: colors.gray100 }]}
              onPress={() => setShowMaxCapacityModal(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                Batas Maksimal
              </Text>
              <Text style={[styles.detailValue, { color: colors.primary }]}>
                {kapasitasData.maxHeight}
              </Text>
              <Text style={[styles.detailUnit, { color: colors.gray500 }]}>
                cm
              </Text>
              {/* Indicator bahwa item ini clickable */}
              <View style={[styles.clickableIndicator, { backgroundColor: colors.primary }]}>
                <Text style={styles.clickableIcon}>✏️</Text>
              </View>
            </TouchableOpacity>

            {/* Persentase terisi - Conditional display based on mode and conversion settings */}
            {((capacityDisplayMode === 'height' && enablePercentageConversion) || 
              (capacityDisplayMode === 'percentage')) && (
              <View style={[styles.detailItem, { borderColor: colors.gray100 }]}>
                <Text style={[styles.detailLabel, { color: colors.gray600 }]}>
                  Persentase Terisi
                </Text>
                <Text style={[styles.detailValue, { color: kapasitasData.color }]}>
                  {kapasitasData.percentage.toFixed(1)}
                </Text>
                <Text style={[styles.detailUnit, { color: colors.gray500 }]}>
                  %
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Kartu Informasi Sensor - Detail teknis ESP32 */}
        <View
          style={[
            styles.sensorCard,
            {
              backgroundColor: colors.white,
              shadowColor: colors.shadow.color,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            Informasi Sensor
          </Text>
          <View style={styles.sensorGrid}>
            {/* ID device ESP32 */}
            <View style={styles.sensorItem}>
              <Text style={[styles.sensorLabel, { color: colors.gray600 }]}>
                Device ID
              </Text>
              <Text style={[styles.sensorValue, { color: colors.gray900 }]}>
                {kapasitasData.deviceId || 'Tidak terhubung'}
              </Text>
            </View>
            {/* Waktu update terakhir dari sensor */}
            <View style={styles.sensorItem}>
              <Text style={[styles.sensorLabel, { color: colors.gray600 }]}>
                Update Terakhir
              </Text>
              <Text style={[styles.sensorValue, { color: colors.gray900 }]}>
                {formatLastUpdated(kapasitasData.lastUpdated)}
              </Text>
            </View>
          </View>
        </View>

        {/* Kartu Informasi - Penjelasan cara kerja sistem */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.white,
              shadowColor: colors.shadow.color,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            Informasi
          </Text>
          {/* Info tentang sensor ultrasonik */}
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📏</Text>
            <Text style={[styles.infoText, { color: colors.gray600 }]}>
              Sensor ultrasonik mengukur ketinggian paket secara real-time dan memperbarui data otomatis.
            </Text>
          </View>
          {/* Info tentang update otomatis */}
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🔄</Text>
            <Text style={[styles.infoText, { color: colors.gray600 }]}>
              Data kapasitas diperbarui langsung oleh ESP32 setiap kali ada perubahan ketinggian paket.
            </Text>
          </View>
          {/* Info tentang monitoring 24/7 */}
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⚡</Text>
            <Text style={[styles.infoText, { color: colors.gray600 }]}>
              Sistem monitoring berjalan 24/7 untuk memastikan akurasi data kapasitas box.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Modal untuk pengaturan kapasitas maksimal */}
      <MaxCapacityModal
        visible={showMaxCapacityModal}
        onClose={() => setShowMaxCapacityModal(false)}
        currentMaxHeight={kapasitasData.maxHeight}
        onUpdate={handleMaxCapacityUpdate}
      />
      
      {/* Modal untuk pengaturan mode tampilan kapasitas */}
      <CapacitySettingsModal
        visible={showCapacitySettingsModal}
        onClose={() => setShowCapacitySettingsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
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
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTexts: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: "right",
  },
  detailCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  detailGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: 8,
  },
  detailItem: {
    flex: 1,
    minWidth: 100,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
    position: 'relative',
  },
  clickableItem: {
    // Styling for clickable items
  },
  clickableIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clickableIcon: {
    fontSize: 10,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  detailValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailUnit: {
    fontSize: 12,
  },
  sensorCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorGrid: {
    gap: 12,
  },
  sensorItem: {
    paddingVertical: 8,
  },
  sensorLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  sensorValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 12,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default KapasitasPaket;
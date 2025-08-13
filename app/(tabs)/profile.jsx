/**
 * Profile Screen - Halaman profil pengguna
 * 
 * Halaman ini menampilkan:
 * - Informasi profil pengguna (nama, telepon, email)
 * - Informasi akun (User ID, role, kode RFID)
 * - Aksi pengguna (edit profil, lihat QR code, logout)
 * - Avatar dan badge role
 * 
 * Features:
 * - Display profil lengkap dengan role-based theming
 * - QR Code modal untuk identifikasi pengguna
 * - Edit profil dengan navigasi ke halaman edit
 * - Logout dengan konfirmasi
 * - Pull-to-refresh untuk data terbaru
 * - RFID code display untuk pairing hardware
 * 
 * Security:
 * - Display informasi sensitif hanya untuk pemilik
 * - Logout aman dengan pembersihan session
 * - Role-based color theming
 * 
 * @component Profile
 * @returns {JSX.Element} Halaman profil pengguna
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useNotification } from "../../contexts/NotificationContext";
import Button from "../../components/ui/Button";
import UserQRModal from "../../components/ui/UserQRModal";
import UserQRModalSimple from "../../components/ui/UserQRModalSimple";
import UserQRModalTest from "../../components/ui/UserQRModalTest";
import UserQRModalDebug from "../../components/ui/UserQRModalDebug";
import UserQRModalWorking from "../../components/ui/UserQRModalWorking";
import { signOutUser } from "../../services/authService";
import { getColors, getThemeByRole } from "../../constants/Colors";

/**
 * Komponen utama halaman Profile
 * Mengelola state dan logika untuk tampilan profil pengguna
 */
function Profile() {
  // Context dan hooks untuk autentikasi, tema, dan navigasi
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const { theme, encryptionMode, changeEncryptionMode, loading: settingsLoading } = useSettings();
  const { showNotification } = useNotification();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State untuk loading dan modal
  const [loggingOut, setLoggingOut] = useState(false);      // Loading saat logout
  const [refreshing, setRefreshing] = useState(false);      // Loading saat pull-to-refresh
  const [userQrModalVisible, setUserQrModalVisible] = useState(false); // Visibility untuk UserQR modal
  
  // Warna berdasarkan role pengguna (admin atau user)
  const colors = getThemeByRole(userProfile?.role === 'admin');

  /**
   * Handler untuk pull-to-refresh
   * Memperbarui data profil pengguna dari server
   */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshProfile) {
        await refreshProfile(); // Refresh profil dari Firebase
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
    setRefreshing(false);
  }, [refreshProfile]);

  /**
   * Handler untuk logout dengan konfirmasi
   * Menampilkan alert konfirmasi sebelum logout
   */
  const handleLogout = async () => {
    Alert.alert("Konfirmasi Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          // Proses logout melalui auth service
          const result = await signOutUser();
          if (result.success) {
            // Redirect ke halaman login setelah logout berhasil
            router.replace("/(auth)/login");
          } else {
            Alert.alert("Gagal Logout", "Gagal keluar. Silakan coba lagi.");
          }
          setLoggingOut(false);
        },
      },
    ]);
  };

  /**
   * Handler untuk navigasi ke halaman edit profil
   */
  const handleEditProfile = () => {
    router.push("/(tabs)/edit-profile"); // Navigasi ke halaman edit (tab tersembunyi)
  };

  /**
   * Handler untuk hidden toggle encryption mode
   * Dipanggil saat avatar profile di-tap
   */
  const handleHiddenEncryptionToggle = async () => {
    const newMode = encryptionMode === 'encrypted' ? 'plain' : 'encrypted';
    await changeEncryptionMode(newMode);
    
    // Show toast notification
    const modeText = newMode === 'encrypted' ? 'Terenkripsi' : 'Plain Text';
    showNotification(
      `Mode QR Code: ${modeText}`,
      'info'
    );
  };


  /**
   * Handler untuk menampilkan modal User QR Code (Dynamic)
   * Dynamic QR Code dengan enkripsi untuk enhanced security
   */
  const handleShowUserQR = () => {
    console.log('HandleShowUserQR called');
    console.log('UserProfile:', userProfile);
    setUserQrModalVisible(true);
    console.log('UserQrModalVisible set to:', true);
  };

  if (settingsLoading) {
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
            Memuat profil...
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
        <View style={styles.content}>
          {/* Seksi profil dengan avatar dan info dasar */}
          <View style={styles.profileSection}>
            {/* Avatar dengan background warna sesuai encryption mode - tappable for hidden toggle */}
            <TouchableOpacity
              style={[
                styles.avatarContainer,
                { backgroundColor: encryptionMode === 'encrypted' ? '#3B82F6' : '#10B981' }, // Biru untuk encrypted, hijau untuk plain
              ]}
              onPress={handleHiddenEncryptionToggle}
              activeOpacity={0.7}
            >
              <Text style={[styles.avatarText, { color: colors.white }]}>
                👤
              </Text>
            </TouchableOpacity>
            {/* Nama pengguna */}
            <Text style={[styles.nameText, { color: colors.gray900 }]}>
              {userProfile?.nama || "Nama User"}
            </Text>
            {/* Badge role pengguna */}
            <Text style={[styles.roleText, { color: colors.gray600 }]}>
              {userProfile?.role === 'admin' ? 'Administrator' : 'Pengguna'}
            </Text>
          </View>

          {userProfile && (
            <View style={styles.profileContainer}>
              {/* Kartu Informasi Pengguna */}
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: colors.white,
                    shadowColor: colors.shadow.color,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
                  Informasi Pengguna
                </Text>

                {/* Baris nama lengkap */}
                <View
                  style={[
                    styles.profileRow,
                    { borderBottomColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.gray600 }]}>
                    Nama Lengkap:
                  </Text>
                  <Text style={[styles.value, { color: colors.gray900 }]}>
                    {userProfile.nama}
                  </Text>
                </View>

                {/* Baris nomor telepon */}
                <View
                  style={[
                    styles.profileRow,
                    { borderBottomColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.gray600 }]}>
                    No Telepon:
                  </Text>
                  <Text style={[styles.value, { color: colors.gray900 }]}>
                    {userProfile.noTelp}
                  </Text>
                </View>

                {/* Baris email (tidak bisa diubah) */}
                <View
                  style={[
                    styles.profileRow,
                    { borderBottomColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.gray600 }]}>
                    Email:
                  </Text>
                  <Text style={[styles.value, { color: colors.gray900 }]}>
                    {userProfile.email}
                  </Text>
                </View>
              </View>

              {/* Kartu Informasi Akun */}
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: colors.white,
                    shadowColor: colors.shadow.color,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
                  Informasi Akun
                </Text>

                {/* Baris User ID untuk debugging dan support */}
                <View
                  style={[
                    styles.profileRow,
                    { borderBottomColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.gray600 }]}>
                    User ID:
                  </Text>
                  <Text
                    style={[
                      styles.value,
                      styles.userId, // Font monospace untuk ID
                      { color: colors.gray900 },
                    ]}
                  >
                    {userProfile.id}
                  </Text>
                </View>

                {/* Baris role pengguna */}
                <View
                  style={[
                    styles.profileRow,
                    { borderBottomColor: colors.gray100 },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.gray600 }]}>
                    Role:
                  </Text>
                  <Text style={[styles.value, { color: colors.gray900 }]}>
                    {userProfile.role === 'admin' ? 'Administrator' : 'Pengguna'}
                  </Text>
                </View>

              </View>
            </View>
          )}

          {/* Container aksi pengguna */}
          <View style={styles.actionsContainer}>
            {/* Tombol edit profil */}
            <Button
              title="Edit Profil"
              onPress={handleEditProfile}
              style={styles.editButton}
            />

            {/* Tombol QR Code dinamis (Enhanced Security) */}
            <Button
              title="Kode Saya"
              onPress={handleShowUserQR}
              variant="outline"
              style={[styles.userQrButton, { borderColor: colors.primary }]}
            />


            {/* Tombol logout dengan loading state */}
            <Button
              title={loggingOut ? "Sedang Keluar..." : "Keluar"}
              onPress={handleLogout}
              variant="outline"
              style={[styles.logoutButton, { borderColor: colors.primary }]}
              disabled={loggingOut} // Disable saat sedang logout
            />
          </View>
        </View>
      </ScrollView>

      {/* Modal User QR Code dinamis dengan enkripsi */}
      <UserQRModalWorking
        visible={userQrModalVisible}
        onClose={() => setUserQrModalVisible(false)}
        userProfile={userProfile} // Complete user profile untuk encryption
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
    paddingTop: 40,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  roleText: {
    fontSize: 14,
  },
  profileContainer: {
    marginBottom: 32,
  },
  profileCard: {
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
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 14,
    flex: 2,
    textAlign: "right",
  },
  userId: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  actionsContainer: {
    gap: 12,
  },
  editButton: {
    marginBottom: 8,
  },
  userQrButton: {
    marginBottom: 8,
  },
  logoutButton: {
    marginBottom: 8,
  },
});

export default Profile;

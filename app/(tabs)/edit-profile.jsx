/**
 * Edit Profile Screen - Halaman edit profil pengguna
 * 
 * Halaman ini memungkinkan pengguna untuk:
 * - Mengedit nama lengkap
 * - Mengedit nomor telepon
 * - Melihat informasi yang tidak bisa diubah (email)
 * - Menyimpan perubahan dengan validasi
 * 
 * Features:
 * - Validasi form real-time
 * - Keyboard avoiding untuk mobile UX
 * - Pull-to-refresh untuk data terbaru
 * - Loading states untuk feedback visual
 * - Alert konfirmasi setelah berhasil update
 * 
 * Security:
 * - Hanya data yang diizinkan yang bisa diubah
 * - Email tidak bisa diubah melalui form ini
 * - Validasi ownership melalui autentikasi
 * 
 * @component EditProfile
 * @returns {JSX.Element} Halaman edit profil
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingsContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { updateUserProfile } from "../../services/userService";
import { getColors, getThemeByRole } from "../../constants/Colors";

/**
 * Komponen utama halaman Edit Profile
 * Mengelola state dan logika untuk edit profil pengguna
 */
export default function EditProfile() {
  // Context dan hooks untuk autentikasi, tema, dan navigasi
  const { userProfile, refreshProfile } = useAuth();
  const { theme, loading: settingsLoading } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = getThemeByRole(false); // Selalu menggunakan tema user

  // State untuk loading dan refresh
  const [loading, setLoading] = useState(false);        // Loading saat menyimpan
  const [refreshing, setRefreshing] = useState(false);  // Loading saat pull-to-refresh
  
  // State untuk data form dengan nilai default dari profil
  const [formData, setFormData] = useState({
    nama: userProfile?.nama || "",     // Nama lengkap pengguna
    noTelp: userProfile?.noTelp || "", // Nomor telepon pengguna
  });
  
  // State untuk error validasi form
  const [errors, setErrors] = useState({});

  /**
   * Handler untuk pull-to-refresh
   * Memperbarui profil pengguna dan reset form data
   */
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshProfile) {
        // Refresh profil dari server
        await refreshProfile();
        // Reset form dengan data terbaru
        setFormData({
          nama: userProfile?.nama || "",
          noTelp: userProfile?.noTelp || "",
        });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
    setRefreshing(false);
  }, [refreshProfile, userProfile]);

  /**
   * Memperbarui data form dan menghapus error jika ada
   * 
   * @param {string} field - Nama field yang diupdate
   * @param {string} value - Nilai baru untuk field
   */
  const updateFormData = (field, value) => {
    // Update nilai field
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Hapus error untuk field ini jika ada
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  /**
   * Validasi form sebelum submit
   * 
   * @returns {boolean} True jika form valid, false jika ada error
   */
  const validateForm = () => {
    const newErrors = {};

    // Validasi nama lengkap (wajib diisi)
    if (!formData.nama.trim()) {
      newErrors.nama = "Nama lengkap wajib diisi";
    }

    // Validasi nomor telepon (wajib diisi dan format valid)
    if (!formData.noTelp.trim()) {
      newErrors.noTelp = "Nomor telepon wajib diisi";
    } else if (!/^[0-9+\-\s]+$/.test(formData.noTelp)) {
      // Regex untuk format nomor telepon (angka, +, -, spasi)
      newErrors.noTelp = "Format nomor telepon tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler untuk menyimpan perubahan profil
   * Melakukan validasi, update ke server, dan refresh data
   */
  const handleSave = async () => {
    // Validasi form terlebih dahulu
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Update profil melalui service
      const result = await updateUserProfile(userProfile.id, formData);

      if (result.success) {
        // Refresh profil untuk mendapat data terbaru
        await refreshProfile();
        
        // Tampilkan alert sukses dan kembali ke halaman sebelumnya
        Alert.alert(
          "Profil Berhasil Diperbarui",
          "Perubahan profil telah disimpan!",
          [
            {
              text: "OK",
              onPress: () => router.back(), // Kembali ke halaman profil
            },
          ]
        );
      } else {
        Alert.alert("Gagal Memperbarui", result.error);
      }
    } catch (error) {
      Alert.alert("Gagal Memperbarui", "Terjadi kesalahan. Silakan coba lagi.");
    }

    setLoading(false);
  };

  if (settingsLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.white,
              borderBottomColor: colors.gray200,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Kembali
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
            Edit Profil
          </Text>
        </View>
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
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.white,
              borderBottomColor: colors.gray200,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              ← Kembali
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
            Edit Profil
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
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
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.gray900, borderBottomColor: colors.primary },
                ]}
              >
                Informasi Pengguna
              </Text>

              {/* Input nama lengkap dengan validasi */}
              <Input
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap Anda"
                value={formData.nama}
                onChangeText={(value) => updateFormData("nama", value)}
                autoCapitalize="words" // Kapitalisasi otomatis untuk nama
                error={errors.nama}
              />

              {/* Input nomor telepon dengan keyboard khusus dan validasi */}
              <Input
                label="Nomor Telepon"
                placeholder="Masukkan nomor telepon Anda"
                value={formData.noTelp}
                onChangeText={(value) => updateFormData("noTelp", value)}
                keyboardType="phone-pad" // Keyboard khusus untuk nomor telepon
                error={errors.noTelp}
              />
            </View>

            <View style={styles.section}>
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                {/* Info tentang batasan edit email */}
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  ℹ️ Email tidak dapat diubah melalui form ini
                </Text>
              </View>
            </View>

            <View style={styles.buttonSection}>
              {/* Tombol batal dengan outline style */}
              <Button
                title="Batal"
                onPress={() => router.back()}
                variant="outline"
                style={[styles.cancelButton, { borderColor: colors.primary }]}
                disabled={loading} // Disable saat sedang menyimpan
              />

              {/* Tombol simpan dengan loading state */}
              <Button
                title={loading ? "Menyimpan..." : "Simpan Perubahan"}
                onPress={handleSave}
                disabled={loading} // Disable saat sedang menyimpan
                style={[styles.saveButton, { backgroundColor: colors.success }]}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
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
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

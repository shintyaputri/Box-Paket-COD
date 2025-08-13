/**
 * Halaman Forgot Password - Komponen untuk reset password pengguna
 * 
 * Halaman ini menyediakan antarmuka untuk pengguna yang lupa password
 * dengan mengirimkan email reset password melalui Firebase Auth.
 * Dilengkapi dengan validasi email, penanganan berbagai jenis error,
 * dan feedback yang jelas kepada pengguna.
 * 
 * Fitur utama:
 * - Form input email dengan validasi format
 * - Integrasi Firebase Auth untuk reset password
 * - Error handling dengan pesan spesifik untuk berbagai kasus
 * - Loading state dengan disable tombol
 * - Success state dengan notifikasi email terkirim
 * - Layout responsif dengan keyboard avoidance
 * - Ilustrasi kustom untuk meningkatkan UX
 * - Navigasi kembali ke halaman login
 * 
 * Error cases yang ditangani:
 * - Email tidak terdaftar (auth/user-not-found)
 * - Terlalu banyak percobaan (auth/too-many-requests)
 * - Tidak ada koneksi internet (auth/network-request-failed)
 * 
 * @author Sistem Paket Delivery
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ForgotPasswordIllustration from '../../components/illustrations/ForgotPasswordIllustration';
import IllustrationContainer from '../../components/ui/IllustrationContainer';

/**
 * Komponen ForgotPassword - Halaman untuk reset password
 * 
 * @returns {JSX.Element} Komponen React yang menampilkan form reset password
 */
export default function ForgotPassword() {
  // ===== STATE MANAGEMENT =====
  const [email, setEmail] = useState(''); // Input email pengguna
  const [loading, setLoading] = useState(false); // Status loading untuk disable tombol dan tampilkan spinner
  const [errors, setErrors] = useState({}); // Object untuk menyimpan pesan error validasi form
  const [emailSent, setEmailSent] = useState(false); // Flag untuk menandai email reset sudah terkirim
  
  // ===== HOOKS & NAVIGATION =====
  const router = useRouter(); // Router untuk navigasi antar halaman

  /**
   * Fungsi validasi form reset password
   * 
   * Memvalidasi input email sebelum mengirim request reset password.
   * Mengecek keberadaan email dan format email yang valid.
   * 
   * @returns {boolean} true jika validasi berhasil, false jika ada error
   */
  const validateForm = () => {
    const newErrors = {}; // Object untuk menampung semua error validasi
    
    // Validasi email
    if (!email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      // Regex untuk memvalidasi format email standar
      newErrors.email = 'Format email tidak valid';
    }
    
    // Set error ke state untuk ditampilkan di UI
    setErrors(newErrors);
    // Return true jika tidak ada error (object kosong)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler untuk proses reset password
   * 
   * Menangani submit form reset password dengan validasi, loading state,
   * dan error handling yang komprehensif. Menggunakan Firebase Auth
   * untuk mengirim email reset password.
   * 
   * @async
   * @function
   */
  const handleResetPassword = async () => {
    // Validasi form sebelum melanjutkan proses reset password
    if (!validateForm()) return;
    
    setLoading(true); // Aktifkan loading state
    try {
      // Kirim email reset password menggunakan Firebase Auth
      await sendPasswordResetEmail(auth, email.trim());
      setEmailSent(true); // Set flag email terkirim
      
      // Tampilkan dialog sukses dengan instruksi lengkap
      Alert.alert(
        'Email Terkirim',
        'Link reset password telah dikirim ke email Anda. Silakan cek inbox dan folder spam.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      // Log error untuk debugging
      console.error('Password reset error:', error);
      
      // Default error message
      let errorMessage = 'Terjadi kesalahan saat mengirim email reset password';
      
      // Penanganan error spesifik berdasarkan error code Firebase
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email tidak terdaftar dalam sistem';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Terlalu banyak percobaan. Silakan coba lagi nanti';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Tidak ada koneksi internet. Silakan coba lagi';
      }
      
      // Tampilkan alert error kepada pengguna
      Alert.alert('Reset Password Gagal', errorMessage);
    } finally {
      // Selalu nonaktifkan loading state di akhir
      setLoading(false);
    }
  };

  // ===== RENDER LOADING STATE =====
  // Jika sedang loading, tampilkan hanya spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // ===== RENDER MAIN UI =====
  return (
    // Container utama dengan keyboard avoidance untuk pengalaman yang lebih baik
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ScrollView untuk memastikan konten dapat di-scroll jika keyboard muncul */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Ilustrasi custom untuk forgot password */}
          <IllustrationContainer>
            <ForgotPasswordIllustration width={250} height={180} />
          </IllustrationContainer>
          
          {/* Header section dengan judul dan deskripsi */}
          <Text style={styles.title}>Lupa Password</Text>
          <Text style={styles.subtitle}>
            Masukkan email Anda dan kami akan mengirimkan link untuk reset password
          </Text>
          
          {/* Form input section */}
          <View style={styles.inputContainer}>
            {/* Input email dengan validasi */}
            <Input
              label="Email"
              placeholder="Masukkan email Anda"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
          </View>
          
          {/* Tombol submit untuk kirim email reset */}
          <Button
            title="Kirim Link Reset"
            onPress={handleResetPassword}
            style={styles.resetButton}
            disabled={loading || emailSent} // Disable jika sedang loading atau email sudah terkirim
          />
          
          {/* Link untuk kembali ke halaman login */}
          <View style={styles.backContainer}>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.backLink}>← Kembali ke Login</Text>
            </TouchableOpacity>
          </View>
          
          {/* Notifikasi sukses jika email sudah terkirim */}
          {emailSent && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Email telah dikirim! Silakan cek inbox Anda.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ===== STYLESHEET =====
/**
 * StyleSheet untuk komponen ForgotPassword
 * Menggunakan React Native StyleSheet untuk styling yang konsisten
 * dan performa yang optimal
 */
const styles = StyleSheet.create({
  // Container utama halaman
  container: {
    flex: 1,
    backgroundColor: '#fff', // Background putih untuk konsistensi
  },
  
  // Container untuk ScrollView
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 100, // Padding bawah ekstra untuk mencegah overlap dengan keyboard
  },
  
  // Container untuk form dan konten utama
  formContainer: {
    justifyContent: 'center',
    maxWidth: 400, // Maksimum lebar untuk desktop/tablet
    alignSelf: 'center',
    width: '100%',
    minHeight: '80%', // Minimum tinggi untuk memastikan layout yang baik
  },
  
  // Placeholder untuk ilustrasi (tidak digunakan karena menggunakan IllustrationContainer)
  illustration: {
    marginBottom: 24,
  },
  
  // Styling untuk judul utama
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333', // Warna teks gelap untuk kontras yang baik
  },
  
  // Styling untuk subtitle/deskripsi
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666', // Warna teks abu-abu untuk hierarchy visual
    lineHeight: 24, // Line height untuk readability
  },
  
  // Container untuk input field
  inputContainer: {
    marginBottom: 24,
  },
  
  // Styling untuk tombol reset password
  resetButton: {
    marginBottom: 32,
  },
  
  // Container untuk link kembali ke login
  backContainer: {
    alignSelf: 'center',
    marginBottom: 20, // Margin bawah untuk mencegah overlap
  },
  
  // Styling untuk link kembali
  backLink: {
    fontSize: 14,
    color: '#378e40', // Warna hijau sesuai tema aplikasi
    fontWeight: '600',
  },
  
  // Container untuk notifikasi sukses
  successContainer: {
    backgroundColor: '#378e40', // Background hijau untuk indikasi sukses
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#378e40', // Border yang sama dengan background
  },
  
  // Styling untuk teks notifikasi sukses
  successText: {
    color: '#ffffff', // Teks putih untuk kontras dengan background hijau
    textAlign: 'center',
    fontSize: 14,
  },
});
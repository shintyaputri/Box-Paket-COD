/**
 * Halaman Register - Komponen untuk pendaftaran pengguna baru
 * 
 * Halaman ini menyediakan formulir pendaftaran lengkap untuk pengguna baru
 * dengan validasi form yang komprehensif, penanganan error, dan navigasi
 * otomatis ke halaman login setelah berhasil mendaftar.
 * 
 * Fitur utama:
 * - Form registrasi dengan 5 field (nama, email, nomor telepon, password, konfirmasi password)
 * - Validasi real-time untuk semua input field
 * - Validasi format email dan nomor telepon
 * - Konfirmasi password untuk memastikan kecocokan
 * - Loading state dengan spinner
 * - Error handling dengan pesan yang user-friendly
 * - Layout responsif dengan keyboard avoidance
 * - Ilustrasi kustom untuk meningkatkan UX
 * - Auto-clear error saat pengguna mulai mengetik
 * 
 * @author Sistem Paket Delivery
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Box,
  ScrollView,
  Pressable,
  Center
} from '@gluestack-ui/themed';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import RegisterIllustration from '../../components/illustrations/RegisterIllustration';
import IllustrationContainer from '../../components/ui/IllustrationContainer';

/**
 * Komponen Register - Halaman pendaftaran pengguna baru
 * 
 * @returns {JSX.Element} Komponen React yang menampilkan form registrasi
 */
export default function Register() {
  // ===== STATE MANAGEMENT =====
  /**
   * Form data object yang menyimpan semua input field registrasi
   * @typedef {Object} FormData
   * @property {string} nama - Nama lengkap pengguna
   * @property {string} email - Alamat email pengguna
   * @property {string} password - Password yang dipilih pengguna
   * @property {string} confirmPassword - Konfirmasi password untuk validasi
   * @property {string} noTelp - Nomor telepon pengguna
   */
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    password: '',
    confirmPassword: '',
    noTelp: '',
  });
  const [loading, setLoading] = useState(false); // Status loading untuk disable tombol dan tampilkan spinner
  const [errors, setErrors] = useState({}); // Object untuk menyimpan pesan error validasi form
  
  // ===== HOOKS & CONTEXTS =====
  const { register } = useAuth(); // Fungsi register dari AuthContext
  const router = useRouter(); // Router untuk navigasi antar halaman

  /**
   * Fungsi validasi form registrasi
   * 
   * Memvalidasi semua input field termasuk format email, nomor telepon,
   * panjang password, dan kecocokan konfirmasi password.
   * 
   * @returns {boolean} true jika semua validasi berhasil, false jika ada error
   */
  const validateForm = () => {
    const newErrors = {}; // Object untuk menampung semua error validasi
    
    // Validasi nama lengkap
    if (!formData.nama.trim()) {
      newErrors.nama = 'Nama wajib diisi';
    }
    
    // Validasi email
    if (!formData.email) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      // Regex untuk memvalidasi format email standar
      newErrors.email = 'Format email tidak valid';
    }
    
    // Validasi password
    if (!formData.password) {
      newErrors.password = 'Password wajib diisi';
    } else if (formData.password.length < 6) {
      // Minimum 6 karakter untuk keamanan dasar
      newErrors.password = 'Password minimal 6 karakter';
    }
    
    // Validasi konfirmasi password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Konfirmasi password wajib diisi';
    } else if (formData.password !== formData.confirmPassword) {
      // Pastikan kedua password sama persis
      newErrors.confirmPassword = 'Password tidak cocok';
    }
    
    // Validasi nomor telepon
    if (!formData.noTelp.trim()) {
      newErrors.noTelp = 'Nomor telepon wajib diisi';
    } else if (!/^[0-9+\-\s]+$/.test(formData.noTelp)) {
      // Regex untuk validasi format nomor telepon (angka, +, -, spasi)
      newErrors.noTelp = 'Format nomor telepon tidak valid';
    }
    
    // Set error ke state untuk ditampilkan di UI
    setErrors(newErrors);
    // Return true jika tidak ada error (object kosong)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler untuk proses registrasi
   * 
   * Menangani submit form registrasi dengan validasi, loading state, dan error handling.
   * Setelah berhasil registrasi, pengguna akan diarahkan ke halaman login.
   * 
   * @async
   * @function
   */
  const handleRegister = async () => {
    // Validasi form sebelum melanjutkan proses registrasi
    if (!validateForm()) return;
    
    setLoading(true); // Aktifkan loading state
    try {
      // Panggil fungsi register dari AuthContext dengan data yang sudah di-trim
      await register({
        nama: formData.nama.trim(),
        email: formData.email.trim(),
        password: formData.password,
        noTelp: formData.noTelp.trim(),
      });
      
      // Tampilkan dialog sukses dan navigasi ke login
      Alert.alert(
        'Registrasi Berhasil',
        'Akun Anda telah berhasil dibuat. Silakan login.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      // Log error untuk debugging
      console.error('Registration error:', error);
      // Tampilkan alert error kepada pengguna
      Alert.alert('Registrasi Gagal', error.message || 'Terjadi kesalahan saat registrasi');
    } finally {
      // Selalu nonaktifkan loading state di akhir
      setLoading(false);
    }
  };

  /**
   * Fungsi helper untuk update form data
   * 
   * Mengupdate field tertentu dalam formData state dan menghapus error
   * untuk field tersebut jika ada (real-time error clearing).
   * 
   * @param {string} field - Nama field yang akan diupdate
   * @param {string} value - Nilai baru untuk field tersebut
   */
  const updateFormData = (field, value) => {
    // Update nilai field dalam formData
    setFormData(prev => ({ ...prev, [field]: value }));
    // Hapus error untuk field ini jika ada (memberikan feedback real-time)
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Box flex={1} bg="$white">
        {/* ScrollView untuk memastikan konten dapat di-scroll jika keyboard muncul */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
          <Center>
            <VStack space="lg" maxWidth="$96" width="$full">
              {/* Ilustrasi custom untuk registrasi */}
              <IllustrationContainer>
                <RegisterIllustration width={250} height={180} />
              </IllustrationContainer>
              
              {/* Header section dengan judul dan subtitle */}
              <VStack space="sm" alignItems="center">
                <Heading size="2xl" color="$textLight900">
                  Daftar
                </Heading>
                <Text color="$textLight600" textAlign="center">
                  Buat akun baru untuk mulai menggunakan aplikasi
                </Text>
              </VStack>
              
              {/* Form input section dengan 5 field */}
              <VStack space="md">
                {/* Input nama lengkap */}
                <Input
                  label="Nama Lengkap"
                  placeholder="Masukkan nama lengkap Anda"
                  value={formData.nama}
                  onChangeText={(value) => updateFormData('nama', value)}
                  error={errors.nama}
                />
                
                {/* Input email dengan validasi */}
                <Input
                  label="Email"
                  placeholder="Masukkan email Anda"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                
                {/* Input nomor telepon dengan keyboard khusus */}
                <Input
                  label="Nomor Telepon"
                  placeholder="Masukkan nomor telepon Anda"
                  value={formData.noTelp}
                  onChangeText={(value) => updateFormData('noTelp', value)}
                  keyboardType="phone-pad"
                  error={errors.noTelp}
                />
                
                {/* Input password dengan secure text entry */}
                <Input
                  label="Password"
                  placeholder="Masukkan password Anda"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  secureTextEntry
                  error={errors.password}
                />
                
                {/* Input konfirmasi password untuk validasi */}
                <Input
                  label="Konfirmasi Password"
                  placeholder="Masukkan ulang password Anda"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  secureTextEntry
                  error={errors.confirmPassword}
                />
              </VStack>
              
              {/* Tombol submit registrasi */}
              <Button
                title="Daftar"
                onPress={handleRegister}
                isDisabled={loading}
              />
              
              {/* Link untuk kembali ke halaman login */}
              <HStack justifyContent="center" alignItems="center" space="xs">
                <Text color="$textLight600" fontSize="$sm">
                  Sudah punya akun?
                </Text>
                <Pressable onPress={() => router.push('/(auth)/login')}>
                  <Text color="$primary600" fontSize="$sm" fontWeight="$semibold">
                    Masuk di sini
                  </Text>
                </Pressable>
              </HStack>
            </VStack>
          </Center>
        </ScrollView>
      </Box>
    </KeyboardAvoidingView>
  );
}


/**
 * Halaman Login - Komponen untuk autentikasi pengguna masuk
 * 
 * Halaman ini menyediakan antarmuka untuk pengguna melakukan login ke aplikasi
 * dengan validasi form, penanganan error, dan navigasi otomatis setelah berhasil login.
 * Mendukung akun admin khusus untuk development (admin@gmail.com dengan password apapun).
 * 
 * Fitur utama:
 * - Validasi email dan password secara real-time
 * - Penanganan error dengan pesan yang user-friendly
 * - Loading state dengan spinner
 * - Navigasi ke halaman lupa password dan registrasi
 * - Layout responsif dengan keyboard avoidance
 * - Ilustrasi kustom untuk meningkatkan UX
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
import LoginIllustration from '../../components/illustrations/LoginIllustration';
import IllustrationContainer from '../../components/ui/IllustrationContainer';

/**
 * Komponen Login - Halaman utama untuk autentikasi pengguna
 * 
 * @returns {JSX.Element} Komponen React yang menampilkan form login
 */
export default function Login() {
  // ===== STATE MANAGEMENT =====
  const [email, setEmail] = useState(''); // Input email pengguna
  const [password, setPassword] = useState(''); // Input password pengguna
  const [loading, setLoading] = useState(false); // Status loading untuk disable tombol dan tampilkan spinner
  const [errors, setErrors] = useState({}); // Object untuk menyimpan pesan error validasi form
  
  // ===== HOOKS & CONTEXTS =====
  const { login } = useAuth(); // Fungsi login dari AuthContext
  const router = useRouter(); // Router untuk navigasi antar halaman

  /**
   * Fungsi validasi form login
   * 
   * Memvalidasi input email dan password sebelum dikirim ke server.
   * Mengecek format email, keberadaan password, dan panjang minimum password.
   * 
   * @returns {boolean} true jika semua validasi berhasil, false jika ada error
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
    
    // Validasi password
    if (!password) {
      newErrors.password = 'Password wajib diisi';
    } else if (password.length < 6) {
      // Minimum 6 karakter untuk keamanan dasar
      newErrors.password = 'Password minimal 6 karakter';
    }
    
    // Set error ke state untuk ditampilkan di UI
    setErrors(newErrors);
    // Return true jika tidak ada error (object kosong)
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handler untuk proses login
   * 
   * Menangani submit form login dengan validasi, loading state, dan error handling.
   * Setelah berhasil login, pengguna akan diarahkan ke halaman utama (tabs).
   * 
   * @async
   * @function
   */
  const handleLogin = async () => {
    // Validasi form sebelum melanjutkan proses login
    if (!validateForm()) return;
    
    setLoading(true); // Aktifkan loading state
    try {
      // Panggil fungsi login dari AuthContext dengan email yang sudah di-trim
      await login(email.trim(), password);
      // Navigasi ke halaman utama setelah berhasil login
      router.replace('/(tabs)');
    } catch (error) {
      // Log error untuk debugging
      console.error('Login error:', error);
      // Tampilkan alert error kepada pengguna
      Alert.alert('Login Gagal', error.message || 'Terjadi kesalahan saat login');
    } finally {
      // Selalu nonaktifkan loading state di akhir
      setLoading(false);
    }
  };

  // ===== RENDER LOADING STATE =====
  // Jika sedang loading, tampilkan hanya spinner di tengah layar
  if (loading) {
    return (
      <Box flex={1} bg="$white" justifyContent="center" alignItems="center">
        <LoadingSpinner />
      </Box>
    );
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
              {/* Ilustrasi custom untuk login */}
              <IllustrationContainer>
                <LoginIllustration width={250} height={180} />
              </IllustrationContainer>
              
              {/* Header section dengan judul dan subtitle */}
              <VStack space="sm" alignItems="center">
                <Heading size="2xl" color="$textLight900">
                  Masuk
                </Heading>
                <Text color="$textLight600" textAlign="center">
                  Silakan masuk ke akun Anda
                </Text>
              </VStack>
              
              {/* Form input section */}
              <VStack space="md">
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
                
                {/* Input password dengan secure text entry */}
                <Input
                  label="Password"
                  placeholder="Masukkan password Anda"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  error={errors.password}
                />
              </VStack>
              
              {/* Link lupa password */}
              <Pressable 
                alignSelf="flex-end"
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text color="$primary600" fontSize="$sm">
                  Lupa Password?
                </Text>
              </Pressable>
              
              {/* Tombol submit login */}
              <Button
                title="Masuk"
                onPress={handleLogin}
                isDisabled={loading}
              />
              
              {/* Link untuk registrasi akun baru */}
              <HStack justifyContent="center" alignItems="center" space="xs">
                <Text color="$textLight600" fontSize="$sm">
                  Belum punya akun?
                </Text>
                <Pressable onPress={() => router.push('/(auth)/register')}>
                  <Text color="$primary600" fontSize="$sm" fontWeight="$semibold">
                    Daftar di sini
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


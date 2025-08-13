/**
 * USER QR MODAL COMPONENT - Dynamic Encrypted QR Code Generator
 * 
 * Modal component yang menampilkan dynamic QR code untuk user profile identification.
 * QR code yang di-generate selalu berbeda setiap kali di-refresh, providing enhanced
 * security melalui timestamp, nonce, dan checksum validation.
 * 
 * Features:
 * - Dynamic QR generation yang selalu unique untuk same user data
 * - Real-time scanner mode status dari ESP32
 * - One-tap QR regeneration dengan visual feedback
 * - Generation counter dan timestamp display
 * - Security indicators (encryption status, algorithm info)
 * - Auto-refresh option dengan configurable interval
 * - ESP32 scanner mode control integration
 * 
 * Security Features:
 * - XOR + Caesar Cipher encryption dengan custom secret keys
 * - Timestamp validation untuk prevent old QR usage
 * - Nonce system untuk guarantee uniqueness setiap generate
 * - Role-based encryption (different keys untuk admin vs user)
 * - Real-time scanner mode management
 * 
 * @component UserQRModal
 * @param {boolean} visible - Modal visibility state
 * @param {Function} onClose - Callback untuk close modal
 * @param {Object} userProfile - User profile object dari AuthContext
 * @returns {JSX.Element} Dynamic QR modal component
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { getThemeByRole } from "../../constants/Colors";
import { 
  encryptUserProfile, 
  setScannerMode, 
  subscribeScannerMode, 
  trackQRGeneration,
  getEncryptionInfo 
} from "../../services/encryptionService";

const { width: screenWidth } = Dimensions.get("window");

/**
 * Main UserQRModal component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Modal visibility
 * @param {Function} props.onClose - Close callback
 * @param {Object} props.userProfile - User profile data
 */
function UserQRModal({ visible, onClose, userProfile }) {
  // Debug logging untuk troubleshooting
  console.log('UserQRModal rendered with:', { visible, userProfile: userProfile?.email });
  
  // State untuk QR code generation dan management
  const [qrCode, setQrCode] = useState('');                    // Encrypted QR string
  const [qrMetadata, setQrMetadata] = useState(null);         // QR generation metadata
  
  // Debug logging untuk state
  console.log('UserQRModal state:', { qrCodeLength: qrCode?.length, hasMetadata: !!qrMetadata });
  
  // Fallback colors jika theme loading bermasalah
  let colors;
  try {
    colors = getThemeByRole(userProfile?.role === 'admin');
  } catch (error) {
    console.error('Error getting theme colors:', error);
    colors = {
      white: '#FFFFFF',
      gray900: '#111827',
      gray600: '#4B5563',
      gray500: '#6B7280',
      gray200: '#E5E7EB',
      gray100: '#F3F4F6',
      primary: '#3B82F6'
    };
  }
  
  const [refreshCount, setRefreshCount] = useState(0);        // Generation counter
  const [isGenerating, setIsGenerating] = useState(false);    // Loading state untuk generation
  const [lastGenerated, setLastGenerated] = useState(null);   // Timestamp last generation
  
  // State untuk scanner mode management
  const [scannerMode, setScannerModeState] = useState('idle'); // Current ESP32 scanner mode
  const [isModeChanging, setIsModeChanging] = useState(false); // Loading state untuk mode change
  const [scannerStatus, setScannerStatus] = useState(null);   // Scanner status object
  
  // State untuk auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(false);      // Auto-refresh toggle
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(60); // Interval dalam detik
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0); // Countdown untuk next refresh
  
  // State untuk encryption info display
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false); // Toggle encryption details
  const [encryptionInfo, setEncryptionInfo] = useState(null); // Encryption algorithm info

  /**
   * Generate new QR code dengan dynamic encryption
   * 
   * Setiap kali dipanggil akan menghasilkan QR code yang berbeda
   * meskipun user data sama, thanks to timestamp dan nonce.
   */
  const generateNewQR = useCallback(async () => {
    console.log('generateNewQR called with userProfile:', userProfile?.email);
    
    if (!userProfile?.email) {
      console.error('generateNewQR: No user profile or email');
      Alert.alert('Error', 'User profile tidak valid');
      return;
    }
    
    console.log('generateNewQR: Starting generation...');
    setIsGenerating(true);
    
    try {
      console.log('generateNewQR: Calling encryptUserProfile...');
      // Generate encrypted QR code
      const result = await encryptUserProfile(userProfile);
      console.log('generateNewQR: encryptUserProfile result:', result);
      
      if (result.success) {
        console.log('generateNewQR: Setting QR code...', result.qrCode?.substring(0, 50) + '...');
        setQrCode(result.qrCode);
        setQrMetadata(result.metadata);
        setRefreshCount(prev => prev + 1);
        setLastGenerated(Date.now());
        console.log('generateNewQR: QR code set successfully');
        
        // Skip QR generation tracking - tidak perlu masuk aktivitas
        // QR generation is dynamic and frequent, no need to track statistics
        
        // Set scanner mode ke user_qr untuk 5 menit (optional)
        try {
          await setScannerMode('user_qr', userProfile.id, 300000);
        } catch (modeError) {
          console.warn('Failed to set scanner mode:', modeError);
          // Don't show error to user as this is optional functionality
        }
        
      } else {
        console.error('generateNewQR: encryptUserProfile failed:', result.error);
        Alert.alert('Error', result.error || 'Gagal membuat QR Code');
      }
      
    } catch (error) {
      console.error('generateNewQR: Exception caught:', error);
      Alert.alert('Error', 'Terjadi kesalahan saat membuat QR Code: ' + error.message);
    }
    
    console.log('generateNewQR: Setting isGenerating to false');
    setIsGenerating(false);
  }, [userProfile]);

  /**
   * Handle scanner mode change
   * 
   * @param {string} newMode - Mode baru ('user_qr', 'resi', atau 'idle')
   */
  const handleScannerModeChange = async (newMode) => {
    setIsModeChanging(true);
    
    try {
      const result = await setScannerMode(newMode, userProfile.id, 300000);
      
      if (result.success) {
        setScannerModeState(newMode);
        
        // Show feedback message
        const modeNames = {
          'user_qr': 'QR Pengguna',
          'resi': 'Scan Resi',
          'idle': 'Standby'
        };
        
        Alert.alert(
          'Mode Scanner Diubah',
          `Scanner ESP32 sekarang dalam mode: ${modeNames[newMode]}`,
          [{ text: 'OK' }]
        );
      } else {
        // Check if it's a Firebase initialization error
        if (result.error && result.error.includes('belum diinisialisasi')) {
          Alert.alert(
            'Informasi', 
            'Fitur scanner mode tidak tersedia saat ini. QR Code tetap dapat digunakan.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', result.error || 'Gagal mengubah mode scanner');
        }
      }
      
    } catch (error) {
      console.error('Error changing scanner mode:', error);
      Alert.alert(
        'Informasi', 
        'Fitur scanner mode tidak tersedia saat ini. QR Code tetap dapat digunakan.',
        [{ text: 'OK' }]
      );
    }
    
    setIsModeChanging(false);
  };

  /**
   * Handle auto-refresh toggle
   */
  const handleAutoRefreshToggle = (enabled) => {
    setAutoRefresh(enabled);
    if (enabled && qrCode) {
      setTimeUntilRefresh(autoRefreshInterval);
    } else {
      setTimeUntilRefresh(0);
    }
  };

  // Subscribe to scanner mode changes saat modal visible
  useEffect(() => {
    if (!visible) return;
    
    try {
      const unsubscribe = subscribeScannerMode((status) => {
        if (status.success) {
          setScannerModeState(status.mode || 'idle');
          setScannerStatus(status);
        } else {
          console.warn('Scanner mode subscription error:', status.error);
          // Set default values if subscription fails
          setScannerModeState('idle');
          setScannerStatus({ mode: 'idle', isActive: false });
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.warn('Failed to subscribe to scanner mode:', error);
      // Set default values if subscription setup fails
      setScannerModeState('idle');
      setScannerStatus({ mode: 'idle', isActive: false });
    }
  }, [visible]);

  // Auto-refresh countdown timer
  useEffect(() => {
    let interval = null;
    
    if (autoRefresh && timeUntilRefresh > 0) {
      interval = setInterval(() => {
        setTimeUntilRefresh(prev => {
          if (prev <= 1) {
            // Time to refresh!
            generateNewQR();
            return autoRefreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, timeUntilRefresh, autoRefreshInterval, generateNewQR]);

  // Load encryption info saat modal dibuka
  useEffect(() => {
    if (visible && !encryptionInfo) {
      const info = getEncryptionInfo();
      setEncryptionInfo(info);
    }
  }, [visible, encryptionInfo]);

  // Use ref to track if QR has been generated for this session
  const hasGeneratedQR = useRef(false);
  
  // Generate initial QR saat modal dibuka
  useEffect(() => {
    if (visible && userProfile?.email && !hasGeneratedQR.current) {
      console.log('Auto-generating QR on modal open...');
      hasGeneratedQR.current = true;
      generateNewQR();
    } else if (!visible) {
      hasGeneratedQR.current = false;
    }
  }, [visible, userProfile?.email]);

  // Reset states saat modal ditutup
  useEffect(() => {
    if (!visible) {
      console.log('Modal closed, resetting states...');
      setQrCode('');
      setQrMetadata(null);
      setRefreshCount(0);
      setLastGenerated(null);
      setAutoRefresh(false);
      setTimeUntilRefresh(0);
      setShowEncryptionInfo(false);
    }
  }, [visible]);

  // Early return jika tidak ada userProfile
  if (!userProfile) {
    console.warn('UserQRModal: No userProfile provided');
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: '#ffffff' }]}>
            <View style={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.title}>QR Code Saya</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ textAlign: 'center', padding: 20 }}>
                Error: User profile tidak tersedia
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header dengan close button */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.gray900 }]}>
                QR Code Saya
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.gray100 }]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeButtonText, { color: colors.gray600 }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {/* User info section */}
            <View style={styles.userInfo}>
              <Text style={[styles.userInfoLabel, { color: colors.gray500 }]}>
                Email:
              </Text>
              <Text style={[styles.userInfoValue, { color: colors.gray900 }]}>
                {userProfile?.email}
              </Text>
              
              <Text style={[styles.userInfoLabel, { color: colors.gray500 }]}>
                Role:
              </Text>
              <Text style={[styles.userInfoValue, { color: colors.primary }]}>
                {userProfile?.role === 'admin' ? 'Administrator' : 'Pengguna'}
              </Text>
            </View>

            {/* QR Code display section */}
            {qrCode ? (
              <View style={styles.qrContainer}>
                <Text style={{ color: 'red', fontSize: 12, marginBottom: 10 }}>
                  DEBUG: QR Code should render here. Length: {qrCode.length}
                </Text>
                <View style={[styles.qrWrapper, { backgroundColor: colors.white }]}>
                  <QRCode
                    value={qrCode.length > 500 ? "QR_TOO_LONG_FOR_DISPLAY" : qrCode}
                    size={200}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                
                {/* QR Info */}
                <View style={styles.qrInfo}>
                  <Text style={[styles.qrInfoText, { color: colors.gray600 }]}>
                    QR #{refreshCount} • {lastGenerated ? new Date(lastGenerated).toLocaleTimeString('id-ID') : ''}
                  </Text>
                  
                  {qrMetadata && (
                    <Text style={[styles.qrInfoText, { color: colors.gray500 }]}>
                      {qrMetadata.encryptionVersion} • {qrMetadata.algorithm}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.gray600 }]}>
                  Membuat QR Code...
                </Text>
              </View>
            )}

            {/* Generation controls */}
            <View style={styles.controlsContainer}>
              {/* Generate button */}
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  { backgroundColor: colors.primary },
                  isGenerating && { opacity: 0.7 }
                ]}
                onPress={generateNewQR}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={20} color={colors.white} />
                    <Text style={[styles.buttonText, { color: colors.white }]}>
                      Generate QR Baru
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Auto-refresh toggle */}
              <View style={[styles.autoRefreshContainer, { borderColor: colors.gray200 }]}>
                <View style={styles.autoRefreshHeader}>
                  <Text style={[styles.autoRefreshLabel, { color: colors.gray700 }]}>
                    Auto-refresh setiap {autoRefreshInterval} detik
                  </Text>
                  <Switch
                    value={autoRefresh}
                    onValueChange={handleAutoRefreshToggle}
                    trackColor={{ false: colors.gray300, true: colors.primary }}
                    thumbColor={autoRefresh ? colors.white : colors.gray500}
                  />
                </View>
                
                {autoRefresh && timeUntilRefresh > 0 && (
                  <Text style={[styles.countdownText, { color: colors.gray500 }]}>
                    Refresh otomatis dalam {timeUntilRefresh} detik
                  </Text>
                )}
              </View>
            </View>

            {/* Scanner mode section */}
            <View style={[styles.scannerModeContainer, { borderTopColor: colors.gray200 }]}>
              <Text style={[styles.scannerModeTitle, { color: colors.gray900 }]}>
                Status Scanner ESP32
              </Text>
              
              {scannerStatus && (
                <View style={styles.scannerStatusContainer}>
                  <Text style={[styles.scannerStatusText, { color: colors.gray600 }]}>
                    Mode: {scannerStatus.mode === 'user_qr' ? 'QR Pengguna' : 
                           scannerStatus.mode === 'resi' ? 'Scan Resi' : 'Standby'}
                  </Text>
                  
                  <Text style={[styles.scannerStatusText, { color: colors.gray500 }]}>
                    Status: {scannerStatus.isActive ? '🟢 Aktif' : '⚪ Idle'}
                  </Text>
                  
                  {scannerStatus.expiresAt && Date.now() < scannerStatus.expiresAt && (
                    <Text style={[styles.scannerStatusText, { color: colors.gray500 }]}>
                      Expires: {new Date(scannerStatus.expiresAt).toLocaleTimeString('id-ID')}
                    </Text>
                  )}
                </View>
              )}
              
              {/* Mode control buttons */}
              <View style={styles.modeButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    { backgroundColor: scannerMode === 'user_qr' ? colors.primary : colors.gray100 },
                    isModeChanging && { opacity: 0.7 }
                  ]}
                  onPress={() => handleScannerModeChange('user_qr')}
                  disabled={isModeChanging}
                >
                  <Text style={[
                    styles.modeButtonText,
                    { color: scannerMode === 'user_qr' ? colors.white : colors.gray700 }
                  ]}>
                    QR Mode
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    { backgroundColor: scannerMode === 'idle' ? colors.gray600 : colors.gray100 },
                    isModeChanging && { opacity: 0.7 }
                  ]}
                  onPress={() => handleScannerModeChange('idle')}
                  disabled={isModeChanging}
                >
                  <Text style={[
                    styles.modeButtonText,
                    { color: scannerMode === 'idle' ? colors.white : colors.gray700 }
                  ]}>
                    Standby
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Encryption info section (collapsible) */}
            <View style={[styles.encryptionInfoContainer, { borderTopColor: colors.gray200 }]}>
              <TouchableOpacity
                style={styles.encryptionInfoHeader}
                onPress={() => setShowEncryptionInfo(!showEncryptionInfo)}
              >
                <Text style={[styles.encryptionInfoTitle, { color: colors.gray900 }]}>
                  Informasi Enkripsi
                </Text>
                <Ionicons
                  name={showEncryptionInfo ? "chevron-up-outline" : "chevron-down-outline"}
                  size={20}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              
              {showEncryptionInfo && encryptionInfo && (
                <View style={styles.encryptionDetails}>
                  <Text style={[styles.encryptionDetailText, { color: colors.gray600 }]}>
                    Algorithm: {encryptionInfo.userQR.algorithm}
                  </Text>
                  <Text style={[styles.encryptionDetailText, { color: colors.gray600 }]}>
                    Version: {encryptionInfo.userQR.version}
                  </Text>
                  <Text style={[styles.encryptionDetailText, { color: colors.gray500 }]}>
                    Security: XOR + Caesar Cipher + Base64
                  </Text>
                  <Text style={[styles.encryptionDetailText, { color: colors.gray500 }]}>
                    Dynamic: Timestamp + Nonce + Checksum
                  </Text>
                </View>
              )}
            </View>

            {/* Usage instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={[styles.instructionsTitle, { color: colors.gray700 }]}>
                Cara Penggunaan:
              </Text>
              <Text style={[styles.instructionsText, { color: colors.gray600 }]}>
                1. Pastikan ESP32 dalam mode "QR Pengguna"
              </Text>
              <Text style={[styles.instructionsText, { color: colors.gray600 }]}>
                2. Tunjukkan QR code ke scanner ESP32
              </Text>
              <Text style={[styles.instructionsText, { color: colors.gray600 }]}>
                3. QR akan otomatis tervalidasi dan menampilkan info user
              </Text>
              <Text style={[styles.instructionsText, { color: colors.gray500 }]}>
                * QR code ini unik dan berubah setiap kali di-generate untuk keamanan
              </Text>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  userInfo: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  userInfoLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 2,
  },
  userInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrInfo: {
    alignItems: "center",
  },
  qrInfoText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 2,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  controlsContainer: {
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  autoRefreshContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  autoRefreshHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  autoRefreshLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  countdownText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  scannerModeContainer: {
    borderTopWidth: 1,
    paddingTop: 20,
    marginBottom: 20,
  },
  scannerModeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  scannerStatusContainer: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  scannerStatusText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  modeButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  encryptionInfoContainer: {
    borderTopWidth: 1,
    paddingTop: 20,
    marginBottom: 20,
  },
  encryptionInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  encryptionInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  encryptionDetails: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  encryptionDetailText: {
    fontSize: 12,
    marginBottom: 4,
  },
  instructionsContainer: {
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default UserQRModal;
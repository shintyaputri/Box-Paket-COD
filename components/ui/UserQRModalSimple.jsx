/**
 * SIMPLE USER QR MODAL - Minimal version for testing
 * 
 * Versi sederhana dari UserQRModal untuk testing apakah modal bisa muncul
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const { width: screenWidth } = Dimensions.get("window");

function UserQRModalSimple({ visible, onClose, userProfile }) {
  console.log('UserQRModalSimple rendered with:', { visible, userProfile: userProfile?.email });
  
  // State untuk QR generation
  const [qrCode, setQrCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  
  // Function untuk generate QR code sederhana
  const generateSimpleQR = async () => {
    if (!userProfile?.email) {
      Alert.alert('Error', 'User profile tidak valid');
      return;
    }
    
    setIsGenerating(true);
    console.log('Starting QR generation...');
    
    try {
      // Buat QR data sederhana
      const qrData = JSON.stringify({
        email: userProfile.email,
        nama: userProfile.nama,
        role: userProfile.role,
        timestamp: Date.now(),
        type: "user_profile_simple"
      });
      
      console.log('QR Data generated:', qrData);
      setQrCode(qrData);
      setGenerationCount(prev => prev + 1);
      console.log('QR Code set successfully');
      
    } catch (error) {
      console.error('Error generating QR:', error);
      Alert.alert('Error', 'Gagal membuat QR Code: ' + error.message);
    }
    
    setIsGenerating(false);
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              QR Code Test Modal
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.userInfoText}>
              User: {userProfile?.email || 'Unknown'}
            </Text>
            <Text style={styles.userInfoText}>
              Role: {userProfile?.role || 'Unknown'}
            </Text>
            
            {/* QR Code Display */}
            {qrCode ? (
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={qrCode}
                    size={180}
                    color="#111827"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrInfoText}>
                  QR #{generationCount} • {new Date().toLocaleTimeString('id-ID')}
                </Text>
              </View>
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrPlaceholderText}>
                  {isGenerating ? 'Membuat QR Code...' : 'QR Code akan muncul di sini'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.generateButton, isGenerating && { opacity: 0.7 }]}
              onPress={generateSimpleQR}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {qrCode ? 'Generate QR Baru' : 'Generate QR Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: '#4B5563',
  },
  content: {
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrInfoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserQRModalSimple;
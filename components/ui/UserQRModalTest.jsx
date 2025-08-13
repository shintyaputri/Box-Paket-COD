/**
 * TEST USER QR MODAL - Minimal version for debugging modal content issues
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const { width: screenWidth } = Dimensions.get("window");

function UserQRModalTest({ visible, onClose, userProfile }) {
  console.log('UserQRModalTest rendered with:', { visible, userProfile: userProfile?.email });
  
  const [qrCode, setQrCode] = useState('');
  const [testStep, setTestStep] = useState(1);
  
  const runTest = () => {
    console.log(`Running test step ${testStep}...`);
    
    switch(testStep) {
      case 1:
        // Test simple string QR
        setQrCode('Hello World Test');
        setTestStep(2);
        break;
      case 2:
        // Test user email QR
        setQrCode(userProfile?.email || 'No Email');
        setTestStep(3);
        break;
      case 3:
        // Test JSON QR
        try {
          const jsonData = JSON.stringify({
            email: userProfile?.email,
            nama: userProfile?.nama,
            timestamp: Date.now()
          });
          setQrCode(jsonData);
          setTestStep(4);
        } catch (error) {
          Alert.alert('JSON Error', error.message);
        }
        break;
      case 4:
        // Test encrypt function call
        testEncryption();
        break;
      default:
        setQrCode('');
        setTestStep(1);
    }
  };
  
  const testEncryption = async () => {
    try {
      console.log('Testing encryption import...');
      const { encryptUserProfile } = await import('../../services/encryptionService');
      console.log('Encryption import successful');
      
      const result = await encryptUserProfile(userProfile);
      console.log('Encryption result:', result.success ? 'SUCCESS' : 'FAILED');
      
      if (result.success) {
        setQrCode(result.qrCode.substring(0, 100) + '...'); // Truncate for display
        Alert.alert('Encryption Test', 'SUCCESS! Full encryption works.');
      } else {
        Alert.alert('Encryption Test', 'FAILED: ' + result.error);
      }
    } catch (error) {
      console.error('Encryption test error:', error);
      Alert.alert('Encryption Test', 'ERROR: ' + error.message);
    }
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
          <Text style={styles.title}>QR CODE STEP-BY-STEP TEST</Text>
          <Text style={styles.text}>User: {userProfile?.email || 'Unknown'}</Text>
          <Text style={styles.text}>Test Step: {testStep}/4</Text>
          
          {/* QR Code Display */}
          {qrCode ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={qrCode}
                size={150}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              <Text style={styles.qrInfo}>
                QR Length: {qrCode.length}
              </Text>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No QR Code yet</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.testButton}
            onPress={runTest}
          >
            <Text style={styles.testButtonText}>
              Run Test Step {testStep}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    width: screenWidth * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: '#111827',
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  qrInfo: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  placeholder: {
    width: 150,
    height: 150,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  testButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UserQRModalTest;
/**
 * DEBUG USER QR MODAL - Find exact crash point
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

function UserQRModalDebug({ visible, onClose, userProfile }) {
  console.log('UserQRModalDebug: Starting render');
  
  const [testStep, setTestStep] = useState(1);
  const [testResult, setTestResult] = useState('Ready to test');
  
  const runNextTest = () => {
    console.log(`UserQRModalDebug: Running test ${testStep}`);
    
    try {
      switch(testStep) {
        case 1:
          console.log('Test 1: ScrollView');
          setTestResult('Test 1: ScrollView - SUCCESS');
          setTestStep(2);
          break;
          
        case 2:
          console.log('Test 2: Theme import');
          const { getThemeByRole } = require('../../constants/Colors');
          const colors = getThemeByRole(false);
          setTestResult(`Test 2: Theme - SUCCESS (primary: ${colors.primary})`);
          setTestStep(3);
          break;
          
        case 3:
          console.log('Test 3: QRCode import');
          const QRCode = require('react-native-qrcode-svg').default;
          setTestResult('Test 3: QRCode import - SUCCESS');
          setTestStep(4);
          break;
          
        case 4:
          console.log('Test 4: Encryption import');
          import('../../services/encryptionService').then(() => {
            setTestResult('Test 4: Encryption import - SUCCESS');
            setTestStep(5);
          }).catch(error => {
            setTestResult(`Test 4: Encryption FAILED - ${error.message}`);
          });
          break;
          
        default:
          setTestResult('All tests completed!');
          setTestStep(1);
      }
    } catch (error) {
      console.error(`Test ${testStep} failed:`, error);
      setTestResult(`Test ${testStep}: FAILED - ${error.message}`);
    }
  };
  
  try {
    console.log('UserQRModalDebug: Step 1 - Basic modal render');
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.title}>DEBUG MODE - STEP BY STEP</Text>
              <Text style={styles.text}>User: {userProfile?.email || 'No email'}</Text>
              <Text style={styles.text}>Current Step: {testStep}/4</Text>
              
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>{testResult}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.testButton}
                onPress={runNextTest}
              >
                <Text style={styles.buttonText}>Run Test {testStep}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.button}
                onPress={onClose}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
    
  } catch (error) {
    console.error('UserQRModalDebug: Error in basic modal:', error);
    
    // Fallback if even basic modal fails
    return (
      <Modal visible={visible} transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
            <Text>ERROR: Modal crashed</Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 10, backgroundColor: 'red', padding: 10 }}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
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
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 4,
  },
  resultContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  resultText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
});

export default UserQRModalDebug;
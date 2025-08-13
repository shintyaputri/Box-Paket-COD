/**
 * Max Capacity Modal - Modal untuk mengatur batas maksimal kapasitas kotak paket
 * 
 * Modal ini memungkinkan pengguna untuk mengatur ulang batas maksimal kapasitas
 * kotak paket melalui input yang mudah digunakan.
 * 
 * Features:
 * - Input numerik untuk kapasitas maksimal
 * - Validasi range kapasitas (5-50 cm)
 * - Konfirmasi perubahan dengan preview
 * - Integrasi dengan capacityService untuk update real-time
 * - Loading states dan error handling
 * 
 * @component MaxCapacityModal
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Visibility state modal
 * @param {Function} props.onClose - Callback untuk menutup modal
 * @param {number} props.currentMaxHeight - Kapasitas maksimal saat ini
 * @param {Function} props.onUpdate - Callback setelah update berhasil
 * @returns {JSX.Element} Modal component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemeByRole } from '../../constants/Colors';
import { updateMaxHeight } from '../../services/capacityService';

const { width: screenWidth } = Dimensions.get('window');

function MaxCapacityModal({ visible, onClose, currentMaxHeight, onUpdate }) {
  const [inputValue, setInputValue] = useState(currentMaxHeight?.toString() || '30');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  
  const colors = getThemeByRole(false); // Always use user theme for consistency

  /**
   * Validasi input kapasitas
   * @param {string} value - Nilai input yang akan divalidasi
   * @returns {Object} Result validasi dengan success boolean dan error message
   */
  const validateCapacity = (value) => {
    const numValue = parseInt(value, 10);
    
    if (isNaN(numValue)) {
      return { success: false, error: 'Masukkan angka yang valid' };
    }
    
    if (numValue < 5) {
      return { success: false, error: 'Kapasitas minimal adalah 5 cm' };
    }
    
    if (numValue > 50) {
      return { success: false, error: 'Kapasitas maksimal adalah 50 cm' };
    }
    
    return { success: true, error: '' };
  };

  /**
   * Handle perubahan input dengan validasi real-time
   * @param {string} value - Nilai input baru
   */
  const handleInputChange = (value) => {
    setInputValue(value);
    const validation = validateCapacity(value);
    setError(validation.error);
  };

  /**
   * Handle update kapasitas maksimal
   */
  const handleUpdateCapacity = async () => {
    const validation = validateCapacity(inputValue);
    
    if (!validation.success) {
      setError(validation.error);
      return;
    }
    
    const newMaxHeight = parseInt(inputValue, 10);
    
    // Konfirmasi perubahan
    Alert.alert(
      'Konfirmasi Perubahan',
      `Apakah Anda yakin ingin mengubah kapasitas maksimal dari ${currentMaxHeight} cm menjadi ${newMaxHeight} cm?`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Ya, Ubah',
          onPress: async () => {
            setIsUpdating(true);
            setError('');
            
            try {
              const result = await updateMaxHeight(newMaxHeight);
              
              if (result.success) {
                Alert.alert(
                  'Berhasil',
                  'Kapasitas maksimal berhasil diperbarui!',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        onUpdate(newMaxHeight);
                        onClose();
                      },
                    },
                  ]
                );
              } else {
                setError(result.error || 'Gagal memperbarui kapasitas');
              }
            } catch (error) {
              console.error('Error updating max capacity:', error);
              setError('Terjadi kesalahan saat memperbarui kapasitas');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Reset modal state saat ditutup
   */
  const handleClose = () => {
    setInputValue(currentMaxHeight?.toString() || '30');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.gray900 }]}>
                Atur Kapasitas Maksimal
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.gray100 }]}
                onPress={handleClose}
              >
                <Ionicons name="close" size={20} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* Current Capacity Info */}
            <View style={[styles.infoContainer, { backgroundColor: colors.gray50 }]}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.gray700 }]}>
                  Kapasitas saat ini: {currentMaxHeight} cm
                </Text>
              </View>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Kapasitas Maksimal Baru (cm)
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.gray50,
                      borderColor: error ? colors.red500 : colors.gray300,
                      color: colors.gray900,
                    },
                  ]}
                  value={inputValue}
                  onChangeText={handleInputChange}
                  placeholder="Masukkan kapasitas (5-50 cm)"
                  placeholderTextColor={colors.gray500}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isUpdating}
                />
                <Text style={[styles.unit, { color: colors.gray600 }]}>cm</Text>
              </View>
              
              {error ? (
                <Text style={[styles.errorText, { color: colors.red500 }]}>
                  {error}
                </Text>
              ) : null}
            </View>

            {/* Preview Section */}
            {inputValue && !error && (
              <View style={[styles.previewContainer, { backgroundColor: colors.blue50 }]}>
                <Text style={[styles.previewTitle, { color: colors.blue700 }]}>
                  Preview Perubahan:
                </Text>
                <Text style={[styles.previewText, { color: colors.blue600 }]}>
                  {currentMaxHeight} cm → {inputValue} cm
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: colors.gray100 },
                ]}
                onPress={handleClose}
                disabled={isUpdating}
              >
                <Text style={[styles.buttonText, { color: colors.gray700 }]}>
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.updateButton,
                  {
                    backgroundColor: error || isUpdating ? colors.gray300 : colors.primary,
                  },
                ]}
                onPress={handleUpdateCapacity}
                disabled={!!error || isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.white }]}>
                    Perbarui
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Text style={[styles.helpText, { color: colors.gray500 }]}>
                💡 Kapasitas maksimal akan mempengaruhi perhitungan persentase dan status kotak paket
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  previewContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    // Styling handled in style prop
  },
  updateButton: {
    // Styling handled in style prop
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default MaxCapacityModal;
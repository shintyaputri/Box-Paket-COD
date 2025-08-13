import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getThemeByRole } from '../../constants/Colors';
import { useSettings } from '../../contexts/SettingsContext';

const { width: screenWidth } = Dimensions.get('window');

function CapacitySettingsModal({ visible, onClose }) {
  const { 
    capacityDisplayMode, 
    enableHeightConversion, 
    enablePercentageConversion,
    changeCapacityDisplayMode, 
    changeHeightConversion,
    changePercentageConversion
  } = useSettings();
  const colors = getThemeByRole(false);
  
  const [selectedMode, setSelectedMode] = useState(capacityDisplayMode);
  const [selectedHeightConversion, setSelectedHeightConversion] = useState(enableHeightConversion);
  const [selectedPercentageConversion, setSelectedPercentageConversion] = useState(enablePercentageConversion);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync modal state with context when modal opens or context changes
  useEffect(() => {
    if (visible) {
      setSelectedMode(capacityDisplayMode);
      setSelectedHeightConversion(enableHeightConversion);
      setSelectedPercentageConversion(enablePercentageConversion);
    }
  }, [visible, capacityDisplayMode, enableHeightConversion, enablePercentageConversion]);

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      await changeCapacityDisplayMode(selectedMode);
      await changeHeightConversion(selectedHeightConversion);
      await changePercentageConversion(selectedPercentageConversion);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setSelectedMode(capacityDisplayMode);
    setSelectedHeightConversion(enableHeightConversion);
    setSelectedPercentageConversion(enablePercentageConversion);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.gray900 }]}>
                Pengaturan Kapasitas
              </Text>
              <Text style={[styles.subtitle, { color: colors.gray600 }]}>
                Pilih mode tampilan data dari ESP32
              </Text>
            </View>

            {/* Mode Selection */}
            <View style={styles.content}>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                Mode Tampilan Data
              </Text>
              
              {/* Height Mode */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: selectedMode === 'height' ? colors.primary + '20' : colors.gray50,
                    borderColor: selectedMode === 'height' ? colors.primary : colors.gray200,
                  }
                ]}
                onPress={() => setSelectedMode('height')}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    { color: selectedMode === 'height' ? colors.primary : colors.gray900 }
                  ]}>
                    📏 Mode Ketinggian
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.gray600 }]}>
                    ESP32 kirim tinggi (cm), app hitung persentase
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  { borderColor: selectedMode === 'height' ? colors.primary : colors.gray300 }
                ]}>
                  {selectedMode === 'height' && (
                    <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Percentage Mode */}
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: selectedMode === 'percentage' ? colors.primary + '20' : colors.gray50,
                    borderColor: selectedMode === 'percentage' ? colors.primary : colors.gray200,
                  }
                ]}
                onPress={() => setSelectedMode('percentage')}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    { color: selectedMode === 'percentage' ? colors.primary : colors.gray900 }
                  ]}>
                    📊 Mode Persentase
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.gray600 }]}>
                    ESP32 kirim persentase langsung (%)
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  { borderColor: selectedMode === 'percentage' ? colors.primary : colors.gray300 }
                ]}>
                  {selectedMode === 'percentage' && (
                    <View style={[styles.radioButtonInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Conversion Toggle for Height Mode */}
              {selectedMode === 'height' && (
                <View style={[styles.conversionSection, { backgroundColor: colors.green50 }]}>
                  <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                    Opsi Konversi Persentase
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      {
                        backgroundColor: selectedPercentageConversion ? colors.blue100 : colors.gray100,
                        borderColor: selectedPercentageConversion ? colors.blue500 : colors.gray300,
                      }
                    ]}
                    onPress={() => setSelectedPercentageConversion(!selectedPercentageConversion)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: selectedPercentageConversion ? colors.blue700 : colors.gray600 }
                    ]}>
                      {selectedPercentageConversion ? '✅ Konversi ke Persentase' : '🚫 Tinggi Saja'}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={[styles.toggleDesc, { color: colors.gray600 }]}>
                    {selectedPercentageConversion 
                      ? 'Tampilkan tinggi + persentase hasil konversi'
                      : 'Tampilkan hanya tinggi dari ESP32'
                    }
                  </Text>
                </View>
              )}

              {/* Conversion Toggle for Percentage Mode */}
              {selectedMode === 'percentage' && (
                <View style={[styles.conversionSection, { backgroundColor: colors.blue50 }]}>
                  <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                    Opsi Konversi Balik
                  </Text>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      {
                        backgroundColor: selectedHeightConversion ? colors.green100 : colors.gray100,
                        borderColor: selectedHeightConversion ? colors.green500 : colors.gray300,
                      }
                    ]}
                    onPress={() => setSelectedHeightConversion(!selectedHeightConversion)}
                  >
                    <Text style={[
                      styles.toggleText,
                      { color: selectedHeightConversion ? colors.green700 : colors.gray600 }
                    ]}>
                      {selectedHeightConversion ? '✅ Konversi ke Tinggi' : '🚫 Persentase Saja'}
                    </Text>
                  </TouchableOpacity>
                  
                  <Text style={[styles.toggleDesc, { color: colors.gray600 }]}>
                    {selectedHeightConversion 
                      ? 'Tampilkan persentase + tinggi hasil konversi'
                      : 'Tampilkan hanya persentase dari ESP32'
                    }
                  </Text>
                </View>
              )}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.gray300 }]}
                onPress={handleCancel}
                disabled={isUpdating}
              >
                <Text style={[styles.cancelText, { color: colors.gray700 }]}>
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isUpdating}
              >
                <Text style={styles.saveText}>
                  {isUpdating ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: Math.min(screenWidth - 40, 380),
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  conversionSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CapacitySettingsModal;
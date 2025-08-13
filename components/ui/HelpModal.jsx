import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../../contexts/SettingsContext';
import { getThemeByRole } from '../../constants/Colors';

const HelpModal = ({ visible, onClose }) => {
  const { theme } = useSettings();
  const colors = getThemeByRole(false);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.gray200 }]}>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
            Bantuan
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.gray600} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Paket Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
              Status Paket
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.gray600 }]}>
              Berikut adalah penjelasan status paket yang tersedia:
            </Text>

            <View style={styles.statusItem}>
              <View style={[styles.statusBadge, { backgroundColor: colors.warning + "20" }]}>
                <Text style={[styles.statusText, { color: colors.warning }]}>
                  Sedang Dikirim
                </Text>
              </View>
              <Text style={[styles.statusDescription, { color: colors.gray700 }]}>
                Paket sedang dalam perjalanan menuju alamat tujuan. Anda akan mendapat notifikasi ketika paket sudah tiba.
              </Text>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.statusBadge, { backgroundColor: colors.info + "20" }]}>
                <Text style={[styles.statusText, { color: colors.info }]}>
                  Telah Tiba
                </Text>
              </View>
              <Text style={[styles.statusDescription, { color: colors.gray700 }]}>
                Paket sudah sampai di tujuan dan siap untuk diambil. Segera ambil paket Anda untuk menghindari penumpukan.
              </Text>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + "20" }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  Sudah Diambil
                </Text>
              </View>
              <Text style={[styles.statusDescription, { color: colors.gray700 }]}>
                Paket sudah berhasil diambil oleh penerima. Transaksi selesai.
              </Text>
            </View>
          </View>

          {/* Tipe Paket Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
              Tipe Paket
            </Text>
            
            <View style={styles.typeItem}>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.typeText, { color: colors.white }]}>
                  COD
                </Text>
              </View>
              <View style={styles.typeContent}>
                <Text style={[styles.typeTitle, { color: colors.gray900 }]}>
                  Cash on Delivery (COD)
                </Text>
                <Text style={[styles.typeDescription, { color: colors.gray700 }]}>
                  Paket yang pembayarannya dilakukan saat pengambilan. Maksimal 5 paket COD untuk semua pengguna.
                </Text>
              </View>
            </View>

            <View style={styles.typeItem}>
              <View style={[styles.typeBadge, { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.typeText, { color: colors.gray700 }]}>
                  Non-COD
                </Text>
              </View>
              <View style={styles.typeContent}>
                <Text style={[styles.typeTitle, { color: colors.gray900 }]}>
                  Non-COD
                </Text>
                <Text style={[styles.typeDescription, { color: colors.gray700 }]}>
                  Paket yang sudah dibayar sebelumnya. Terbatas oleh kapasitas box penyimpanan (maksimal 90%).
                </Text>
              </View>
            </View>
          </View>

          {/* COD Limit Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
              Informasi COD X/5
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.gray600 }]}>
              Angka "COD X/5" menunjukkan jumlah paket COD yang sedang aktif dari total maksimal 5 paket COD untuk semua pengguna.
            </Text>
            
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Contoh: "COD 3/5" artinya saat ini ada 3 paket COD aktif dari maksimal 5 paket yang diizinkan sistem.
              </Text>
            </View>
          </View>

          {/* Capacity Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
              Kapasitas Box
            </Text>
            <Text style={[styles.sectionDescription, { color: colors.gray600 }]}>
              Kapasitas box hanya mempengaruhi paket Non-COD. Jika kapasitas mencapai 90% atau lebih, Anda tidak dapat menambah paket Non-COD baru.
            </Text>
            
            <View style={[styles.warningBox, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
              <Ionicons name="warning" size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Paket COD tidak terpengaruh oleh kapasitas box dan tetap dapat ditambahkan selama belum mencapai batas 5 paket.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusItem: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
    marginTop: 2,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeContent: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

export default HelpModal;
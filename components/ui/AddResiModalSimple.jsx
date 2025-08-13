import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getThemeByRole } from "../../constants/Colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AddResiModalSimple({
  visible,
  onClose,
  onSubmit,
  loading = false,
  codResiCount = 0,
  capacityPercentage = 0,
}) {
  const [noResi, setNoResi] = useState("");
  const [tipePaket, setTipePaket] = useState("COD");
  const colors = getThemeByRole(false);

  const handleSubmit = () => {
    if (!noResi.trim()) {
      alert("Mohon masukkan nomor resi");
      return;
    }
    
    onSubmit({ 
      noResi: noResi.trim(), 
      tipePaket 
    });
  };

  const handleClose = () => {
    setNoResi("");
    setTipePaket("COD");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.gray900 }]}>
              Tambah Resi Baru
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <View style={styles.content}>
            {/* Nomor Resi */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Nomor Resi *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: colors.gray50,
                    color: colors.gray900,
                    borderColor: colors.gray200,
                  },
                ]}
                value={noResi}
                onChangeText={setNoResi}
                placeholder="Masukkan nomor resi"
                placeholderTextColor={colors.gray400}
                editable={!loading}
                autoCapitalize="characters"
              />
            </View>

            {/* Tipe Paket */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.gray700 }]}>
                Tipe Paket *
              </Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { borderColor: colors.gray300 },
                    tipePaket === "COD" && { 
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + "10",
                    },
                  ]}
                  onPress={() => setTipePaket("COD")}
                  disabled={loading}
                >
                  <View style={[
                    styles.radioCircle,
                    { borderColor: colors.gray300 },
                    tipePaket === "COD" && { borderColor: colors.primary },
                  ]}>
                    {tipePaket === "COD" && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.radioText,
                    { color: colors.gray700 },
                    tipePaket === "COD" && { color: colors.primary, fontWeight: "600" },
                  ]}>
                    COD (Bayar di Tempat)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { borderColor: colors.gray300 },
                    tipePaket === "Non-COD" && { 
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + "10",
                    },
                  ]}
                  onPress={() => setTipePaket("Non-COD")}
                  disabled={loading}
                >
                  <View style={[
                    styles.radioCircle,
                    { borderColor: colors.gray300 },
                    tipePaket === "Non-COD" && { borderColor: colors.primary },
                  ]}>
                    {tipePaket === "Non-COD" && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.radioText,
                    { color: colors.gray700 },
                    tipePaket === "Non-COD" && { color: colors.primary, fontWeight: "600" },
                  ]}>
                    Non-COD (Sudah Dibayar)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info */}
            <View style={[styles.infoContainer, { backgroundColor: colors.blue50 }]}>
              <Text style={[styles.infoText, { color: colors.blue600 }]}>
                COD: Maksimal 5 paket ({codResiCount}/5)
              </Text>
              <Text style={[styles.infoText, { color: colors.blue600 }]}>
                Kapasitas: {Math.round(capacityPercentage)}%
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.gray100 },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.gray700 }]}>
                Batal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!noResi.trim() || loading) && { 
                  backgroundColor: colors.gray300,
                },
              ]}
              onPress={handleSubmit}
              disabled={!noResi.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Tambah Resi
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
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  radioContainer: {
    gap: 12,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontSize: 14,
    flex: 1,
  },
  infoContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
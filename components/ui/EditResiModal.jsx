import React, { useState, useEffect } from "react";
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
import { resiService } from "../../services/resiService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function EditResiModal({
  visible,
  onClose,
  onSubmit,
  resiData,
  loading = false,
}) {
  const [noResi, setNoResi] = useState("");
  const [tipePaket, setTipePaket] = useState("COD");
  const [nomorLoker, setNomorLoker] = useState("");
  const [occupiedLokers, setOccupiedLokers] = useState([]);
  const colors = getThemeByRole(false);

  // Subscribe to occupied lokers when modal is visible
  useEffect(() => {
    if (visible) {
      const unsubscribe = resiService.subscribeToOccupiedLokers((result) => {
        if (result.success) {
          setOccupiedLokers(result.data);
        }
      });
      
      return () => unsubscribe();
    }
  }, [visible]);

  // Set initial values when modal opens or resiData changes
  useEffect(() => {
    if (resiData) {
      setNoResi(resiData.noResi || "");
      setTipePaket(resiData.tipePaket || "COD");
      setNomorLoker(resiData.nomorLoker ? resiData.nomorLoker.toString() : "");
    }
  }, [resiData]);

  const handleSubmit = () => {
    if (!noResi.trim()) {
      alert("Mohon masukkan nomor resi");
      return;
    }
    if (tipePaket === "COD" && !nomorLoker) {
      alert("Mohon pilih nomor loker untuk paket COD");
      return;
    }
    
    const submitData = { 
      noResi: noResi.trim(), 
      tipePaket 
    };
    
    if (tipePaket === "COD") {
      submitData.nomorLoker = parseInt(nomorLoker);
    }
    
    onSubmit(submitData);
  };

  const handleClose = () => {
    // Reset to original values
    if (resiData) {
      setNoResi(resiData.noResi || "");
      setTipePaket(resiData.tipePaket || "COD");
      setNomorLoker(resiData.nomorLoker ? resiData.nomorLoker.toString() : "");
    }
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
              Edit Resi
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                  onPress={() => {
                    setTipePaket("COD");
                    setNomorLoker(""); // Reset nomor loker when switching to COD
                  }}
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
                  onPress={() => {
                    setTipePaket("Non-COD");
                    setNomorLoker(""); // Reset nomor loker when switching to Non-COD
                  }}
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

            {/* Nomor Loker - Only show for COD */}
            {tipePaket === "COD" && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.gray700 }]}>
                  Nomor Loker *
                </Text>
                <View style={styles.lokerContainer}>
                  {[1, 2, 3, 4, 5].map((loker) => {
                    const isOccupied = occupiedLokers.includes(loker);
                    const isSelected = nomorLoker === loker.toString();
                    const isCurrentLoker = resiData?.nomorLoker === loker;
                    
                    // Allow current loker to be selected even if technically "occupied"
                    const isDisabled = isOccupied && !isCurrentLoker;
                    
                    return (
                      <TouchableOpacity
                        key={loker}
                        style={[
                          styles.lokerOption,
                          { borderColor: colors.gray300 },
                          isSelected && { 
                            borderColor: colors.primary,
                            backgroundColor: colors.primary + "10",
                          },
                          isDisabled && {
                            backgroundColor: colors.gray100,
                            borderColor: colors.gray200,
                            opacity: 0.5,
                          },
                        ]}
                        onPress={() => setNomorLoker(loker.toString())}
                        disabled={loading || isDisabled}
                      >
                        <Text style={[
                          styles.lokerText,
                          { color: colors.gray700 },
                          isSelected && { 
                            color: colors.primary,
                            fontWeight: "600",
                          },
                          isDisabled && {
                            color: colors.gray400,
                          },
                        ]}>
                          {loker}
                        </Text>
                        {isDisabled && (
                          <View style={styles.occupiedBadge}>
                            <Ionicons name="lock-closed" size={12} color={colors.gray400} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.helperText, { color: colors.gray500 }]}>
                  Pilih nomor loker yang tersedia (1-5)
                </Text>
              </View>
            )}
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
                (!noResi.trim() || loading || (tipePaket === "COD" && !nomorLoker)) && { 
                  backgroundColor: colors.gray300,
                },
              ]}
              onPress={handleSubmit}
              disabled={!noResi.trim() || loading || (tipePaket === "COD" && !nomorLoker)}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Simpan Perubahan
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
  form: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
  cancelButton: {},
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  lokerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lokerOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lokerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
  },
  occupiedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 2,
  },
});
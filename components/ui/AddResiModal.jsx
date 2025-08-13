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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getThemeByRole } from "../../constants/Colors";
import { resiService } from "../../services/resiService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AddResiModal({
  visible,
  onClose,
  onSubmit,
  loading = false,
  codResiCount = 0,
  capacityPercentage = 0,
}) {
  // Validate props to prevent crashes
  const safeCapacityPercentage = typeof capacityPercentage === 'number' && !isNaN(capacityPercentage) ? capacityPercentage : 0;
  const safeCodResiCount = typeof codResiCount === 'number' && !isNaN(codResiCount) ? codResiCount : 0;
  const [noResi, setNoResi] = useState("");
  const [tipePaket, setTipePaket] = useState("COD");
  const [nomorLoker, setNomorLoker] = useState("");
  const [occupiedLokers, setOccupiedLokers] = useState([]);
  const colors = getThemeByRole(false);

  const handleSubmit = () => {
    if (!noResi.trim()) {
      alert("Mohon masukkan nomor resi");
      return;
    }
    
    // Validasi universal: kapasitas tidak boleh > 90% untuk semua jenis paket
    if (safeCapacityPercentage > 90) {
      alert("Kapasitas box sudah > 90%. Tidak dapat menambah paket apapun. Silakan kosongkan box terlebih dahulu.");
      return;
    }
    
    // Validasi COD: maksimal 5 paket dan harus ada nomor loker
    if (tipePaket === "COD") {
      if (safeCodResiCount >= 5) {
        alert("Maksimal 5 paket COD aktif. Silakan selesaikan paket COD yang ada terlebih dahulu.");
        return;
      }
      if (!nomorLoker) {
        alert("Mohon pilih nomor loker untuk paket COD");
        return;
      }
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

  // Reset to default when modal opens if both options are disabled
  useEffect(() => {
    if (visible && safeCapacityPercentage > 90) {
      // Both COD and Non-COD are disabled when capacity > 90%
      // Keep current selection but user will see disabled state
    }
  }, [visible, safeCapacityPercentage]);

  const handleClose = () => {
    setNoResi("");
    setTipePaket("COD");
    setNomorLoker("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
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

            {/* Content - Remove ScrollView for now */}
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
                    (safeCodResiCount >= 5 || safeCapacityPercentage > 90) && { 
                      opacity: 0.5,
                      borderColor: colors.gray200,
                    },
                  ]}
                  onPress={() => {
                    if (safeCapacityPercentage > 90) {
                      alert("Kapasitas box sudah > 90%. Silakan kosongkan box terlebih dahulu untuk menambah paket COD.");
                      return;
                    }
                    if (safeCodResiCount >= 5) {
                      alert("Maksimal 5 paket COD aktif. Silakan selesaikan paket COD yang ada terlebih dahulu.");
                      return;
                    }
                    setTipePaket("COD");
                    setNomorLoker(""); // Reset nomor loker when switching to COD
                  }}
                  disabled={loading || safeCodResiCount >= 5 || safeCapacityPercentage > 90}
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
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.radioText,
                      { color: colors.gray700 },
                      tipePaket === "COD" && { color: colors.primary, fontWeight: "600" },
                    ]}>
                      COD (Bayar di Tempat)
                    </Text>
                    <Text style={[
                      styles.radioSubtext,
                      { color: (safeCodResiCount >= 5 || safeCapacityPercentage > 90) ? colors.red500 : colors.gray500 },
                    ]}>
                      {(safeCodResiCount >= 5 || safeCapacityPercentage > 90)
                        ? `Tidak dapat ditambah: ${safeCodResiCount >= 5 ? 'COD penuh' : ''}${safeCodResiCount >= 5 && safeCapacityPercentage > 90 ? ' & ' : ''}${safeCapacityPercentage > 90 ? 'Box > 90%' : ''}`
                        : `Maks. 5 paket & kapasitas ≤ 90% (${safeCodResiCount}/5, ${Math.round(safeCapacityPercentage)}%)`
                      }
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    { borderColor: colors.gray300 },
                    tipePaket === "Non-COD" && { 
                      borderColor: colors.primary,
                      backgroundColor: colors.primary + "10",
                    },
                    safeCapacityPercentage > 90 && { 
                      opacity: 0.5,
                      borderColor: colors.gray200,
                    },
                  ]}
                  onPress={() => {
                    if (safeCapacityPercentage > 90) {
                      alert("Kapasitas box sudah > 90%. Silakan kosongkan box terlebih dahulu untuk menambah paket Non-COD.");
                      return;
                    }
                    setTipePaket("Non-COD");
                    setNomorLoker(""); // Reset nomor loker when switching to Non-COD
                  }}
                  disabled={loading || safeCapacityPercentage > 90}
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
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.radioText,
                      { color: colors.gray700 },
                      tipePaket === "Non-COD" && { color: colors.primary, fontWeight: "600" },
                    ]}>
                      Non-COD (Sudah Dibayar)
                    </Text>
                    <Text style={[
                      styles.radioSubtext,
                      { color: safeCapacityPercentage > 90 ? colors.red500 : colors.gray500 },
                    ]}>
                      {safeCapacityPercentage > 90 
                        ? `Box penuh (${Math.round(safeCapacityPercentage)}% > 90%) - Tidak dapat ditambah`
                        : `Kapasitas ≤ 90% (${Math.round(safeCapacityPercentage)}% terisi)`
                      }
                    </Text>
                  </View>
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
                          isOccupied && {
                            backgroundColor: colors.gray100,
                            borderColor: colors.gray200,
                            opacity: 0.5,
                          },
                        ]}
                        onPress={() => setNomorLoker(loker.toString())}
                        disabled={loading || isOccupied}
                      >
                        <Text style={[
                          styles.lokerText,
                          { color: colors.gray700 },
                          isSelected && { 
                            color: colors.primary,
                            fontWeight: "600",
                          },
                          isOccupied && {
                            color: colors.gray400,
                          },
                        ]}>
                          {loker}
                        </Text>
                        {isOccupied && (
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

            {/* Information Section */}
            <View style={[styles.infoContainer, { backgroundColor: colors.blue50 }]}>
              <View style={styles.infoList}>
                <Text style={[styles.infoItem, { color: colors.blue600 }]}>
                  • COD: Maksimal 5 paket & kapasitas ≤ 90%
                </Text>
                <Text style={[styles.infoItem, { color: colors.blue600 }]}>
                  • Non-COD: Kapasitas ≤ 90%
                </Text>
                {(safeCodResiCount >= 5 || safeCapacityPercentage > 90) && (
                  <Text style={[styles.infoWarning, { color: colors.orange600 }]}>
                    ⚠️ {safeCapacityPercentage > 90 && "Box > 90%"}{safeCodResiCount >= 5 && safeCapacityPercentage > 90 && " & "}{safeCodResiCount >= 5 && "COD penuh (5/5)"}
                  </Text>
                )}
              </View>
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
                (!noResi.trim() || loading || safeCapacityPercentage > 90 ||
                 (tipePaket === "COD" && (!nomorLoker || safeCodResiCount >= 5))
                ) && { 
                  backgroundColor: colors.gray300,
                },
              ]}
              onPress={handleSubmit}
              disabled={!noResi.trim() || loading || safeCapacityPercentage > 90 ||
                       (tipePaket === "COD" && (!nomorLoker || safeCodResiCount >= 5))}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
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
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
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
  },
  radioSubtext: {
    fontSize: 12,
    marginTop: 2,
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
  infoContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoList: {
    gap: 4,
  },
  infoItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  infoWarning: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
});
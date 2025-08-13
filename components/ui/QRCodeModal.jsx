import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { getThemeByRole } from "../../constants/Colors";
import { lokerControlService } from "../../services/lokerControlService";

const { width: screenWidth } = Dimensions.get("window");

function QRCodeModal({ visible, onClose, userEmail, isAdmin = false, resiData = null, onUpdateStatus = null }) {
  const colors = getThemeByRole(isAdmin);
  const [loadingCommand, setLoadingCommand] = useState(null);
  const [lokerStatus, setLokerStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [activeCommand, setActiveCommand] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Use resi number if provided, otherwise use userEmail
  const qrValue = resiData?.noResi || userEmail;
  const displayText = resiData?.noResi || userEmail;
  const title = resiData ? (isArrivedPackage ? "Paket Sudah Tiba" : "Kontrol Loker") : "Kode QR Saya";
  const description = resiData ? 
    (isArrivedPackage ? "Kontrol loker untuk paket COD atau tandai sebagai sudah diambil" : "Kontrol loker untuk paket COD Anda") : 
    "Tunjukkan kode QR ini untuk identifikasi";
  
  const isCODPackage = resiData?.tipePaket === "COD" && resiData?.nomorLoker;
  const isArrivedPackage = resiData?.status === "Telah Tiba";

  // Subscribe to loker status for COD packages
  useEffect(() => {
    if (visible && isCODPackage) {
      const unsubscribe = lokerControlService.subscribeToLokerStatus(
        resiData.nomorLoker,
        (result) => {
          if (result.success) {
            setLokerStatus(result.data);
          }
        }
      );
      
      return () => unsubscribe();
    }
  }, [visible, isCODPackage, resiData?.nomorLoker]);

  // Countdown timer effect
  useEffect(() => {
    let interval = null;
    
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setActiveCommand(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown]);

  // Reset states when modal closes
  useEffect(() => {
    if (!visible) {
      setCountdown(0);
      setActiveCommand(null);
      setLoadingCommand(null);
      setUpdatingStatus(false);
    }
  }, [visible]);

  const handleLokerCommand = async (command) => {
    if (!resiData?.nomorLoker) return;
    
    setLoadingCommand(command);
    
    try {
      const result = command === "buka" 
        ? await lokerControlService.openLoker(resiData.nomorLoker)
        : await lokerControlService.closeLoker(resiData.nomorLoker);
      
      if (result.success) {
        // Start countdown and set active command
        setActiveCommand(command);
        setCountdown(10);
      } else {
        Alert.alert(
          "Gagal",
          `Gagal mengirim perintah: ${result.error}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        `Terjadi kesalahan: ${error.message}`,
        [{ text: "OK" }]
      );
    }
    
    setLoadingCommand(null);
  };

  const handleUpdateStatus = async () => {
    if (!resiData?.id || !onUpdateStatus) return;
    
    Alert.alert(
      "Konfirmasi",
      "Apakah Anda yakin ingin mengubah status paket ini ke 'Sudah Diambil'?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya", 
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await onUpdateStatus(resiData.id, "Sudah Diambil");
              Alert.alert(
                "Berhasil",
                "Status paket berhasil diubah ke 'Sudah Diambil'",
                [
                  { 
                    text: "OK", 
                    onPress: () => {
                      onClose();
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert(
                "Gagal",
                "Gagal mengubah status paket. Silakan coba lagi.",
                [{ text: "OK" }]
              );
            } finally {
              setUpdatingStatus(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.gray900 }]}>
              {title}
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

          {resiData && (
            <View style={styles.resiInfo}>
              <Text style={[styles.resiInfoLabel, { color: colors.gray500 }]}>
                Nama Penerima:
              </Text>
              <Text style={[styles.resiInfoValue, { color: colors.gray900 }]}>
                {resiData.nama}
              </Text>
              
              {isCODPackage && (
                <>
                  <Text style={[styles.resiInfoLabel, { color: colors.gray500 }]}>
                    Nomor Loker:
                  </Text>
                  <Text style={[styles.resiInfoValue, { color: colors.primary }]}>
                    Loker #{resiData.nomorLoker}
                  </Text>
                </>
              )}
              
              <Text style={[styles.resiInfoLabel, { color: colors.gray500 }]}>
                Status:
              </Text>
              <Text style={[styles.resiInfoValue, { color: colors.gray900 }]}>
                {resiData.status || "Sedang Dikirim"}
              </Text>
            </View>
          )}

          {/* Only show QR Code for non-COD packages */}
          {!isCODPackage && (
            <>
              <View style={styles.qrContainer}>
                <View style={[styles.qrWrapper, { backgroundColor: colors.white }]}>
                  <QRCode
                    value={qrValue}
                    size={200}
                    color={colors.gray900}
                    backgroundColor={colors.white}
                  />
                </View>
                <Text style={[styles.emailText, { color: colors.gray600 }]}>
                  {displayText}
                </Text>
              </View>

              <Text style={[styles.description, { color: colors.gray500 }]}>
                {description}
              </Text>
            </>
          )}

          {/* Loker Control Buttons - Only for COD packages */}
          {isCODPackage && (
            <View style={[styles.lokerControlContainer, { borderTopWidth: 0, paddingTop: 0, marginTop: 0 }]}>
              <Text style={[styles.lokerControlTitle, { color: colors.gray900 }]}>
                Kontrol Loker #{resiData.nomorLoker}
              </Text>
              
              {lokerStatus && (
                <View style={styles.statusIndicator}>
                  <Text style={[styles.statusText, { color: colors.gray600 }]}>
                    Status: {lokerStatus.lastCommand === "buka" && lokerStatus.buka === 1 ? "Terbuka" : 
                            lokerStatus.lastCommand === "tutup" && lokerStatus.tutup === 1 ? "Tertutup" :
                            "Idle"}
                  </Text>
                </View>
              )}
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.lokerButton,
                    styles.openButton,
                    { backgroundColor: colors.success },
                    (loadingCommand === "buka" || (activeCommand === "tutup" && countdown > 0)) && { opacity: 0.7 }
                  ]}
                  onPress={() => handleLokerCommand("buka")}
                  disabled={loadingCommand !== null || (activeCommand === "tutup" && countdown > 0)}
                >
                  {loadingCommand === "buka" ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="lock-open-outline" size={20} color={colors.white} />
                      <Text style={[styles.buttonText, { color: colors.white }]}>
                        {activeCommand === "buka" && countdown > 0 
                          ? `Buka (${countdown}s)` 
                          : "Buka Loker"
                        }
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.lokerButton,
                    styles.closeButton,
                    { backgroundColor: colors.danger },
                    (loadingCommand === "tutup" || (activeCommand === "buka" && countdown > 0)) && { opacity: 0.7 }
                  ]}
                  onPress={() => handleLokerCommand("tutup")}
                  disabled={loadingCommand !== null || (activeCommand === "buka" && countdown > 0)}
                >
                  {loadingCommand === "tutup" ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.white} />
                      <Text style={[styles.buttonText, { color: colors.white }]}>
                        {activeCommand === "tutup" && countdown > 0 
                          ? `Tutup (${countdown}s)` 
                          : "Tutup Loker"
                        }
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.autoResetText, { color: colors.gray400 }]}>
                Perintah akan otomatis reset setelah 10 detik
              </Text>
            </View>
          )}

          {/* Update Status Button for Arrived Packages */}
          {isArrivedPackage && onUpdateStatus && (
            <View style={styles.statusUpdateContainer}>
              <TouchableOpacity
                style={[
                  styles.statusUpdateButton,
                  { backgroundColor: colors.primary },
                  updatingStatus && { opacity: 0.7 }
                ]}
                onPress={handleUpdateStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color={colors.white} />
                    <Text style={[styles.buttonText, { color: colors.white }]}>
                      Tandai Sudah Diambil
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={[styles.statusUpdateText, { color: colors.gray500 }]}>
                Gunakan tombol ini jika paket sudah diambil
              </Text>
            </View>
          )}
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
    width: screenWidth * 0.85,
    maxWidth: 350,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
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
  emailText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  resiInfo: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  resiInfoLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
    marginBottom: 2,
  },
  resiInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  lokerControlContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  lokerControlTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  statusIndicator: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  lokerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  openButton: {
    // backgroundColor set dynamically
  },
  closeButton: {
    // backgroundColor set dynamically
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  autoResetText: {
    fontSize: 10,
    textAlign: "center",
    fontStyle: "italic",
  },
  statusUpdateContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    alignItems: "center",
  },
  statusUpdateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    gap: 8,
  },
  statusUpdateText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});

export default QRCodeModal;
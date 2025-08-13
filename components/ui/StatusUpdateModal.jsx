import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getThemeByRole } from "../../constants/Colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function StatusUpdateModal({
  visible,
  onClose,
  onUpdateStatus,
  resiList = [],
  loading = false,
  currentUserId = null,
}) {
  const [selectedResiIds, setSelectedResiIds] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const colors = getThemeByRole(false);

  // Reset selections when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedResiIds([]);
      setSelectedStatus("");
    }
  }, [visible]);

  const statusOptions = [
    { value: "Sedang Dikirim", label: "Sedang Dikirim", icon: "send", color: colors.warning },
    { value: "Telah Tiba", label: "Telah Tiba", icon: "checkmark-circle", color: colors.info },
    { value: "Sudah Diambil", label: "Sudah Diambil", icon: "checkmark-done", color: colors.success },
  ];

  // Filter resi yang bisa dipilih (hanya milik user)
  const selectableResi = resiList.filter(resi => resi.userId === currentUserId);

  const toggleResiSelection = (resiId) => {
    // Cek apakah resi ini milik user
    const resi = resiList.find(r => r.id === resiId);
    if (resi && resi.userId !== currentUserId) {
      return; // Jangan lakukan apa-apa jika bukan milik user
    }

    setSelectedResiIds(prev => 
      prev.includes(resiId) 
        ? prev.filter(id => id !== resiId)
        : [...prev, resiId]
    );
  };

  const selectAllResi = () => {
    if (selectedResiIds.length === selectableResi.length) {
      setSelectedResiIds([]);
    } else {
      setSelectedResiIds(selectableResi.map(resi => resi.id));
    }
  };

  const handleUpdateStatus = () => {
    if (selectedResiIds.length === 0) {
      alert("Pilih minimal satu resi untuk diupdate");
      return;
    }
    if (!selectedStatus) {
      alert("Pilih status yang akan diupdate");
      return;
    }

    onUpdateStatus(selectedResiIds, selectedStatus);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Sedang Dikirim":
        return { bg: colors.warning + "20", text: colors.warning };
      case "Telah Tiba":
        return { bg: colors.info + "20", text: colors.info };
      case "Sudah Diambil":
        return { bg: colors.success + "20", text: colors.success };
      default:
        return { bg: colors.gray100, text: colors.gray600 };
    }
  };

  const renderResiItem = ({ item }) => {
    const isSelected = selectedResiIds.includes(item.id);
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.resiItem,
          { backgroundColor: colors.white, borderColor: colors.gray200 },
          isSelected && { 
            borderColor: colors.primary,
            backgroundColor: colors.primary + "10",
          },
        ]}
        onPress={() => toggleResiSelection(item.id)}
      >
        <View style={styles.selectionIndicator}>
          <View style={[
            styles.checkbox,
            { borderColor: isSelected ? colors.primary : colors.gray300 },
            isSelected && { backgroundColor: colors.primary },
          ]}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={colors.white} />
            )}
          </View>
        </View>
        
        <View style={styles.resiInfo}>
          <Text style={[styles.resiNumber, { color: colors.gray900 }]} numberOfLines={1}>
            {item.noResi}
          </Text>
          <Text style={[styles.resiName, { color: colors.gray600 }]} numberOfLines={1}>
            {item.nama}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusColor.bg }
          ]}>
            <Text style={[
              styles.statusText,
              { color: statusColor.text }
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.gray900 }]}>
              Update Status Resi
            </Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Info Section */}
            <View style={[styles.infoContainer, { backgroundColor: colors.blue50 }]}>
              <Ionicons name="information-circle" size={16} color={colors.blue600} />
              <Text style={[styles.infoText, { color: colors.blue600 }]}>
                {selectableResi.length} resi milik Anda dari {resiList.length} total resi
              </Text>
            </View>

            {/* Select All Button */}
            <TouchableOpacity
              style={[styles.selectAllButton, { backgroundColor: colors.gray50 }]}
              onPress={selectAllResi}
            >
              <Ionicons 
                name={selectedResiIds.length === selectableResi.length ? "checkbox" : "square-outline"} 
                size={20} 
                color={colors.primary} 
              />
              <Text style={[styles.selectAllText, { color: colors.gray700 }]}>
                {selectedResiIds.length === selectableResi.length ? "Batalkan Semua" : "Pilih Semua"} 
                ({selectedResiIds.length}/{selectableResi.length})
              </Text>
            </TouchableOpacity>

            {/* Resi List - Simple scrollable container */}
            <ScrollView style={styles.resiListContainer} showsVerticalScrollIndicator={false}>
              {resiList.map((item, index) => {
                const isSelected = selectedResiIds.includes(item.id);
                const statusColor = getStatusColor(item.status);
                const isOwner = item.userId === currentUserId;
                const isDisabled = !isOwner;

                return (
                  <View key={item.id} style={index > 0 ? { marginTop: 8 } : {}}>
                    <TouchableOpacity
                      style={[
                        styles.resiItem,
                        { backgroundColor: colors.white, borderColor: colors.gray200 },
                        isSelected && { 
                          borderColor: colors.primary,
                          backgroundColor: colors.primary + "10",
                        },
                        isDisabled && {
                          backgroundColor: colors.gray50,
                          borderColor: colors.gray100,
                          opacity: 0.6,
                        },
                      ]}
                      onPress={() => toggleResiSelection(item.id)}
                      disabled={isDisabled}
                    >
                      <View style={styles.selectionIndicator}>
                        <View style={[
                          styles.checkbox,
                          { borderColor: isSelected ? colors.primary : colors.gray300 },
                          isSelected && { backgroundColor: colors.primary },
                          isDisabled && { borderColor: colors.gray200 },
                        ]}>
                          {isSelected && !isDisabled && (
                            <Ionicons name="checkmark" size={16} color={colors.white} />
                          )}
                          {isDisabled && (
                            <Ionicons name="lock-closed" size={12} color={colors.gray400} />
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.resiInfo}>
                        <Text style={[
                          styles.resiNumber, 
                          { color: isDisabled ? colors.gray400 : colors.gray900 }
                        ]} numberOfLines={1}>
                          {item.noResi}
                        </Text>
                        <Text style={[
                          styles.resiName, 
                          { color: isDisabled ? colors.gray400 : colors.gray600 }
                        ]} numberOfLines={1}>
                          {item.nama} {!isOwner && "(Bukan milik Anda)"}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: statusColor.bg }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: statusColor.text }
                          ]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Status Selection */}
            <View style={styles.statusSection}>
              <Text style={[styles.sectionTitle, { color: colors.gray700 }]}>
                Pilih Status Baru:
              </Text>
              <View style={styles.statusOptions}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      { borderColor: colors.gray300 },
                      selectedStatus === option.value && {
                        borderColor: option.color,
                        backgroundColor: option.color + "10",
                      },
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={selectedStatus === option.value ? option.color : colors.gray400} 
                    />
                    <Text style={[
                      styles.statusOptionText,
                      { color: colors.gray700 },
                      selectedStatus === option.value && { 
                        color: option.color, 
                        fontWeight: "600" 
                      },
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.gray700 }]}>
                Batal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.updateButton,
                { backgroundColor: colors.primary },
                (selectedResiIds.length === 0 || !selectedStatus || loading) && { 
                  backgroundColor: colors.gray300,
                },
              ]}
              onPress={handleUpdateStatus}
              disabled={selectedResiIds.length === 0 || !selectedStatus || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Update ({selectedResiIds.length})
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
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resiListContainer: {
    maxHeight: 180,
    marginBottom: 20,
  },
  resiItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  selectionIndicator: {
    marginRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  resiInfo: {
    flex: 1,
  },
  resiNumber: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  resiName: {
    fontSize: 12,
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  statusOptionText: {
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
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSettings } from "../../contexts/SettingsContext";
import { getColors } from "../../constants/Colors";
import Button from "./Button";

const PaymentModal = ({ visible, payment, onClose, onPaymentSuccess, creditBalance = 0 }) => {
  const { theme, loading: settingsLoading } = useSettings();
  const colors = getColors(theme);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMode, setPaymentMode] = useState('exact');
  const [customAmount, setCustomAmount] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePaymentAmount = () => {
    if (!payment) return {
      originalAmount: 0,
      baseAmount: 0,
      creditApplied: 0,
      amountAfterCredit: 0,
      payableToBePaid: 0,
      excessAmount: 0,
      willBecomeCredit: 0
    };
    
    const baseAmount = payment.remainingAmount || payment.amount;
    const creditApplied = Math.min(creditBalance, baseAmount);
    const amountAfterCredit = Math.max(0, baseAmount - creditApplied);
    
    let payableToBePaid = amountAfterCredit;
    let excessAmount = 0;
    let willBecomeCredit = 0;
    
    if (paymentMode === 'custom' && customAmount) {
      const customAmountNum = parseInt(customAmount) || 0;
      payableToBePaid = customAmountNum;
      
      if (customAmountNum > amountAfterCredit) {
        excessAmount = customAmountNum - amountAfterCredit;
        const maxCredit = payment.amount * 3;
        willBecomeCredit = Math.min(excessAmount, maxCredit - creditBalance);
      }
    }
    
    return {
      originalAmount: payment.amount,
      baseAmount,
      creditApplied,
      amountAfterCredit,
      payableToBePaid,
      excessAmount,
      willBecomeCredit
    };
  };

  const { 
    originalAmount, 
    baseAmount, 
    creditApplied, 
    amountAfterCredit, 
    payableToBePaid, 
    excessAmount, 
    willBecomeCredit 
  } = calculatePaymentAmount();

  if (!payment) return null;

  const paymentMethods = [
    {
      id: "bca",
      name: "Transfer BCA",
      icon: "🏦",
      description: "Transfer ke rekening BCA Perusahaan",
      details: "Rek: 1234567890 a.n. Layanan Paket Express",
    },
    {
      id: "mandiri",
      name: "Transfer Mandiri",
      icon: "🏦",
      description: "Transfer ke rekening Mandiri Perusahaan",
      details: "Rek: 0987654321 a.n. Layanan Paket Express",
    },
    {
      id: "qris",
      name: "QRIS",
      icon: "📱",
      description: "Scan QRIS untuk pembayaran paket",
      details: "Scan QR Code dengan aplikasi mobile banking",
    },
    {
      id: "gopay",
      name: "GoPay",
      icon: "💚",
      description: "Bayar dengan GoPay",
      details: "Transfer ke 081234567890",
    },
    {
      id: "ovo",
      name: "OVO",
      icon: "💜",
      description: "Bayar dengan OVO",
      details: "Transfer ke 081234567890",
    },
    {
      id: "dana",
      name: "DANA",
      icon: "💙",
      description: "Bayar dengan DANA",
      details: "Transfer ke 081234567890",
    },
  ];

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
  };

  const handlePayNow = async () => {
    if ((amountAfterCredit || 0) > 0 && !selectedMethod) {
      Alert.alert(
        "Pilih Metode",
        "Silakan pilih metode pembayaran terlebih dahulu"
      );
      return;
    }

    // Validate custom amount
    if (paymentMode === 'custom' && customAmount) {
      const customAmountNum = parseInt(customAmount) || 0;
      if (customAmountNum < (amountAfterCredit || 0)) {
        Alert.alert(
          "Jumlah Tidak Valid",
          `Minimum pembayaran adalah ${formatCurrency(amountAfterCredit || 0)}`
        );
        return;
      }
    }

    setProcessing(true);

    const finalAmount = paymentMode === 'custom' && customAmount 
      ? parseInt(customAmount) 
      : (amountAfterCredit || 0);

    setTimeout(() => {
      const successMessage = (excessAmount || 0) > 0 
        ? `Pembayaran paket ${payment.periodData?.label} berhasil! Kelebihan ${formatCurrency(willBecomeCredit || 0)} menjadi credit.`
        : `Pembayaran paket ${payment.periodData?.label} sebesar ${formatCurrency(finalAmount || 0)} berhasil diproses.`;

      Alert.alert(
        "Pembayaran Paket Berhasil! 🎉",
        successMessage,
        [
          {
            text: "OK",
            onPress: () => {
              setProcessing(false);
              setSelectedMethod(null);
              setPaymentMode('exact');
              setCustomAmount('');
              onPaymentSuccess(payment, selectedMethod?.id || 'credit', finalAmount);
              onClose();
            },
          },
        ]
      );
    }, 2000);
  };

  const handleClose = () => {
    if (!processing) {
      setSelectedMethod(null);
      setPaymentMode('exact');
      setCustomAmount('');
      onClose();
    }
  };

  if (settingsLoading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContainer, { backgroundColor: colors.white }]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}
          >
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>
              Pembayaran Paket
            </Text>
            {!processing && (
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.gray100 },
                ]}
                onPress={handleClose}
              >
                <Text
                  style={[styles.closeButtonText, { color: colors.gray600 }]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.paymentInfo,
                { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Text style={[styles.periodTitle, { color: colors.gray900 }]}>
                💳 {payment.periodData?.label || `Periode ${payment.periodData?.number}`}
              </Text>
              <Text style={[styles.originalAmountText, { color: colors.gray600 }]}>
                Nominal: {formatCurrency(originalAmount || 0)}
              </Text>
              
              {creditApplied > 0 && (
                <View style={styles.creditSection}>
                  <Text style={[styles.creditText, { color: colors.green }]}>
                    💰 Credit: -{formatCurrency(creditApplied || 0)}
                  </Text>
                  <View style={[styles.divider, { backgroundColor: colors.gray300 }]} />
                </View>
              )}
              
              <Text style={[styles.finalAmountText, { color: colors.primary }]}>
                Yang harus dibayar: {formatCurrency(amountAfterCredit || 0)}
              </Text>
              
              {(amountAfterCredit || 0) === 0 && (
                <Text style={[styles.paidWithCreditText, { color: colors.green }]}>
                  ✅ Lunas dengan Credit
                </Text>
              )}
            </View>

            {(amountAfterCredit || 0) > 0 && (
              <View style={styles.paymentModeSection}>
                <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                  Mode Pembayaran:
                </Text>
                <View style={styles.paymentModeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: paymentMode === 'exact' ? colors.primary : colors.gray100,
                        borderColor: paymentMode === 'exact' ? colors.primary : colors.gray300,
                      },
                    ]}
                    onPress={() => setPaymentMode('exact')}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: paymentMode === 'exact' ? colors.white : colors.gray700 },
                      ]}
                    >
                      Bayar Pas
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: paymentMode === 'custom' ? colors.primary : colors.gray100,
                        borderColor: paymentMode === 'custom' ? colors.primary : colors.gray300,
                      },
                    ]}
                    onPress={() => setPaymentMode('custom')}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        { color: paymentMode === 'custom' ? colors.white : colors.gray700 },
                      ]}
                    >
                      Bayar Custom
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {paymentMode === 'custom' && (
                  <View style={styles.customAmountSection}>
                    <Text style={[styles.customAmountLabel, { color: colors.gray700 }]}>
                      Jumlah Pembayaran:
                    </Text>
                    <TextInput
                      style={[
                        styles.customAmountInput,
                        {
                          backgroundColor: colors.white,
                          borderColor: colors.gray300,
                          color: colors.gray900,
                        },
                      ]}
                      placeholder={`Min: ${formatCurrency(amountAfterCredit || 0)}`}
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      keyboardType="numeric"
                    />
                    
                    {(excessAmount || 0) > 0 && (
                      <View style={[styles.excessPreview, { backgroundColor: colors.primary + '10' }]}>
                        <Text style={[styles.excessText, { color: colors.primary }]}>
                          💡 Kelebihan Pembayaran:
                        </Text>
                        <Text style={[styles.excessAmount, { color: colors.gray700 }]}>
                          {formatCurrency(excessAmount || 0)} → Credit {formatCurrency(willBecomeCredit || 0)}
                        </Text>
                        {(willBecomeCredit || 0) < (excessAmount || 0) && (
                          <Text style={[styles.excessWarning, { color: colors.warning }]}>
                            ⚠️ Credit dibatasi maksimal 3x nominal periode
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {amountAfterCredit > 0 && (
              <View style={styles.methodsSection}>
                <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                  Pilih Metode Pembayaran:
                </Text>

              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodCard,
                    {
                      backgroundColor: colors.white,
                      borderColor:
                        selectedMethod?.id === method.id
                          ? colors.primary
                          : colors.gray200,
                    },
                    selectedMethod?.id === method.id && {
                      backgroundColor: colors.primary + "08",
                    },
                  ]}
                  onPress={() => handleMethodSelect(method)}
                  disabled={processing}
                >
                  <View
                    style={[
                      styles.methodIcon,
                      { backgroundColor: colors.gray100 },
                    ]}
                  >
                    <Text style={styles.methodIconText}>{method.icon}</Text>
                  </View>

                  <View style={styles.methodInfo}>
                    <Text
                      style={[styles.methodName, { color: colors.gray900 }]}
                    >
                      {method.name}
                    </Text>
                    <Text
                      style={[
                        styles.methodDescription,
                        { color: colors.gray600 },
                      ]}
                    >
                      {method.description}
                    </Text>
                    <Text
                      style={[styles.methodDetails, { color: colors.gray500 }]}
                    >
                      {method.details}
                    </Text>
                  </View>

                  {selectedMethod?.id === method.id && (
                    <View
                      style={[
                        styles.selectedIcon,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectedIconText,
                          { color: colors.white },
                        ]}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              </View>
            )}

            {processing && (
              <View style={styles.processingSection}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[styles.processingText, { color: colors.gray900 }]}
                >
                  Memproses pembayaran melalui {selectedMethod?.name}...
                </Text>
                <Text
                  style={[styles.processingSubtext, { color: colors.gray600 }]}
                >
                  Mohon tunggu sebentar
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[styles.modalFooter, { borderTopColor: colors.gray200 }]}
          >
            <Button
              title="Batal"
              onPress={handleClose}
              variant="outline"
              style={[styles.cancelButton, { borderColor: colors.primary }]}
              disabled={processing}
            />
            
            {(amountAfterCredit || 0) === 0 ? (
              <Button
                title="Gunakan Credit"
                onPress={handlePayNow}
                style={[styles.payButton, { backgroundColor: colors.green }]}
                disabled={processing}
              />
            ) : (
              <Button
                title={processing ? "Memproses..." : "Bayar Sekarang"}
                onPress={handlePayNow}
                style={[
                  styles.payButton,
                  {
                    backgroundColor: selectedMethod
                      ? colors.primary
                      : colors.gray400,
                  },
                ]}
                disabled={!selectedMethod || processing}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  paymentInfo: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 20,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  originalAmountText: {
    fontSize: 16,
    marginBottom: 8,
  },
  creditSection: {
    marginVertical: 8,
    alignItems: 'center',
  },
  creditText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  finalAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  paidWithCreditText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  paymentModeSection: {
    marginBottom: 20,
  },
  paymentModeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customAmountSection: {
    marginTop: 12,
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  customAmountInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  excessPreview: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  excessText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  excessAmount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  excessWarning: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  methodsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  methodDetails: {
    fontSize: 12,
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIconText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  processingSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  processingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 2,
  },
});

export default PaymentModal;

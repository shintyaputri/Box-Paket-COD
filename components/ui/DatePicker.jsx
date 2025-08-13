import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "../../constants/Colors";

const DatePicker = ({
  label,
  value,
  onChange,
  error,
  placeholder = "Select date",
  maximumDate,
  minimumDate,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    value ? new Date(value) : new Date()
  );

  const handleDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split("T")[0];
      onChange(formattedDate);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return placeholder;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const showDatePicker = () => {
    Keyboard.dismiss();
    setTimeout(() => {
      setShowPicker(true);
    }, 100);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputContainer, error && styles.inputContainerError]}
        onPress={showDatePicker}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {formatDisplayDate(value)}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.gray700,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: Colors.error,
  },
  dateText: {
    fontSize: 16,
    color: Colors.gray900,
    flex: 1,
  },
  placeholderText: {
    color: Colors.gray400,
  },
  calendarIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
});

export default DatePicker;

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Colors } from "../../constants/Colors";

const DataTable = ({ headers, data, onEdit, onDelete, keyExtractor }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
        return Colors.success;
      case "pending":
        return Colors.warning;
      case "inactive":
      case "error":
        return Colors.error;
      default:
        return Colors.gray700;
    }
  };

  const formatNumber = (value) => {
    if (typeof value === "number") {
      return value.toFixed(2);
    }
    return String(value);
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return "";
    const date = new Date(datetime);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const renderActionButtons = (item, rowIndex) => {
    const originalItem = data[rowIndex];

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => onEdit && onEdit(originalItem)}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete && onDelete(originalItem)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCell = (value, columnIndex, rowIndex) => {
    if (columnIndex === headers.length - 1) {
      return renderActionButtons(value, rowIndex);
    }

    if (columnIndex === 3) {
      return (
        <Text
          style={[
            styles.cellText,
            styles.statusText,
            { color: getStatusColor(value) },
          ]}
        >
          {String(value)}
        </Text>
      );
    }

    if (columnIndex === 0) {
      return (
        <Text style={[styles.cellText, styles.dateTimeText]} numberOfLines={2}>
          {formatDateTime(value)}
        </Text>
      );
    }

    if (columnIndex === 1 || columnIndex === 2) {
      return (
        <Text style={[styles.cellText, styles.numberText]} numberOfLines={1}>
          {formatNumber(value)}
        </Text>
      );
    }

    return (
      <Text style={styles.cellText} numberOfLines={2}>
        {String(value)}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            {headers.map((header, index) => (
              <View
                key={index}
                style={[styles.headerCell, styles[`column${index}`]]}
              >
                <Text style={styles.headerText}>{header}</Text>
              </View>
            ))}
          </View>

          {data.map((row, rowIndex) => (
            <View
              key={keyExtractor ? keyExtractor(row, rowIndex) : rowIndex}
              style={[
                styles.dataRow,
                rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow,
              ]}
            >
              <View style={[styles.dataCell, styles.column0]}>
                {renderCell(row.datetime, 0, rowIndex)}
              </View>
              <View style={[styles.dataCell, styles.column1]}>
                {renderCell(row.value1, 1, rowIndex)}
              </View>
              <View style={[styles.dataCell, styles.column2]}>
                {renderCell(row.value2, 2, rowIndex)}
              </View>
              <View style={[styles.dataCell, styles.column3]}>
                {renderCell(row.status, 3, rowIndex)}
              </View>
              <View style={[styles.dataCell, styles.column4]}>
                {renderCell(row, 4, rowIndex)}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: "hidden",
  },
  table: {
    minWidth: "100%",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: Colors.gray50,
    borderBottomWidth: 2,
    borderBottomColor: Colors.gray200,
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray900,
    textAlign: "center",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  evenRow: {
    backgroundColor: Colors.white,
  },
  oddRow: {
    backgroundColor: Colors.gray25,
  },
  dataCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: Colors.gray100,
  },
  cellText: {
    fontSize: 13,
    color: Colors.gray700,
    textAlign: "center",
  },
  dateTimeText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    lineHeight: 14,
  },
  numberText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontWeight: "500",
  },
  statusText: {
    fontWeight: "500",
    textTransform: "capitalize",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  editButtonText: {
    fontSize: 14,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  column0: {
    width: 120,
  },
  column1: {
    width: 90,
  },
  column2: {
    width: 90,
  },
  column3: {
    width: 90,
  },
  column4: {
    width: 90,
  },
});

export default DataTable;

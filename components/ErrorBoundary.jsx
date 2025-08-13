import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors } from "../constants/Colors";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Terjadi Kesalahan</Text>
          <Text style={styles.message}>
            Aplikasi mengalami error tak terduga. Silakan coba lagi.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.gray900,
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: Colors.gray600,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ErrorBoundary;

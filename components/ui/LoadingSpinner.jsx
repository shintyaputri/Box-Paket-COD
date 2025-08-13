import React, { useEffect, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { Colors } from "../../constants/Colors";

const LoadingSpinner = ({
  size = "large",
  color = Colors.primary,
  text = "Memuat...",
  subText = null,
  style,
  showProgress = false,
  progressSteps = [],
  currentStep = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (showProgress && progressSteps.length > 0) {
      const progressValue = (currentStep + 1) / progressSteps.length;
      Animated.timing(progressAnim, {
        toValue: progressValue,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep, progressSteps, showProgress]);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        <View style={styles.pulse} />
      </View>

      {text && <Text style={[styles.text, { color: color }]}>{text}</Text>}

      {subText && <Text style={styles.subText}>{subText}</Text>}

      {showProgress && progressSteps.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {progressSteps[currentStep] && (
            <Text style={styles.stepText}>{progressSteps[currentStep]}</Text>
          )}

          <Text style={styles.stepCounter}>
            {currentStep + 1} dari {progressSteps.length}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const LoadingCard = ({
  title = "Memuat Data",
  subtitle = "Mohon tunggu sebentar...",
  color = Colors.primary,
  children,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <LoadingSpinner size="large" color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
        {children}
      </View>
    </Animated.View>
  );
};

const LoadingOverlay = ({
  visible,
  text = "Memuat...",
  color = Colors.primary,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayContent}>
        <LoadingSpinner size="large" color={color} text={text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  spinnerContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pulse: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.gray600,
    textAlign: "center",
  },
  progressContainer: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepText: {
    fontSize: 14,
    color: Colors.gray700,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  stepCounter: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: "center",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    minWidth: 300,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray900,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.gray600,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  overlayContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    maxWidth: 280,
  },
});

export { LoadingCard, LoadingOverlay };
export default LoadingSpinner;

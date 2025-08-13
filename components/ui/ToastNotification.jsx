import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../../contexts/SettingsContext";
import { getColors } from "../../constants/Colors";
import { useNotification } from "../../contexts/NotificationContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NOTIFICATION_HEIGHT = 100;

export default function ToastNotification() {
  const { theme } = useSettings();
  const colors = getColors(theme);
  const insets = useSafeAreaInsets();
  const { notifications, visible, removeNotification } = useNotification();

  const translateY = useRef(
    new Animated.Value(-NOTIFICATION_HEIGHT - insets.top)
  ).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const currentNotification = notifications[0];

  useEffect(() => {
    if (visible && currentNotification) {
      showNotification();
    } else {
      hideNotification();
    }
  }, [visible, currentNotification]);

  const showNotification = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -NOTIFICATION_HEIGHT - insets.top,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismissNotification = () => {
    if (currentNotification) {
      removeNotification(currentNotification.id);
    }
  };

  const handleSwipeUp = () => {
    dismissNotification();
  };

  const getNotificationStyle = (type) => {
    const baseStyle = {
      backgroundColor: colors.white,
      borderLeftWidth: 4,
    };

    switch (type) {
      case "success":
        return {
          ...baseStyle,
          borderLeftColor: colors.success,
          backgroundColor: colors.white,
        };
      case "error":
        return {
          ...baseStyle,
          borderLeftColor: colors.error,
          backgroundColor: colors.white,
        };
      case "warning":
        return {
          ...baseStyle,
          borderLeftColor: colors.warning,
          backgroundColor: colors.white,
        };
      case "info":
      default:
        return {
          ...baseStyle,
          borderLeftColor: colors.primary,
          backgroundColor: colors.white,
        };
    }
  };

  const getIconStyle = (type) => {
    switch (type) {
      case "success":
        return { color: colors.success };
      case "error":
        return { color: colors.error };
      case "warning":
        return { color: colors.warning };
      case "info":
      default:
        return { color: colors.primary };
    }
  };

  if (!currentNotification) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }, { translateX }, { scale }],
            opacity,
            zIndex: 9999,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notification,
            getNotificationStyle(currentNotification.type),
            {
              shadowColor: colors.shadow.color,
            },
          ]}
          onPress={dismissNotification}
          onLongPress={handleSwipeUp}
          activeOpacity={0.9}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                {currentNotification.icon && (
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor:
                          getIconStyle(currentNotification.type).color + "15",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.icon,
                        getIconStyle(currentNotification.type),
                      ]}
                    >
                      {currentNotification.icon}
                    </Text>
                  </View>
                )}
                <Text style={[styles.title, { color: colors.gray900 }]}>
                  {currentNotification.title}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colors.gray100,
                    borderWidth: 1,
                    borderColor: colors.gray200,
                  },
                ]}
                onPress={dismissNotification}
              >
                <Text style={[styles.closeText, { color: colors.gray600 }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.message, { color: colors.gray700 }]}>
              {currentNotification.message}
            </Text>

            {currentNotification.actions &&
              currentNotification.actions.length > 0 && (
                <View style={styles.actions}>
                  {currentNotification.actions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionButton,
                        action.primary && { backgroundColor: colors.primary },
                        !action.primary && { backgroundColor: colors.gray100 },
                      ]}
                      onPress={() => {
                        action.onPress?.(currentNotification);
                        dismissNotification();
                      }}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          action.primary && { color: colors.white },
                          !action.primary && { color: colors.gray700 },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
          </View>

          {currentNotification.autoHide && (
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: getIconStyle(currentNotification.type)
                      .color,
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        100 -
                          ((Date.now() - currentNotification.timestamp) /
                            currentNotification.duration) *
                            100
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
    pointerEvents: "box-none",
  },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  notification: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    height: 3,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginTop: 12,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 1.5,
  },
});

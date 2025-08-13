import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../../constants/Colors";

const IllustrationContainer = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.illustrationWrapper}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.shadow.color,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
});

export default IllustrationContainer;

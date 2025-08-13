import React from "react";
import { View, StyleSheet } from "react-native";
import ForgotPasswordSvg from "../../assets/images/forgot-password-illustration.svg";

const ForgotPasswordIllustration = ({ width = 280, height = 200, style }) => {
  return (
    <View style={[styles.container, style]}>
      <ForgotPasswordSvg width={width} height={height} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export default ForgotPasswordIllustration;

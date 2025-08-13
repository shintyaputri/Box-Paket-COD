import React from "react";
import { View, StyleSheet } from "react-native";
import RegisterSvg from "../../assets/images/register-illustration.svg";

const RegisterIllustration = ({ width = 280, height = 200, style }) => {
  return (
    <View style={[styles.container, style]}>
      <RegisterSvg width={width} height={height} />
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

export default RegisterIllustration;

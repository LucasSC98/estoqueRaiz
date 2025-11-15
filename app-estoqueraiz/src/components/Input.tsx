import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

type InputProps = TextInputProps;

export function Input(props: InputProps) {
  return <TextInput style={[styles.input, props.style]} {...props} />;
}
const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    fontFamily: "NunitoSans_400Regular",
  },
  inputErro: {
    borderColor: "#F44336",
  },
});

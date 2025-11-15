import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Home() {
  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  useEffect(() => {
    async function buscarUsuario() {
      const usuarioJson = await AsyncStorage.getItem("usuario");
      if (usuarioJson) {
        const usuario = JSON.parse(usuarioJson);
        setNomeUsuario(usuario.nome);
      }
    }
    buscarUsuario();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Bem-vindo, {nomeUsuario}!</Text>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  titulo: { fontSize: 20, fontWeight: "semibold" },
});

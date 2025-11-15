import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Input } from "../components/Input";
import { RootStackParamList } from "../types/navigation";
import api from "../services/api";
import Toast from "react-native-toast-message";

export default function Login() {
  type LoginScreenProp = NativeStackNavigationProp<RootStackParamList, "Login">;
  const navigation = useNavigation<LoginScreenProp>();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async () => {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        senha,
      });

      const data = response.data;

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("usuario", JSON.stringify(data.usuario));
      await AsyncStorage.setItem("nome", data.usuario.nome);
      await AsyncStorage.setItem("cargo", data.usuario.cargo);

      navigation.navigate("Dashboard");
    } catch (error: any) {
      if (error.response) {
        Toast.show({
          type: "error",
          text1: "Erro no Login",
          text2: error.response.data.message || "Email ou senha incorretos",
          position: "bottom",
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Erro de Conexão",
          text2: "Erro de conexão. Verifique sua internet.",
          position: "bottom",
          visibilityTime: 4000,
        });
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.titulo}>Entrar</Text>
          <Text style={styles.subtitulo}>Acesse sua conta para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <Input
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <Input
              placeholder="Sua senha"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
              value={senha}
              onChangeText={setSenha}
              style={styles.input}
              textContentType={Platform.OS === "ios" ? "oneTimeCode" : "none"}
            />
          </View>

          <TouchableOpacity
            style={styles.botao}
            onPress={() => {
              handleLogin();
            }}
          >
            <Text style={styles.botaoTexto}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: "row" }}>
            <Text style={styles.loginTexto}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Cadastro")}>
              <Text style={styles.loginLink}>Crie uma aqui</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingTop: 100,
    paddingBottom: 48,
    alignItems: "center",
    marginTop: 30,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "NunitoSans_700Bold",
    color: "#111827",
  },
  subtitulo: {
    fontSize: 15,
    fontFamily: "NunitoSans_400Regular",
    color: "#044001",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 25,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    height: 50,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: "#111827",
  },
  botao: {
    backgroundColor: "#111827",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
  footer: {
    paddingVertical: 32,
    alignItems: "center",
    bottom: 30,
  },
  loginTexto: {
    fontSize: 14,
    fontFamily: "NunitoSans_400Regular",
    color: "#6B7280",
  },
  loginLink: {
    color: "#111827",
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
});

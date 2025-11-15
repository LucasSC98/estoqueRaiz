import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { cpf as cpfValidator } from "cpf-cnpj-validator";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaskedTextInput } from "react-native-mask-text";
import { Input } from "../components/Input";
import { RootStackParamList } from "../types/navigation";
import Toast from "react-native-toast-message";
import api from "../services/api";
import { useAppFonts } from "../hooks/useAppFonts";

export default function Cadastro() {
  type CadastroScreenProp = NativeStackNavigationProp<
    RootStackParamList,
    "Cadastro"
  >;
  const navigation = useNavigation<CadastroScreenProp>();
  const fontesCarregadas = useAppFonts();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpfValor, setCpfValor] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function cadastroUsuario() {
    if (senha !== confirmarSenha) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "As senhas precisam ser iguais!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (!nome || !email || !cpfValor || !senha) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Você precisa preencher todos os campos!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }
    if (!cpfValidator.isValid(cpfValor)) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Esse cpf é invalido!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const resposta = await api.post("/api/usuarios", {
        nome,
        email,
        cpf: cpfValor,
        senha,
      });

      if (!resposta.data) {
        throw new Error("Houve algo errado ao cadastrar o usuário.");
      }

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: `Seu cadastro foi realizado com sucesso! usuario: ${nome}`,
        position: "top",
        visibilityTime: 3000,
      });
      navigation.navigate("Login");
      setNome("");
      setEmail("");
      setCpfValor("");
      setSenha("");
      setConfirmarSenha("");
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: String(error),
        position: "top",
        visibilityTime: 3000,
      });
    }
  }

  if (!fontesCarregadas) {
    return null;
  }

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
          <Text style={styles.titulo}>Criar conta</Text>
          <Text style={styles.subtitulo}>Preencha seus dados para começar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <Input
              placeholder="Seu nome completo"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <Input
              placeholder="seu@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CPF</Text>
            <MaskedTextInput
              mask="999.999.999-99"
              onChangeText={setCpfValor}
              value={cpfValor}
              keyboardType="numeric"
              style={styles.input}
              placeholder="000.000.000-00"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <Input
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
              value={senha}
              onChangeText={setSenha}
              style={styles.input}
              textContentType={Platform.OS === "ios" ? "oneTimeCode" : "none"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar senha</Text>
            <Input
              placeholder="Digite a senha novamente"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.botao} onPress={cadastroUsuario}>
            <Text style={styles.botaoTexto}>Criar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.loginTexto}>
            Já tem uma conta?{" "}
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Entre aqui</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000ff",
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
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: "center",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "NunitoSans_700Bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: "#6B7280",
    textAlign: "center",
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
    height: 52,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
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
    top: 5,
  },
});

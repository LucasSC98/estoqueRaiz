import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  useFonts,
} from "@expo-google-fonts/nunito-sans";

import { useState, useCallback } from "react";
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
import Header from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import api from "../services/api";
import Toast from "react-native-toast-message";

export default function CadastroCategoria() {
  const navigation = useNavigation();

  const voltarParaDashboard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const [fontesLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  async function cadastrarCategoria() {
    if (!nome || !descricao) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Preencha todos os campos!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const resposta = await api.post("/api/categorias", { nome, descricao });

      if (!resposta.data) {
        throw new Error("Erro ao cadastrar a categoria.");
      }

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Categoria cadastrada com sucesso!",
        position: "top",
        visibilityTime: 3000,
      });
      limparCampos();
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

  function limparCampos() {
    setNome("");
    setDescricao("");
  }

  if (!fontesLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header
        titulo="Cadastro de Categoria"
        subtitulo="Preencha os dados da categoria"
        onPressVoltar={voltarParaDashboard}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome</Text>
            <Input
              placeholder="Nome da categoria"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <Input
              placeholder="Descrição da categoria"
              value={descricao}
              onChangeText={setDescricao}
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
            />
          </View>

          <TouchableOpacity
            style={styles.botaoCadastrar}
            onPress={cadastrarCategoria}
          >
            <Text style={styles.botaoTexto}>Cadastrar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoLimpar} onPress={limparCampos}>
            <Text style={styles.botaoTexto}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  form: { flex: 1 },
  inputGroup: { marginBottom: 20 },
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
  botaoCadastrar: {
    backgroundColor: "#111827",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  botaoLimpar: {
    backgroundColor: "#6B7280",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
});

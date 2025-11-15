import {
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  useFonts,
} from "@expo-google-fonts/nunito-sans";
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
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { MaskedTextInput } from "react-native-mask-text";
import { Input } from "../components/Input";
import Header from "../components/Header";
import api from "../services/api";
import Toast from "react-native-toast-message";

export default function CadastroUnidade() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [fontesLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  async function buscarEnderecoPorCep(cepDigitado: string) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      return;
    }

    setBuscandoCep(true);

    try {
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
      const dados = await resposta.json();

      if (dados.erro) {
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "CEP não encontrado!",
          position: "top",
          visibilityTime: 3000,
        });
        return;
      }

      setRua(dados.logradouro || "");
      setBairro(dados.bairro || "");
      setCidade(dados.localidade || "");
      setEstado(dados.uf || "");
    } catch {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível buscar o CEP. Verifique sua conexão.",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setBuscandoCep(false);
    }
  }

  async function cadastrarUnidade() {
    if (!nome || !cep || !rua || !bairro || !numero || !cidade || !estado) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Preencha todos os campos obrigatórios!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    try {
      const resposta = await api.post("/api/unidades", {
        nome,
        descricao: descricao || null,
        rua,
        numero,
        bairro,
        cidade,
        estado,
        cep,
      });

      if (!resposta.data) {
        throw new Error("Erro ao cadastrar a unidade.");
      }

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Unidade cadastrada com sucesso!",
        position: "top",
        visibilityTime: 3000,
      });
      limparCampos();
    } catch (error: any) {
      const mensagem =
        error.response?.data?.message || error.message || "Erro desconhecido";
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: `Falha ao cadastrar unidade: ${mensagem}`,
        position: "top",
        visibilityTime: 3000,
      });
    }
  }

  function limparCampos() {
    setNome("");
    setDescricao("");
    setCep("");
    setRua("");
    setBairro("");
    setNumero("");
    setCidade("");
    setEstado("");
    setBuscandoCep(false);
  }

  if (!fontesLoaded) return null;

  return (
    <View style={styles.container}>
      <Header
        titulo="Cadastro de Unidade"
        subtitulo="Preencha os dados da nova filial"
        onPressVoltar={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.secao}>
              <View style={styles.secaoHeader}>
                <MaterialIcons name="business" size={20} color="#059669" />
                <Text style={styles.secaoTitulo}>Informações Básicas</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome da Unidade *</Text>
                <Input
                  placeholder="Ex: Filial Centro, Matriz São Paulo..."
                  value={nome}
                  onChangeText={setNome}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descrição</Text>
                <Input
                  placeholder="Descrição opcional da unidade..."
                  value={descricao}
                  onChangeText={setDescricao}
                  style={[styles.input, styles.inputTextArea]}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            <View style={styles.secao}>
              <View style={styles.secaoHeader}>
                <MaterialIcons name="location-on" size={20} color="#059669" />
                <Text style={styles.secaoTitulo}>Endereço</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  CEP *{" "}
                  {buscandoCep && (
                    <Text style={styles.statusText}>(Buscando...)</Text>
                  )}
                </Text>
                <MaskedTextInput
                  mask="99999-999"
                  keyboardType="numeric"
                  value={cep}
                  onChangeText={(texto) => {
                    setCep(texto);
                    buscarEnderecoPorCep(texto);
                  }}
                  style={[
                    styles.input,
                    buscandoCep && styles.inputCarregando,
                    cep && styles.inputPreenchido,
                  ]}
                  placeholder="00000-000"
                  placeholderTextColor="#9CA3AF"
                  editable={!buscandoCep}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 3 }]}>
                  <Text style={styles.label}>
                    Rua * {rua && <Text style={styles.statusText}>(Auto)</Text>}
                  </Text>
                  <Input
                    placeholder="Nome da rua"
                    value={rua}
                    onChangeText={setRua}
                    style={[styles.input, rua && styles.inputPreenchido]}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Número *</Text>
                  <Input
                    placeholder="123"
                    keyboardType="numeric"
                    value={numero}
                    onChangeText={setNumero}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Bairro *{" "}
                  {bairro && <Text style={styles.statusText}>(Auto)</Text>}
                </Text>
                <Input
                  placeholder="Nome do bairro"
                  value={bairro}
                  onChangeText={setBairro}
                  style={[styles.input, bairro && styles.inputPreenchido]}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 3 }]}>
                  <Text style={styles.label}>
                    Cidade *{" "}
                    {cidade && <Text style={styles.statusText}>(Auto)</Text>}
                  </Text>
                  <Input
                    placeholder="Nome da cidade"
                    value={cidade}
                    onChangeText={setCidade}
                    style={[styles.input, cidade && styles.inputPreenchido]}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>
                    UF *{" "}
                    {estado && <Text style={styles.statusText}>(Auto)</Text>}
                  </Text>
                  <Input
                    placeholder="PR"
                    maxLength={2}
                    autoCapitalize="characters"
                    value={estado}
                    onChangeText={setEstado}
                    style={[styles.input, estado && styles.inputPreenchido]}
                  />
                </View>
              </View>
            </View>
            <View style={styles.botoesContainer}>
              <TouchableOpacity
                style={styles.botaoCadastrar}
                onPress={cadastrarUnidade}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add-business" size={20} color="#FFFFFF" />
                <Text style={styles.botaoTexto}>Cadastrar Unidade</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoLimpar}
                onPress={limparCampos}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={18} color="#6B7280" />
                <Text style={styles.botaoTextoSecundario}>Limpar Campos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
  },
  secao: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  secaoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  secaoTitulo: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    color: "#1e293b",
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    color: "#374151",
    marginBottom: 6,
  },
  statusText: {
    fontSize: 11,
    color: "#059669",
    fontStyle: "italic",
  },
  input: {
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "NunitoSans_400Regular",
    color: "#1e293b",
  },
  inputTextArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  inputCarregando: {
    backgroundColor: "#fefce8",
    borderColor: "#facc15",
    borderWidth: 1.5,
  },
  inputPreenchido: {
    backgroundColor: "#f0fdf4",
    borderColor: "#22c55e",
    borderWidth: 1.5,
  },
  botoesContainer: {
    marginTop: 20,
    gap: 12,
  },
  botaoCadastrar: {
    backgroundColor: "#059669",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  botaoLimpar: {
    backgroundColor: "#f8fafc",
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  botaoTexto: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 8,
  },
  botaoTextoSecundario: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "NunitoSans_600SemiBold",
    marginLeft: 6,
  },
});

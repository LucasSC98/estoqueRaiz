import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

interface Unidade {
  id: number;
  nome: string;
  descricao?: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude?: number;
  longitude?: number;
}

export default function MapaUnidades() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoToque, setProcessandoToque] = useState<number | null>(null);
  const [ehGerente, setEhGerente] = useState(false);

  const verificarCargoUsuario = React.useCallback(async () => {
    try {
      const cargo = await AsyncStorage.getItem("cargo");
      setEhGerente(cargo === "gerente");
    } catch (error) {
      console.error("Erro ao verificar cargo do usuário:", error);
      setEhGerente(false);
    }
  }, []);

  const carregarUnidades = React.useCallback(async () => {
    try {
      setCarregando(true);
      const response = await api.get("/api/unidades");
      setUnidades(response.data);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível carregar as unidades",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    verificarCargoUsuario();
    carregarUnidades();
  }, [verificarCargoUsuario, carregarUnidades]);

  const abrirNoMapa = React.useCallback(
    async (unidade: Unidade) => {
      if (processandoToque === unidade.id) {
        return;
      }

      setProcessandoToque(unidade.id);

      try {
        const endereco = `${unidade.rua}, ${unidade.numero}, ${unidade.bairro}, ${unidade.cidade}, ${unidade.estado}, ${unidade.cep}`;
        const enderecoEncoded = encodeURIComponent(endereco);

        let url: string;

        if (Platform.OS === "ios") {
          url = `http://maps.apple.com/?q=${enderecoEncoded}`;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${enderecoEncoded}`;
        }

        await Linking.openURL(url);
      } catch (err) {
        console.error("Erro ao abrir o mapa:", err);

        Toast.hide();

        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Não foi possível abrir o mapa",
          position: "top",
          visibilityTime: 3000,
        });
      } finally {
        setTimeout(() => {
          setProcessandoToque(null);
        }, 1000);
      }
    },
    [processandoToque]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.botaoVoltar}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTextos}>
            <Text style={styles.titulo}>Lista de Unidades</Text>
            <View style={styles.subtituloContainer}>
              {carregando && <ActivityIndicator size="small" color="#059669" />}
              <Text style={styles.subtitulo}>
                {carregando
                  ? "Carregando unidades..."
                  : `${unidades.length} unidades encontradas`}
              </Text>
            </View>
          </View>

          {ehGerente && (
            <TouchableOpacity
              style={styles.botaoCadastro}
              onPress={() => navigation.navigate("CadastroUnidade")}
              activeOpacity={0.8}
            >
              <View style={styles.iconeCadastroContainer}>
                <MaterialIcons name="add-business" size={20} color="#059669" />
              </View>
              <Text style={styles.textoCadastro}>Nova Unidade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {carregando ? (
        <ActivityIndicator
          size="large"
          color="#059669"
          style={styles.loading}
        />
      ) : (
        <ScrollView style={styles.lista}>
          {unidades.map((unidade) => (
            <TouchableOpacity
              key={unidade.id}
              style={[
                styles.unidadeItem,
                processandoToque === unidade.id &&
                  styles.unidadeItemDesabilitado,
              ]}
              onPress={() => abrirNoMapa(unidade)}
              activeOpacity={0.7}
              disabled={processandoToque === unidade.id}
            >
              <View style={styles.unidadeHeader}>
                <MaterialIcons name="business" size={24} color="#059669" />
                <Text style={styles.unidadeNome}>{unidade.nome}</Text>
              </View>
              {unidade.descricao && (
                <Text style={styles.unidadeDescricao}>{unidade.descricao}</Text>
              )}
              <View style={styles.unidadeEndereco}>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.enderecoTexto}>
                  {unidade.rua}, {unidade.numero}
                </Text>
              </View>
              <Text style={styles.enderecoComplemento}>
                {unidade.bairro}, {unidade.cidade} - {unidade.estado}
              </Text>
              <Text style={styles.cep}>CEP: {unidade.cep}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  botaoVoltar: {
    marginRight: 16,
  },
  headerTextos: {
    flex: 1,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  subtituloContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  subtitulo: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  botaoCadastro: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdf4",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  iconeCadastroContainer: {
    marginBottom: 2,
  },
  textoCadastro: {
    fontSize: 10,
    fontFamily: "NunitoSans_600SemiBold",
    color: "#059669",
    fontWeight: "600",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lista: {
    flex: 1,
    padding: 16,
  },
  unidadeItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  unidadeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  unidadeNome: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  unidadeDescricao: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  unidadeEndereco: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  enderecoTexto: {
    fontSize: 14,
    color: "#333",
    marginLeft: 4,
  },
  enderecoComplemento: {
    fontSize: 14,
    color: "#666",
    marginLeft: 20,
    marginBottom: 4,
  },
  cep: {
    fontSize: 12,
    color: "#999",
    marginLeft: 20,
  },
  clickHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    justifyContent: "center",
  },
  clickHintText: {
    fontSize: 12,
    color: "#059669",
    marginLeft: 4,
    fontStyle: "italic",
  },
  unidadeItemDesabilitado: {
    opacity: 0.5,
  },
});

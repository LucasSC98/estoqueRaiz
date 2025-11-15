import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface OpcaoSelecao {
  id: number | string;
  nome: string;
  [key: string]: any;
}

interface PropriedadesSelecao {
  rotulo: string;
  placeholder: string;
  valor: OpcaoSelecao | null;
  opcoes: OpcaoSelecao[];
  aoMudarValor: (valor: OpcaoSelecao | null) => void;
  obrigatorio?: boolean;
  desabilitado?: boolean;
  pesquisavel?: boolean;
  rotuloAcessibilidade?: string;
  renderizarOpcao?: (
    item: OpcaoSelecao,
    isSelected: boolean
  ) => React.ReactNode;
}

const COR_PRIMARIA = "#3B82F6";
const COR_PRIMARIA_FUNDO = "#EFF6FF";

export function Seletor({
  rotulo,
  placeholder,
  valor,
  opcoes,
  aoMudarValor,
  obrigatorio,
  desabilitado,
  pesquisavel,
  rotuloAcessibilidade,
  renderizarOpcao,
}: PropriedadesSelecao) {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [textoPesquisa, setTextoPesquisa] = useState("");

  const abrirModal = () => !desabilitado && setModalVisivel(true);
  const fecharModal = () => {
    setModalVisivel(false);
    setTextoPesquisa("");
  };

  const selecionarOpcao = (opcao: OpcaoSelecao | null) => {
    aoMudarValor(opcao);
    fecharModal();
  };

  const opcoesFiltradas = textoPesquisa
    ? opcoes.filter((o) =>
        o.nome.toLowerCase().includes(textoPesquisa.toLowerCase())
      )
    : opcoes;

  const renderItem = ({ item }: { item: OpcaoSelecao }) => {
    const selecionado = valor?.id === item.id;
    const conteudo = renderizarOpcao ? (
      renderizarOpcao(item, selecionado)
    ) : (
      <Text
        style={[styles.textoOpcao, selecionado && styles.textoOpcaoSelecionada]}
      >
        {item.nome}
      </Text>
    );

    return (
      <TouchableOpacity
        style={styles.itemOpcao}
        onPress={() => selecionarOpcao(item)}
        accessibilityLabel={`Selecionar ${item.nome}`}
        accessibilityRole="button"
        accessibilityState={{ selected: selecionado }}
      >
        {conteudo}
        {selecionado && (
          <MaterialIcons name="check" size={24} color={COR_PRIMARIA} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>
        {rotulo} {obrigatorio && <Text style={styles.obrigatorio}>*</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.seletor,
          desabilitado && styles.seletorDesabilitado,
          valor && styles.seletorAtivo,
        ]}
        onPress={abrirModal}
        disabled={desabilitado}
        accessibilityLabel={rotuloAcessibilidade || `Selecionar ${rotulo}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: desabilitado, expanded: modalVisivel }}
      >
        <Text
          style={[
            styles.textoSeletor,
            !valor && styles.textoSeletorPlaceholder,
            desabilitado && styles.textoSeletorDesabilitado,
          ]}
          numberOfLines={1}
        >
          {valor ? valor.nome : placeholder}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={desabilitado ? "#ccc" : "#666"}
        />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisivel}
        onRequestClose={fecharModal}
      >
        <TouchableWithoutFeedback onPress={fecharModal}>
          <View style={styles.overlayModal}>
            <TouchableWithoutFeedback>
              <View style={styles.conteudoModal}>
                <View style={styles.puxadorModalContainer}>
                  <View style={styles.puxadorModal} />
                </View>

                <View style={styles.cabecalhoModal}>
                  <Text style={styles.tituloModal}>{rotulo}</Text>
                  <TouchableOpacity onPress={fecharModal}>
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {pesquisavel && (
                  <View style={styles.containerPesquisa}>
                    <MaterialIcons name="search" size={20} color="#666" />
                    <TextInput
                      style={styles.inputPesquisa}
                      placeholder="Buscar..."
                      value={textoPesquisa}
                      onChangeText={setTextoPesquisa}
                    />
                  </View>
                )}

                <FlatList
                  data={opcoesFiltradas}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.containerVazio}>
                      <MaterialIcons name="search-off" size={48} color="#ccc" />
                      <Text style={styles.textoVazio}>
                        {textoPesquisa
                          ? "Nenhum resultado encontrado"
                          : "Nenhuma opção disponível"}
                      </Text>
                    </View>
                  }
                />

                {valor && (
                  <View style={styles.rodapeModal}>
                    <TouchableOpacity
                      onPress={() => selecionarOpcao(null)}
                      style={styles.botaoLimpar}
                    >
                      <Text style={styles.textoBotaoLimpar}>Limpar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  rotulo: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    fontFamily: "NunitoSans_600SemiBold",
  },
  obrigatorio: { color: "#EF4444" },
  seletor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  seletorAtivo: {
    borderColor: COR_PRIMARIA,
    backgroundColor: COR_PRIMARIA_FUNDO,
    shadowColor: COR_PRIMARIA,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  seletorDesabilitado: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    elevation: 0,
    shadowOpacity: 0,
  },
  textoSeletor: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
    fontFamily: "NunitoSans_400Regular",
  },
  textoSeletorPlaceholder: { color: "#9CA3AF" },
  textoSeletorDesabilitado: { color: "#9CA3AF" },
  overlayModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  conteudoModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  puxadorModalContainer: { alignItems: "center", paddingVertical: 12 },
  puxadorModal: {
    width: 40,
    height: 5,
    backgroundColor: "#D1D5DB",
    borderRadius: 100,
  },
  cabecalhoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    fontFamily: "NunitoSans_700Bold",
  },
  containerPesquisa: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 48,
  },
  inputPesquisa: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "NunitoSans_400Regular",
  },
  itemOpcao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  textoOpcao: {
    fontSize: 16,
    color: "#374151",
    fontFamily: "NunitoSans_400Regular",
  },
  textoOpcaoSelecionada: {
    fontFamily: "NunitoSans_700Bold",
    color: COR_PRIMARIA,
  },
  containerVazio: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 200,
  },
  textoVazio: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
    fontFamily: "NunitoSans_400Regular",
  },
  rodapeModal: { padding: 16, paddingTop: 8, alignItems: "center" },
  botaoLimpar: { paddingVertical: 8, paddingHorizontal: 16 },
  textoBotaoLimpar: {
    color: COR_PRIMARIA,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
  },
});

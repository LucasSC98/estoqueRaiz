import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import Header from "../components/Header";
import api, { getMovimentacoesPaginadas } from "../services/api";
import Toast from "react-native-toast-message";

type MovimentacoesScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  "Movimentacoes"
>;

interface Movimentacao {
  id: number;
  tipo: "ENTRADA" | "SAIDA" | "TRANSFERENCIA" | "AJUSTE";
  quantidade: number;
  data_movimentacao: string;
  observacao?: string;
  documento?: string;
  produto: {
    id: number;
    nome: string;
  };
  usuario: {
    id: number;
    nome: string;
  };
  unidade_origem?: {
    id: number;
    nome: string;
  };
  unidade_destino?: {
    id: number;
    nome: string;
  };
  criado_em: string;
}

export default function Movimentacoes() {
  const navigation = useNavigation<MovimentacoesScreenProp>();

  // Estados principais
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  // Estados de paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const ITENS_POR_PAGINA = 20;

  // Estados para dados de apoio
  const [produtos, setProdutos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);

  // Estados para filtros
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<any>(null);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<any>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("");
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [termoPesquisaDebounced, setTermoPesquisaDebounced] = useState("");

  // Estados para modais
  const [modalProdutoVisivel, setModalProdutoVisivel] = useState(false);
  const [modalUsuarioVisivel, setModalUsuarioVisivel] = useState(false);
  const [modalUnidadeVisivel, setModalUnidadeVisivel] = useState(false);
  const [modalTipoVisivel, setModalTipoVisivel] = useState(false);
  const [modalFiltrosVisivel, setModalFiltrosVisivel] = useState(false);

  // Debounce da pesquisa
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTermoPesquisaDebounced(termoPesquisa);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [termoPesquisa]);

  // Função para carregar movimentações paginadas
  const carregarMovimentacoesPaginadas = useCallback(
    async (resetar: boolean = false, pagina: number = 1) => {
      try {
        if (resetar) {
          setMovimentacoes([]);
          setPaginaAtual(1);
        } else {
          setCarregandoMais(true);
        }

        const params = {
          page: resetar ? 1 : pagina,
          limit: ITENS_POR_PAGINA,
          search: termoPesquisaDebounced.trim() || undefined,
          produto_id: produtoSelecionado?.id || undefined,
          tipo: tipoSelecionado || undefined,
          unidade_id: unidadeSelecionada?.id || undefined,
        };

        const response = await getMovimentacoesPaginadas(params);

        if (response.movimentacoes) {
          const novasMovimentacoes = Array.isArray(response.movimentacoes)
            ? response.movimentacoes
            : [];

          if (resetar) {
            setMovimentacoes(novasMovimentacoes);
          } else {
            setMovimentacoes((prev) => [...prev, ...novasMovimentacoes]);
          }

          if (response.pagination) {
            setTotalPaginas(response.pagination.total_pages);
            setTotalItens(response.pagination.total_items);
            setPaginaAtual(response.pagination.current_page);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar movimentações:", error);
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Erro ao carregar movimentações",
          position: "top",
        });
      } finally {
        setCarregandoMais(false);
      }
    },
    [
      termoPesquisaDebounced,
      produtoSelecionado,
      tipoSelecionado,
      unidadeSelecionada,
      ITENS_POR_PAGINA,
    ]
  );

  // Função para carregar dados iniciais
  const carregarDadosIniciais = useCallback(async () => {
    try {
      setCarregando(true);
      const [responseProdutos, responseUsuarios, responseUnidades] =
        await Promise.all([
          api.get("/api/produtos"),
          api.get("/api/usuarios"),
          api.get("/api/unidades"),
        ]);

      const produtosAtivos = Array.isArray(responseProdutos.data)
        ? responseProdutos.data.filter(
            (produto: any) => produto.quantidade_estoque > 0
          )
        : [];

      setProdutos(produtosAtivos);
      setUsuarios(
        Array.isArray(responseUsuarios.data) ? responseUsuarios.data : []
      );
      setUnidades(
        Array.isArray(responseUnidades.data) ? responseUnidades.data : []
      );

      await carregarMovimentacoesPaginadas(true);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      console.error(
        "Detalhes do erro:",
        error instanceof Error ? error.message : String(error)
      );

      Toast.show({
        type: "error",
        text1: "Erro de Conexão",
        text2: "Verifique se o backend está rodando e o IP está correto",
        position: "top",
        visibilityTime: 5000,
      });
    } finally {
      setCarregando(false);
    }
  }, [carregarMovimentacoesPaginadas]);

  // Função para atualizar lista
  const atualizarLista = useCallback(async () => {
    try {
      setAtualizando(true);
      await carregarMovimentacoesPaginadas(true);
    } catch (error) {
      console.error("Erro ao atualizar lista:", error);
    } finally {
      setAtualizando(false);
    }
  }, [carregarMovimentacoesPaginadas]);

  // Função para carregar mais movimentações
  const carregarMaisMovimentacoes = useCallback(() => {
    if (!carregandoMais && paginaAtual < totalPaginas) {
      carregarMovimentacoesPaginadas(false, paginaAtual + 1);
    }
  }, [
    carregandoMais,
    paginaAtual,
    totalPaginas,
    carregarMovimentacoesPaginadas,
  ]);

  // Effect para carregar dados iniciais na montagem
  useEffect(() => {
    carregarDadosIniciais();
  }, [carregarDadosIniciais]);

  // Effect para recarregar quando filtros mudarem
  useEffect(() => {
    if (!carregando) {
      carregarMovimentacoesPaginadas(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    termoPesquisaDebounced,
    produtoSelecionado,
    usuarioSelecionado,
    unidadeSelecionada,
    tipoSelecionado,
  ]);

  function limparFiltros() {
    setProdutoSelecionado(null);
    setUsuarioSelecionado(null);
    setUnidadeSelecionada(null);
    setTipoSelecionado("");
    setTermoPesquisa("");
    setTermoPesquisaDebounced("");
    setModalFiltrosVisivel(false);
  }

  function getTipoCor(tipo: string) {
    switch (tipo) {
      case "ENTRADA":
        return "#4CAF50";
      case "SAIDA":
        return "#F44336";
      case "TRANSFERENCIA":
        return "#2196F3";
      case "AJUSTE":
        return "#FF9800";
      default:
        return "#666";
    }
  }

  function formatarData(data: string) {
    try {
      if (!data) return "Data não disponível";
      const date = new Date(data);
      if (isNaN(date.getTime())) return "Data inválida";
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data não disponível";
    }
  }

  function renderMovimentacao({ item }: { item: Movimentacao }) {
    if (!item) return null;

    return (
      <View style={styles.movimentacaoCard}>
        <View style={styles.movimentacaoHeader}>
          <View style={styles.tipoContainer}>
            <Text
              style={[
                styles.tipoBadge,
                { backgroundColor: getTipoCor(item.tipo || "AJUSTE") },
              ]}
            >
              {item.tipo || "AJUSTE"}
            </Text>
          </View>
          <Text style={styles.dataText}>
            {item.data_movimentacao
              ? formatarData(item.data_movimentacao)
              : "Data não disponível"}
          </Text>
        </View>

        <View style={styles.movimentacaoBody}>
          <Text style={styles.produtoNome}>
            {item.produto?.nome || "Produto não informado"}
          </Text>
          <Text style={styles.quantidadeText}>
            Quantidade: {item.quantidade || 0}
          </Text>
          <Text style={styles.usuarioText}>
            Por: {item.usuario?.nome || "Usuário não informado"}
          </Text>

          {item.unidade_origem && (
            <Text style={styles.unidadeText}>
              Origem: {item.unidade_origem.nome || "Unidade não informada"}
            </Text>
          )}

          {item.unidade_destino && (
            <Text style={styles.unidadeText}>
              Destino: {item.unidade_destino.nome || "Unidade não informada"}
            </Text>
          )}

          {item.observacao && (
            <Text style={styles.observacaoText}>Obs: {item.observacao}</Text>
          )}

          {item.documento && (
            <Text style={styles.documentoText}>Doc: {item.documento}</Text>
          )}
        </View>
      </View>
    );
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando movimentações...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        titulo={`Movimentações (${totalItens})`}
        onPressVoltar={() => navigation.goBack()}
        botaoDireita={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate("CadastroMovimentacao")}
              accessibilityLabel="Adicionar nova movimentação"
              accessibilityRole="button"
            >
              <MaterialIcons name="add" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setModalFiltrosVisivel(true)}
              accessibilityLabel="Abrir filtros"
              accessibilityRole="button"
            >
              <MaterialIcons name="filter-list" size={24} color="#2196F3" />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar movimentações..."
            value={termoPesquisa}
            onChangeText={setTermoPesquisa}
          />
          {termoPesquisa ? (
            <TouchableOpacity onPress={() => setTermoPesquisa("")}>
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={Array.isArray(movimentacoes) ? movimentacoes : []}
        keyExtractor={(item) =>
          item?.id?.toString() || Math.random().toString()
        }
        renderItem={renderMovimentacao}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarLista}
            colors={["#2196F3"]}
          />
        }
        onEndReached={carregarMaisMovimentacoes}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          carregandoMais ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#2196F3" />
              <Text style={styles.loadingFooterText}>Carregando mais...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !carregando ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                Nenhuma movimentação encontrada
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltrosVisivel}
        onRequestClose={() => setModalFiltrosVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setModalFiltrosVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setModalFiltrosVisivel(false);
                  setModalTipoVisivel(true);
                }}
              >
                <Text style={styles.filterLabel}>Tipo</Text>
                <Text style={styles.filterValue}>
                  {tipoSelecionado || "Todos"}
                </Text>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setModalFiltrosVisivel(false);
                  setModalProdutoVisivel(true);
                }}
              >
                <Text style={styles.filterLabel}>Produto</Text>
                <Text style={styles.filterValue}>
                  {produtoSelecionado?.nome || "Todos"}
                </Text>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setModalFiltrosVisivel(false);
                  setModalUsuarioVisivel(true);
                }}
              >
                <Text style={styles.filterLabel}>Usuário</Text>
                <Text style={styles.filterValue}>
                  {usuarioSelecionado?.nome || "Todos"}
                </Text>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterOption}
                onPress={() => {
                  setModalFiltrosVisivel(false);
                  setModalUnidadeVisivel(true);
                }}
              >
                <Text style={styles.filterLabel}>Unidade</Text>
                <Text style={styles.filterValue}>
                  {unidadeSelecionada?.nome || "Todas"}
                </Text>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={limparFiltros}
                >
                  <Text style={styles.clearButtonText}>Limpar Filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Tipo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalTipoVisivel}
        onRequestClose={() => setModalTipoVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Tipo</Text>
              <TouchableOpacity onPress={() => setModalTipoVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {["ENTRADA", "SAIDA", "TRANSFERENCIA", "AJUSTE"].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={styles.selectOption}
                  onPress={() => {
                    setTipoSelecionado(tipo);
                    setModalTipoVisivel(false);
                  }}
                >
                  <Text style={styles.selectOptionText}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Produto */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalProdutoVisivel}
        onRequestClose={() => setModalProdutoVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setModalProdutoVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {produtos.map((produto) => (
                <TouchableOpacity
                  key={produto.id}
                  style={styles.selectOption}
                  onPress={() => {
                    setProdutoSelecionado(produto);
                    setModalProdutoVisivel(false);
                  }}
                >
                  <Text style={styles.selectOptionText}>{produto.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Usuário */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalUsuarioVisivel}
        onRequestClose={() => setModalUsuarioVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Usuário</Text>
              <TouchableOpacity onPress={() => setModalUsuarioVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {usuarios.map((usuario) => (
                <TouchableOpacity
                  key={usuario.id}
                  style={styles.selectOption}
                  onPress={() => {
                    setUsuarioSelecionado(usuario);
                    setModalUsuarioVisivel(false);
                  }}
                >
                  <Text style={styles.selectOptionText}>{usuario.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalUnidadeVisivel}
        onRequestClose={() => setModalUnidadeVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Unidade</Text>
              <TouchableOpacity onPress={() => setModalUnidadeVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {unidades.map((unidade) => (
                <TouchableOpacity
                  key={unidade.id}
                  style={styles.selectOption}
                  onPress={() => {
                    setUnidadeSelecionada(unidade);
                    setModalUnidadeVisivel(false);
                  }}
                >
                  <Text style={styles.selectOptionText}>{unidade.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  addButton: {
    padding: 4,
    marginRight: 8,
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
  },
  movimentacaoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  movimentacaoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tipoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipoBadge: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dataText: {
    fontSize: 12,
    color: "#666",
  },
  movimentacaoBody: {
    gap: 4,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  quantidadeText: {
    fontSize: 14,
    color: "#666",
  },
  usuarioText: {
    fontSize: 14,
    color: "#666",
  },
  unidadeText: {
    fontSize: 14,
    color: "#666",
  },
  observacaoText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  documentoText: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  filterValue: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    textAlign: "right",
    marginRight: 8,
  },
  filterActions: {
    paddingTop: 20,
  },
  clearButton: {
    backgroundColor: "#f44336",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectOptionText: {
    fontSize: 16,
    color: "#333",
  },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingFooterText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
});

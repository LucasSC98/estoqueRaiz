import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
import { ModalConfirmacao } from "../components/ModalConfirmacao";
import api, { getProdutosPaginados } from "../services/api";
import Toast from "react-native-toast-message";

type ListaProdutosScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  "ListaProdutos"
>;

export default function ListaProdutos() {
  const navigation = useNavigation<ListaProdutosScreenProp>();

  const voltarParaDashboard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const [produtos, setProdutos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [pesquisando, setPesquisando] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalItens, setTotalItens] = useState(0);
  const [temMaisPaginas, setTemMaisPaginas] = useState(false);
  const ITENS_POR_PAGINA = 15;

  const [categorias, setCategorias] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<any>(null);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<any>(null);
  const [termoPesquisa, setTermoPesquisa] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState<
    "todos" | "baixo" | "zerado"
  >("todos");
  const [modalCategoriaVisivel, setModalCategoriaVisivel] = useState(false);
  const [modalUnidadeVisivel, setModalUnidadeVisivel] = useState(false);
  const [modalFiltrosVisivel, setModalFiltrosVisivel] = useState(false);
  const [modalExclusaoVisivel, setModalExclusaoVisivel] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<any>(null);
  const [carregandoExclusao, setCarregandoExclusao] = useState(false);

  const carregarProdutos = useCallback(
    async (
      pagina: number = 1,
      substituir: boolean = false,
      ehPesquisa: boolean = false
    ) => {
      try {
        if (ehPesquisa) {
        } else if (pagina === 1) {
          setCarregando(true);
        } else {
          setCarregandoMais(true);
        }

        const parametros = {
          page: pagina,
          limit: ITENS_POR_PAGINA,
          search: termoPesquisa.trim() || undefined,
          categoria_id: categoriaSelecionada?.id || undefined,
          unidade_id: unidadeSelecionada?.id || undefined,
          filtro_estoque: filtroEstoque,
        };

        const response = await getProdutosPaginados(parametros);

        if (response.produtos) {
          const produtosRaw = response.produtos;
          const produtosValidos = Array.isArray(produtosRaw)
            ? produtosRaw.filter((p) => p && p.id != null)
            : [];

          const removerDuplicatas = (lista: any[], novosProdutos: any[]) => {
            const idsExistentes = new Set(lista.map((p) => p.id));
            const produtosFiltrados = novosProdutos.filter(
              (p) => !idsExistentes.has(p.id)
            );

            return [...lista, ...produtosFiltrados];
          };

          if (substituir || pagina === 1) {
            setProdutos(produtosValidos);
          } else {
            setProdutos((prev) => removerDuplicatas(prev, produtosValidos));
          }
        }

        if (response.pagination) {
          setPaginaAtual(response.pagination.currentPage);
          setTotalItens(response.pagination.totalItems);
          setTemMaisPaginas(response.pagination.hasNextPage);
        }
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Não foi possível carregar os produtos",
          position: "top",
          visibilityTime: 3000,
        });
      } finally {
        if (!ehPesquisa) {
          setCarregando(false);
        }
        setCarregandoMais(false);
      }
    },
    [
      termoPesquisa,
      categoriaSelecionada?.id,
      unidadeSelecionada?.id,
      filtroEstoque,
    ]
  );

  const carregarDadosIniciais = useCallback(async () => {
    try {
      setCarregando(true);

      const [responseCategorias, responseUnidades] = await Promise.all([
        api.get("/api/categorias"),
        api.get("/api/unidades"),
      ]);

      setCategorias(responseCategorias.data);
      setUnidades(responseUnidades.data);

      await carregarProdutos(1, true);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível carregar os dados",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setCarregando(false);
    }
  }, [carregarProdutos]);

  useEffect(() => {
    carregarDadosIniciais();
  }, [carregarDadosIniciais]);

  useEffect(() => {
    setPaginaAtual(1);
    setProdutos([]);
    carregarProdutos(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaSelecionada, unidadeSelecionada, filtroEstoque]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!pesquisando) {
        setPesquisando(true);
      }
      setPaginaAtual(1);
      setProdutos([]);
      await carregarProdutos(1, true, true);
      setPesquisando(false);
    }, 800);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termoPesquisa]);

  async function atualizarLista() {
    try {
      setAtualizando(true);
      setPaginaAtual(1);
      await carregarProdutos(1, true);
    } catch (error) {
      console.error("Erro ao atualizar lista:", error);
    } finally {
      setAtualizando(false);
    }
  }

  function carregarMaisProdutos() {
    if (temMaisPaginas && !carregandoMais && !carregando) {
      carregarProdutos(paginaAtual + 1, false);
    }
  }

  const renderizarProduto = ({ item: produto }: { item: any }) => {
    const statusEstoque = getStatusEstoque(produto);
    return (
      <View style={estilos.cartaoProduto}>
        <View style={estilos.cabecalhoProduto}>
          <Text style={estilos.nomeProduto}>{produto.nome}</Text>
          <View
            style={[
              estilos.badgeEstoque,
              { backgroundColor: statusEstoque.cor },
            ]}
          >
            <Text style={estilos.textoEstoque}>{statusEstoque.texto}</Text>
          </View>
        </View>

        <Text style={estilos.descricaoProduto}>{produto.descricao}</Text>

        <View style={estilos.detalhes}>
          <View style={estilos.detalheItem}>
            <MaterialIcons name="attach-money" size={16} color="#666" />
            <Text style={estilos.textoDetalhe}>
              Venda: {formatarPreco(parseFloat(produto.preco_venda))}
            </Text>
          </View>

          <View style={estilos.detalheItem}>
            <MaterialIcons name="inventory-2" size={16} color="#666" />
            <Text style={estilos.textoDetalhe}>
              Estoque: {produto.quantidade_estoque}
            </Text>
          </View>

          {produto.categoria && (
            <View style={estilos.detalheItem}>
              <MaterialIcons name="category" size={16} color="#666" />
              <Text style={estilos.textoDetalhe}>{produto.categoria.nome}</Text>
            </View>
          )}

          {produto.unidade && (
            <View style={estilos.detalheItem}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={estilos.textoDetalhe}>{produto.unidade.nome}</Text>
            </View>
          )}

          {produto.codigo_barras && (
            <View style={estilos.detalheItem}>
              <MaterialIcons name="qr-code" size={16} color="#666" />
              <Text style={estilos.textoDetalhe}>{produto.codigo_barras}</Text>
            </View>
          )}
        </View>

        <View style={estilos.acoesProduto}>
          <TouchableOpacity
            style={estilos.botaoEditar}
            onPress={() => editarProduto(produto)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={18} color="#2196F3" />
            <Text style={estilos.textoBotaoEditar}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.botaoDeletar}
            onPress={() => confirmarExclusao(produto)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete" size={18} color="#F44336" />
            <Text style={estilos.textoBotaoDeletar}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderizarComponenteVazio = () => (
    <View style={estilos.containerVazio}>
      <MaterialIcons name="inventory" size={64} color="#ccc" />
      <Text style={estilos.textoVazio}>Nenhum produto encontrado</Text>
      <Text style={estilos.subtextoVazio}>
        Tente ajustar os filtros ou adicionar novos produtos
      </Text>
    </View>
  );

  const renderizarFooterCarregamento = () => {
    if (!carregandoMais) return null;

    return (
      <View style={estilos.footerCarregamento}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={estilos.textoCarregandoMais}>
          Carregando mais produtos...
        </Text>
      </View>
    );
  };

  function limparFiltros() {
    setCategoriaSelecionada(null);
    setUnidadeSelecionada(null);
    setTermoPesquisa("");
    setFiltroEstoque("todos");
  }

  const selecionarCategoria = (categoria: any) => {
    setCategoriaSelecionada(categoria);
    setModalCategoriaVisivel(false);
  };

  const selecionarUnidade = (unidade: any) => {
    setUnidadeSelecionada(unidade);
    setModalUnidadeVisivel(false);
  };

  const abrirModalCategoria = () => {
    setModalUnidadeVisivel(false);
    setModalFiltrosVisivel(false);
    setTimeout(() => {
      setModalCategoriaVisivel(true);
    }, 100);
  };

  const abrirModalUnidade = () => {
    setModalCategoriaVisivel(false);
    setModalFiltrosVisivel(false);
    setTimeout(() => {
      setModalUnidadeVisivel(true);
    }, 100);
  };

  function formatarPreco(valor: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  }

  function getStatusEstoque(produto: any) {
    if (produto.quantidade_estoque === 0) {
      return { texto: "Zerado", cor: "#F44336" };
    } else if (produto.quantidade_estoque <= produto.quantidade_minima) {
      return { texto: "Baixo", cor: "#FF9800" };
    } else {
      return { texto: "Normal", cor: "#4CAF50" };
    }
  }

  function editarProduto(produto: any) {
    navigation.navigate("CadastroProduto", { produto });
  }

  function confirmarExclusao(produto: any) {
    setProdutoParaExcluir(produto);
    setModalExclusaoVisivel(true);
  }

  async function deletarProduto() {
    if (!produtoParaExcluir) return;

    setCarregandoExclusao(true);
    try {
      await api.delete(`/api/produtos/${produtoParaExcluir.id}`);

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Produto deletado com sucesso",
        position: "top",
        visibilityTime: 3000,
      });
      setProdutos(produtos.filter((p) => p.id !== produtoParaExcluir.id));
      setProdutoParaExcluir(null);
      setModalExclusaoVisivel(false);
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível deletar o produto",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setCarregandoExclusao(false);
    }
  }

  function cancelarExclusao() {
    setModalExclusaoVisivel(false);
    setProdutoParaExcluir(null);
    setCarregandoExclusao(false);
  }

  if (carregando && produtos.length === 0) {
    return (
      <View style={estilos.containerCarregando}>
        <Text style={estilos.textoCarregando}>Carregando produtos...</Text>
      </View>
    );
  }

  return (
    <View style={estilos.container}>
      <Header
        titulo="Lista de Produtos"
        subtitulo={`${totalItens} produto(s) encontrado(s)`}
        onPressVoltar={voltarParaDashboard}
        botaoDireita={
          <TouchableOpacity
            style={estilos.botaoFiltros}
            onPress={() => setModalFiltrosVisivel(true)}
          >
            <MaterialIcons name="filter-list" size={24} color="#2196F3" />
          </TouchableOpacity>
        }
      />

      <View style={estilos.barraPesquisa}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={estilos.inputPesquisa}
          placeholder="Pesquisar produtos..."
          placeholderTextColor="#999"
          value={termoPesquisa}
          onChangeText={setTermoPesquisa}
        />
        {pesquisando && <ActivityIndicator size="small" color="#059669" />}
        {termoPesquisa.length > 0 && !pesquisando && (
          <TouchableOpacity onPress={() => setTermoPesquisa("")}>
            <MaterialIcons name="clear" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {(categoriaSelecionada ||
        unidadeSelecionada ||
        filtroEstoque !== "todos") && (
        <View style={estilos.filtrosAtivos}>
          <ScrollView
            horizontal
            contentContainerStyle={{
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 4,
            }}
            showsHorizontalScrollIndicator={false}
          >
            {categoriaSelecionada && (
              <View style={estilos.chipFiltro}>
                <Text style={estilos.textoChip}>
                  Categoria: {categoriaSelecionada.nome}
                </Text>
                <TouchableOpacity
                  onPress={() => setCategoriaSelecionada(null)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
            )}
            {unidadeSelecionada && (
              <View style={estilos.chipFiltro}>
                <Text style={estilos.textoChip}>
                  Unidade: {unidadeSelecionada.nome}
                </Text>
                <TouchableOpacity
                  onPress={() => setUnidadeSelecionada(null)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
            )}
            {filtroEstoque !== "todos" && (
              <View style={estilos.chipFiltro}>
                <Text style={estilos.textoChip}>
                  Estoque: {filtroEstoque === "baixo" ? "Baixo" : "Zerado"}
                </Text>
                <TouchableOpacity
                  onPress={() => setFiltroEstoque("todos")}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={16} color="#2196F3" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={estilos.botaoLimparFiltros}
              onPress={limparFiltros}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={estilos.textoLimparFiltros}>Limpar todos</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        style={estilos.lista}
        data={produtos}
        renderItem={renderizarProduto}
        keyExtractor={(item, index) =>
          item?.id ? `produto-${item.id}` : `item-${index}`
        }
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={atualizarLista} />
        }
        onEndReached={carregarMaisProdutos}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={!carregando ? renderizarComponenteVazio : null}
        ListFooterComponent={renderizarFooterCarregamento}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={produtos.length === 0 ? { flex: 1 } : undefined}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltrosVisivel}
        onRequestClose={() => setModalFiltrosVisivel(false)}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={estilos.modalContainer}
          activeOpacity={1}
          onPress={() => setModalFiltrosVisivel(false)}
        >
          <TouchableOpacity
            style={estilos.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={estilos.modalHeader}>
              <Text style={estilos.tituloModal}>Filtros</Text>
              <TouchableOpacity
                onPress={() => setModalFiltrosVisivel(false)}
                style={estilos.botaoFechar}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={estilos.modalBody}>
              <View style={estilos.grupoFiltro}>
                <Text style={estilos.labelFiltro}>Categoria</Text>
                <TouchableOpacity
                  style={estilos.containerSeletor}
                  onPress={() => {
                    abrirModalCategoria();
                  }}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Text style={estilos.textoSeletor}>
                    {categoriaSelecionada
                      ? categoriaSelecionada.nome
                      : "Todas as categorias"}
                  </Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={estilos.grupoFiltro}>
                <Text style={estilos.labelFiltro}>Unidade</Text>
                <TouchableOpacity
                  style={estilos.containerSeletor}
                  onPress={() => {
                    abrirModalUnidade();
                  }}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Text style={estilos.textoSeletor}>
                    {unidadeSelecionada
                      ? unidadeSelecionada.nome
                      : "Todas as unidades"}
                  </Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={estilos.grupoFiltro}>
                <Text style={estilos.labelFiltro}>Status do Estoque</Text>
                <View style={estilos.opcoesFiltro}>
                  {["todos", "baixo", "zerado"].map((opcao) => (
                    <TouchableOpacity
                      key={opcao}
                      style={[
                        estilos.opcaoFiltro,
                        filtroEstoque === opcao && estilos.opcaoSelecionada,
                      ]}
                      onPress={() => setFiltroEstoque(opcao as any)}
                    >
                      <Text
                        style={[
                          estilos.textoOpcao,
                          filtroEstoque === opcao &&
                            estilos.textoOpcaoSelecionada,
                        ]}
                      >
                        {opcao === "todos"
                          ? "Todos"
                          : opcao === "baixo"
                          ? "Estoque Baixo"
                          : "Estoque Zerado"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={estilos.botoesModal}>
                <TouchableOpacity
                  style={estilos.botaoLimpar}
                  onPress={limparFiltros}
                >
                  <Text style={estilos.textoBotaoLimpar}>Limpar Filtros</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={estilos.botaoAplicar}
                  onPress={() => setModalFiltrosVisivel(false)}
                >
                  <Text style={estilos.textoBotaoAplicar}>Aplicar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalCategoriaVisivel}
        onRequestClose={() => setModalCategoriaVisivel(false)}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={estilos.modalContainer}
          activeOpacity={1}
          onPress={() => setModalCategoriaVisivel(false)}
        >
          <TouchableOpacity
            style={estilos.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={estilos.modalHeader}>
              <Text style={estilos.tituloModal}>Selecionar Categoria</Text>
              <TouchableOpacity
                onPress={() => setModalCategoriaVisivel(false)}
                style={estilos.botaoFechar}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={estilos.modalBody}>
              <TouchableOpacity
                style={[
                  estilos.opcaoModal,
                  !categoriaSelecionada && estilos.opcaoModalSelecionada,
                ]}
                onPress={() => selecionarCategoria(null)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    estilos.textoOpcaoModal,
                    !categoriaSelecionada && estilos.textoOpcaoModalSelecionada,
                  ]}
                >
                  Todas as categorias
                </Text>
                {!categoriaSelecionada && (
                  <MaterialIcons name="check" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
              {categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria.id}
                  style={[
                    estilos.opcaoModal,
                    categoria.id === categoriaSelecionada?.id &&
                      estilos.opcaoModalSelecionada,
                  ]}
                  onPress={() => selecionarCategoria(categoria)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      estilos.textoOpcaoModal,
                      categoria.id === categoriaSelecionada?.id &&
                        estilos.textoOpcaoModalSelecionada,
                    ]}
                  >
                    {categoria.nome}
                  </Text>
                  {categoria.id === categoriaSelecionada?.id && (
                    <MaterialIcons name="check" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalUnidadeVisivel}
        onRequestClose={() => setModalUnidadeVisivel(false)}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={estilos.modalContainer}
          activeOpacity={1}
          onPress={() => setModalUnidadeVisivel(false)}
        >
          <TouchableOpacity
            style={estilos.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={estilos.modalHeader}>
              <Text style={estilos.tituloModal}>Selecionar Unidade</Text>
              <TouchableOpacity
                onPress={() => setModalUnidadeVisivel(false)}
                style={estilos.botaoFechar}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={estilos.modalBody}>
              <TouchableOpacity
                style={[
                  estilos.opcaoModal,
                  !unidadeSelecionada && estilos.opcaoModalSelecionada,
                ]}
                onPress={() => selecionarUnidade(null)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    estilos.textoOpcaoModal,
                    !unidadeSelecionada && estilos.textoOpcaoModalSelecionada,
                  ]}
                >
                  Todas as unidades
                </Text>
                {!unidadeSelecionada && (
                  <MaterialIcons name="check" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
              {unidades.map((unidade) => (
                <TouchableOpacity
                  key={unidade.id}
                  style={[
                    estilos.opcaoModal,
                    unidade.id === unidadeSelecionada?.id &&
                      estilos.opcaoModalSelecionada,
                  ]}
                  onPress={() => selecionarUnidade(unidade)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      estilos.textoOpcaoModal,
                      unidade.id === unidadeSelecionada?.id &&
                        estilos.textoOpcaoModalSelecionada,
                    ]}
                  >
                    {unidade.nome}
                  </Text>
                  {unidade.id === unidadeSelecionada?.id && (
                    <MaterialIcons name="check" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <ModalConfirmacao
        visivel={modalExclusaoVisivel}
        titulo="Confirmar Exclusão"
        mensagem={
          produtoParaExcluir
            ? `Tem certeza que deseja excluir o produto "${produtoParaExcluir.nome}"?\n\nEsta ação não pode ser desfeita.`
            : ""
        }
        textoBotaoConfirmar="Excluir"
        textoBotaoCancelar="Cancelar"
        corBotaoConfirmar="#ef4444"
        iconeBotaoConfirmar="delete"
        onConfirmar={deletarProduto}
        onCancelar={cancelarExclusao}
        carregando={carregandoExclusao}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerCarregando: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  textoCarregando: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  subtitulo: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  botaoFiltros: {
    padding: 8,
  },
  barraPesquisa: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  inputPesquisa: {
    flex: 1,
    fontSize: 15,
    color: "#050505ff",
    marginLeft: 12,
  },
  filtrosAtivos: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    minHeight: 48,
    maxHeight: 56,
    zIndex: 1,
    elevation: 2,
  },
  chipFiltro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    minHeight: 32,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textoChip: {
    fontSize: 12,
    color: "#2196F3",
    marginRight: 4,
    fontWeight: "500",
  },
  botaoLimparFiltros: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textoLimparFiltros: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  lista: {
    flex: 1,
    paddingHorizontal: 20,
  },
  containerVazio: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  textoVazio: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginTop: 16,
  },
  subtextoVazio: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  cartaoProduto: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cabecalhoProduto: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nomeProduto: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  badgeEstoque: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  textoEstoque: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  descricaoProduto: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  detalhes: {
    gap: 6,
  },
  detalheItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  textoDetalhe: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  acoesProduto: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  botaoEditar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  textoBotaoEditar: {
    fontSize: 12,
    color: "#2196F3",
    fontWeight: "600",
    marginLeft: 4,
  },
  botaoDeletar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  textoBotaoDeletar: {
    fontSize: 12,
    color: "#F44336",
    fontWeight: "600",
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  containerModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    minHeight: "50%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  conteudoModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
  },
  cabecalhoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  grupoFiltro: {
    marginBottom: 24,
  },
  labelFiltro: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  containerSeletor: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 8,
    overflow: "hidden",
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    minHeight: 50,
    ...(Platform.OS === "ios" && {
      borderColor: "#2196F3",
      borderWidth: 2,
      backgroundColor: "#f8f9ff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  seletor: {
    backgroundColor: "#fff",
    color: "#333",
    height: 50,
  },
  seletorFiltro: {
    height: 48,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    ...(Platform.OS === "ios" && {
      backgroundColor: "#fff",
      borderColor: "#2196F3",
      borderWidth: 2,
    }),
  },
  textoSeletor: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  placeholder: {
    color: "#999",
    fontStyle: "italic",
  },
  pickerContainer: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
  },
  picker: {
    height: 48,
    color: "#333",
  },
  opcoesFiltro: {
    flexDirection: "column",
    gap: 8,
  },
  opcaoFiltro: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
  },
  opcaoSelecionada: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  textoOpcao: {
    fontSize: 14,
    color: "#666",
  },
  textoOpcaoSelecionada: {
    color: "#fff",
    fontWeight: "500",
  },
  botoesModal: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  botaoLimpar: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotaoLimpar: {
    fontSize: 16,
    color: "#666",
  },
  botaoAplicar: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    alignItems: "center",
  },
  textoBotaoAplicar: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  opcaoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    minHeight: 50,
  },
  opcaoModalSelecionada: {
    backgroundColor: "#f0f8ff",
  },
  textoOpcaoModal: {
    fontSize: 16,
    color: "#333",
  },
  textoOpcaoModalSelecionada: {
    color: "#2196F3",
    fontWeight: "500",
  },
  botaoFechar: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  footerCarregamento: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  textoCarregandoMais: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
});

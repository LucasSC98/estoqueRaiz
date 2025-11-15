import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  StatusBar,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import LogoAgrologica from "../assets/images/logo.png";
import api from "../services/api";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import CurvaABCCard from "../components/CurvaABCCard";

export default function PainelControle() {
  const navegacao =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [nomeUsuario, setNomeUsuario] = useState<string | null>(null);
  const [iniciaisUsuario, setIniciaisUsuario] = useState<string>("");
  const [cargoUsuario, setCargoUsuario] = useState<string>("Carregando...");
  const [cargoOriginal, setCargoOriginal] = useState<string>("");
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<any>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [podeAcessarTodasUnidades, setPodeAcessarTodasUnidades] =
    useState(false);

  const [totalProdutos, setTotalProdutos] = useState(0);
  const [produtosVencendo, setProdutosVencendo] = useState(0);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<any[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [unidadeUsuario, setUnidadeUsuario] = useState<any>(null);
  const [movimentacoesRecentes, setMovimentacoesRecentes] = useState<any[]>([]);

  const [dadosCurvaABC, setDadosCurvaABC] = useState<{
    totalProdutos: number;
    valorTotal: number;
    classeA: {
      quantidade: number;
      valor: number;
      percentual: number;
    };
    classeB: {
      quantidade: number;
      valor: number;
      percentual: number;
    };
    classeC: {
      quantidade: number;
      valor: number;
      percentual: number;
    };
  } | null>(null);

  const obterIniciais = (nomeCompleto: string): string => {
    const nomes = nomeCompleto.trim().split(" ");
    if (nomes.length >= 2) {
      return (nomes[0][0] + nomes[nomes.length - 1][0]).toUpperCase();
    }
    return nomes[0] ? nomes[0][0].toUpperCase() : "";
  };

  const formatarCargo = (cargo: string): string => {
    const cargos: { [key: string]: string } = {
      gerente: "Gerente",
      estoquista: "Estoquista",
      financeiro: "Financeiro",
    };
    return cargos[cargo] || cargo;
  };

  const carregarDadosUsuario = useCallback(async () => {
    try {
      const nome = await AsyncStorage.getItem("nome");
      const cargo = await AsyncStorage.getItem("cargo");
      const usuarioString = await AsyncStorage.getItem("usuario");

      if (!usuarioString) {
        console.error("Usuário não encontrado no AsyncStorage");
        return;
      }

      const usuario = JSON.parse(usuarioString);
      setNomeUsuario(nome);
      setCargoUsuario(cargo ? formatarCargo(cargo) : "Usuário");
      setCargoOriginal(cargo || "");

      const podeAcessarTodas = cargo === "gerente";
      setPodeAcessarTodasUnidades(podeAcessarTodas);

      if (nome) {
        setIniciaisUsuario(obterIniciais(nome));
      }

      const responseUnidades = await api.get("/api/unidades");
      const unidadesData = responseUnidades.data;
      setUnidades(unidadesData);

      const unidadeDoUsuario = unidadesData.find(
        (u: any) => u.id === usuario.unidade_id
      );
      if (unidadeDoUsuario) {
        setUnidadeUsuario(unidadeDoUsuario);
        setUnidadeSelecionada(unidadeDoUsuario);
      } else {
        console.error("Unidade do usuário não encontrada");
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  }, []);

  useEffect(() => {
    carregarDadosUsuario();
  }, [carregarDadosUsuario]);

  useEffect(() => {
    if (unidadeSelecionada) {
      carregarDadosDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeSelecionada]);

  async function carregarDadosDashboard() {
    try {
      setCarregandoDados(true);

      if (unidadeSelecionada) {
        await carregarDadosUnidade(unidadeSelecionada.id);
      } else {
        if (unidadeUsuario) {
          setUnidadeSelecionada(unidadeUsuario);
          await carregarDadosUnidade(unidadeUsuario.id);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setCarregandoDados(false);
    }
  }

  async function carregarDadosUnidade(unidadeId: number) {
    try {
      setCarregandoDados(true);

      const responseProdutos = await api.get(
        `/api/produtos?unidade_id=${unidadeId}`
      );
      const produtos = Array.isArray(responseProdutos.data)
        ? responseProdutos.data.filter(
            (produto: any) => produto.quantidade_estoque > 0
          )
        : [];
      setTotalProdutos(produtos.length);

      const hoje = new Date();
      const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

      const produtosVencendoCount = produtos.filter((produto: any) => {
        if (!produto.data_validade) return false;
        const dataValidade = new Date(produto.data_validade);
        return dataValidade <= em30Dias && dataValidade >= hoje;
      }).length;
      setProdutosVencendo(produtosVencendoCount);

      const produtosBaixoUnidade = produtos
        .filter(
          (produto: any) =>
            produto.quantidade_estoque > 0 &&
            produto.quantidade_estoque < produto.quantidade_minima &&
            produto.unidade_id === unidadeId
        )
        .slice(0, 3);
      setProdutosEstoqueBaixo(produtosBaixoUnidade);

      const responseMovimentacoes = await api.get(
        `/api/movimentacoes?unidade_id=${unidadeId}&limit=3`
      );
      const movimentacoes = Array.isArray(responseMovimentacoes.data)
        ? responseMovimentacoes.data.slice(0, 3)
        : [];
      setMovimentacoesRecentes(movimentacoes);

      await carregarDadosCurvaABCResumo(unidadeId);
    } catch (error) {
      console.error("Erro ao carregar dados da unidade:", error);
    } finally {
      setCarregandoDados(false);
    }
  }

  async function carregarDadosCurvaABCResumo(unidadeId?: number) {
    try {
      const response = await api.get(
        `/api/relatorios/curva-abc${
          unidadeId ? `?unidade_id=${unidadeId}` : ""
        }`
      );

      if (response.data && response.data.produtos && response.data.resumo) {
        const resumo = response.data.resumo;
        const produtos = response.data.produtos;
        const valorTotal = produtos.reduce(
          (total: number, produto: any) => total + produto.valor_total,
          0
        );

        const dadosResumo = {
          totalProdutos: produtos.length,
          valorTotal,
          classeA: {
            quantidade:
              resumo.find((r: any) => r.classe === "A")?.quantidade_produtos ||
              0,
            valor: resumo.find((r: any) => r.classe === "A")?.valor_total || 0,
            percentual:
              resumo.find((r: any) => r.classe === "A")?.percentual_valor || 0,
          },
          classeB: {
            quantidade:
              resumo.find((r: any) => r.classe === "B")?.quantidade_produtos ||
              0,
            valor: resumo.find((r: any) => r.classe === "B")?.valor_total || 0,
            percentual:
              resumo.find((r: any) => r.classe === "B")?.percentual_valor || 0,
          },
          classeC: {
            quantidade:
              resumo.find((r: any) => r.classe === "C")?.quantidade_produtos ||
              0,
            valor: resumo.find((r: any) => r.classe === "C")?.valor_total || 0,
            percentual:
              resumo.find((r: any) => r.classe === "C")?.percentual_valor || 0,
          },
        };

        setDadosCurvaABC(dadosResumo);
      } else {
        setDadosCurvaABC(null);
      }
    } catch (error) {
      console.error("Erro ao carregar resumo Curva ABC:", error);
      setDadosCurvaABC(null);
    }
  }

  function formatarDataMovimentacao(data: string): string {
    try {
      const date = new Date(data);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  }

  function getCorTipoMovimentacao(tipo: string): string {
    switch (tipo) {
      case "ENTRADA":
        return "#059669";
      case "SAIDA":
        return "#dc2626";
      case "TRANSFERENCIA":
        return "#2563eb";
      case "AJUSTE":
        return "#d97706";
      default:
        return "#64748b";
    }
  }

  return (
    <ScrollView
      style={estilos.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={estilos.header}>
        <View style={estilos.containerLogo}>
          <Image
            source={LogoAgrologica}
            style={estilos.logoHeader}
            resizeMode="contain"
          />
        </View>

        <View style={estilos.areaCentral}>
          <View style={estilos.containerTitulo}>
            <Text style={estilos.tituloPrincipal}>
              Controle{"\n"}de{"\n"}Estoque
            </Text>
            <View style={estilos.divisor} />
            <Text style={estilos.subtitulo}>Sistema de Gestão</Text>
          </View>
        </View>

        <View style={estilos.containerUsuario}>
          {nomeUsuario ? (
            <>
              <View style={estilos.infoUsuario}>
                <Text
                  style={estilos.nomeUsuarioHeader}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {nomeUsuario}
                </Text>
                <Text
                  style={estilos.cargoUsuarioHeader}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cargoUsuario}
                </Text>
              </View>
              <View style={estilos.avatarUsuario}>
                <Text style={estilos.iniciaisUsuario}>{iniciaisUsuario}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={estilos.infoUsuario}>
                <Text
                  style={estilos.nomeUsuarioHeader}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Carregando...
                </Text>
                <Text
                  style={estilos.cargoUsuarioHeader}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Usuário
                </Text>
              </View>
              <View style={estilos.avatarUsuario}>
                <Text style={estilos.iniciaisUsuario}>?</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={{ marginHorizontal: 24, marginTop: 32 }}>
        <View style={estilos.secaoHeader}>
          <MaterialIcons name="location-on" size={20} color="#059669" />
          <Text style={estilos.tituloSecao}>
            {podeAcessarTodasUnidades ? "Unidade Selecionada" : "Sua Unidade"}
          </Text>
        </View>

        {podeAcessarTodasUnidades && unidades.length > 1 ? (
          <TouchableOpacity
            style={estilos.containerSeletor}
            onPress={() => setModalVisivel(true)}
            activeOpacity={0.8}
          >
            <View style={estilos.conteudoSeletor}>
              <View style={estilos.iconeSeletor}>
                <MaterialIcons
                  name="warehouse"
                  size={15}
                  color={unidadeSelecionada ? "#059669" : "#94a3b8"}
                />
              </View>
              <View style={estilos.textoContainer}>
                <Text
                  style={[
                    estilos.textoSeletor,
                    !unidadeSelecionada && estilos.textoSeletorPlaceholder,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {unidadeSelecionada
                    ? unidadeSelecionada.nome
                    : unidades.length > 0
                    ? "Selecione uma unidade"
                    : "Carregando unidades..."}
                </Text>
              </View>
              <MaterialIcons name="expand-more" size={24} color="#64748b" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={estilos.containerSeletorFixo}>
            <View style={estilos.conteudoSeletor}>
              <View style={estilos.iconeSeletor}>
                <MaterialIcons name="warehouse" size={15} color="#059669" />
              </View>
              <View style={estilos.textoContainer}>
                <Text
                  style={estilos.textoSeletor}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {unidadeSelecionada?.nome ||
                    unidadeUsuario?.nome ||
                    "Sua Unidade"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Modal de seleção de unidades */}
        {podeAcessarTodasUnidades && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisivel}
            onRequestClose={() => setModalVisivel(false)}
          >
            <View style={estilos.containerModal}>
              <TouchableOpacity
                style={estilos.overlayModal}
                activeOpacity={1}
                onPress={() => setModalVisivel(false)}
              />
              <View style={estilos.conteudoModal}>
                <View style={estilos.cabecalhoModal}>
                  <View style={estilos.tituloModalContainer}>
                    <MaterialIcons name="warehouse" size={24} color="#059669" />
                    <Text style={estilos.tituloModal}>Selecionar Unidade</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisivel(false)}
                    style={estilos.botaoFecharModal}
                  >
                    <MaterialIcons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={estilos.separadorModal} />

                <ScrollView
                  style={estilos.listaUnidades}
                  showsVerticalScrollIndicator={false}
                >
                  <TouchableOpacity
                    style={[
                      estilos.itemUnidade,
                      !unidadeSelecionada && estilos.itemUnidadeSelecionado,
                    ]}
                    onPress={() => {
                      setUnidadeSelecionada(null);
                      setModalVisivel(false);
                      carregarDadosDashboard();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={estilos.iconeItemContainer}>
                      <MaterialIcons
                        name="grid-view"
                        size={20}
                        color={!unidadeSelecionada ? "#059669" : "#64748b"}
                      />
                    </View>
                    <View style={estilos.conteudoItem}>
                      <Text
                        style={[
                          estilos.nomeUnidade,
                          !unidadeSelecionada && estilos.nomeUnidadeSelecionado,
                        ]}
                      >
                        Todas as unidades
                      </Text>
                      <Text style={estilos.descricaoItem}>
                        Visualizar dados de todas as filiais
                      </Text>
                    </View>
                    {!unidadeSelecionada && (
                      <View style={estilos.indicadorSelecionado}>
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="#059669"
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {unidades.map((unidade) => (
                    <TouchableOpacity
                      key={unidade.id}
                      style={[
                        estilos.itemUnidade,
                        unidadeSelecionada?.id === unidade.id &&
                          estilos.itemUnidadeSelecionado,
                      ]}
                      onPress={() => {
                        setUnidadeSelecionada(unidade);
                        carregarDadosUnidade(unidade.id);
                        setModalVisivel(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={estilos.iconeItemContainer}>
                        <MaterialIcons
                          name="warehouse"
                          size={15}
                          color={
                            unidadeSelecionada?.id === unidade.id
                              ? "#059669"
                              : "#64748b"
                          }
                        />
                      </View>
                      <View style={estilos.conteudoItem}>
                        <Text
                          style={[
                            estilos.nomeUnidade,
                            unidadeSelecionada?.id === unidade.id &&
                              estilos.nomeUnidadeSelecionado,
                          ]}
                        >
                          {unidade.nome}
                        </Text>
                        <Text style={estilos.descricaoItem}>
                          {unidade.cidade
                            ? `${unidade.cidade}, ${unidade.estado}`
                            : "Filial cadastrada"}
                        </Text>
                      </View>
                      {unidadeSelecionada?.id === unidade.id && (
                        <View style={estilos.indicadorSelecionado}>
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color="#059669"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>

      <View style={estilos.containerResumo}>
        <View style={estilos.cartaoResumo}>
          <View style={[estilos.iconeCartao, { backgroundColor: "#eff6ff" }]}>
            <MaterialIcons name="inventory-2" size={20} color="#2563eb" />
          </View>
          <View style={estilos.conteudoCartao}>
            <Text style={estilos.valorCartao}>
              {carregandoDados ? "..." : totalProdutos}
            </Text>
            <Text style={estilos.tituloCartao}>Total de Produtos</Text>
            <Text style={estilos.subtituloCartao}>Itens cadastrados</Text>
          </View>
        </View>

        <View style={estilos.cartaoResumo}>
          <View style={[estilos.iconeCartao, { backgroundColor: "#fef2f2" }]}>
            <MaterialIcons name="schedule" size={20} color="#dc2626" />
          </View>
          <View style={estilos.conteudoCartao}>
            <Text style={estilos.valorCartao}>
              {carregandoDados ? "..." : produtosVencendo}
            </Text>
            <Text style={estilos.tituloCartao}>Produtos Vencendo</Text>
            <Text style={estilos.subtituloCartao}>Próximos ao vencimento</Text>
          </View>
        </View>
      </View>

      {/* Card da Curva ABC - COMPONENTE SEPARADO */}
      <CurvaABCCard dados={dadosCurvaABC} carregando={carregandoDados} />

      {/* Produtos com Estoque Baixo */}
      <View style={estilos.secao}>
        <View style={estilos.cabecalhoSecao}>
          <MaterialIcons name="trending-down" size={20} color="#dc2626" />
          <Text style={estilos.tituloSecao}>Produtos com Estoque Baixo</Text>
        </View>
        {carregandoDados ? (
          <View style={estilos.cartaoProduto}>
            <Text style={estilos.nomeProduto}>Carregando...</Text>
          </View>
        ) : produtosEstoqueBaixo.length > 0 ? (
          produtosEstoqueBaixo.slice(0, 3).map((produto) => (
            <View key={produto.id} style={estilos.cartaoProduto}>
              <Text style={estilos.nomeProduto}>{produto.nome}</Text>
              <Text style={estilos.detalhesProduto}>
                Estoque: {produto.quantidade_estoque} • Mínimo:{" "}
                {produto.quantidade_minima}
              </Text>
              {produto.categoria && (
                <Text style={estilos.detalhesProduto}>
                  Categoria: {produto.categoria.nome}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={estilos.cartaoProduto}>
            <Text style={estilos.nomeProduto}>
              Nenhum produto com estoque baixo
            </Text>
          </View>
        )}
      </View>

      {/* Movimentações Recentes */}
      <View style={estilos.secao}>
        <View style={estilos.cabecalhoSecao}>
          <MaterialIcons name="history" size={20} color="#2563eb" />
          <Text style={estilos.tituloSecao}>Movimentações Recentes</Text>
          <TouchableOpacity
            onPress={() => navegacao.navigate("Movimentacoes")}
            style={estilos.botaoVerTodas}
          >
            <Text style={estilos.textoVerTodas}>Ver todas</Text>
            <MaterialIcons name="chevron-right" size={16} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {carregandoDados ? (
          <View style={estilos.cartaoMovimentacao}>
            <Text style={estilos.textoCarregando}>Carregando...</Text>
          </View>
        ) : movimentacoesRecentes.length > 0 ? (
          movimentacoesRecentes.map((movimentacao) => (
            <View key={movimentacao.id} style={estilos.cartaoMovimentacao}>
              <View style={estilos.cabecalhoMovimentacao}>
                <View style={estilos.tipoMovimentacao}>
                  <View
                    style={[
                      estilos.indicadorTipo,
                      {
                        backgroundColor: getCorTipoMovimentacao(
                          movimentacao.tipo
                        ),
                      },
                    ]}
                  />
                  <Text style={estilos.tipoTexto}>{movimentacao.tipo}</Text>
                </View>
                <Text style={estilos.dataMovimentacao}>
                  {formatarDataMovimentacao(movimentacao.data_movimentacao)}
                </Text>
              </View>

              <Text style={estilos.produtoMovimentacao}>
                {movimentacao.produto?.nome || "Produto não informado"}
              </Text>

              <View style={estilos.detalhesMovimentacao}>
                <Text style={estilos.quantidadeMovimentacao}>
                  Qtd: {movimentacao.quantidade}
                </Text>
                <Text style={estilos.usuarioMovimentacao}>
                  Por: {movimentacao.usuario?.nome || "Usuário não informado"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={estilos.conteudoSemDados}>
            <MaterialIcons name="history" size={32} color="#94a3b8" />
            <Text style={estilos.textoSemDados}>
              Nenhuma movimentação recente
            </Text>
          </View>
        )}
      </View>

      {/* Botões de ação */}
      <View style={estilos.botoesAcao}>
        <TouchableOpacity
          style={[estilos.botaoAcao, estilos.botaoPrimario]}
          onPress={() => navegacao.navigate("Movimentacoes")}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={estilos.textoBotao}>Movimentações</Text>
        </TouchableOpacity>
        {/* 
        <TouchableOpacity style={[estilos.botaoAcao, estilos.botaoSecundario]}>
          <MaterialIcons name="file-download" size={20} color="#059669" />
          <Text style={[estilos.textoBotao, { color: "#059669" }]}>
            Exportar Dados // Funcionalidade futura
          </Text>
        </TouchableOpacity>
        */}
      </View>
      <View style={estilos.navegacaoRapida}>
        <Text style={estilos.tituloSecao}>Acesso Rápido</Text>
        <View style={estilos.gradeNavegacaoRapida}>
          <TouchableOpacity
            style={estilos.itemNavegacaoRapida}
            onPress={() => navegacao.navigate("ListaProdutos")}
          >
            <MaterialIcons name="inventory" size={36} color="#3b82f6" />
            <Text style={estilos.textoNavegacaoRapida}>Lista de Produtos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.itemNavegacaoRapida}
            onPress={() => navegacao.navigate("CadastroProduto")}
          >
            <MaterialIcons name="add-box" size={36} color="#059669" />
            <Text style={estilos.textoNavegacaoRapida}>Novo Produto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.itemNavegacaoRapida}
            onPress={() => navegacao.navigate("CadastroCategoria")}
          >
            <MaterialIcons name="category" size={36} color="#f59e0b" />
            <Text style={estilos.textoNavegacaoRapida}>
              Cadastro de Categorias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={estilos.itemNavegacaoRapida}
            onPress={() => navegacao.navigate("MapaUnidades")}
          >
            <MaterialIcons name="location-on" size={36} color="#8b5cf6" />
            <Text style={estilos.textoNavegacaoRapida}>Unidades</Text>
          </TouchableOpacity>
          {(cargoOriginal === "financeiro" || cargoOriginal === "gerente") && (
            <TouchableOpacity
              style={estilos.itemNavegacaoRapida}
              onPress={() => navegacao.navigate("Financeiro")}
            >
              <MaterialIcons name="attach-money" size={36} color="#10b981" />
              <Text style={estilos.textoNavegacaoRapida}>Financeiro</Text>
            </TouchableOpacity>
          )}
          {podeAcessarTodasUnidades && (
            <TouchableOpacity
              style={estilos.itemNavegacaoRapida}
              onPress={() => navegacao.navigate("UsuariosSistema")}
            >
              <MaterialIcons name="groups" size={36} color="#ef4444" />
              <Text style={estilos.textoNavegacaoRapida}>Usuarios</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  header: {
    backgroundColor: "#ffffff",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#1e293b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: "relative",
    overflow: "hidden",
  },

  containerLogo: {
    position: "absolute",
    left: 12,
    top: 50,
    bottom: 24,
    justifyContent: "center",
    alignItems: "flex-start",
    minWidth: 100,
    backgroundColor: "transparent",
  },

  logoHeader: {
    width: 60,
    height: 38,
    backgroundColor: "transparent",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  areaCentral: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 130,
  },

  containerTitulo: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    maxWidth: 120,
  },

  tituloPrincipal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    width: 100,
  },

  divisor: {
    width: 50,
    height: 3,
    backgroundColor: "#059669",
    marginVertical: 6,
    borderRadius: 2,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },

  subtitulo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 13,
    letterSpacing: 0.2,
  },

  containerUsuario: {
    position: "absolute",
    right: 12,
    top: 50,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 100,
  },

  infoUsuario: {
    alignItems: "flex-end",
    marginRight: 12,
    maxWidth: 85,
    paddingVertical: 2,
  },

  nomeUsuarioHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "right",
    lineHeight: 14,
    textShadowColor: "rgba(0, 0, 0, 0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  cargoUsuarioHeader: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
    textAlign: "right",
    marginTop: 2,
    lineHeight: 12,
    opacity: 0.8,
  },

  avatarUsuario: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#ffffff",
  },

  iniciaisUsuario: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  containerSeletor: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginTop: 1,
    overflow: "hidden",
    minHeight: 54,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  conteudoSeletor: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 54,
    gap: 12,
  },

  textoSeletor: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },

  textoSeletorPlaceholder: {
    color: "#94a3b8",
    fontWeight: "400",
  },

  containerModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  overlayModal: {
    flex: 1,
  },

  conteudoModal: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 34,
  },

  cabecalhoModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  tituloModal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },

  botaoFecharModal: {
    padding: 4,
  },

  listaUnidades: {
    maxHeight: 400,
  },

  itemUnidade: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    gap: 12,
    minHeight: 60,
  },

  itemUnidadeSelecionado: {
    backgroundColor: "#f0fdf4",
    borderBottomColor: "#bbf7d0",
  },

  nomeUnidade: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },

  nomeUnidadeSelecionado: {
    color: "#059669",
    fontWeight: "600",
  },

  containerResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },

  cartaoResumo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 16,
    marginHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    minHeight: 80,
  },

  valorCartao: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
    lineHeight: 20,
  },

  tituloCartao: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "600",
    lineHeight: 14,
  },

  secao: {
    backgroundColor: "#ffffff",
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  cabecalhoSecao: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  tituloSecao: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 12,
    letterSpacing: 0.3,
    flex: 1,
  },

  botaoVerTodas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },

  textoVerTodas: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },

  cartaoProduto: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },

  nomeProduto: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },

  detalhesProduto: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 3,
    lineHeight: 18,
  },

  // Estilos para movimentações recentes
  cartaoMovimentacao: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  cabecalhoMovimentacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  tipoMovimentacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  indicadorTipo: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  tipoTexto: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  dataMovimentacao: {
    fontSize: 11,
    color: "#94a3b8",
  },

  produtoMovimentacao: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },

  detalhesMovimentacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  quantidadeMovimentacao: {
    fontSize: 12,
    color: "#64748b",
  },

  usuarioMovimentacao: {
    fontSize: 12,
    color: "#64748b",
  },

  textoCarregando: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },

  conteudoSemDados: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },

  textoSemDados: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },

  botoesAcao: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },

  botaoAcao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    marginBottom: 0,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  botaoPrimario: {
    backgroundColor: "#059669",
  },

  botaoSecundario: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#059669",
  },

  textoBotao: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.3,
  },

  navegacaoRapida: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  gradeNavegacaoRapida: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 16,
  },

  itemNavegacaoRapida: {
    width: "47%",
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 0,
    elevation: 6,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  textoNavegacaoRapida: {
    fontSize: 13,
    color: "#1e293b",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  secaoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  iconeSeletor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },

  textoContainer: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
  },

  tituloModalContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  separadorModal: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 20,
  },

  iconeItemContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },

  conteudoItem: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 4,
  },

  descricaoItem: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },

  indicadorSelecionado: {
    marginLeft: 8,
  },

  iconeCartao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  conteudoCartao: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },

  subtituloCartao: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
    lineHeight: 12,
  },

  containerSeletorFixo: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
    overflow: "hidden",
  },

  // Novos estilos para o gráfico da Curva ABC
  headerGrafico: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },

  tituloGrafico: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },

  totalProdutos: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  numeroTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },

  labelTotal: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 14,
  },

  containerBarras: {
    width: "100%",
    alignItems: "center",
  },
});

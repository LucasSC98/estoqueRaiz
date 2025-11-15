import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import Header from "../components/Header";
import { Seletor } from "../components/Seletor";
import api, { getCurvaABCRelatorio } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

type RelatorioCurvaABCScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  "RelatorioCurvaABC"
>;

interface ProdutoCurvaABC {
  produto_id: number;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade_vendida: number;
  valor_total: number;
  percentual_participacao: number;
  percentual_acumulado: number;
  classificacao: "A" | "B" | "C";
}

interface ResumoCurvaABC {
  classe: "A" | "B" | "C";
  quantidade_produtos: number;
  valor_total: number;
  percentual_valor: number;
  percentual_produtos: number;
}

interface DadosCurvaABC {
  message: string;
  produtos: ProdutoCurvaABC[];
  resumo: ResumoCurvaABC[];
  estatisticas: {
    total_produtos: number;
    valor_total_geral: number;
    periodo?: {
      data_inicio?: string;
      data_fim?: string;
    };
    unidade_id: string;
  };
}

interface Unidade {
  id: number;
  nome: string;
  cidade?: string;
  estado?: string;
}

const { width } = Dimensions.get("window");

export default function RelatorioCurvaABC() {
  const navigation = useNavigation<RelatorioCurvaABCScreenProp>();

  const [dados, setDados] = useState<DadosCurvaABC | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [produtosSelecionados, setProdutosSelecionados] = useState<
    ProdutoCurvaABC[]
  >([]);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<Unidade | null>(
    null
  );
  const [cargoUsuario, setCargoUsuario] = useState<string>("");
  const [unidadeUsuario, setUnidadeUsuario] = useState<Unidade | null>(null);
  const [podeAcessarTodasUnidades, setPodeAcessarTodasUnidades] =
    useState(false);

  const carregarDadosCurvaABC = useCallback(async () => {
    try {
      setCarregando(true);

      const filtros: { unidade_id?: number } = {};

      if (unidadeSelecionada) {
        filtros.unidade_id = unidadeSelecionada.id;
      }

      const dadosRecebidos = await getCurvaABCRelatorio(filtros);
      setDados(dadosRecebidos);
    } catch (error: any) {
      console.error("Erro ao carregar Curva ABC:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: error.response?.data?.message || "Erro ao carregar relatório",
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      setCarregando(false);
    }
  }, [unidadeSelecionada]);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  useEffect(() => {
    if (cargoUsuario) {
      carregarDadosCurvaABC();
    }
  }, [unidadeSelecionada, cargoUsuario, carregarDadosCurvaABC]);

  async function carregarDadosIniciais() {
    try {
      setCarregando(true);
      const cargo = await AsyncStorage.getItem("cargo");
      const usuarioString = await AsyncStorage.getItem("usuario");

      if (cargo) {
        setCargoUsuario(cargo);
        setPodeAcessarTodasUnidades(cargo === "gerente");
      }

      const responseUnidades = await api.get("/api/unidades");
      const unidadesData = responseUnidades.data;
      setUnidades(unidadesData);

      if (cargo === "gerente") {
        setUnidadeSelecionada(null);
      } else {
        if (usuarioString) {
          const usuario = JSON.parse(usuarioString);
          const unidadeDoUsuario = unidadesData.find(
            (u: any) => u.id === usuario.unidade_id
          );
          if (unidadeDoUsuario) {
            setUnidadeUsuario(unidadeDoUsuario);
            setUnidadeSelecionada(unidadeDoUsuario);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Erro ao carregar dados iniciais",
        position: "top",
        visibilityTime: 4000,
      });
    }
  }

  function formatarValor(valor: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  }

  function getCorClasse(classe: "A" | "B" | "C"): string {
    switch (classe) {
      case "A":
        return "#4CAF50";
      case "B":
        return "#FF9800";
      case "C":
        return "#F44336";
      default:
        return "#666666";
    }
  }

  function prepararDadosGrafico() {
    if (!dados?.resumo) return [];

    return dados.resumo.map((item, index) => ({
      name: `Classe ${item.classe}`,
      population: item.percentual_valor,
      color: getCorClasse(item.classe),
      legendFontColor: "#333",
      legendFontSize: 14,
    }));
  }

  function abrirDetalhesClasse(classe: "A" | "B" | "C") {
    if (!dados?.produtos) return;

    const produtosDaClasse = dados.produtos.filter(
      (p) => p.classificacao === classe
    );
    setProdutosSelecionados(produtosDaClasse);
    setModalDetalhesVisivel(true);
  }

  function renderCartaoResumo(item: ResumoCurvaABC) {
    return (
      <TouchableOpacity
        key={item.classe}
        style={[
          styles.cartaoResumo,
          { borderLeftColor: getCorClasse(item.classe) },
        ]}
        onPress={() => abrirDetalhesClasse(item.classe)}
      >
        <View style={styles.cabecalhoCartao}>
          <Text
            style={[styles.classeTexto, { color: getCorClasse(item.classe) }]}
          >
            Classe {item.classe}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={getCorClasse(item.classe)}
          />
        </View>

        <View style={styles.conteudoCartao}>
          <Text style={styles.valorPrincipal}>
            {formatarValor(item.valor_total)}
          </Text>
          <Text style={styles.percentualValor}>
            {item.percentual_valor.toFixed(1)}% do valor total
          </Text>
          <Text style={styles.quantidadeProdutos}>
            {item.quantidade_produtos} produto(s) •{" "}
            {item.percentual_produtos.toFixed(1)}% do total
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderProdutoDetalhado(produto: ProdutoCurvaABC) {
    return (
      <View key={produto.produto_id} style={styles.produtoDetalhado}>
        <View style={styles.produtoHeader}>
          <Text style={styles.produtoNome}>{produto.nome}</Text>
          <Text
            style={[
              styles.produtoClasse,
              { color: getCorClasse(produto.classificacao) },
            ]}
          >
            {produto.classificacao}
          </Text>
        </View>

        <Text style={styles.produtoCategoria}>{produto.categoria}</Text>
        <Text style={styles.produtoUnidade}>{produto.unidade}</Text>

        <View style={styles.produtoMetricas}>
          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>Valor Total</Text>
            <Text style={styles.metricaValor}>
              {formatarValor(produto.valor_total)}
            </Text>
          </View>

          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>Quantidade Vendida</Text>
            <Text style={styles.metricaValor}>
              {produto.quantidade_vendida}
            </Text>
          </View>

          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>% Participação</Text>
            <Text style={styles.metricaValor}>
              {produto.percentual_participacao.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.metrica}>
            <Text style={styles.metricaLabel}>% Acumulado</Text>
            <Text style={styles.metricaValor}>
              {produto.percentual_acumulado.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    );
  }

  function getSubtituloHeader(): string {
    if (!dados) return "Carregando...";

    let subtitulo = `${dados.estatisticas.total_produtos} produtos analisados`;

    if (podeAcessarTodasUnidades) {
      if (unidadeSelecionada) {
        subtitulo += ` • ${unidadeSelecionada.nome}`;
      } else {
        subtitulo += " • Todas as unidades";
      }
    } else if (unidadeUsuario) {
      subtitulo += ` • ${unidadeUsuario.nome}`;
    }

    return subtitulo;
  }

  const opcoesUnidades = [
    { id: "todas", nome: "Todas as unidades" },
    ...unidades.map((unidade) => ({
      id: unidade.id.toString(),
      nome: unidade.nome,
    })),
  ];

  if (carregando && !dados) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Gerando Relatório Curva ABC...</Text>
      </View>
    );
  }

  if (!dados || dados.produtos.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          titulo="Curva ABC"
          subtitulo="Análise de Giro de Produtos"
          onPressVoltar={() => navigation.goBack()}
        />
        {podeAcessarTodasUnidades && (
          <View style={styles.secaoFiltros}>
            <View style={styles.containerFiltro}>
              <Seletor
                rotulo="Unidade"
                placeholder="Selecione uma unidade"
                valor={
                  unidadeSelecionada
                    ? {
                        id: unidadeSelecionada.id.toString(),
                        nome: unidadeSelecionada.nome,
                      }
                    : { id: "todas", nome: "Todas as unidades" }
                }
                opcoes={opcoesUnidades}
                aoMudarValor={(opcao) => {
                  if (opcao?.id === "todas") {
                    setUnidadeSelecionada(null);
                  } else {
                    const unidadeEncontrada = unidades.find(
                      (u) => u.id.toString() === opcao?.id
                    );
                    setUnidadeSelecionada(unidadeEncontrada || null);
                  }
                }}
                pesquisavel
                rotuloAcessibilidade="Selecionar unidade para análise"
              />
            </View>
          </View>
        )}

        <View style={styles.emptyContainer}>
          <MaterialIcons name="analytics" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum dado disponível</Text>
          <Text style={styles.emptySubtext}>
            {unidadeSelecionada
              ? `Realize algumas movimentações na unidade ${unidadeSelecionada.nome} para gerar a análise`
              : "Realize algumas movimentações para gerar a análise"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        titulo="Curva ABC"
        subtitulo={getSubtituloHeader()}
        onPressVoltar={() => navigation.goBack()}
        botaoDireita={
          <TouchableOpacity onPress={carregarDadosCurvaABC}>
            <MaterialIcons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {podeAcessarTodasUnidades && (
          <View style={styles.secaoFiltros}>
            <View style={styles.containerFiltro}>
              <Seletor
                rotulo="Unidade"
                placeholder="Selecione uma unidade"
                valor={
                  unidadeSelecionada
                    ? {
                        id: unidadeSelecionada.id.toString(),
                        nome: unidadeSelecionada.nome,
                      }
                    : { id: "todas", nome: "Todas as unidades" }
                }
                opcoes={opcoesUnidades}
                aoMudarValor={(opcao) => {
                  if (opcao?.id === "todas") {
                    setUnidadeSelecionada(null);
                  } else {
                    const unidadeEncontrada = unidades.find(
                      (u) => u.id.toString() === opcao?.id
                    );
                    setUnidadeSelecionada(unidadeEncontrada || null);
                  }
                }}
                pesquisavel
                rotuloAcessibilidade="Selecionar unidade para análise"
              />
            </View>
          </View>
        )}

        {/* Gráfico de Pizza */}
        <View style={styles.secaoGrafico}>
          <Text style={styles.tituloSecao}>Distribuição por Valor</Text>

          <View style={styles.containerGrafico}>
            <PieChart
              data={prepararDadosGrafico()}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 10]}
              absolute
            />
          </View>

          <View style={styles.estatisticasGerais}>
            <Text style={styles.valorTotalGeral}>
              Valor Total: {formatarValor(dados.estatisticas.valor_total_geral)}
            </Text>
          </View>
        </View>

        <View style={styles.secaoResumo}>
          <Text style={styles.tituloSecao}>Resumo por Classe</Text>
          {dados.resumo.map(renderCartaoResumo)}
        </View>
        <View style={styles.secaoDetalhes}>
          <Text style={styles.tituloSecao}>Produtos Detalhados</Text>
          {dados.produtos.slice(0, 10).map(renderProdutoDetalhado)}

          {dados.produtos.length > 10 && (
            <TouchableOpacity
              style={styles.botaoVerMais}
              onPress={() => {
                setProdutosSelecionados(dados.produtos);
                setModalDetalhesVisivel(true);
              }}
            >
              <Text style={styles.textoVerMais}>
                Ver todos os {dados.produtos.length} produtos
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color="#4CAF50"
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalDetalhesVisivel}
        onRequestClose={() => setModalDetalhesVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>
              Produtos Detalhados ({produtosSelecionados.length})
            </Text>
            <TouchableOpacity onPress={() => setModalDetalhesVisivel(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {produtosSelecionados.map(renderProdutoDetalhado)}
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  scrollContainer: {
    flex: 1,
  },

  secaoFiltros: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  containerFiltro: {
    marginBottom: 0,
  },

  secaoGrafico: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secaoResumo: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secaoDetalhes: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tituloSecao: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  containerGrafico: {
    alignItems: "center",
    marginVertical: 10,
  },
  estatisticasGerais: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  valorTotalGeral: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  cartaoResumo: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cabecalhoCartao: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  classeTexto: {
    fontSize: 18,
    fontWeight: "700",
  },
  conteudoCartao: {
    gap: 4,
  },
  valorPrincipal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  percentualValor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  quantidadeProdutos: {
    fontSize: 12,
    color: "#888",
  },
  produtoDetalhado: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  produtoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  produtoClasse: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  produtoCategoria: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  produtoUnidade: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  produtoMetricas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metrica: {
    flex: 1,
    minWidth: "45%",
  },
  metricaLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  metricaValor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  botaoVerMais: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginTop: 8,
    backgroundColor: "#f0f8f0",
    borderRadius: 8,
  },
  textoVerMais: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
});

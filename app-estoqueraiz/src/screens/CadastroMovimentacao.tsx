import { useState, useEffect } from "react";
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
import { Seletor } from "../components/Seletor";
import Header from "../components/Header";
import { ModalConfirmacao } from "../components/ModalConfirmacao";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { useAppFonts } from "../hooks/useAppFonts";

type CadastroMovimentacaoScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  "CadastroMovimentacao"
>;

export default function CadastroMovimentacao() {
  const navigation = useNavigation<CadastroMovimentacaoScreenProp>();
  const fontesCarregadas = useAppFonts();

  const [tipo, setTipo] = useState<
    "ENTRADA" | "SAIDA" | "TRANSFERENCIA" | "AJUSTE"
  >("ENTRADA");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [documento, setDocumento] = useState("");

  const [produtos, setProdutos] = useState<any[]>([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState<any[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeOrigemSelecionada, setUnidadeOrigemSelecionada] =
    useState<any>(null);
  const [unidadeDestinoSelecionada, setUnidadeDestinoSelecionada] =
    useState<any>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalConfirmacaoVisivel, setModalConfirmacaoVisivel] = useState(false);

  useEffect(() => {
    verificarLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (unidadeOrigemSelecionada) {
      const produtosDaUnidade = produtos.filter(
        (produto) => produto.unidade_id === unidadeOrigemSelecionada.id
      );
      setProdutosFiltrados(produtosDaUnidade);
    } else {
      setProdutosFiltrados(produtos);
    }
    if (produtoSelecionado && unidadeOrigemSelecionada) {
      const produtoAindaDisponivel = produtos.some(
        (produto) =>
          produto.id === produtoSelecionado.id &&
          produto.unidade_id === unidadeOrigemSelecionada.id
      );
      if (!produtoAindaDisponivel) {
        setProdutoSelecionado(null);
      }
    }
  }, [unidadeOrigemSelecionada, produtos, produtoSelecionado]);

  async function verificarLogin() {
    try {
      const token = await AsyncStorage.getItem("token");
      const usuarioString = await AsyncStorage.getItem("usuario");

      if (!token || !usuarioString) {
        Toast.show({
          type: "error",
          text1: "Sessão Expirada",
          text2: "Faça login novamente para continuar.",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      const usuario = JSON.parse(usuarioString);

      if (!usuario.id) {
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Dados do usuário inválidos. Faça login novamente.",
          position: "top",
          visibilityTime: 4000,
        });
        return;
      }

      setUsuarioId(usuario.id);
      carregarDadosIniciais();
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Erro interno do aplicativo.",
        position: "top",
        visibilityTime: 4000,
      });
    }
  }

  async function carregarDadosIniciais() {
    try {
      setCarregandoDados(true);

      const [responseProdutos, responseUnidades] = await Promise.all([
        api.get("/api/produtos"),
        api.get("/api/unidades"),
      ]);

      const listaProdutos =
        responseProdutos.data?.produtos || responseProdutos.data || [];
      const produtosAtivos = Array.isArray(listaProdutos)
        ? listaProdutos.filter((produto: any) => produto.ativo === true)
        : [];

      setProdutos(produtosAtivos);
      setProdutosFiltrados(produtosAtivos);
      setUnidades(
        Array.isArray(responseUnidades.data) ? responseUnidades.data : []
      );
    } catch (error: any) {
      console.error("Detalhes do erro:", error.response?.data || error.message);
      Toast.show({
        type: "error",
        text1: "Erro de Conexão",
        text2: "Verifique se o backend está rodando e o IP está correto",
        position: "top",
        visibilityTime: 5000,
      });
    } finally {
      setCarregandoDados(false);
    }
  }

  function getTipoTexto(tipo: string) {
    switch (tipo) {
      case "ENTRADA":
        return "Entrada";
      case "SAIDA":
        return "Saída";
      case "TRANSFERENCIA":
        return "Transferência";
      case "AJUSTE":
        return "Ajuste";
      default:
        return tipo;
    }
  }

  function renderProdutoOption(produto: any) {
    const quantidadeEstoque = produto.quantidade_estoque || 0;
    const unidade = quantidadeEstoque === 1 ? "unid." : "unid.";

    return (
      <View style={styles.produtoOptionContainer}>
        <Text style={styles.produtoNome} numberOfLines={1}>
          {produto.nome}
        </Text>
        <Text style={styles.produtoEstoque}>
          — {quantidadeEstoque} {unidade}
        </Text>
      </View>
    );
  }

  function validarFormulario(): boolean {
    if (!unidadeOrigemSelecionada) {
      Toast.show({
        type: "error",
        text1: "Campo obrigatório",
        text2: "Selecione a unidade de origem",
        position: "top",
        visibilityTime: 3000,
      });
      return false;
    }

    if (!produtoSelecionado) {
      Toast.show({
        type: "error",
        text1: "Campo obrigatório",
        text2: "Selecione um produto",
        position: "top",
        visibilityTime: 3000,
      });
      return false;
    }

    if (!quantidade || parseFloat(quantidade) <= 0) {
      Toast.show({
        type: "error",
        text1: "Campo obrigatório",
        text2: "Digite uma quantidade válida",
        position: "top",
        visibilityTime: 3000,
      });
      return false;
    }

    if (tipo === "TRANSFERENCIA" && !unidadeDestinoSelecionada) {
      Toast.show({
        type: "error",
        text1: "Campo obrigatório para transferência",
        text2: "Selecione a unidade de destino",
        position: "top",
        visibilityTime: 3000,
      });
      return false;
    }

    return true;
  }

  function confirmarMovimentacao() {
    if (validarFormulario()) {
      setModalConfirmacaoVisivel(true);
    }
  }

  function cancelarMovimentacao() {
    setModalConfirmacaoVisivel(false);
  }

  function gerarMensagemConfirmacao(): string {
    const tipoTexto = getTipoTexto(tipo);
    const produto = produtoSelecionado?.nome || "";
    const qtd = quantidade;
    const unidadeOrigem = unidadeOrigemSelecionada?.nome || "";
    const unidadeDestino = unidadeDestinoSelecionada?.nome || "";

    let mensagem = `Confirma a ${tipoTexto.toLowerCase()} de ${qtd} unidades do produto "${produto}"?`;

    if (tipo === "TRANSFERENCIA") {
      mensagem += `\n\nDe: ${unidadeOrigem}\nPara: ${unidadeDestino}`;
    } else {
      mensagem += `\n\nUnidade: ${unidadeOrigem}`;
    }

    if (observacao.trim()) {
      mensagem += `\n\nObservação: ${observacao.trim()}`;
    }

    if (documento.trim()) {
      mensagem += `\nDocumento: ${documento.trim()}`;
    }

    return mensagem;
  }

  function obterIconeMovimentacao():
    | "add-circle"
    | "remove-circle"
    | "swap-horiz"
    | "edit"
    | "inventory"
    | undefined {
    switch (tipo) {
      case "ENTRADA":
        return "add-circle";
      case "SAIDA":
        return "remove-circle";
      case "TRANSFERENCIA":
        return "swap-horiz";
      case "AJUSTE":
        return "edit";
      default:
        return "inventory";
    }
  }

  function obterCorMovimentacao(): string {
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
        return "#2196F3";
    }
  }

  async function salvarMovimentacao() {
    try {
      setSalvando(true);

      const dadosMovimentacao = {
        tipo,
        quantidade: parseFloat(quantidade),
        produto_id: produtoSelecionado.id,
        usuario_id: usuarioId,
        observacao: observacao.trim() || null,
        documento: documento.trim() || null,
        unidade_origem_id: unidadeOrigemSelecionada?.id || null,
        unidade_destino_id: unidadeDestinoSelecionada?.id || null,
      };

      const response = await api.post("/api/movimentacoes", dadosMovimentacao);

      if (response.status === 201 || response.status === 200) {
        Toast.show({
          type: "success",
          text1: "Sucesso",
          text2: "Movimentação registrada com sucesso",
          position: "top",
          visibilityTime: 3000,
        });

        setTipo("ENTRADA");
        setQuantidade("");
        setObservacao("");
        setDocumento("");
        setProdutoSelecionado(null);
        setUnidadeOrigemSelecionada(null);
        setUnidadeDestinoSelecionada(null);

        await carregarDadosIniciais();

        navigation.goBack();
      } else {
        throw new Error("Resposta inesperada do servidor");
      }
    } catch (error: any) {
      console.error("Erro ao salvar movimentação:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.message || "Erro ao registrar movimentação";
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: errorMessage,
          position: "top",
          visibilityTime: 4000,
        });
      } else if (error.request) {
        Toast.show({
          type: "error",
          text1: "Erro de Conexão",
          text2: "Verifique sua conexão com a internet",
          position: "top",
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Erro interno do aplicativo",
          position: "top",
          visibilityTime: 4000,
        });
      }
    } finally {
      setSalvando(false);
      setModalConfirmacaoVisivel(false);
    }
  }

  if (!fontesCarregadas || carregandoDados) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header
        titulo="Nova Movimentação"
        onPressVoltar={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Seletor
              rotulo="Tipo de Movimentação"
              placeholder="Selecione o tipo"
              valor={tipo ? { id: tipo, nome: getTipoTexto(tipo) } : null}
              opcoes={[
                { id: "ENTRADA", nome: "Entrada" },
                { id: "SAIDA", nome: "Saída" },
                { id: "TRANSFERENCIA", nome: "Transferência" },
                { id: "AJUSTE", nome: "Ajuste" },
              ]}
              aoMudarValor={(value) =>
                setTipo(value ? (value.id as typeof tipo) : "ENTRADA")
              }
              obrigatorio
              rotuloAcessibilidade="Selecionar tipo de movimentação"
            />
          </View>

          <View style={styles.inputGroup}>
            <Seletor
              rotulo="Unidade de Origem"
              placeholder="Selecione a unidade"
              valor={unidadeOrigemSelecionada}
              opcoes={unidades}
              aoMudarValor={setUnidadeOrigemSelecionada}
              obrigatorio
              pesquisavel
              rotuloAcessibilidade="Selecionar unidade de origem"
            />
          </View>

          <View style={styles.inputGroup}>
            <Seletor
              rotulo="Produto"
              placeholder={
                unidadeOrigemSelecionada
                  ? "Selecione um produto"
                  : "Selecione primeiro a unidade de origem"
              }
              valor={produtoSelecionado}
              opcoes={produtosFiltrados}
              aoMudarValor={setProdutoSelecionado}
              obrigatorio
              desabilitado={!unidadeOrigemSelecionada}
              pesquisavel
              rotuloAcessibilidade="Selecionar produto"
              renderizarOpcao={renderProdutoOption}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade *</Text>
            <Input
              placeholder="Digite a quantidade"
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="numeric"
              accessibilityLabel="Campo quantidade"
              accessibilityHint="Digite a quantidade da movimentação"
            />
          </View>

          <View style={styles.inputGroup}>
            <Seletor
              rotulo="Unidade de Destino"
              placeholder="Selecione a unidade (opcional)"
              valor={unidadeDestinoSelecionada}
              opcoes={unidades}
              aoMudarValor={setUnidadeDestinoSelecionada}
              pesquisavel
              rotuloAcessibilidade="Selecionar unidade de destino"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observação</Text>
            <Input
              placeholder="Digite uma observação (opcional)"
              value={observacao}
              onChangeText={setObservacao}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Documento</Text>
            <Input
              placeholder="Número do documento (opcional)"
              value={documento}
              onChangeText={setDocumento}
            />
          </View>

          <TouchableOpacity
            style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
            onPress={confirmarMovimentacao}
            disabled={salvando}
            accessibilityLabel="Salvar movimentação"
            accessibilityRole="button"
          >
            <Text style={styles.textoBotaoSalvar}>
              {salvando ? "Salvando..." : "Salvar Movimentação"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ModalConfirmacao
        visivel={modalConfirmacaoVisivel}
        titulo={`Confirmar ${getTipoTexto(tipo)}`}
        mensagem={gerarMensagemConfirmacao()}
        textoBotaoConfirmar={salvando ? "Salvando..." : "Confirmar"}
        textoBotaoCancelar="Cancelar"
        corBotaoConfirmar={obterCorMovimentacao()}
        iconeBotaoConfirmar={obterIconeMovimentacao()}
        onConfirmar={salvarMovimentacao}
        onCancelar={cancelarMovimentacao}
        carregando={salvando}
      />
    </KeyboardAvoidingView>
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
    fontSize: 16,
    color: "#666",
    fontFamily: "NunitoSans_400Regular",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    fontFamily: "NunitoSans_600SemiBold",
  },
  Seletoror: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  SeletororContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tipoIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  SeletororText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "NunitoSans_400Regular",
  },
  botaoSalvar: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  botaoDesabilitado: {
    backgroundColor: "#ccc",
  },
  textoBotaoSalvar: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "NunitoSans_600SemiBold",
  },
  SeletororDesabilitado: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  produtoOptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  produtoNome: {
    fontSize: 16,
    color: "#333",
    fontFamily: "NunitoSans_400Regular",
    flex: 1,
  },
  produtoEstoque: {
    fontSize: 14,
    color: "#666",
    fontFamily: "NunitoSans_400Regular",
    marginLeft: 8,
  },
});

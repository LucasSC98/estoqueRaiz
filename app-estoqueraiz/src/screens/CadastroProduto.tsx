import { useState, useEffect, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Image,
  ActionSheetIOS,
  TextInput,
} from "react-native";
import { Input } from "../components/Input";
import { Seletor } from "../components/Seletor";
import Header from "../components/Header";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../types/navigation";
import { useAppFonts } from "../hooks/useAppFonts";

type CadastroProdutoRouteProp = RouteProp<
  RootStackParamList,
  "CadastroProduto"
>;

const FORMATOS_PERMITIDOS = ["jpg", "jpeg", "png", "gif", "webp"];
const TAMANHO_MAXIMO_MB = 5;
const TAMANHO_MAXIMO_BYTES = TAMANHO_MAXIMO_MB * 1024 * 1024;

export default function CadastroProduto() {
  const route = useRoute<CadastroProdutoRouteProp>();
  const navigation = useNavigation();
  const produtoParaEditar = route.params?.produto;
  const fontesCarregadas = useAppFonts();

  const voltarParaDashboard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [quantidadeMinima, setQuantidadeMinima] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [lote, setLote] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [imagemLocal, setImagemLocal] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<any>(null);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<any>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [cargoUsuario, setCargoUsuario] = useState<string>("");
  const [unidadeUsuario, setUnidadeUsuario] = useState<any>(null);

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [modalImagemVisivel, setModalImagemVisivel] = useState(false);
  const [modalUrlVisivel, setModalUrlVisivel] = useState(false);

  const handleQrCodePress = () => {
    Toast.show({
      type: "info",
      text1: "Funcionalidade QR Code",
      text2: "Em breve: leitura de qr code via câmera",
      position: "top",
      visibilityTime: 3000,
    });
  };

  const formatarData = (texto: string) => {
    const apenasNumeros = texto.replace(/\D/g, "");
    const limitado = apenasNumeros.slice(0, 8);
    let formatado = limitado;
    if (limitado.length >= 5) {
      formatado = `${limitado.slice(0, 2)}/${limitado.slice(
        2,
        4
      )}/${limitado.slice(4)}`;
    } else if (limitado.length >= 3) {
      formatado = `${limitado.slice(0, 2)}/${limitado.slice(2)}`;
    }

    return formatado;
  };

  const handleDataValidadeChange = (texto: string) => {
    const formatado = formatarData(texto);
    setDataValidade(formatado);
  };

  const converterDataParaBackend = (dataFormatada: string) => {
    if (!dataFormatada || dataFormatada.length !== 10) return null;
    const partes = dataFormatada.split("/");
    if (partes.length !== 3) return null;

    const dia = partes[0].padStart(2, "0");
    const mes = partes[1].padStart(2, "0");
    const ano = partes[2];

    return `${ano}-${mes}-${dia}`;
  };

  const converterDataParaFrontend = (dataBackend: string) => {
    if (!dataBackend || dataBackend.length !== 10) return "";
    const partes = dataBackend.split("-");
    if (partes.length !== 3) return "";

    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${ano}`;
  };

  const validarFormatoImagem = (uri: string): boolean => {
    const extensao = uri.split(".").pop()?.toLowerCase();
    if (!extensao || !FORMATOS_PERMITIDOS.includes(extensao)) {
      Toast.show({
        type: "error",
        text1: "Formato Inválido",
        text2: `Apenas imagens ${FORMATOS_PERMITIDOS.join(
          ", "
        )} são permitidas`,
        position: "top",
        visibilityTime: 4000,
      });
      return false;
    }
    return true;
  };

  const validarTamanhoImagem = async (uri: string): Promise<boolean> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const tamanhoBytes = blob.size;

      if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
        const tamanhoMB = (tamanhoBytes / (1024 * 1024)).toFixed(2);
        Toast.show({
          type: "error",
          text1: "Imagem Muito Grande",
          text2: `Tamanho: ${tamanhoMB}MB. Máximo permitido: ${TAMANHO_MAXIMO_MB}MB`,
          position: "top",
          visibilityTime: 4000,
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Erro ao validar tamanho da imagem:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível validar o tamanho da imagem",
        position: "top",
        visibilityTime: 3000,
      });
      return false;
    }
  };

  const validarImagemCompleta = async (uri: string): Promise<boolean> => {
    if (!validarFormatoImagem(uri)) {
      return false;
    }

    const tamanhoValido = await validarTamanhoImagem(uri);
    if (!tamanhoValido) {
      return false;
    }

    return true;
  };

  async function carregarDadosIniciais(
    cargoParam?: string,
    unidadeIdParam?: number
  ) {
    try {
      setCarregandoDados(true);

      const responseCategorias = await api.get("/api/categorias");
      setCategorias(responseCategorias.data);

      const responseUnidades = await api.get("/api/unidades");
      let unidadesFiltradas = responseUnidades.data;
      const cargoAtual = cargoParam || cargoUsuario;
      const unidadeIdAtual = unidadeIdParam || unidadeUsuario?.id;
      if (cargoAtual === "estoquista" || cargoAtual === "financeiro") {
        let unidadesPermitidas = [];
        if (unidadeIdAtual) {
          unidadesPermitidas.push(unidadeIdAtual);
        }
        if (produtoParaEditar && produtoParaEditar.unidade_id) {
          unidadesPermitidas.push(produtoParaEditar.unidade_id);
        }

        unidadesFiltradas = responseUnidades.data.filter((unidade: any) =>
          unidadesPermitidas.includes(unidade.id)
        );
        const unidadeCompleta = responseUnidades.data.find(
          (unidade: any) => unidade.id === unidadeIdAtual
        );
        if (
          unidadeCompleta &&
          JSON.stringify(unidadeUsuario) !== JSON.stringify(unidadeCompleta)
        ) {
          setUnidadeUsuario(unidadeCompleta);
        }
      }

      setUnidades(unidadesFiltradas);
      if (unidadesFiltradas.length === 1) {
        setUnidadeSelecionada(unidadesFiltradas[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível carregar os dados iniciais",
        position: "top",
        visibilityTime: 4000,
      });
    } finally {
      setCarregandoDados(false);
    }
  }

  const preencherCamposParaEdicao = useCallback(() => {
    if (!produtoParaEditar) return;

    setNome(produtoParaEditar.nome || "");
    setDescricao(produtoParaEditar.descricao || "");
    setCodigoBarras(produtoParaEditar.codigo_barras || "");
    setPrecoCusto(produtoParaEditar.preco_custo?.toString() || "");
    setPrecoVenda(produtoParaEditar.preco_venda?.toString() || "");
    setQuantidadeEstoque(
      produtoParaEditar.quantidade_estoque?.toString() || ""
    );
    setQuantidadeMinima(produtoParaEditar.quantidade_minima?.toString() || "");
    setDataValidade(
      converterDataParaFrontend(produtoParaEditar.data_validade) || ""
    );
    setLote(produtoParaEditar.lote || "");
    setLocalizacao(produtoParaEditar.localizacao || "");
    setImagemUrl(produtoParaEditar.imagem_url || "");

    if (produtoParaEditar.categoria_id && categorias.length > 0) {
      const categoria = categorias.find(
        (c) => c.id === produtoParaEditar.categoria_id
      );
      if (categoria) {
        setCategoriaSelecionada(categoria);
      }
    }

    if (produtoParaEditar.unidade_id && unidades.length > 0) {
      const unidade = unidades.find(
        (u) => u.id === produtoParaEditar.unidade_id
      );
      if (unidade) {
        setUnidadeSelecionada(unidade);
      }
    }
  }, [produtoParaEditar, categorias, unidades]);

  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    if (!inicializado) {
      setInicializado(true);
      verificarLogin();
    }
  }, [inicializado]);

  useEffect(() => {
    if (produtoParaEditar) {
      preencherCamposParaEdicao();
    }
  }, [
    produtoParaEditar,
    categorias,
    unidades,
    unidadeUsuario,
    preencherCamposParaEdicao,
  ]);

  async function verificarLogin() {
    try {
      const token = await AsyncStorage.getItem("token");
      const usuarioString = await AsyncStorage.getItem("usuario");
      const cargo = await AsyncStorage.getItem("cargo");

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
      setCargoUsuario(cargo || "");
      if (
        (cargo === "estoquista" || cargo === "financeiro") &&
        usuario.unidade_id
      ) {
        setUnidadeUsuario({ id: usuario.unidade_id });
      }
      carregarDadosIniciais(cargo || "", usuario.unidade_id);
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Erro ao verificar sessão. Faça login novamente.",
        position: "top",
        visibilityTime: 4000,
      });
    }
  }

  async function cadastrarProduto() {
    if (!nome.trim()) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Nome do produto é obrigatório!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (!categoriaSelecionada) {
      Toast.show({
        type: "warning",
        text1: "Atenção",
        text2: "Selecione uma categoria!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (!unidadeSelecionada) {
      Toast.show({
        type: "warning",
        text1: "Atenção",
        text2: "Selecione uma unidade!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (!quantidadeMinima.trim() || parseInt(quantidadeMinima) <= 0) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Quantidade mínima deve ser maior que zero!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (precoCusto.trim() && parseFloat(precoCusto) <= 0) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Preço de custo deve ser maior que zero!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (precoVenda.trim() && parseFloat(precoVenda) <= 0) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Preço de venda deve ser maior que zero!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (quantidadeEstoque.trim() && parseInt(quantidadeEstoque) < 0) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Quantidade em estoque não pode ser negativa!",
        position: "top",
        visibilityTime: 3000,
      });
      return;
    }

    if (!usuarioId) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Usuário não identificado! Faça login novamente.",
        position: "top",
        visibilityTime: 4000,
      });
      return;
    }

    if (imagemLocal && !(await validarImagemCompleta(imagemLocal))) {
      return;
    }

    if (imagemUrl && !validarFormatoImagem(imagemUrl)) {
      return;
    }

    try {
      const dados: any = {
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        codigo_barras: codigoBarras.trim() || null,
        quantidade_estoque: parseInt(quantidadeEstoque) || 0,
        quantidade_minima: parseInt(quantidadeMinima),
        data_validade: converterDataParaBackend(dataValidade.trim()) || null,
        lote: lote.trim() || null,
        localizacao: localizacao.trim() || null,
        imagem_url: imagemLocal || imagemUrl || null,
        categoria_id: categoriaSelecionada.id,
        unidade_id: unidadeSelecionada.id,
        usuario_id: usuarioId,
      };
      if (precoCusto.trim()) {
        dados.preco_custo = parseFloat(precoCusto);
      }
      if (precoVenda.trim()) {
        dados.preco_venda = parseFloat(precoVenda);
      }

      let resposta;
      const isEdicao = !!produtoParaEditar;

      if (isEdicao) {
        resposta = await api.patch(
          `/api/produtos/${produtoParaEditar.id}`,
          dados
        );
      } else {
        resposta = await api.post("/api/produtos", dados);
      }

      if (resposta.data) {
        Toast.show({
          type: "success",
          text1: "Sucesso!",
          text2: isEdicao
            ? "Produto atualizado com sucesso!"
            : "Produto cadastrado com sucesso!",
          position: "top",
          visibilityTime: 3000,
        });

        if (!isEdicao) {
          limparCampos();
        }
      }
    } catch (error: any) {
      const mensagem =
        error.response?.data?.message || error.message || "Erro desconhecido";
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: `${mensagem}`,
        position: "top",
        visibilityTime: 4000,
      });
    }
  }

  function limparCampos() {
    setNome("");
    setDescricao("");
    setCodigoBarras("");
    setPrecoCusto("");
    setPrecoVenda("");
    setQuantidadeEstoque("");
    setQuantidadeMinima("");
    setDataValidade("");
    setLote("");
    setLocalizacao("");
    setImagemUrl("");
    setImagemLocal(null);
    setCategoriaSelecionada(null);
    setUnidadeSelecionada(null);
  }

  const mostrarOpcoesFoto = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancelar", "URL da Imagem", "Galeria", "Câmera"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setModalUrlVisivel(true);
          } else if (buttonIndex === 2) {
            selecionarDaGaleria();
          } else if (buttonIndex === 3) {
            tirarFoto();
          }
        }
      );
    } else {
      setModalImagemVisivel(true);
    }
  };

  const selecionarDaGaleria = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Permissão para usar a galeria é necessária!",
          position: "top",
          visibilityTime: 3000,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;

        if (await validarImagemCompleta(uri)) {
          setImagemLocal(uri);
          setImagemUrl("");

          Toast.show({
            type: "success",
            text1: "Imagem Selecionada",
            text2: "Imagem válida adicionada com sucesso!",
            position: "top",
            visibilityTime: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao selecionar imagem:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2:
          "Houve um erro ao selecionar imagem da galeria, tente novamente.",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const tirarFoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Toast.show({
          type: "error",
          text1: "Erro",
          text2: "Permissão para usar a câmera é necessária!",
          position: "top",
          visibilityTime: 3000,
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;

        if (await validarImagemCompleta(uri)) {
          setImagemLocal(uri);
          setImagemUrl("");

          Toast.show({
            type: "success",
            text1: "Foto Capturada",
            text2: "Foto válida adicionada com sucesso!",
            position: "top",
            visibilityTime: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Erro ao tirar foto:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2:
          "Houve um erro ao enviar a foto para o servidor, tente novamente.",
        position: "top",
        visibilityTime: 3000,
      });
    }
  };

  const adicionarImagemPorUrl = (url: string) => {
    if (url.trim()) {
      if (validarFormatoImagem(url.trim())) {
        setImagemUrl(url.trim());
        setImagemLocal(null);

        Toast.show({
          type: "success",
          text1: "URL Adicionada",
          text2: "URL da imagem validada com sucesso!",
          position: "top",
          visibilityTime: 2000,
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Digite uma URL válida!",
        position: "top",
        visibilityTime: 3000,
      });
    }
    setModalUrlVisivel(false);
  };

  const removerImagem = () => {
    setImagemUrl("");
    setImagemLocal(null);
    Toast.show({
      type: "info",
      text1: "Imagem Removida",
      text2: "A imagem foi removida do produto",
      position: "top",
      visibilityTime: 2000,
    });
  };

  if (!fontesCarregadas) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header
        titulo={produtoParaEditar ? "Editar Produto" : "Cadastro de Produto"}
        subtitulo="Preencha os dados do produto"
        onPressVoltar={voltarParaDashboard}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {carregandoDados ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Carregando dados...</Text>
            </View>
          ) : (
            <>
              <Seletor
                rotulo="Categoria"
                placeholder="Selecione uma categoria"
                valor={categoriaSelecionada}
                opcoes={categorias}
                aoMudarValor={setCategoriaSelecionada}
                obrigatorio={true}
                pesquisavel={true}
              />

              <Seletor
                rotulo="Unidade"
                placeholder="Selecione uma unidade"
                valor={unidadeSelecionada}
                opcoes={unidades}
                aoMudarValor={setUnidadeSelecionada}
                obrigatorio={true}
                pesquisavel={true}
              />
            </>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Código de Barras</Text>
            <View style={styles.containerEntrada}>
              <TextInput
                placeholder="Código de barras (opcional)"
                value={codigoBarras}
                onChangeText={setCodigoBarras}
                style={styles.inputComIcone}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={styles.botaoQr}
                onPress={handleQrCodePress}
              >
                <MaterialIcons
                  name="qr-code-scanner"
                  size={24}
                  color="#2196F3"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome *</Text>
            <Input
              placeholder="Nome do produto"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <Input
              placeholder="Descrição do produto (opcional)"
              value={descricao}
              onChangeText={setDescricao}
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade em Estoque</Text>
            <Input
              placeholder="Ex: 100 (padrão: 0)"
              value={quantidadeEstoque}
              onChangeText={setQuantidadeEstoque}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade Mínima</Text>
            <Input
              placeholder="Ex: 10 (padrão: 1)"
              value={quantidadeMinima}
              onChangeText={setQuantidadeMinima}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Validade</Text>
            <Input
              placeholder="DD/MM/YYYY (opcional)"
              value={dataValidade}
              onChangeText={handleDataValidadeChange}
              style={styles.input}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lote</Text>
            <Input
              placeholder="Número do lote (opcional)"
              value={lote}
              onChangeText={setLote}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Localização</Text>
            <Input
              placeholder="Ex: A1-B2-C3 (opcional)"
              value={localizacao}
              onChangeText={setLocalizacao}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Imagem do Produto</Text>
            <Text style={styles.infoFormato}>
              Formatos: {FORMATOS_PERMITIDOS.join(", ")} | Máx:{" "}
              {TAMANHO_MAXIMO_MB}MB
            </Text>

            {imagemLocal || imagemUrl ? (
              <View style={styles.containerImagem}>
                <Image
                  source={{ uri: imagemLocal || imagemUrl }}
                  style={styles.visualizacaoImagem}
                  resizeMode="cover"
                />
                <View style={styles.acoesImagem}>
                  <TouchableOpacity
                    style={styles.botaoImagemSecundario}
                    onPress={mostrarOpcoesFoto}
                  >
                    <MaterialIcons name="edit" size={16} color="#2196F3" />
                    <Text style={styles.textoBotaoSecundario}>Alterar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.botaoImagemRemover}
                    onPress={removerImagem}
                  >
                    <MaterialIcons name="delete" size={16} color="#F44336" />
                    <Text style={styles.textoBotaoRemover}>Remover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.botaoAdicionarImagem}
                onPress={mostrarOpcoesFoto}
              >
                <MaterialIcons name="add-a-photo" size={32} color="#2196F3" />
                <Text style={styles.textoBotaoImagem}>Adicionar Imagem</Text>
                <Text style={styles.subtextoBotaoImagem}>
                  URL, galeria ou câmera
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.botaoCadastrar}
            onPress={cadastrarProduto}
          >
            <Text style={styles.botaoTexto}>
              {produtoParaEditar ? "Atualizar" : "Cadastrar"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoLimpar} onPress={limparCampos}>
            <Text style={styles.botaoTexto}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalImagemVisivel}
        onRequestClose={() => setModalImagemVisivel(false)}
      >
        <View style={styles.containerModal}>
          <View style={styles.conteudoModal}>
            <View style={styles.cabecalhoModal}>
              <Text style={styles.tituloModal}>Selecionar Imagem</Text>
              <TouchableOpacity onPress={() => setModalImagemVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.opcoesImagem}>
              <TouchableOpacity
                style={styles.opcaoImagem}
                onPress={() => {
                  setModalImagemVisivel(false);
                  setModalUrlVisivel(true);
                }}
              >
                <MaterialIcons name="link" size={32} color="#2196F3" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcaoImagem}>URL da Imagem</Text>
                  <Text style={styles.subtextoOpcaoImagem}>
                    Inserir link de uma imagem
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.opcaoImagem}
                onPress={() => {
                  setModalImagemVisivel(false);
                  selecionarDaGaleria();
                }}
              >
                <MaterialIcons name="photo-library" size={32} color="#4CAF50" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcaoImagem}>Galeria</Text>
                  <Text style={styles.subtextoOpcaoImagem}>
                    Escolher da galeria de fotos
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.opcaoImagem}
                onPress={() => {
                  setModalImagemVisivel(false);
                  tirarFoto();
                }}
              >
                <MaterialIcons name="camera-alt" size={32} color="#FF9800" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.textoOpcaoImagem}>Câmera</Text>
                  <Text style={styles.subtextoOpcaoImagem}>
                    Tirar uma nova foto
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalUrlVisivel}
        onRequestClose={() => setModalUrlVisivel(false)}
      >
        <View style={styles.containerModal}>
          <View style={styles.conteudoModal}>
            <View style={styles.cabecalhoModal}>
              <Text style={styles.tituloModal}>URL da Imagem</Text>
              <TouchableOpacity onPress={() => setModalUrlVisivel(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.corpoModal}>
              <Text style={styles.rotuloModal}>Cole o link da imagem:</Text>
              <Text style={styles.infoFormato}>
                Formatos aceitos: {FORMATOS_PERMITIDOS.join(", ")}
              </Text>
              <Input
                placeholder="https://exemplo.com/imagem.jpg"
                value={imagemUrl}
                onChangeText={setImagemUrl}
                style={styles.entradaModal}
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.botoesModal}>
                <TouchableOpacity
                  style={styles.botaoModalCancelar}
                  onPress={() => {
                    setModalUrlVisivel(false);
                    setImagemUrl("");
                  }}
                >
                  <Text style={styles.textoBotaoModalCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoModalConfirmar}
                  onPress={() => adicionarImagemPorUrl(imagemUrl)}
                >
                  <Text style={styles.textoBotaoModalConfirmar}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "NunitoSans_600SemiBold",
    color: "#374151",
    marginBottom: 8,
  },
  infoFormato: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    fontStyle: "italic",
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
    justifyContent: "center",
  },
  containerEntrada: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: "#F9FAFB",
  },
  inputComIcone: {
    flex: 1,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: "#111827",
  },
  botaoQr: {
    padding: 4,
  },
  botaoOpcao: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  opcaoSelecionada: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  textoOpcao: {
    color: "#111827",
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 14,
  },
  textoOpcaoSelecionada: {
    color: "#FFFFFF",
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
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "NunitoSans_600SemiBold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontFamily: "NunitoSans_400Regular",
  },
  containerImagem: {
    alignItems: "center",
    marginTop: 8,
  },
  visualizacaoImagem: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  acoesImagem: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  botaoImagemSecundario: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 8,
    gap: 4,
  },
  textoBotaoSecundario: {
    fontSize: 14,
    color: "#2196F3",
    fontFamily: "NunitoSans_600SemiBold",
  },
  botaoImagemRemover: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F44336",
    borderRadius: 8,
    gap: 4,
  },
  textoBotaoRemover: {
    fontSize: 14,
    color: "#F44336",
    fontFamily: "NunitoSans_600SemiBold",
  },
  botaoAdicionarImagem: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: "center",
  },
  textoBotaoImagem: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196F3",
    marginTop: 8,
    fontFamily: "NunitoSans_600SemiBold",
  },
  subtextoBotaoImagem: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "NunitoSans_400Regular",
  },
  opcoesImagem: {
    padding: 20,
    gap: 16,
  },
  opcaoImagem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    gap: 16,
  },
  textoOpcaoImagem: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "NunitoSans_600SemiBold",
  },
  subtextoOpcaoImagem: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: "NunitoSans_400Regular",
  },
  containerModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  conteudoModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  cabecalhoModal: {
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
    fontFamily: "NunitoSans_600SemiBold",
  },
  botaoFechar: {
    padding: 4,
  },
  corpoModal: {
    padding: 20,
  },
  rotuloModal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    fontFamily: "NunitoSans_600SemiBold",
  },
  entradaModal: {
    height: 52,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: "#111827",
    marginBottom: 20,
  },
  botoesModal: {
    flexDirection: "row",
    gap: 12,
  },
  botaoModalCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    alignItems: "center",
  },
  textoBotaoModalCancelar: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "NunitoSans_600SemiBold",
  },
  botaoModalConfirmar: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#111827",
    borderRadius: 12,
    alignItems: "center",
  },
  textoBotaoModalConfirmar: {
    fontSize: 16,
    color: "#FFFFFF",
    fontFamily: "NunitoSans_600SemiBold",
  },
});

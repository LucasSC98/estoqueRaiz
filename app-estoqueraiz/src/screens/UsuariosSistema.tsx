import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import api, { clearCache } from "../services/api";
import Toast from "react-native-toast-message";
import { Seletor } from "../components/Seletor";
import Header from "../components/Header";
import { ModalConfirmacao } from "../components/ModalConfirmacao";

type UsuariosSistemaScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  "UsuariosSistema"
>;

interface Usuario {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  status: "pendente" | "aprovado" | "rejeitado";
  cargo: "gerente" | "estoquista" | "financeiro" | null;
  unidade_id: number | null;
  unidade?: {
    id: number;
    nome: string;
  };
}

interface Unidade {
  id: number;
  nome: string;
}

export default function UsuariosSistema() {
  const navigation = useNavigation<UsuariosSistemaScreenProp>();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroUnidade, setFiltroUnidade] = useState<number | null>(null);
  const [filtroCargo, setFiltroCargo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");

  const [modalAprovacaoVisivel, setModalAprovacaoVisivel] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(
    null
  );
  const [cargoAprovacao, setCargoAprovacao] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [unidadeAprovacao, setUnidadeAprovacao] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  // Estados para modal de confirmação
  const [modalConfirmacaoVisivel, setModalConfirmacaoVisivel] = useState(false);
  const [usuarioParaRejeitar, setUsuarioParaRejeitar] =
    useState<Usuario | null>(null);
  const [carregandoRejeicao, setCarregandoRejeicao] = useState(false);

  const [modalAlterarCargoVisivel, setModalAlterarCargoVisivel] =
    useState(false);
  const [usuarioAlterarCargo, setUsuarioAlterarCargo] =
    useState<Usuario | null>(null);
  const [novoCargoSelecionado, setNovoCargoSelecionado] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      const timestamp = Date.now();
      const [responseUsuarios, responseUnidades] = await Promise.all([
        api.get(`/api/usuarios?_t=${timestamp}`),
        api.get("/api/unidades"),
      ]);

      setUsuarios(responseUsuarios.data);
      setUnidades(responseUnidades.data);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Não foi possível carregar os usuários",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setCarregando(false);
    }
  }

  const aplicarFiltros = useCallback(() => {
    let filtrados = [...usuarios];

    if (filtroUnidade) {
      filtrados = filtrados.filter(
        (usuario) => usuario.unidade_id === filtroUnidade
      );
    }

    if (filtroCargo) {
      filtrados = filtrados.filter((usuario) => usuario.cargo === filtroCargo);
    }

    if (filtroStatus) {
      filtrados = filtrados.filter(
        (usuario) => usuario.status === filtroStatus
      );
    } else {
      filtrados = filtrados.filter((usuario) => usuario.status !== "rejeitado");
    }

    setUsuariosFiltrados(filtrados);
  }, [usuarios, filtroUnidade, filtroCargo, filtroStatus]);

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  function limparFiltros() {
    setFiltroUnidade(null);
    setFiltroCargo("");
    setFiltroStatus("");
  }

  function abrirModalAlterarCargo(usuario: Usuario) {
    setUsuarioAlterarCargo(usuario);
    setNovoCargoSelecionado({
      id: usuario.cargo || "",
      nome: formatarCargo(usuario.cargo),
    });
    setModalAlterarCargoVisivel(true);
  }

  async function alterarCargo() {
    if (!usuarioAlterarCargo || !novoCargoSelecionado) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Selecione um cargo",
      });
      return;
    }

    if (novoCargoSelecionado.id === usuarioAlterarCargo.cargo) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "O cargo selecionado é o mesmo atual",
      });
      return;
    }

    try {
      await api.put(`/api/usuarios/${usuarioAlterarCargo.id}/alterar-cargo`, {
        cargo: novoCargoSelecionado.id,
      });

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: `Cargo alterado para ${novoCargoSelecionado.nome}`,
      });

      clearCache();
      setModalAlterarCargoVisivel(false);
      setUsuarioAlterarCargo(null);
      setNovoCargoSelecionado(null);
      carregarDados();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: error.response?.data?.message || "Erro ao alterar cargo",
      });
    }
  }

  function formatarCargo(cargo: string | null) {
    if (!cargo) return "Não definido";
    return cargo.charAt(0).toUpperCase() + cargo.slice(1);
  }

  function abrirModalAprovacao(usuario: Usuario) {
    setUsuarioSelecionado(usuario);
    setCargoAprovacao(null);
    setUnidadeAprovacao(null);
    setModalAprovacaoVisivel(true);
  }

  async function aprovarUsuario() {
    if (!usuarioSelecionado || !cargoAprovacao || !unidadeAprovacao) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: "Cargo e unidade são obrigatórios",
      });
      return;
    }

    try {
      await api.patch(`/api/usuarios/${usuarioSelecionado.id}/aprovar`, {
        cargo: cargoAprovacao.id,
        unidade_id: Number(unidadeAprovacao.id),
      });

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Usuário aprovado com sucesso",
      });

      clearCache();
      setModalAprovacaoVisivel(false);
      setUsuarioSelecionado(null);
      setCargoAprovacao(null);
      setUnidadeAprovacao(null);
      carregarDados();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: error.response?.data?.message || "Erro ao aprovar usuário",
      });
    }
  }

  async function rejeitarUsuario(usuario: Usuario) {
    setUsuarioParaRejeitar(usuario);
    setModalConfirmacaoVisivel(true);
  }

  async function confirmarRejeicao() {
    if (!usuarioParaRejeitar) return;

    setCarregandoRejeicao(true);
    try {
      await api.patch(`/api/usuarios/${usuarioParaRejeitar.id}/rejeitar`);

      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Usuário rejeitado",
      });

      clearCache();
      setModalConfirmacaoVisivel(false);
      setUsuarioParaRejeitar(null);
      carregarDados();
    } catch (error: any) {
      console.error("Erro ao rejeitar usuário:", error);
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: error.response?.data?.message || "Erro ao rejeitar usuário",
      });
    } finally {
      setCarregandoRejeicao(false);
    }
  }

  function cancelarRejeicao() {
    setModalConfirmacaoVisivel(false);
    setUsuarioParaRejeitar(null);
    setCarregandoRejeicao(false);
  }

  const opcoesCargo = [
    { id: "", nome: "Todos" },
    { id: "gerente", nome: "Gerente" },
    { id: "estoquista", nome: "Estoquista" },
    { id: "financeiro", nome: "Financeiro" },
  ];

  const opcoesCargoAprovacao = [
    { id: "estoquista", nome: "Estoquista" },
    { id: "financeiro", nome: "Financeiro" },
  ];

  const opcoesCargoAlteracao = [
    { id: "gerente", nome: "Gerente" },
    { id: "estoquista", nome: "Estoquista" },
    { id: "financeiro", nome: "Financeiro" },
  ];

  const opcoesStatus = [
    { id: "", nome: "Todos" },
    { id: "pendente", nome: "Pendente" },
    { id: "aprovado", nome: "Aprovado" },
    { id: "rejeitado", nome: "Rejeitado" },
  ];

  const opcoesUnidade = [
    { id: "", nome: "Todas" },
    ...unidades.map((unidade) => ({
      id: unidade.id.toString(),
      nome: unidade.nome,
    })),
  ];

  if (carregando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        titulo="Usuários do Sistema"
        onPressVoltar={() => navigation.goBack()}
      />

      <View style={styles.filtrosContainer}>
        <View style={styles.filtroRow}>
          <View style={styles.filtroItem}>
            <Seletor
              rotulo="Unidade"
              placeholder="Todas"
              valor={
                filtroUnidade
                  ? {
                      id: filtroUnidade.toString(),
                      nome:
                        unidades.find((u) => u.id === filtroUnidade)?.nome ||
                        "Unidade não encontrada",
                    }
                  : { id: "", nome: "Todas" }
              }
              opcoes={opcoesUnidade}
              aoMudarValor={(value) => {
                const id = value?.id;
                if (id === "") {
                  setFiltroUnidade(null);
                } else if (typeof id === "string") {
                  const numId = parseInt(id, 10);
                  setFiltroUnidade(isNaN(numId) ? null : numId);
                } else {
                  setFiltroUnidade(null);
                }
              }}
              pesquisavel
              rotuloAcessibilidade="Selecionar filtro de unidade"
            />
          </View>

          <View style={styles.filtroItem}>
            <Seletor
              rotulo="Cargo"
              placeholder="Todos"
              valor={
                filtroCargo
                  ? {
                      id: filtroCargo,
                      nome:
                        opcoesCargo.find((c) => c.id === filtroCargo)?.nome ||
                        "",
                    }
                  : { id: "", nome: "Todos" }
              }
              opcoes={opcoesCargo}
              aoMudarValor={(value) =>
                setFiltroCargo(typeof value?.id === "string" ? value.id : "")
              }
              pesquisavel
              rotuloAcessibilidade="Selecionar filtro de cargo"
            />
          </View>

          <View style={styles.filtroItem}>
            <Seletor
              rotulo="Status"
              placeholder="Todos"
              valor={
                filtroStatus
                  ? {
                      id: filtroStatus,
                      nome:
                        opcoesStatus.find((s) => s.id === filtroStatus)?.nome ||
                        "",
                    }
                  : { id: "", nome: "Todos" }
              }
              opcoes={opcoesStatus}
              aoMudarValor={(value) =>
                setFiltroStatus(typeof value?.id === "string" ? value.id : "")
              }
              pesquisavel
              rotuloAcessibilidade="Selecionar filtro de status"
            />
          </View>

          <TouchableOpacity
            style={styles.limparFiltros}
            onPress={limparFiltros}
          >
            <MaterialIcons name="clear" size={16} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.listaContainer}>
        {usuariosFiltrados.length === 0 ? (
          <View style={styles.vazio}>
            <MaterialIcons name="person-off" size={48} color="#ccc" />
            <Text style={styles.vazioTexto}>Nenhum usuário encontrado</Text>
          </View>
        ) : (
          usuariosFiltrados.map((usuario) => (
            <View key={usuario.id} style={styles.usuarioCard}>
              <View style={styles.usuarioHeader}>
                <View style={styles.usuarioInfo}>
                  <Text style={styles.usuarioNome}>{usuario.nome}</Text>
                  <Text style={styles.usuarioEmail}>{usuario.email}</Text>
                  <Text style={styles.usuarioUnidade}>
                    Unidade: {usuario.unidade?.nome || "Não definida"}
                  </Text>
                  <View style={styles.cargoContainer}>
                    <Text style={styles.usuarioCargo}>
                      Cargo: {formatarCargo(usuario.cargo)}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusContainer}>
                  <Text
                    style={[
                      styles.statusText,
                      usuario.status === "pendente" && styles.statusPendente,
                      usuario.status === "aprovado" && styles.statusAprovado,
                      usuario.status === "rejeitado" && styles.statusRejeitado,
                    ]}
                  >
                    {usuario.status}
                  </Text>
                  {usuario.status === "aprovado" && (
                    <TouchableOpacity
                      style={styles.botaoAlterarCargoSutil}
                      onPress={() => abrirModalAlterarCargo(usuario)}
                    >
                      <MaterialIcons name="edit" size={14} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {usuario.status === "pendente" && (
                <View style={styles.botoesAcao}>
                  <TouchableOpacity
                    style={[styles.botaoAcao, styles.botaoAprovar]}
                    onPress={() => abrirModalAprovacao(usuario)}
                  >
                    <MaterialIcons name="check" size={16} color="#fff" />
                    <Text style={styles.textoBotao}>Aprovar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.botaoAcao, styles.botaoRejeitar]}
                    onPress={() => rejeitarUsuario(usuario)}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                    <Text style={styles.textoBotao}>Rejeitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalAprovacaoVisivel}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Aprovar Usuário</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalAprovacaoVisivel(false);
                  setUsuarioSelecionado(null);
                  setCargoAprovacao(null);
                  setUnidadeAprovacao(null);
                }}
                style={styles.botaoFechar}
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalConteudo}>
              {usuarioSelecionado && (
                <>
                  <View style={styles.infoUsuario}>
                    <Text style={styles.modalDescricao}>
                      {usuarioSelecionado.nome}
                    </Text>
                    <Text style={styles.modalEmail}>
                      {usuarioSelecionado.email}
                    </Text>
                  </View>

                  <View style={styles.modalCampo}>
                    <Text style={styles.modalLabel}>Cargo:</Text>
                    <Seletor
                      rotulo=""
                      valor={cargoAprovacao}
                      aoMudarValor={(valor) => setCargoAprovacao(valor as any)}
                      placeholder="Selecione o cargo"
                      opcoes={opcoesCargoAprovacao}
                    />
                  </View>

                  <View style={styles.modalCampo}>
                    <Text style={styles.modalLabel}>Unidade:</Text>
                    <Seletor
                      rotulo=""
                      valor={unidadeAprovacao}
                      aoMudarValor={(valor) =>
                        setUnidadeAprovacao(valor as any)
                      }
                      placeholder="Selecione a unidade"
                      opcoes={unidades.map((unidade) => ({
                        id: unidade.id.toString(),
                        nome: unidade.nome,
                      }))}
                    />
                  </View>

                  <View style={styles.modalBotoes}>
                    <TouchableOpacity
                      style={[styles.modalBotao, styles.modalBotaoCancelar]}
                      onPress={() => {
                        setModalAprovacaoVisivel(false);
                        setUsuarioSelecionado(null);
                        setCargoAprovacao(null);
                        setUnidadeAprovacao(null);
                      }}
                    >
                      <Text style={styles.modalBotaoTextoCancelar}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBotao, styles.modalBotaoAprovar]}
                      onPress={() => aprovarUsuario()}
                      disabled={!cargoAprovacao || !unidadeAprovacao}
                    >
                      <Text style={styles.modalBotaoTextoAprovar}>Aprovar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={modalAlterarCargoVisivel}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Alterar Cargo</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalAlterarCargoVisivel(false);
                  setUsuarioAlterarCargo(null);
                  setNovoCargoSelecionado(null);
                }}
                style={styles.botaoFechar}
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalConteudo}>
              {usuarioAlterarCargo && (
                <>
                  <View style={styles.infoUsuario}>
                    <Text style={styles.modalDescricao}>
                      {usuarioAlterarCargo.nome}
                    </Text>
                    <Text style={styles.modalEmail}>
                      {usuarioAlterarCargo.email}
                    </Text>
                    <Text style={styles.cargoAtual}>
                      Cargo atual: {formatarCargo(usuarioAlterarCargo.cargo)}
                    </Text>
                  </View>

                  <View style={styles.modalCampo}>
                    <Text style={styles.modalLabel}>Novo cargo:</Text>
                    <Seletor
                      rotulo=""
                      valor={novoCargoSelecionado}
                      aoMudarValor={(valor) =>
                        setNovoCargoSelecionado(valor as any)
                      }
                      placeholder="Selecione o novo cargo"
                      opcoes={opcoesCargoAlteracao}
                    />
                  </View>

                  <View style={styles.modalBotoes}>
                    <TouchableOpacity
                      style={[styles.modalBotao, styles.modalBotaoCancelar]}
                      onPress={() => {
                        setModalAlterarCargoVisivel(false);
                        setUsuarioAlterarCargo(null);
                        setNovoCargoSelecionado(null);
                      }}
                    >
                      <Text style={styles.modalBotaoTextoCancelar}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBotao, styles.modalBotaoAprovar]}
                      onPress={() => alterarCargo()}
                      disabled={
                        !novoCargoSelecionado ||
                        novoCargoSelecionado.id === usuarioAlterarCargo.cargo
                      }
                    >
                      <Text style={styles.modalBotaoTextoAprovar}>Alterar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação */}
      <ModalConfirmacao
        visivel={modalConfirmacaoVisivel}
        titulo="Confirmar Rejeição"
        mensagem={
          usuarioParaRejeitar
            ? `Deseja realmente rejeitar o usuário ${usuarioParaRejeitar.nome}?`
            : ""
        }
        textoBotaoConfirmar="Rejeitar"
        textoBotaoCancelar="Cancelar"
        corBotaoConfirmar="#ef4444"
        iconeBotaoConfirmar="person-remove"
        onConfirmar={confirmarRejeicao}
        onCancelar={cancelarRejeicao}
        carregando={carregandoRejeicao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  filtrosContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  filtroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filtroItem: {
    flex: 1,
    marginHorizontal: 3,
    minWidth: 80,
  },
  limparFiltros: {
    backgroundColor: "#f0fdf4",
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#d1fae5",
    alignSelf: "center",
  },
  listaContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  usuarioCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  usuarioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNome: {
    fontSize: 15,
    fontFamily: "NunitoSans_700Bold",
    color: "#1e293b",
    marginBottom: 3,
  },
  usuarioEmail: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },
  usuarioUnidade: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 1,
  },
  usuarioCargo: {
    fontSize: 12,
    color: "#94a3b8",
  },
  cargoContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  botaoAlterarCargoSutil: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 4,
  },
  statusContainer: {
    alignItems: "flex-end" as const,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "NunitoSans_600SemiBold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: "uppercase",
  },
  statusPendente: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  statusAprovado: {
    backgroundColor: "#d1fae5",
    color: "#059669",
  },
  statusRejeitado: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  vazio: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  vazioTexto: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 16,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  botoesAcao: {
    flexDirection: "row" as const,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  botaoAcao: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  botaoAprovar: {
    backgroundColor: "#4CAF50",
  },
  botaoRejeitar: {
    backgroundColor: "#f44336",
  },
  textoBotao: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1a202c",
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f7fafc",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalConteudo: {
    padding: 20,
  },
  infoUsuario: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalDescricao: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#2d3748",
    marginBottom: 2,
  },
  modalEmail: {
    fontSize: 13,
    color: "#718096",
  },
  modalCampo: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#4a5568",
    marginBottom: 6,
  },
  modalBotoes: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 8,
  },
  modalBotao: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalBotaoCancelar: {
    backgroundColor: "#e2e8f0",
    borderWidth: 1,
    borderColor: "#cbd5e0",
  },
  modalBotaoAprovar: {
    backgroundColor: "#48bb78",
    shadowColor: "#48bb78",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cargoAtual: {
    fontSize: 13,
    color: "#059669",
    marginTop: 4,
    fontFamily: "NunitoSans_600SemiBold",
  },
  modalBotaoTextoCancelar: {
    color: "#4a5568",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  modalBotaoTextoAprovar: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
});

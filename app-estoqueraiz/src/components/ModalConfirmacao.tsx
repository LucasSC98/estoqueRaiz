import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface ModalConfirmacaoProps {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  textoBotaoConfirmar?: string;
  textoBotaoCancelar?: string;
  corBotaoConfirmar?: string;
  iconeBotaoConfirmar?: keyof typeof MaterialIcons.glyphMap;
  onConfirmar: () => void;
  onCancelar: () => void;
  carregando?: boolean;
}

export const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = ({
  visivel,
  titulo,
  mensagem,
  textoBotaoConfirmar = "Confirmar",
  textoBotaoCancelar = "Cancelar",
  corBotaoConfirmar = "#ef4444",
  iconeBotaoConfirmar = "warning",
  onConfirmar,
  onCancelar,
  carregando = false,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visivel}
      onRequestClose={onCancelar}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Ícone */}
          <View
            style={[
              styles.iconeContainer,
              { backgroundColor: `${corBotaoConfirmar}15` },
            ]}
          >
            <MaterialIcons
              name={iconeBotaoConfirmar}
              size={32}
              color={corBotaoConfirmar}
            />
          </View>

          {/* Título */}
          <Text style={styles.titulo}>{titulo}</Text>

          {/* Mensagem */}
          <Text style={styles.mensagem}>{mensagem}</Text>

          {/* Botões */}
          <View style={styles.botoesContainer}>
            <TouchableOpacity
              style={[styles.botao, styles.botaoCancelar]}
              onPress={onCancelar}
              disabled={carregando}
            >
              <Text style={styles.textoBotaoCancelar}>
                {textoBotaoCancelar}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botao,
                styles.botaoConfirmar,
                { backgroundColor: corBotaoConfirmar },
                carregando && styles.botaoDesabilitado,
              ]}
              onPress={onConfirmar}
              disabled={carregando}
            >
              <Text style={styles.textoBotaoConfirmar}>
                {carregando ? "Aguarde..." : textoBotaoConfirmar}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  iconeContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  titulo: {
    fontSize: 20,
    fontFamily: "NunitoSans_700Bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  mensagem: {
    fontSize: 16,
    fontFamily: "NunitoSans_400Regular",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  botoesContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  botao: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  botaoCancelar: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  botaoConfirmar: {
    backgroundColor: "#ef4444",
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotaoCancelar: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    color: "#64748b",
  },
  textoBotaoConfirmar: {
    fontSize: 16,
    fontFamily: "NunitoSans_600SemiBold",
    color: "#fff",
  },
});

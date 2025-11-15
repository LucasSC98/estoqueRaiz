import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  mostrarBotaoVoltar?: boolean;
  rotaVoltar?: keyof RootStackParamList;
  botaoDireita?: React.ReactNode;
  onPressVoltar?: () => void;
}

type HeaderNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Header({
  titulo,
  subtitulo,
  mostrarBotaoVoltar = true,
  rotaVoltar = "Dashboard",
  botaoDireita,
  onPressVoltar,
}: HeaderProps) {
  const navigation = useNavigation<HeaderNavigationProp>();

  const handleVoltar = () => {
    if (onPressVoltar) {
      onPressVoltar();
    } else {
      navigation.navigate(rotaVoltar);
    }
  };

  return (
    <View style={styles.header}>
      {mostrarBotaoVoltar ? (
        <TouchableOpacity
          style={styles.botaoVoltar}
          onPress={handleVoltar}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ) : (
        <View style={styles.espacoVazio} />
      )}

      <View style={styles.headerTextos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
      </View>

      {botaoDireita ? (
        <View style={styles.botaoDireita}>{botaoDireita}</View>
      ) : (
        <View style={styles.espacoVazio} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  headerTextos: {
    flex: 1,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "NunitoSans_700Bold",
  },
  subtitulo: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    fontFamily: "NunitoSans_400Regular",
  },
  espacoVazio: {
    width: 40, // Mesmo tamanho do botão voltar para centralizar
  },
  botaoDireita: {
    width: 40,
    alignItems: "center",
  },
});

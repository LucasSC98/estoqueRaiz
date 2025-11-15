import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

interface CurvaABCCardProps {
  dados: {
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
  } | null;
  carregando: boolean;
}

export default function CurvaABCCard({ dados, carregando }: CurvaABCCardProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (carregando) {
    return (
      <View style={estilos.container}>
        <View style={estilos.header}>
          <MaterialIcons name="analytics" size={20} color="#059669" />
          <Text style={estilos.titulo}>Análise Curva ABC</Text>
        </View>
        <Text style={estilos.carregando}>Carregando dados...</Text>
      </View>
    );
  }

  if (!dados) {
    return (
      <View style={estilos.container}>
        <View style={estilos.header}>
          <MaterialIcons name="analytics" size={20} color="#059669" />
          <Text style={estilos.titulo}>Análise Curva ABC</Text>
        </View>
        <Text style={estilos.semDados}>Nenhum produto com estoque baixo</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={estilos.container}
      onPress={() => navigation.navigate("RelatorioCurvaABC")}
      activeOpacity={0.8}
    >
      <View style={estilos.header}>
        <MaterialIcons name="analytics" size={20} color="#059669" />
        <Text style={estilos.titulo}>Análise Curva ABC</Text>
        <MaterialIcons name="chevron-right" size={16} color="#059669" />
      </View>

      <Text style={estilos.subtitulo}>
        {dados.totalProdutos} produtos classificados
      </Text>

      <View style={estilos.graficoContainer}>
        <View style={estilos.graficoCircular}>
          <Text style={estilos.numeroTotal}>{dados.totalProdutos}</Text>
          <Text style={estilos.labelTotal}>ITENS</Text>
        </View>

        <View style={estilos.legendaContainer}>
          <View style={estilos.itemLegenda}>
            <View
              style={[estilos.indicadorCor, { backgroundColor: "#059669" }]}
            />
            <Text style={estilos.classeTexto}>Classe A</Text>
            <Text style={estilos.percentualTexto}>
              {dados.classeA.percentual.toFixed(1)}%
            </Text>
          </View>

          <View style={estilos.itemLegenda}>
            <View
              style={[estilos.indicadorCor, { backgroundColor: "#f59e0b" }]}
            />
            <Text style={estilos.classeTexto}>Classe B</Text>
            <Text style={estilos.percentualTexto}>
              {dados.classeB.percentual.toFixed(1)}%
            </Text>
          </View>

          <View style={estilos.itemLegenda}>
            <View
              style={[estilos.indicadorCor, { backgroundColor: "#ef4444" }]}
            />
            <Text style={estilos.classeTexto}>Classe C</Text>
            <Text style={estilos.percentualTexto}>
              {dados.classeC.percentual.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  titulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 12,
    letterSpacing: 0.3,
    flex: 1,
  },
  subtitulo: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
  },
  graficoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  graficoCircular: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ef4444",
  },
  numeroTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ef4444",
  },
  labelTotal: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
  },
  legendaContainer: {
    flex: 1,
    gap: 8,
  },
  itemLegenda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicadorCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  classeTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  percentualTexto: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
    minWidth: 35,
    textAlign: "right",
  },
  carregando: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    paddingVertical: 20,
  },
  semDados: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
    paddingVertical: 20,
  },
});

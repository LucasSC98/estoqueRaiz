import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Cadastro from "./src/screens/Cadastro";
import Home from "./src/screens/Home";
import Login from "./src/screens/Login";
import Dashboard from "./src/screens/Dashboard";
import CadastroProduto from "./src/screens/CadastroProduto";
import CadastroCategoria from "./src/screens/CadastroCategorias";
import CadastroUnidade from "./src/screens/CadastroUnidades";
import ListaProdutos from "./src/screens/ListaProdutos";
import MapaUnidades from "./src/screens/MapaUnidades";
import Movimentacoes from "./src/screens/Movimentacoes";
import CadastroMovimentacao from "./src/screens/CadastroMovimentacao";
import UsuariosSistema from "./src/screens/UsuariosSistema";
import Financeiro from "./src/screens/Financeiro";
import RelatorioCurvaABC from "./src/screens/RelatorioCurvaABC";
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/config/toastConfig.jsx";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CadastroUnidade"
            component={CadastroUnidade}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CadastroCategoria"
            component={CadastroCategoria}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Cadastro"
            component={Cadastro}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={Home}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CadastroProduto"
            component={CadastroProduto}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Dashboard"
            component={Dashboard}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ListaProdutos"
            component={ListaProdutos}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MapaUnidades"
            component={MapaUnidades}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Movimentacoes"
            component={Movimentacoes}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CadastroMovimentacao"
            component={CadastroMovimentacao}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="UsuariosSistema"
            component={UsuariosSistema}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Financeiro"
            component={Financeiro}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RelatorioCurvaABC"
            component={RelatorioCurvaABC}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={toastConfig} />
    </>
  );
}

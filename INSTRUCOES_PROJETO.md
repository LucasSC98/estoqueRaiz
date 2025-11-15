# 📋 INSTRUÇÕES DO PROJETO WMS - ESTOQUE RAIZ

## � **SOBRE A EMPRESA - AGROLÓGICA AGROMERCANTIL**

### **Perfil da Empresa:**

- **Nome:** Agrológica Agromercantil
- **CEO:** Antônio Botelho
- **Localização:** Lucas do Rio Verde - MT
- **Setor:** Agronegócio - Insumos Agrícolas
- **Website:** https://www.agrologica.com.br/

### **Área de Atuação:**

- **Produtos:** Fertilizantes, Defensivos Agrícolas, Sementes, Insumos
- **Clientes:** Produtores rurais de soja, milho e outras commodities
- **Mercado:** Mato Grosso (líder nacional em produção agrícola)
- **Diferencial:** Tecnologia aplicada ao agronegócio para aumento de produtividade

### **Valores Empresariais:**

- ✅ **Compromisso com o Cliente:** Soluções diferenciadas que impulsionam negócios
- ✅ **Confiança nas Relações:** Transparência, honestidade e respeito mútuo
- ✅ **Resultado para Todos:** Crescimento sustentável para todos os envolvidos
- ✅ **Agilidade com Simplicidade:** Entrega eficaz e prática de valor

### **Estrutura Operacional:**

- **7 Unidades Horizontais** (estoques independentes)
- **ERP Atual:** AGROTITAN (VIASOFT)
- **Necessidade:** Sistema WMS próprio para controle detalhado de estoque
- **Meta:** Dobrar participação no mercado através de tecnologia

---

## �🎯 **OBJETIVO DO PROJETO**

Criar um sistema WMS (Warehouse Management System) gratuito para gestão das 7 unidades de estoque da Agrológica, substituindo a necessidade de ferramentas WMS pagas e integrando com o ERP AGROTITAN existente.

### **Necessidades Específicas:**

- ✅ Controle de **insumos agrícolas** (fertilizantes, defensivos, sementes)
- ✅ Gestão de **7 estoques horizontais** independentes
- ✅ Rastreabilidade de **lotes e validades** (produtos agrícolas)
- ✅ Controle de **movimentação** entre unidades
- ✅ **Curva ABC** para análise de giro de produtos
- ✅ Integração com **ERP AGROTITAN** para sincronização
- ✅ Relatórios gerenciais para **tomada de decisão**

---

## 🏗️ **ARQUITETURA DO PROJETO**

### **Backend (API Node.js + TypeScript + Sequelize)**

- **Localização:** `api-estoqueraiz/`
- **Tecnologias:** Node.js, Express, TypeScript, Sequelize, PostgreSQL/MySQL
- **Padrão:** MVC (Model-View-Controller)

### **Frontend (React Native + Expo)**

- **Localização:** `estoqueraiz-app/`
- **Tecnologias:** React Native, Expo CLI, TypeScript
- **Padrão:** Component-based Architecture

---

## 📋 **REGRAS DE DESENVOLVIMENTO**

### **🔧 BACKEND - API**

#### **1. Estrutura de Pastas (OBRIGATÓRIA)**

```
api-estoqueraiz/
├── src/
│   ├── config/         # Configurações (database, jwt, etc.)
│   ├── controllers/    # Lógica de negócio
│   ├── models/         # Modelos do banco (Sequelize)
│   ├── routes/         # Rotas da API
│   ├── middleware/     # Middlewares (auth, validação)
│   ├── utils/          # Funções utilitárias
│   └── index.ts        # Arquivo principal
├── package.json
└── tsconfig.json
```

#### **2. Nomenclatura de Arquivos**

- **Controllers:** `NomeController.ts` (ex: `ProdutosController.ts`)
- **Models:** `NomeModel.ts` (ex: `ProdutosModel.ts`)
- **Routes:** `rotaNome.ts` (ex: `rotaProdutos.ts`)
- **Sempre em PascalCase para classes e camelCase para funções**

#### **3. Padrão de Controllers**

```typescript
// Exemplo: ProdutosController.ts
import { Request, Response } from "express";
import NomeModel from "../models/NomeModel";
import sequelize from "../config/database";

export async function criarItem(req: Request, res: Response) {
  const transaction = await sequelize.transaction();

  try {
    // Validações
    // Lógica de negócio
    // Commit da transação
    await transaction.commit();
    return res.status(201).json({ message: "Sucesso", data });
  } catch (error: unknown) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Erro ao criar item",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
```

#### **4. Padrão de Models**

```typescript
// Exemplo: ProdutoModel.ts
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

class Produto extends Model {
  public id!: number;
  public nome!: string;
  // ... outros campos
}

Produto.init(
  {
    // Definição dos campos
  },
  {
    sequelize,
    modelName: "Produto",
    tableName: "produtos",
    timestamps: true,
    createdAt: "criado_em",
    updatedAt: "atualizado_em",
  }
);

// Relacionamentos
export default Produto;
```

#### **5. Padrão de Rotas**

```typescript
// Exemplo: rotaProdutos.ts
import { Router } from "express";
import {
  buscarTodos,
  buscarPorId,
  criar,
  atualizar,
  deletar,
} from "../controllers/ProdutosController";

const router = Router();

/**
 * @swagger
 * documentação aqui
 */
router.get("/", buscarTodos);
router.get("/:id", buscarPorId);
router.post("/", criar);
router.put("/:id", atualizar);
router.delete("/:id", deletar);

export default router;
```

### **📱 FRONTEND - REACT NATIVE**

#### **1. Estrutura de Pastas (OBRIGATÓRIA)**

```
estoqueraiz-app/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── screens/        # Telas da aplicação
│   ├── services/       # APIs e serviços externos
│   ├── constants/      # Constantes (cores, tamanhos)
│   ├── types/          # Tipos TypeScript
│   ├── assets/         # Imagens, fontes
│   └── hooks/          # Custom hooks
├── App.tsx
└── package.json
```

#### **2. Nomenclatura de Arquivos**

- **Screens:** `NomeTela.tsx` (ex: `CadastroProduto.tsx`)
- **Components:** `NomeComponente.tsx` (ex: `Input.tsx`)
- **Services:** `nomeService.tsx` (ex: `api.tsx`)
- **Sempre em PascalCase para componentes**

#### **3. Padrão de Screens**

```typescript
// Exemplo: CadastroProduto.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import api from "../services/api";
import Toast from "react-native-toast-message";

export default function CadastroProduto() {
  const [loading, setLoading] = useState(false);

  async function salvarProduto() {
    setLoading(true);
    try {
      // Lógica da função
      Toast.show({
        type: "success",
        text1: "Sucesso",
        text2: "Produto cadastrado com sucesso",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Erro",
        text2: error.response?.data?.message || "Erro interno",
      });
    } finally {
      setLoading(false);
    }
  }

  return <View style={styles.container}>{/* JSX aqui */}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
});
```

#### **4. Padrão de Componentes**

```typescript
// Exemplo: Input.tsx
import React from "react";
import { TextInput, StyleSheet, TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export function Input({
  placeholder,
  value,
  onChangeText,
  ...rest
}: InputProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
});
```

---

## 🎨 **PADRÕES DE DESIGN E UX**

### **1. Cores Padrão (constants/Colors.ts)**

```typescript
export const Colors = {
  primary: "#2196F3",
  secondary: "#4CAF50",
  danger: "#F44336",
  warning: "#FF9800",
  success: "#4CAF50",
  background: "#f5f5f5",
  surface: "#ffffff",
  text: "#333333",
  textSecondary: "#666666",
};
```

### **2. Estilos Consistentes**

- **Padding padrão:** 20px
- **Border radius:** 12px
- **Elevação de cards:** 2-4
- **Font sizes:** 14, 16, 18, 20, 24
- **Gaps entre elementos:** 8, 12, 16, 20

### **3. Componentes de Feedback**

- **Toast para notificações**
- **Loading states em todas as operações**
- **Confirmações para ações críticas**
- **Estados vazios com instruções**

---

## 🔄 **FLUXO DE DESENVOLVIMENTO**

### **1. Para Nova Funcionalidade:**

#### **Backend:**

1. Criar/atualizar Model se necessário
2. Implementar Controller com validações
3. Criar/atualizar rotas
4. Adicionar documentação Swagger
5. Testar endpoints

#### **Frontend:**

1. Criar/atualizar tipos TypeScript
2. Implementar tela/componente
3. Integrar com API
4. Adicionar tratamento de erros
5. Testar fluxo completo

### **2. Checklist Antes de Commit:**

- [ ] Código sem erros TypeScript
- [ ] Tratamento de erro implementado
- [ ] Loading states adicionados
- [ ] Responsividade testada
- [ ] API endpoints documentados
- [ ] Transações de banco implementadas

---

## 🗃️ **ESTRUTURA DO BANCO DE DADOS**

### **Tabelas Principais:**

1. **usuarios** - Controle de acesso
2. **unidades** - 7 unidades da empresa
3. **categorias** - Classificação de produtos
4. **produtos** - Itens do estoque
5. **movimentacoes** - Histórico de entrada/saída
6. **inventarios** - Contagens físicas (futuro)

### **Relacionamentos:**

```
usuarios (1:N) produtos
unidades (1:N) produtos
categorias (1:N) produtos
produtos (1:N) movimentacoes
usuarios (1:N) movimentacoes
```

---

## 📊 **FUNCIONALIDADES IMPLEMENTADAS**

### ✅ **Concluídas:**

- [x] Autenticação de usuários
- [x] CRUD de categorias
- [x] CRUD de unidades
- [x] CRUD de produtos
- [x] Dashboard básico
- [x] Listagem de produtos
- [x] Modelo de movimentações

### 🔄 **Em Desenvolvimento:**

- [ ] Controller de movimentações
- [ ] Tela de movimentação
- [ ] Relatórios básicos

### 📋 **Próximas (Prioridade Alta):**

- [ ] Sistema de transferência entre unidades
- [ ] Relatório de curva ABC
- [ ] Sistema de inventário físico
- [ ] Integração com código de barras
- [ ] Alertas automáticos (estoque baixo)
- [ ] Sincronização com ERP AGROTITAN

---

## 🚀 **COMANDOS PARA DESENVOLVIMENTO**

### **Backend (api-estoqueraiz/):**

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar migrações
npx sequelize-cli db:migrate

# Criar nova migração
npx sequelize-cli migration:generate --name nome-da-migracao
```

### **Frontend (estoqueraiz-app/):**

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm start

# Build para Android
npx expo run:android

# Build para iOS
npx expo run:ios

# Limpar cache
npx expo start --clear
```

---

## 🔒 **SEGURANÇA E BOAS PRÁTICAS**

### **Backend:**

- Sempre usar transações para operações críticas
- Validar todos os inputs
- Usar middleware de autenticação
- Log de todas as operações importantes
- Tratamento de erro padronizado

### **Frontend:**

- Validação de formulários
- Estados de loading
- Tratamento de erros da API
- Armazenamento seguro de tokens
- Feedback visual para usuário

### **Banco de Dados:**

- Soft delete (campo 'ativo')
- Timestamps em todas as tabelas
- Relacionamentos com chaves estrangeiras
- Índices em campos de busca frequente

---

## 📝 **DOCUMENTAÇÃO OBRIGATÓRIA**

### **Swagger (Backend):**

- Documentar todos os endpoints
- Incluir exemplos de request/response
- Especificar códigos de status
- Documentar parâmetros obrigatórios

### **README.md:**

- Instruções de instalação
- Configuração do ambiente
- Estrutura do projeto
- Como contribuir

---

## ⚠️ **REGRAS CRÍTICAS - NÃO QUEBRAR**

1. **NUNCA** deletar dados, sempre usar soft delete (`ativo: false`)
2. **SEMPRE** usar transações para operações de estoque
3. **SEMPRE** validar estoque antes de permitir saída
4. **SEMPRE** registrar quem fez a operação (`usuario_id`)
5. **SEMPRE** tratar erros no frontend e backend
6. **NUNCA** fazer operações diretas no banco, sempre via API
7. **SEMPRE** manter consistência entre unidades (sem estoque negativo)

---

## 📞 **CONTATOS E RECURSOS**

- **Desenvolvedor:** Lucas SC
- **Repositório:** meu-app-projeto-modulo7
- **Branch Principal:** feature/nova-dashboard
- **ERP Atual:** AGROTITAN (VIASOFT)
- **Objetivo:** Substituir WMS pago por solução própria

---

## 📅 **ROADMAP**

### **Setembro 2025:**

- [ ] Finalizar sistema de movimentações
- [ ] Implementar relatórios básicos
- [ ] Testes de usabilidade

### **Outubro 2025:**

- [ ] Sistema de inventário
- [ ] Integração com código de barras
- [ ] Curva ABC automática

### **Novembro 2025:**

- [ ] Integração com ERP AGROTITAN
- [ ] Sistema de alertas
- [ ] Deploy em produção

---

**💡 LEMBRE-SE:** Este sistema substituirá um WMS comercial para 7 unidades. Mantenha a qualidade, performance e confiabilidade como prioridades máximas!

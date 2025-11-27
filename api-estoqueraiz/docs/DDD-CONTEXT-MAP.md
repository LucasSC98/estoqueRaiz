# Domain-Driven Design - Context Map e Bounded Contexts

## 1. Context Map

Mapeamento dos domínios e suas relações no sistema Estoque Raiz.

![Domain-Driven Design - Bounded Contexts](https://i.imgur.com/sr7QNfl.png)

**Visão Geral do Context Map:**

O diagrama acima representa a arquitetura estratégica do sistema utilizando Domain-Driven Design (DDD), dividido em três categorias de domínios:

### Core Domain - Gestão de Estoque

Representa o diferencial competitivo do negócio, onde concentramos o maior investimento em qualidade e expertise:

- **Produtos Context**: Catálogo de produtos agrícolas com aprovações e controle de estoque
- **Movimentações Context**: Registro de entradas, saídas, transferências e ajustes de estoque
- **Relatórios Context**: Análises estratégicas, Curva ABC e consolidação de dados

### Supporting Domains

Domínios necessários para o funcionamento do sistema, mas que não representam diferencial competitivo:

- **Usuários Context**: Gestão de perfis, cargos e permissões
- **Unidades Context**: Gerenciamento das 7 unidades físicas de estoque
- **Categorias Context**: Hierarquia e organização de produtos

### Generic Subdomain

Funcionalidades genéricas que podem usar soluções prontas ou terceirizadas:

- **Autenticação Context**: Login, sessões e controle de acesso via JWT

**Tipos de Relacionamentos:**

- **Linhas sólidas**: Dependências fortes (uso direto de dados)
- **Linhas tracejadas**: Consultas read-only (queries analíticas)

---

## 2. Domínios Identificados

### 2.1 Core Domain - Gestão de Estoque

**Subdomínios:**

#### A. Produtos Context (Core)

- Responsável pelo catálogo de produtos agrícolas
- Gerencia preços, imagens e status de aprovação
- Controla estoque mínimo e alertas

#### B. Movimentações Context (Core)

- Registra todas as operações de estoque
- Tipos: ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE
- Garante integridade das quantidades

#### C. Relatórios Context (Core)

- Curva ABC para análise de giro
- Estatísticas gerais do sistema
- Produtos com estoque baixo e vencendo

### 2.2 Supporting Domains

#### D. Usuários Context (Supporting)

- Gerenciamento de usuários do sistema
- Cargos: Gerente, Estoquista, Financeiro
- Aprovação de cadastros

#### E. Unidades Context (Supporting)

- Gerenciamento das 7 unidades físicas
- Endereços e geolocalização
- Apenas gerentes podem gerenciar

#### F. Categorias Context (Supporting)

- Organização de produtos por categorias
- Fertilizantes, Defensivos, Sementes, etc.

### 2.3 Generic Subdomain

#### G. Autenticação Context (Generic)

- Login e gestão de tokens JWT
- Validação de credenciais
- Controle de sessão

---

## 3. Bounded Contexts Detalhados

### 3.1 Produtos Context

**Linguagem Ubíqua:**

- Produto
- Categoria
- Unidade
- Preço de Custo
- Preço de Venda
- Status do Produto (pendente/aprovado)
- Estoque Mínimo
- Data de Validade
- Imagem do Produto

**Responsabilidades:**

- Criar produtos (estoquista ou gerente)
- Aprovar preços (financeiro ou gerente)
- Atualizar informações de produtos
- Controlar estoque mínimo
- Gerenciar imagens via Multer

**Relacionamentos:**

- **Upstream**: Categorias Context, Unidades Context
- **Downstream**: Movimentações Context, Relatórios Context

**Regras de Negócio:**

1. Produto criado inicia com status pendente
2. Apenas financeiro ou gerente pode aprovar preços
3. Estoquista só pode criar produtos da sua unidade
4. Imagem limitada a 5MB e formatos jpg, png, gif, webp
5. Produto com estoque < estoque_minimo gera alerta

**Eventos Publicados:**

- `PRODUTO_CRIADO`
- `PRODUTO_APROVADO`
- `PRODUTO_ATUALIZADO`
- `PRODUTO_DELETADO`

---

### 3.2 Movimentações Context

**Linguagem Ubíqua:**

- Movimentação
- Tipo de Movimentação (ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE)
- Quantidade
- Documento
- Observação
- Unidade Origem
- Unidade Destino

**Responsabilidades:**

- Registrar entradas de estoque
- Registrar saídas (com validação de estoque)
- Transferir produtos entre unidades
- Ajustar quantidades (correção manual)
- Rastrear usuário e data da operação

**Relacionamentos:**

- **Upstream**: Produtos Context, Unidades Context, Usuários Context
- **Downstream**: Relatórios Context

**Regras de Negócio:**

1. **ENTRADA**: aumenta quantidade no estoque
2. **SAIDA**: valida estoque suficiente antes de reduzir
3. **TRANSFERENCIA**: origem diferente de destino, transação atômica
4. **AJUSTE**: define quantidade exata no estoque
5. Estoquista só pode movimentar produtos da sua unidade
6. Gerente pode movimentar em qualquer unidade

**Eventos Publicados:**

- `MOVIMENTACAO_CRIADA`
- `MOVIMENTACAO_DELETADA`

**Impactos:**

- Invalida cache de produtos
- Invalida cache de relatórios

---

### 3.3 Relatórios Context

**Linguagem Ubíqua:**

- Curva ABC
- Classe A (80% do valor)
- Classe B (15% do valor)
- Classe C (5% do valor)
- Estatísticas Gerais
- Produto com Estoque Baixo
- Produto Vencendo

**Responsabilidades:**

- Gerar Curva ABC baseada em movimentações
- Consolidar estatísticas por unidade
- Identificar produtos críticos
- Análise de giro de produtos

**Relacionamentos:**

- **Upstream**: Produtos Context, Movimentações Context, Unidades Context

**Regras de Negócio:**

1. Curva ABC calculada com base em saídas
2. Classe A representa produtos com maior giro
3. Estoque baixo quando quantidade < estoque_minimo
4. Produto vencendo nos próximos 30 dias
5. Dados cacheados por 30 minutos
6. Cache invalidado ao receber eventos de `MOVIMENTACAO_CRIADA`

**Eventos Assinados:**

- `MOVIMENTACAO_CRIADA`
- `PRODUTO_CRIADO`
- `PRODUTO_ATUALIZADO`

---

### 3.4 Usuários Context

**Linguagem Ubíqua:**

- Usuário
- Cargo (gerente, estoquista, financeiro)
- Status (pendente, aprovado, rejeitado)
- Unidade Vinculada

**Responsabilidades:**

- Cadastro de usuários
- Aprovação por gerente
- Alteração de cargos
- Vinculação com unidade

**Relacionamentos:**

- **Downstream**: Movimentações Context, Produtos Context

**Regras de Negócio:**

1. Usuário criado inicia com status pendente
2. Apenas gerente pode aprovar usuários
3. Gerente não pode remover próprio cargo
4. Estoquista e financeiro vinculados a uma unidade
5. Gerente tem acesso a todas as unidades

**Eventos Publicados:**

- `USUARIO_CRIADO`
- `USUARIO_APROVADO`
- `USUARIO_REJEITADO`

---

### 3.5 Unidades Context

**Linguagem Ubíqua:**

- Unidade
- Endereço Completo
- Geolocalização (latitude, longitude)
- CEP

**Responsabilidades:**

- Gerenciar 7 unidades físicas de estoque
- Endereçamento e geolocalização
- Validação de CEP via ViaCEP

**Relacionamentos:**

- **Downstream**: Produtos Context, Movimentações Context, Usuários Context

**Regras de Negócio:**

1. Apenas gerente pode criar/editar unidades
2. Endereço obrigatório e validado
3. Integração com ViaCEP para autocompletar

**Eventos Publicados:**

- `UNIDADE_CRIADA`
- `UNIDADE_ATUALIZADA`

---

### 3.6 Categorias Context

**Linguagem Ubíqua:**

- Categoria
- Descrição

**Responsabilidades:**

- Organizar produtos por categorias
- Hierarquia: Fertilizantes, Defensivos, Sementes

**Relacionamentos:**

- **Downstream**: Produtos Context

**Regras de Negócio:**

1. Apenas gerente pode gerenciar categorias
2. Nome único obrigatório

**Eventos Publicados:**

- `CATEGORIA_CRIADA`
- `CATEGORIA_ATUALIZADA`

---

### 3.7 Autenticação Context

**Linguagem Ubíqua:**

- Token JWT
- Credenciais
- Sessão

**Responsabilidades:**

- Autenticar usuários
- Gerar tokens JWT
- Validar credenciais

**Relacionamentos:**

- **Upstream**: Usuários Context

**Regras de Negócio:**

1. Token expira em 24 horas
2. Apenas usuários aprovados podem logar
3. Token inclui cargo e unidade_id

**Eventos Publicados:**

- `LOGIN_REALIZADO`
- `LOGIN_FALHOU`

---

## 4. Tipos de Relacionamento Entre Contextos

### Partnership (Parceria)

Nenhum relacionamento de parceria identificado. Cada contexto opera de forma independente via eventos.

### Shared Kernel (Núcleo Compartilhado)

- **Shared Module** [`shared/`](../shared/): Código compartilhado entre todos os contextos
  - Config (database, redis)
  - Eventos (publicador, assinante)
  - Utils (cache, logger, metrics, healthCheck)

### Customer-Supplier (Cliente-Fornecedor)

- **Movimentações Context** depende de **Produtos Context**
- **Movimentações Context** depende de **Unidades Context**
- **Relatórios Context** depende de **Movimentações Context**
- **Relatórios Context** depende de **Produtos Context**

### Conformist (Conformista)

- **Autenticação Context** conforma com **Usuários Context**

### Anticorruption Layer (Camada Anticorrupção)

- **ERP AGROTITAN** (sistema externo) será integrado via camada anticorrupção futura

### Open Host Service (Serviço Aberto)

- Todos os contextos expõem APIs REST via Nginx Gateway

### Published Language (Linguagem Publicada)

- **Redis Pub/Sub**: Linguagem de eventos comum entre contextos
- **EventosTipo** [`shared/eventos/publicador.ts`](../shared/eventos/publicador.ts): Enum com 11 tipos de eventos

---

## 5. Resumo do Context Map

| Contexto          | Tipo       | Relacionamentos Upstream     | Relacionamentos Downstream        |
| ----------------- | ---------- | ---------------------------- | --------------------------------- |
| **Produtos**      | Core       | Categorias, Unidades         | Movimentações, Relatórios         |
| **Movimentações** | Core       | Produtos, Unidades, Usuários | Relatórios                        |
| **Relatórios**    | Core       | Produtos, Movimentações      | -                                 |
| **Usuários**      | Supporting | -                            | Movimentações, Produtos           |
| **Unidades**      | Supporting | -                            | Produtos, Movimentações, Usuários |
| **Categorias**    | Supporting | -                            | Produtos                          |
| **Autenticação**  | Generic    | Usuários                     | -                                 |

---

## 6. Padrões Estratégicos Aplicados

### Event-Driven Architecture

Todos os contextos core utilizam eventos para comunicação assíncrona via Redis Pub/Sub.

**Fluxo de Eventos:**

```
Movimentações Service → publica MOVIMENTACAO_CRIADA
    ↓
Redis Pub/Sub (canal: eventos)
    ↓
Relatórios Service → assina evento → invalida cache
    ↓
Produtos Service → assina evento → invalida cache
```

### CQRS (Command Query Responsibility Segregation)

- **Command Side**: Movimentações e Produtos (operações de escrita)
- **Query Side**: Relatórios Context (somente leitura, otimizado para consultas)

### Eventual Consistency

Cache invalidado via eventos, garantindo consistência eventual entre contextos.

- **TTL**: 10-30 minutos dependendo do contexto
- **Invalidação**: Via eventos assíncronos

### API Gateway Pattern

Nginx atua como gateway único, roteando requisições para contextos específicos.

- **Porta 80**: Ponto único de entrada
- **Rate Limiting**: 100 req/s geral, 10 req/s para auth
- **Cache HTTP**: 3-10 minutos por endpoint

---

## 7. Integração com Sistemas Externos

### ViaCEP

- **Tipo**: Open Host Service
- **Função**: Consumo de API pública para validação de CEP
- **Implementação**: [`unidades-service/src/utils/buscarCep.ts`](../unidades-service/src/utils/buscarCep.ts)
- **Uso**: Autocompletar endereços ao cadastrar unidades

---

## 8. Padrões de Integração DDD

### Shared Kernel

**Movimentações <-> Produtos**

- Compartilham definições de eventos
- Interface comum para comunicação

### Customer/Supplier

**Movimentações -> Unidades**

- Movimentações é cliente (customer)
- Unidades é fornecedor (supplier)
- Contrato bem definido via API

### Conformist

**Auth -> Usuários**

- Auth se conforma ao modelo de Usuários
- Sem camada de tradução

### Anti-Corruption Layer

**Relatórios -> Todos os Contextos**

- Relatórios usa ACL para proteger seu modelo
- Transforma dados externos para linguagem interna
- Previne poluição do domínio

---

## 9. Arquivo de Diagrama

Para edição do diagrama no Draw.io:

- [DDD Bounded Contexts (XML)](./ddd-bounded-contexts-diagram.drawio)

---

## 10. Decisões Arquiteturais Relacionadas

Veja também:

- [`ADR-002 - Arquitetura de Microserviços.md`](./ADR-002%20-%20Arquitetura%20de%20Microserviços.md)
- [`DIAGRAMAS-C4.md`](./DIAGRAMAS-C4.md)
- [`SLOs-SLIs.md`](./SLOs-SLIs.md)
- [`RESILIENCIA-E-OBSERVABILIDADE.md`](./RESILIENCIA-E-OBSERVABILIDADE.md)

---

## 11. Glossário DDD

### Bounded Context

Limite explícito dentro do qual um modelo de domínio é definido e aplicável. Cada contexto tem sua própria linguagem ubíqua.

### Ubiquitous Language

Linguagem comum compartilhada entre desenvolvedores e especialistas do domínio, usada no código e nas conversas.

### Core Domain

Parte do sistema que representa o diferencial competitivo do negócio e justifica o investimento em software customizado.

### Supporting Subdomain

Domínio necessário para o funcionamento do sistema, mas que não representa diferencial competitivo.

### Generic Subdomain

Funcionalidade genérica que pode ser resolvida com soluções prontas ou terceirizadas.

### Context Map

Diagrama que mostra os bounded contexts e seus relacionamentos, ajudando a visualizar a arquitetura estratégica.

### Anti-Corruption Layer (ACL)

Camada que traduz entre dois modelos diferentes, protegendo um contexto de mudanças em outro.

### Published Language

Linguagem bem documentada e estável usada para comunicação entre contextos (ex: eventos, APIs).

### Open Host Service

Serviço que define um protocolo ou interface aberta para comunicação com outros contextos.

### Customer/Supplier

Relacionamento onde um contexto (supplier) atende às necessidades de outro (customer).

### Conformist

Relacionamento onde um contexto se conforma ao modelo de outro sem tradução.

### Shared Kernel

Subconjunto do modelo que é compartilhado entre dois ou mais contextos.

---

**Última atualização**: 2025-11-23  
**Autor**: Lucas SC (@LucasSC98)  
**Versão**: 2.0

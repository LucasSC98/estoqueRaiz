# Diagramas C4 - Arquitetura do Sistema Estoque Raiz

## 1. Diagrama de Contexto

Visão macro do sistema e suas interações com usuários e sistemas externos.

![Diagrama de Contexto - Sistema Estoque Raiz](https://i.imgur.com/DfehJKT.png)

**Descrição:**

- **Gerente**: Administrador do sistema com acesso total a todas as unidades e funcionalidades
- **Estoquista**: Operador que registra movimentações e produtos apenas da sua unidade
- **Financeiro**: Analista que aprova produtos e visualiza relatórios financeiros
- **Estoque Raiz WMS**: Sistema de gestão de armazém para controle de 7 unidades de estoque de insumos agrícolas
- **Serviço SMTP**: Provedor de email para notificações e recuperação de senha

**Integrações:**

- Gerente → Estoque Raiz: Gerencia usuários, aprova cadastros, audita movimentações (HTTPS/REST)
- Estoquista → Estoque Raiz: Registra movimentações, cadastra produtos (HTTPS/REST)
- Financeiro → Estoque Raiz: Aprova custos de produtos, consulta relatórios (HTTPS/REST)
- Estoque Raiz → SMTP: Envia notificações por email (SMTP)

---

## 2. Diagrama de Containers

Detalhamento da arquitetura de microserviços, infraestrutura e fluxo de dados.

![Diagrama de Containers - Arquitetura de Microserviços](https://i.imgur.com/3HdQWC0.png)

**Componentes Principais:**

### Camada de Gateway

- **API Gateway (Nginx)**: Proxy reverso com rate limiting, cache HTTP e load balancing

### Camada de Microserviços

- **Auth Service**: Autenticação JWT, login e controle de sessão
- **Usuarios Service**: Cadastro de usuários, aprovação e gestão de cargos
- **Unidades Service**: Gerenciamento das 7 unidades físicas de estoque
- **Categorias Service**: Organização de produtos por categorias
- **Produtos Service**: Catálogo de produtos, preços, imagens e aprovações
- **Movimentações Service**: Registro de entradas, saídas, transferências e ajustes
- **Relatórios Service**: Curva ABC, estatísticas e consolidação de dados

### Camada de Dados

- **PostgreSQL**: Dados de usuários, produtos, movimentações e unidades
- **Redis**: Cache distribuído (5-30min TTL) e mensageria assíncrona entre serviços

### Camada de Observabilidade

- **Prometheus**: Coleta de métricas (HTTP requests, cache hit rate, latency)
- **Grafana**: Visualização de métricas e alertas

---

## 3. Descrição dos Componentes

### 3.1 API Gateway (Nginx)

**Porta:** 80  
**Responsabilidades:**

- Proxy reverso para 7 microserviços
- Rate limiting: 100 req/s geral, 10 req/s para auth
- Cache HTTP: 3-10 minutos por endpoint
- Load balancing entre instâncias

### 3.2 Auth Service

**Porta:** 3001  
**Responsabilidades:**

- Login com JWT (expiração: 24h)
- Validação de credenciais
- Eventos: LOGIN_REALIZADO, LOGIN_FALHOU

### 3.3 Usuarios Service

**Porta:** 3002  
**Responsabilidades:**

- Cadastro de usuários (status: pendente)
- Aprovação/rejeição por gerente
- Alteração de cargos (gerente, estoquista, financeiro)
- Eventos: USUARIO_CRIADO, USUARIO_APROVADO, USUARIO_REJEITADO

### 3.4 Unidades Service

**Porta:** 3003  
**Responsabilidades:**

- CRUD das 7 unidades físicas
- Validação de endereço e CEP
- Apenas gerente pode criar/editar

### 3.5 Categorias Service

**Porta:** 3004  
**Responsabilidades:**

- Organização de produtos por categorias
- Hierarquia: Fertilizantes, Defensivos, Sementes
- Apenas gerente pode gerenciar

### 3.6 Produtos Service

**Porta:** 3005  
**Responsabilidades:**

- Catálogo de produtos agrícolas
- Upload de imagens (Multer, máx 5MB)
- Aprovação de preços por financeiro
- Controle de estoque mínimo
- Eventos: PRODUTO_CRIADO, PRODUTO_APROVADO, PRODUTO_ATUALIZADO
- Cache: TTL 10 minutos

### 3.7 Movimentações Service

**Porta:** 3006  
**Responsabilidades:**

- Registro de movimentações (ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE)
- Validação de estoque suficiente
- Transações atômicas
- Eventos: MOVIMENTACAO_CRIADA
- Invalida cache de produtos e relatórios

### 3.8 Relatórios Service

**Porta:** 3007  
**Responsabilidades:**

- Curva ABC de produtos
- Estatísticas gerais por unidade
- Cache: TTL 30 minutos
- Assina eventos: MOVIMENTACAO_CRIADA, PRODUTO_CRIADO

---

## 4. Fluxo de Dados

### 4.1 Cache Distribuído

**Padrão:** Cache-Aside  
**TTL por Namespace:**

- `produtos`: 600s (10 min)
- `relatorios`: 1800s (30 min)
- `estatisticas`: 900s (15 min)

### 4.2 Mensageria (Redis Pub/Sub)

**Eventos Publicados:**

1. `USUARIO_CRIADO`, `USUARIO_APROVADO`, `USUARIO_REJEITADO`
2. `LOGIN_REALIZADO`, `LOGIN_FALHOU`
3. `UNIDADE_CRIADA`
4. `CATEGORIA_CRIADA`
5. `PRODUTO_CRIADO`, `PRODUTO_APROVADO`, `PRODUTO_ATUALIZADO`
6. `MOVIMENTACAO_CRIADA`

**Fluxo de Invalidação:**

```
Movimentações Service publica MOVIMENTACAO_CRIADA
    ↓
Relatórios Service recebe evento → Invalida cache
    ↓
Produtos Service recebe evento → Invalida cache
```

---

## 5. Segurança

### 5.1 Autenticação

- JWT com expiração de 24h
- Token inclui: `id`, `email`, `cargo`, `unidade_id`

### 5.2 Autorização (RBAC)

**Matriz de Permissões:**

| Cargo          | Permissões                                          |
| -------------- | --------------------------------------------------- |
| **Gerente**    | Acesso total a todas as unidades                    |
| **Financeiro** | Aprovar produtos, relatórios (apenas sua unidade)   |
| **Estoquista** | Criar produtos e movimentações (apenas sua unidade) |

---

## 6. Observabilidade

### 6.1 Logs (Winston)

- Formato JSON estruturado
- Níveis: `info`, `warn`, `error`

### 6.2 Métricas (Prometheus)

- `http_requests_total`
- `http_request_duration_seconds`
- `cache_hits_total`, `cache_misses_total`

### 6.3 Dashboards (Grafana)

- Performance HTTP
- Cache Hit Rate
- Erros e Alertas

---

## 7. Referências

- **ADR-001**: Escolha do PostgreSQL
- **ADR-002**: Arquitetura de Microserviços
- **SLOs-SLIs**: Objetivos de desempenho
- **RESILIENCIA-E-OBSERVABILIDADE**: Estratégias de resiliência

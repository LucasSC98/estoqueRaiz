# Arquitetura de Microserviços - Sistema Estoque Raiz

Sistema WMS (Warehouse Management System) para gestão de 7 unidades de estoque de insumos agrícolas da Agrológica Agromercantil.

## Visão Geral

Arquitetura baseada em microserviços com comunicação assíncrona via eventos, cache distribuído e API Gateway centralizado.

## Estrutura do Projeto

```
api-estoqueraiz/
├── docker-compose.yml
├── .env
├── shared/
│   ├── config/
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── eventos/
│   │   ├── publicador.ts
│   │   └── assinante.ts
│   ├── utils/
│   │   ├── cache.ts
│   │   ├── circuitBreaker.ts
│   │   ├── retry.ts
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   ├── healthCheck.ts
│   │   └── tratamentoErros.ts
│   └── types/
│       └── index.ts
├── auth-service/
│   ├── Dockerfile
│   └── src/
│       ├── index.ts
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── dto/
│       └── utils/
├── usuarios-service/
├── unidades-service/
├── categorias-service/
├── produtos-service/
│   ├── uploads/
│   └── src/
│       └── utils/
│           └── uploadImagem.ts
├── movimentacoes-service/
├── relatorios-service/
├── nginx/
│   └── nginx.conf
├── redis/
│   └── redis.conf
├── prometheus/
│   ├── prometheus.yml
│   └── alerts.yml
├── grafana/
│   ├── datasources/
│   └── dashboards/
└── docs/
    ├── README.md
    ├── ADR-001-escolha-postgresql.md
    ├── ADR-002 - Arquitetura de Microserviços.md
    ├── DDD-CONTEXT-MAP.md
    ├── DDD-TACTICAL-DESIGN.md
    ├── DIAGRAMAS-C4.md
    ├── AUTENTICACAO-AUTORIZACAO.md
    ├── THREAT-MODEL.md
    ├── CHECKLIST-SEGURANCA.md
    ├── SLOs-SLIs.md
    ├── ESTRATEGIAS-RESILIENCIA.md
    ├── PLANO-OBSERVABILIDADE.md
    ├── RESILIENCIA-E-OBSERVABILIDADE.md
    ├── ESTRATEGIA-DEPLOY.md
    ├── runbook-incidentes.md
    ├── COMANDOS-UTEIS.md
    └── openapi-spec.yaml
```

## Microserviços

### 1. Auth Service (Porta 3001)

Responsável por autenticação e controle de sessão.

**Funcionalidades:**

- Login com JWT (expiração: 24h)
- Validação de credenciais
- Publicação de eventos de login

**Endpoints:**

- POST /api/auth/login
- GET /health
- GET /metrics

**Eventos Publicados:**

- LOGIN_REALIZADO
- LOGIN_FALHOU

### 2. Usuarios Service (Porta 3002)

Gerenciamento completo de usuários do sistema.

**Funcionalidades:**

- Cadastro de usuários (status inicial: pendente)
- Aprovação/rejeição por gerente
- Alteração de cargos (gerente, estoquista, financeiro)
- Envio de emails transacionais
- Validação: gerente não pode remover próprio cargo

**Endpoints:**

- POST /api/usuarios (criar conta)
- GET /api/usuarios (listar - autenticação obrigatória)
- GET /api/usuarios/pendentes (apenas gerente)
- PATCH /api/usuarios/:id/aprovar (apenas gerente)
- PATCH /api/usuarios/:id/rejeitar (apenas gerente)
- PUT /api/usuarios/:id/alterar-cargo (apenas gerente)
- DELETE /api/usuarios/:id (apenas gerente)

**Eventos Publicados:**

- USUARIO_CRIADO
- USUARIO_APROVADO
- USUARIO_REJEITADO

**Eventos Assinados:**

- LOGIN_REALIZADO
- LOGIN_FALHOU

### 3. Unidades Service (Porta 3003)

Gerenciamento das 7 unidades físicas de estoque.

**Funcionalidades:**

- CRUD de unidades
- Validação de endereço via ViaCEP
- Geolocalização (latitude, longitude)
- Apenas gerente pode gerenciar

**Endpoints:**

- GET /api/unidades
- GET /api/unidades/:id
- POST /api/unidades (apenas gerente)
- PUT /api/unidades/:id (apenas gerente)
- DELETE /api/unidades/:id (apenas gerente)

**Eventos Publicados:**

- UNIDADE_CRIADA
- UNIDADE_ATUALIZADA
- UNIDADE_DELETADA

### 4. Categorias Service (Porta 3004)

Organização de produtos por categorias.

**Funcionalidades:**

- CRUD de categorias
- Hierarquia: Fertilizantes, Defensivos, Sementes, etc.
- Apenas gerente pode gerenciar

**Endpoints:**

- GET /api/categorias
- GET /api/categorias/:id
- POST /api/categorias (apenas gerente)
- PUT /api/categorias/:id (apenas gerente)
- DELETE /api/categorias/:id (apenas gerente)

**Eventos Publicados:**

- CATEGORIA_CRIADA
- CATEGORIA_ATUALIZADA
- CATEGORIA_DELETADA

### 5. Produtos Service (Porta 3005)

Catálogo completo de produtos agrícolas.

**Funcionalidades:**

- CRUD de produtos
- Upload de imagens (Multer, máximo 5MB)
- Formatos aceitos: jpg, jpeg, png, gif, webp
- Aprovação de preços por financeiro
- Controle de estoque mínimo
- Validação de acesso por unidade
- Cache de 5-10 minutos

**Fluxo de Aprovação:**

1. Estoquista cria produto (statusProduto: pendente)
2. Financeiro aprova preços (statusProduto: aprovado)
3. Produto disponível no sistema

**Endpoints:**

- GET /api/produtos
- GET /api/produtos/:id
- POST /api/produtos (estoquista ou gerente)
- PUT /api/produtos/:id (estoquista ou gerente)
- PATCH /api/produtos/:id/aprovar (financeiro ou gerente)
- DELETE /api/produtos/:id (apenas gerente)

**Eventos Publicados:**

- PRODUTO_CRIADO
- PRODUTO_APROVADO
- PRODUTO_ATUALIZADO
- PRODUTO_DELETADO

**Eventos Assinados:**

- CATEGORIA_CRIADA
- UNIDADE_CRIADA

### 6. Movimentacoes Service (Porta 3006)

Registro de todas as operações de estoque.

**Funcionalidades:**

- Tipos: ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE
- Validação de estoque suficiente
- Transações atômicas
- Controle de acesso: estoquista só acessa sua unidade

**Regras de Negócio:**

- ENTRADA: aumenta quantidade no estoque
- SAIDA: valida estoque suficiente antes de reduzir
- TRANSFERENCIA: origem diferente de destino, transação atômica
- AJUSTE: define quantidade exata no estoque

**Endpoints:**

- GET /api/movimentacoes
- GET /api/movimentacoes/:id
- POST /api/movimentacoes (estoquista ou gerente)
- DELETE /api/movimentacoes/:id (apenas gerente)

**Eventos Publicados:**

- MOVIMENTACAO_CRIADA
- MOVIMENTACAO_DELETADA

**Eventos Assinados:**

- PRODUTO_CRIADO
- PRODUTO_ATUALIZADO

**Impactos:**

- Invalida cache de produtos
- Invalida cache de relatórios

### 7. Relatorios Service (Porta 3007)

Análises e consolidação de dados.

**Funcionalidades:**

- Curva ABC de produtos (A: 80% valor, B: 15%, C: 5%)
- Estatísticas gerais por unidade
- Movimentações por mês (últimos 6 meses)
- Produtos com estoque baixo
- Produtos vencendo (próximos 30 dias)
- Cache de 15-30 minutos

**Endpoints:**

- GET /api/relatorios/curva-abc
- GET /api/relatorios/estatisticas

**Eventos Assinados:**

- MOVIMENTACAO_CRIADA (invalida cache)
- PRODUTO_CRIADO (invalida cache)

## Infraestrutura

### API Gateway (Nginx - Porta 80)

**Funcionalidades:**

- Proxy reverso para 7 microserviços
- Rate limiting: 100 req/s geral, 10 req/s para auth
- Cache HTTP: 3-10 minutos por endpoint
- Load balancing entre instâncias
- Logs centralizados de acesso

**Rotas:**

```
/api/auth/*        -> auth-service:3001
/api/usuarios/*    -> usuarios-service:3002
/api/unidades/*    -> unidades-service:3003
/api/categorias/*  -> categorias-service:3004
/api/produtos/*    -> produtos-service:3005
/api/movimentacoes/* -> movimentacoes-service:3006
/api/relatorios/*  -> relatorios-service:3007
```

### PostgreSQL

**Banco de dados relacional compartilhado.**

**Tabelas principais:**

- usuarios
- unidades
- categorias
- produtos
- movimentacoes

**Configurações:**

- Pool de conexões: 20
- Timeout de query: 30s
- Logs de slow queries (>2s)

### Redis

**Cache distribuído e mensageria.**

**Uso como Cache:**

- Padrão: Cache-Aside
- TTL por namespace:
  - produtos: 600s (10 min)
  - relatorios: 1800s (30 min)
  - estatisticas: 900s (15 min)
  - unidades: 600s (10 min)

**Uso como Pub/Sub:**

- 11 tipos de eventos
- Comunicação assíncrona entre microserviços
- Invalidação automática de cache via eventos

### Prometheus (Porta 9090)

**Coleta de métricas de todos os serviços.**

**Métricas customizadas:**

- http_requests_total (counter)
- http_request_duration_seconds (histogram)
- cache_hits_total (counter)
- cache_misses_total (counter)
- active_connections (gauge)
- http_server_errors (counter)

**Alertas configurados:**

- CPU > 80% por 5 minutos
- Memória > 90% por 5 minutos
- Taxa de erro > 5% por 2 minutos
- Latência P95 > 2s por 5 minutos

### Grafana (Porta 3000)

**Visualização de métricas e dashboards.**

**Dashboards:**

1. Visão Geral de Serviços
2. Performance HTTP (latência, throughput)
3. Cache Hit Rate por Serviço
4. Erros e Alertas
5. Recursos de Infraestrutura (CPU, memória)

**Credenciais padrão:**

- Usuário: admin
- Senha: admin (alterar no primeiro acesso)

## Tecnologias

### Backend

- Node.js 18.x
- TypeScript 5.x
- Express 4.x
- Sequelize 6.x (ORM)
- JWT para autenticação
- Bcrypt para senhas

### Infraestrutura

- Docker 24.x
- Docker Compose 2.x
- Nginx 1.25.x
- PostgreSQL 15.x
- Redis 7.x
- Prometheus 2.x
- Grafana 10.x

### Observabilidade

- Winston (logs estruturados)
- Prometheus (métricas)
- Grafana (dashboards)

### Segurança

- JWT com expiração de 24h
- Bcrypt para hash de senhas
- RBAC (Role-Based Access Control)
- Rate limiting no Nginx
- Validação de entrada em todos os endpoints

## Como Executar

### Pré-requisitos

- Docker 24.x ou superior
- Docker Compose 2.x ou superior
- Node.js 18.x (para desenvolvimento local)

### Passo a Passo

1. Clonar repositório:

```bash
git clone <url-do-repositorio>
cd api-estoqueraiz
```

2. Configurar variáveis de ambiente:

```bash
cp .env.example .env
```

3. Editar arquivo .env:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:senha@postgres:5432/estoque_raiz
JWT_SECRET=uma_senha_boa_e_segura
REDIS_HOST=redis
REDIS_PORT=6379
EMAIL_SERVICE=gmail
EMAIL_USER=seu@email.com
EMAIL_PASS=sua_senha_app
```

4. Iniciar serviços:

```bash
docker-compose up -d
```

5. Verificar status:

```bash
docker-compose ps
```

6. Verificar logs:

```bash
docker-compose logs -f
```

7. Testar endpoints:

```bash
curl http://localhost/health
curl http://localhost/api/usuarios
```

8. Acessar interfaces:

- API: http://localhost
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

### Parar Serviços

```bash
docker-compose down
```

### Parar e remover volumes:

```bash
docker-compose down -v
```

## Health Checks

Todos os serviços expõem 3 endpoints de health check:

- GET /health - Status geral (database + redis + memory)
- GET /liveness - Container está vivo
- GET /readiness - Serviço está pronto para receber requisições

Exemplo:

```bash
curl http://localhost/api/auth/health
```

Resposta:

```json
{
  "status": "ok",
  "service": "auth-service",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:45.123Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "memory": "ok"
  }
}
```

## Segurança

### Autenticação e Autorização

Sistema baseado em JWT com 3 níveis de usuário:

**Cargos:**

1. Gerente: Acesso total ao sistema
2. Financeiro: Aprova produtos e visualiza relatórios
3. Estoquista: Registra movimentações e produtos

**Matriz de Permissões:**
| Recurso | Gerente | Financeiro | Estoquista |
|---------|---------|------------|------------|
| Aprovar usuários | Sim | Não | Não |
| Criar produto | Sim | Não | Sim |
| Aprovar produto | Sim | Sim | Não |
| Todas as unidades | Sim | Não | Não |
| Criar movimentação | Sim | Não | Sim |
| Deletar movimentação | Sim | Não | Não |

### Threat Model

Documento completo em: `docs/THREAT-MODEL.md`

**Principais ameaças mitigadas:**

- Injection attacks (SQL, NoSQL)
- Cross-Site Scripting (XSS)
- Broken Authentication
- Sensitive Data Exposure
- Broken Access Control

### Checklist de Segurança

Documento completo em: `docs/CHECKLIST-SEGURANCA.md`

**Itens implementados:**

- Senhas criptografadas com bcrypt
- JWT com expiração
- HTTPS obrigatório
- Rate limiting
- Validação de entrada
- CORS configurado
- Secrets em variáveis de ambiente

## Resiliência

### Estratégias Implementadas

Documento completo em: `docs/ESTRATEGIAS-RESILIENCIA.md`

**Padrões aplicados:**

1. Retry com Backoff Exponencial

   - 3 tentativas
   - Intervalo: 1s, 2s, 4s
   - Implementação: `shared/utils/retry.ts`

2. Circuit Breaker

   - Threshold: 5 falhas consecutivas
   - Timeout: 30 segundos
   - Implementação: `shared/utils/circuitBreaker.ts`

3. Timeout

   - Requisições HTTP: 8 segundos
   - Queries no banco: 30 segundos
   - Conexão Redis: 5 segundos

4. Graceful Shutdown
   - Aguarda requisições finalizarem
   - Fecha conexões ordenadamente
   - Timeout: 10 segundos

### SLOs e SLIs

Documento completo em: `docs/SLOs-SLIs.md`

**Objetivos de Nível de Serviço:**

**Desempenho:**

- Tempo de resposta APIs: < 500ms (P95)
- Tempo de resposta relatórios: < 2s (P95)
- Taxa de transferência: > 100 req/s por serviço

**Disponibilidade:**

- Uptime do sistema: 99,5% (mensal)
- Tempo máximo de downtime: 3,6 horas/mês
- Recovery Time Objective (RTO): < 5 minutos

**Confiabilidade:**

- Taxa de erro: < 1%
- Taxa de sucesso de transações: > 99%
- Perda de dados: 0% (backup diário)

## Observabilidade

### Logs

**Níveis:**

- info: Operações normais
- warn: Requisições lentas (>2s), cache miss
- error: Erros de aplicação, falhas em conexões

**Formato JSON:**

```json
{
  "timestamp": "2025-01-15 10:30:45",
  "level": "info",
  "message": "Evento PUBLICADO: produto:criado",
  "metadata": {
    "assinantes": 2,
    "servicoOrigem": "produtos-service"
  }
}
```

### Métricas

**Coleta via Prometheus:**

- HTTP requests total
- HTTP request duration
- Cache hit rate
- Cache miss rate
- Active connections
- Server errors

**Visualização via Grafana:**

- http://localhost:3000

### Alertas

**Configurados no Prometheus:**

- CPU alta
- Memória alta
- Taxa de erro elevada
- Latência alta

## Mensageria

### Eventos (Redis Pub/Sub)

**11 tipos de eventos:**

**Usuários:**

1. USUARIO_CRIADO
2. USUARIO_APROVADO
3. USUARIO_REJEITADO

**Autenticação:** 4. LOGIN_REALIZADO 5. LOGIN_FALHOU

**Unidades:** 6. UNIDADE_CRIADA

**Categorias:** 7. CATEGORIA_CRIADA

**Produtos:** 8. PRODUTO_CRIADO 9. PRODUTO_APROVADO 10. PRODUTO_ATUALIZADO

**Movimentações:** 11. MOVIMENTACAO_CRIADA

**Exemplo de fluxo:**

```
Movimentações Service publica MOVIMENTACAO_CRIADA
    ↓
Relatórios Service recebe evento
    ↓
Invalida cache de relatórios
    ↓
Produtos Service recebe evento
    ↓
Invalida cache de produtos
```

## Cache

### Estratégia Cache-Aside

**TTL por namespace:**
| Namespace | TTL | Uso |
|-----------|-----|-----|
| produtos | 600s | Lista e detalhes de produtos |
| relatorios | 1800s | Curva ABC e estatísticas |
| estatisticas | 900s | Dashboard e indicadores |
| unidades | 600s | Lista de unidades |

**Invalidação:**

- Automática via eventos Pub/Sub
- Manual via padrão wildcard

**Exemplo de código:**

```typescript
await cacheService.buscarOuExecutar(
  "produtos:lista",
  async () => await produtosService.listar(),
  { ttl: 600, namespace: "produtos" }
);
```

## Deploy

### Estratégia de Deploy

Documento completo em: `docs/ESTRATEGIA-DEPLOY.md`

**Estratégias suportadas:**

1. Recreate (Atual)

   - Derruba todos os containers
   - Sobe nova versão
   - Downtime: ~30 segundos

2. Rolling Update (Futuro)

   - Atualiza containers gradualmente
   - Zero downtime
   - Requer múltiplas instâncias

3. Blue-Green (Futuro)
   - Ambiente paralelo completo
   - Switch instantâneo
   - Rollback imediato

### Pipeline CI/CD

**Arquivo:** `.github/workflows/api-ci-cd.yml`

**Etapas:**

1. Build
2. Test
3. Security Scan
4. Deploy

**Triggers:**

- Push na branch main
- Pull requests
- Tags de release

## Runbook de Incidentes

Documento completo em: `docs/runbook-incidentes.md`

**Procedimentos para:**

1. Serviço não responde
2. Banco de dados lento
3. Redis indisponível
4. Alto uso de CPU
5. Alto uso de memória
6. Logs de erro elevados

**Exemplo de procedimento:**

**Sintoma:** Serviço não responde

**Diagnóstico:**

```bash
docker-compose ps
docker-compose logs -f <servico>
curl http://localhost/api/<servico>/health
```

**Ação:**

```bash
docker-compose restart <servico>
docker-compose logs -f <servico>
```

## Documentação Adicional

### Arquitetura

- `DIAGRAMAS-C4.md` - Diagramas de Contexto e Containers
- `DDD-CONTEXT-MAP.md` - Mapa de domínios e contextos
- `DDD-TACTICAL-DESIGN.md` - Entities, Value Objects, Aggregates
- `ADR-001-escolha-postgresql.md` - Decisão de banco de dados
- `ADR-002 - Arquitetura de Microserviços.md` - Decisão de arquitetura

### Segurança

- `THREAT-MODEL.md` - Análise de ameaças
- `AUTENTICACAO-AUTORIZACAO.md` - Sistema RBAC completo
- `CHECKLIST-SEGURANCA.md` - Lista de verificação

### Operações

- `SLOs-SLIs.md` - Objetivos de nível de serviço
- `ESTRATEGIAS-RESILIENCIA.md` - Retry, Circuit Breaker, Timeout
- `PLANO-OBSERVABILIDADE.md` - Plano de monitoramento
- `RESILIENCIA-E-OBSERVABILIDADE.md` - Implementação detalhada
- `ESTRATEGIA-DEPLOY.md` - Estratégias de implantação
- `runbook-incidentes.md` - Procedimentos operacionais

### APIs

- `openapi-spec.yaml` - Especificação OpenAPI completa dos 7 microserviços

### Utilitários

- `COMANDOS-UTEIS.md` - Comandos para desenvolvimento e operação

## Endpoints de Referência

### Auth Service

```bash
POST http://localhost/api/auth/login
Body: { "email": "usuario@email.com", "senha": "senha123" }
```

### Usuarios Service

```bash
GET http://localhost/api/usuarios
Headers: Authorization: Bearer <token>
```

### Produtos Service

```bash
GET http://localhost/api/produtos?unidade_id=1
Headers: Authorization: Bearer <token>
```

### Movimentacoes Service

```bash
POST http://localhost/api/movimentacoes
Headers: Authorization: Bearer <token>
Body: {
  "tipo": "ENTRADA",
  "quantidade": 100,
  "produto_id": 1,
  "unidade_destino_id": 1
}
```

### Relatorios Service

```bash
GET http://localhost/api/relatorios/curva-abc?unidade_id=1
Headers: Authorization: Bearer <token>
```

## Desenvolvimento Local

### Configuração do Ambiente

1. Instalar dependências em cada serviço:

```bash
cd auth-service && npm install
cd ../usuarios-service && npm install
# Repetir para todos os serviços
```

2. Executar serviço individualmente:

```bash
cd auth-service
npm run dev
```

3. Executar testes:

```bash
npm test
```

### Estrutura de um Microserviço

```
servico-nome/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # Ponto de entrada
    ├── controllers/          # Lógica de controle
    ├── services/             # Lógica de negócio
    ├── models/               # Modelos Sequelize
    ├── routes/               # Definição de rotas
    ├── dto/                  # Data Transfer Objects
    ├── middleware/           # Middlewares customizados
    └── utils/                # Funções utilitárias
```

### Padrões de Código

**Controllers:**

```typescript
export const criarItem = asyncHandler(async (req: Request, res: Response) => {
  const dados = req.body;
  const item = await service.criar(dados);
  res.status(201).json({ message: "Item criado", item });
});
```

**Services:**

```typescript
async criar(dados: CriarItemDTO): Promise<Item> {
  this.validar(dados);
  const item = await ItemModel.create(dados);
  await publicadorEventos.publicar(EventosTipo.ITEM_CRIADO, item);
  await cacheService.invalidarPorPadrao("*", "items");
  return item;
}
```

**Routes:**

```typescript
router.post("/", autenticacao, apenasGerente, criarItem);
router.get("/", autenticacao, listarItems);
```

## Troubleshooting

### Serviço não inicia

**Problema:** Container reiniciando constantemente

**Solução:**

```bash
docker-compose logs -f <servico>
docker-compose down
docker-compose up -d
```

### Erro de conexão com banco

**Problema:** Cannot connect to database

**Solução:**

```bash
docker-compose ps postgres
docker-compose restart postgres
```

### Cache não funciona

**Problema:** Redis não responde

**Solução:**

```bash
docker-compose ps redis
docker-compose restart redis
docker-compose exec redis redis-cli ping
```

### Métricas não aparecem

**Problema:** Prometheus não coleta métricas

**Solução:**

```bash
docker-compose ps prometheus
docker-compose restart prometheus
curl http://localhost:9090/targets
```

## Manutenção

### Backup do Banco de Dados

```bash
docker-compose exec postgres pg_dump -U postgres estoque_raiz > backup.sql
```

### Restaurar Backup

```bash
docker-compose exec -T postgres psql -U postgres estoque_raiz < backup.sql
```

### Limpar Cache

```bash
docker-compose exec redis redis-cli FLUSHALL
```

### Ver Estatísticas Redis

```bash
docker-compose exec redis redis-cli INFO
```

### Ver Logs de um Serviço Específico

```bash
docker-compose logs -f --tail=100 produtos-service
```

## Contato e Suporte

Desenvolvedor: Lucas SC
Repositório: api-estoqueraiz
Branch Principal: main
Empresa: Agrológica Agromercantil
Sistema Atual: AGROTITAN (VIASOFT)

## Licença

Propriedade da Agrológica Agromercantil - Uso Interno

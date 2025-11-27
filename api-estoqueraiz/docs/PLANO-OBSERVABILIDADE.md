# Plano de Observabilidade - Sistema Estoque Raiz

## Visao Geral

Este documento define quais metricas, logs e traces devem ser coletados para garantir observabilidade completa do sistema.

---

## 1. METRICAS A COLETAR

### 1.1 Metricas de Infraestrutura

#### Containers Docker

**CPU:**

```promql
rate(container_cpu_usage_seconds_total{name="auth-service"}[5m]) * 100
```

**Memoria:**

```promql
container_memory_usage_bytes{name="auth-service"}
```

**Rede:**

```promql
rate(container_network_receive_bytes_total{name="auth-service"}[5m])
rate(container_network_transmit_bytes_total{name="auth-service"}[5m])
```

**Disco:**

```promql
container_fs_usage_bytes{name="auth-service"}
```

#### Banco de Dados PostgreSQL

**Conexoes Ativas:**

```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

**Conexoes Totais:**

```sql
SELECT count(*) FROM pg_stat_activity;
```

**Tamanho do Banco:**

```sql
SELECT pg_database_size('estoqueraiz');
```

**Queries Lentas:**

```sql
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Deadlocks:**

```sql
SELECT deadlocks FROM pg_stat_database WHERE datname = 'estoqueraiz';
```

#### Redis Cache

**Memoria Usada:**

```bash
redis-cli INFO memory | grep used_memory_human
```

**Hit Rate:**

```bash
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses
```

**Conexoes:**

```bash
redis-cli INFO clients | grep connected_clients
```

**Keys Totais:**

```bash
redis-cli DBSIZE
```

### 1.2 Metricas de Aplicacao

#### HTTP Requests

**Total de Requisicoes:**

```typescript
httpRequestsTotal.inc({
  method: req.method,
  endpoint: req.route.path,
  status_code: res.statusCode,
  service: "auth-service",
});
```

**Duracao de Requisicoes:**

```typescript
const start = Date.now();
res.on("finish", () => {
  const duration = Date.now() - start;
  httpRequestDuration.observe(
    {
      method: req.method,
      endpoint: req.route.path,
      status_code: res.statusCode,
    },
    duration / 1000
  );
});
```

**Requisicoes Ativas:**

```typescript
activeRequests.inc();
res.on("finish", () => activeRequests.dec());
```

#### Business Metrics

**Logins por Minuto:**

```typescript
loginAttemptsTotal.inc({ success: true });
loginAttemptsTotal.inc({ success: false });
```

**Produtos Cadastrados:**

```typescript
produtosCriadosTotal.inc({ unidade_id: produto.unidade_id });
```

**Movimentacoes:**

```typescript
movimentacoesTotal.inc({
  tipo: movimentacao.tipo,
  unidade_id: movimentacao.unidade_id,
});
```

**Usuarios Ativos:**

```typescript
usuariosAtivosGauge.set(await Usuario.count({ where: { status: "aprovado" } }));
```

#### Erros e Exceptions

**Erros 4xx:**

```typescript
httpErrors.inc({
  status_code: 400,
  endpoint: req.route.path,
});
```

**Erros 5xx:**

```typescript
httpErrors.inc({
  status_code: 500,
  endpoint: req.route.path,
});
```

**Exceptions Nao Tratadas:**

```typescript
process.on("uncaughtException", (error) => {
  uncaughtExceptions.inc({ error: error.name });
  console.error("Uncaught Exception:", error);
});
```

### 1.3 Metricas de Resiliencia

**Circuit Breaker:**

```typescript
circuitBreakerState.set({ service: "produtos-service", state: "OPEN" }, 1);
circuitBreakerFailures.inc({ service: "produtos-service" });
```

**Retries:**

```typescript
retryAttemptsTotal.inc({ operation: "fetch-produtos", attempt: 3 });
```

**Timeouts:**

```typescript
timeoutsTotal.inc({ operation: "query-relatorio" });
```

**Cache:**

```typescript
cacheHitsTotal.inc({ key_pattern: "produtos:*" });
cacheMissesTotal.inc({ key_pattern: "produtos:*" });
```

---

## 2. LOGS A COLETAR

### 2.1 Estrutura de Log Padronizada

Formato JSON estruturado:

```json
{
  "timestamp": "2025-11-15T10:30:00.000Z",
  "level": "info",
  "service": "auth-service",
  "trace_id": "abc123xyz",
  "user_id": 10,
  "message": "Usuario autenticado com sucesso",
  "metadata": {
    "email": "usuario@agrologica.com.br",
    "ip": "192.168.1.100"
  }
}
```

### 2.2 Niveis de Log

**ERROR:**

- Erros criticos que impedem funcionamento
- Exceptions nao tratadas
- Falhas de banco de dados
- Servicos externos indisponiveis

**WARN:**

- Circuit breaker aberto
- Retry apos falha
- Operacoes proximas do limite
- Configuracoes deprecadas

**INFO:**

- Login/logout de usuarios
- Operacoes de negocio (movimentacoes)
- Deploy e inicializacao
- Metricas periodicas

**DEBUG:**

- Detalhes de requisicoes HTTP
- Queries SQL executadas
- Cache hits/misses
- Dados de debugging

### 2.3 Logs por Categoria

#### Autenticacao

```typescript
logger.info("Login attempt", {
  email: req.body.email,
  ip: req.ip,
  success: true,
});

logger.warn("Failed login attempt", {
  email: req.body.email,
  ip: req.ip,
  reason: "Invalid password",
});
```

#### Autorizacao

```typescript
logger.warn("Access denied", {
  user_id: req.usuario.id,
  cargo: req.usuario.cargo,
  endpoint: req.route.path,
  reason: "Insufficient privileges",
});
```

#### Movimentacoes

```typescript
logger.info("Stock movement created", {
  user_id: req.usuario.id,
  produto_id: movimentacao.produto_id,
  tipo: movimentacao.tipo,
  quantidade: movimentacao.quantidade,
  unidade_id: movimentacao.unidade_id,
});
```

#### Erros de Sistema

```typescript
logger.error("Database connection failed", {
  error: error.message,
  stack: error.stack,
  retry_attempt: 3,
});
```

#### Performance

```typescript
logger.warn("Slow query detected", {
  query: "SELECT * FROM produtos",
  duration_ms: 2500,
  threshold_ms: 1000,
});
```

### 2.4 Logs Proibidos

Nunca logar:

- Senhas (hasheadas ou nao)
- Tokens JWT completos
- Numeros de cartao de credito
- Dados pessoais sensiveis (CPF completo)
- Secrets e API keys

Exemplo correto:

```typescript
logger.info("User authenticated", {
  user_id: usuario.id,
  email: usuario.email.replace(/(?<=.{3}).(?=[^@]*?@)/g, "*"),
});
```

---

## 3. TRACES DISTRIBUIDOS

### 3.1 Trace ID

Propagar trace_id entre servicos:

```typescript
import { v4 as uuidv4 } from "uuid";

app.use((req, res, next) => {
  req.trace_id = req.headers["x-trace-id"] || uuidv4();
  res.setHeader("x-trace-id", req.trace_id);
  next();
});
```

### 3.2 Chamadas Entre Servicos

```typescript
const response = await axios.get("http://produtos-service:3003/api/produtos", {
  headers: {
    "x-trace-id": req.trace_id,
    "x-user-id": req.usuario.id,
  },
});
```

### 3.3 Visualizacao de Traces

Exemplo de trace completo:

```
[trace_id: abc123]
  -> auth-service: POST /api/auth/login (150ms)
  -> usuarios-service: GET /api/usuarios/10 (50ms)
    -> postgres: SELECT * FROM usuarios (30ms)
  -> redis: GET user:10 (5ms)
  <- Total: 235ms
```

---

## 4. DASHBOARDS GRAFANA

### 4.1 Dashboard: Overview Geral

**Paineis:**

- Disponibilidade de todos os servicos (gauge)
- Requisicoes por segundo (grafico linha)
- Latencia P50/P95/P99 (grafico linha)
- Taxa de erro (grafico linha)
- CPU e Memoria de containers (heatmap)

**Queries Prometheus:**

```promql
up{job=~".*-service"}
rate(http_requests_total[5m])
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])
```

### 4.2 Dashboard: Business Metrics

**Paineis:**

- Logins por hora (grafico barra)
- Produtos cadastrados por dia (grafico linha)
- Movimentacoes por tipo (grafico pizza)
- Usuarios por unidade (grafico barra)
- Top 10 produtos mais movimentados (tabela)

### 4.3 Dashboard: Resiliencia

**Paineis:**

- Estado dos circuit breakers (status)
- Retries por servico (contador)
- Timeouts por operacao (grafico)
- Cache hit rate (gauge)
- Erros por servico (heatmap)

### 4.4 Dashboard: Infraestrutura

**Paineis:**

- CPU por container (grafico area)
- Memoria por container (grafico area)
- Conexoes PostgreSQL (grafico linha)
- Redis memoria e hit rate (gauge)
- Disco utilizado (gauge)

---

## 5. ALERTAS

### 5.1 Alertas Criticos

**Servico Down:**

```yaml
alert: ServiceDown
expr: up{job="auth-service"} == 0
for: 2m
severity: critical
action: Notificar equipe imediatamente
```

**Taxa de Erro Alta:**

```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
for: 5m
severity: critical
action: Iniciar investigacao
```

**Latencia Alta:**

```yaml
alert: HighLatency
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 10m
severity: warning
action: Investigar queries lentas
```

### 5.2 Alertas de Recursos

**CPU Alta:**

```yaml
alert: HighCPU
expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
for: 15m
severity: warning
action: Considerar escalar horizontalmente
```

**Memoria Alta:**

```yaml
alert: HighMemory
expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
for: 5m
severity: critical
action: Investigar memory leak
```

**Disco Cheio:**

```yaml
alert: DiskFull
expr: (node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes > 0.9
for: 10m
severity: critical
action: Limpar logs ou expandir disco
```

### 5.3 Alertas de Negocio

**Nenhum Login em 1 Hora:**

```yaml
alert: NoLoginsDetected
expr: rate(login_attempts_total[1h]) == 0
for: 1h
severity: warning
action: Verificar se servico esta acessivel
```

**Movimentacoes Atipicas:**

```yaml
alert: UnusualMovements
expr: rate(movimentacoes_total[5m]) > avg_over_time(rate(movimentacoes_total[5m])[7d]) * 3
for: 10m
severity: warning
action: Verificar atividade suspeita
```

---

## 6. FERRAMENTAS DE OBSERVABILIDADE

### 6.1 Stack Atual

**Prometheus:**

- Coleta de metricas
- Armazenamento de series temporais
- Queries e alertas

**Grafana:**

- Visualizacao de metricas
- Dashboards interativos
- Alertas visuais

**Docker Logs:**

- Logs de containers
- Agregacao basica

### 6.2 Stack Futura Recomendada

**Loki:**

- Agregacao de logs centralizada
- Queries eficientes
- Integracao com Grafana

**Jaeger:**

- Distributed tracing
- Visualizacao de latencia
- Analise de gargalos

**AlertManager:**

- Gerenciamento de alertas
- Roteamento inteligente
- Integracao Slack/Email

---

## 7. IMPLEMENTACAO

### 7.1 Expor Metricas Prometheus

Arquivo: `shared/utils/metrics.ts`

```typescript
import promClient from "prom-client";

const register = new promClient.Registry();

export const httpRequestsTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total de requisicoes HTTP",
  labelNames: ["method", "endpoint", "status_code", "service"],
  registers: [register],
});

export const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duracao das requisicoes HTTP",
  labelNames: ["method", "endpoint", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

app.get("/metrics", async (req, res) => {
  res.setHeader("Content-Type", register.contentType);
  res.send(await register.metrics());
});
```

### 7.2 Configurar Logger

Arquivo: `shared/utils/logger.ts`

```typescript
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});
```

### 7.3 Configurar Prometheus

Arquivo: `prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "auth-service"
    static_configs:
      - targets: ["auth-service:3001"]

  - job_name: "produtos-service"
    static_configs:
      - targets: ["produtos-service:3003"]

  - job_name: "postgres"
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

---

## 8. RETENCAO DE DADOS

| Tipo                | Retencao | Motivo                  |
| ------------------- | -------- | ----------------------- |
| Metricas Prometheus | 30 dias  | Analise de tendencias   |
| Logs aplicacao      | 7 dias   | Debugging recente       |
| Logs de auditoria   | 12 meses | Conformidade LGPD       |
| Traces              | 7 dias   | Analise de performance  |
| Alertas             | 90 dias  | Historico de incidentes |

---

## 9. CHECKLIST DE OBSERVABILIDADE

Ao implementar nova funcionalidade:

- [ ] Metricas expostas no /metrics
- [ ] Logs estruturados em JSON
- [ ] Trace ID propagado
- [ ] Alertas configurados
- [ ] Dashboard atualizado
- [ ] Documentacao atualizada
- [ ] SLOs definidos
- [ ] Runbook criado

---

## 10. EXEMPLO PRATICO

### Cenario: Investigar Latencia Alta

**Passo 1: Ver Dashboard**

- Abrir Grafana -> Dashboard Overview
- Verificar painel de latencia P95

**Passo 2: Query Prometheus**

```promql
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket{service="produtos-service"}[5m])
) by (endpoint)
```

**Passo 3: Analisar Logs**

```bash
docker logs produtos-service | grep "Slow query"
```

**Passo 4: Ver Traces**

- Abrir Jaeger (futuro)
- Buscar por trace_id
- Identificar gargalo

**Passo 5: Corrigir**

- Adicionar indice no banco
- Implementar cache
- Otimizar query

---

Ultima atualizacao: 15/11/2025
Proxima revisao: 15/12/2025

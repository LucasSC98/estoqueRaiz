# Resiliência e Observabilidade - Estoque Raiz

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estratégias de Resiliência Implementadas](#estratégias-de-resiliência-implementadas)
- [Sistema de Observabilidade](#sistema-de-observabilidade)
- [Como Usar](#como-usar)
- [Métricas Disponíveis](#métricas-disponíveis)
- [Alertas Configurados](#alertas-configurados)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

Este sistema implementa estratégias de resiliência e observabilidade em uma arquitetura de microserviços, incluindo:

- **Retry com Backoff Exponencial**
- **Circuit Breaker**
- **Rate Limiting**
- **Health Checks**
- **Graceful Shutdown**
- **Métricas com Prometheus**
- **Visualização com Grafana**
- **Alertas Automáticos**

---

## 🛡️ Estratégias de Resiliência Implementadas

### 1. Retry (Tentativas Automáticas)

**Localização**: `shared/utils/retry.ts`

**Como usar**:

```typescript
import {
  retryWithBackoff,
  httpRequestWithRetry,
} from "../../../shared/utils/retry";

// Exemplo 1: Retry genérico
const resultado = await retryWithBackoff(
  async () => await servicoExterno.buscarDados(),
  {
    maxRetries: 3,
    initialDelay: 1000,
    shouldRetry: (error) => error.code === "ECONNREFUSED",
  }
);

// Exemplo 2: Retry HTTP (já inclui lógica de erros retryable)
const dados = await httpRequestWithRetry(
  async () => await axios.get("http://api-externa/dados"),
  { maxRetries: 5 }
);
```

**Configuração**:

- **maxRetries**: Número máximo de tentativas (padrão: 3)
- **initialDelay**: Delay inicial em ms (padrão: 1000)
- **maxDelay**: Delay máximo em ms (padrão: 30000)

**Erros retryable**:

- Erros de rede (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ECONNRESET)
- HTTP 5xx (500-599)
- HTTP 429 (Rate Limit)

---

### 2. Circuit Breaker

**Localização**: `shared/utils/circuitBreaker.ts`

**Como usar**:

```typescript
import { createCircuitBreaker } from "../../../shared/utils/circuitBreaker";

// Criar circuit breaker
const buscarCategoriaCB = createCircuitBreaker(
  async (id: number) => {
    const response = await fetch(
      `http://categorias-service:3004/api/categorias/${id}`
    );
    return response.json();
  },
  {
    name: "categorias-service",
    failureThreshold: 5, // Abre após 5 falhas
    successThreshold: 2, // Fecha após 2 sucessos
    timeout: 5000, // 5s de timeout
    resetTimeout: 30000, // Tenta reabrir após 30s
  }
);

// Usar com fallback
try {
  const categoria = await buscarCategoriaCB.execute(categoriaId);
  return categoria;
} catch (error) {
  // Fallback: retornar dados em cache ou valor padrão
  return { id: categoriaId, nome: "Categoria Indisponível" };
}
```

**Estados**:

- **CLOSED**: Funcionando normalmente
- **OPEN**: Bloqueado (muitas falhas)
- **HALF_OPEN**: Testando se voltou

---

### 3. Rate Limiting (Nginx)

**Localização**: `nginx/nginx.conf`

**Limites configurados**:

| Endpoint          | Taxa      | Burst          | Descrição                   |
| ----------------- | --------- | -------------- | --------------------------- |
| `/api/auth`       | 10 req/s  | 20             | Proteção contra força bruta |
| `/api/*` (geral)  | 100 req/s | 50             | APIs normais                |
| `/api/relatorios` | 5 req/s   | 10             | Endpoints pesados           |
| Conexões por IP   | -         | 20 simultâneas | Limite global               |

**Resposta quando exceder**:

```json
HTTP 429 Too Many Requests
```

---

### 4. Health Checks

**Localização**: `shared/utils/healthCheck.ts`

**Endpoints disponíveis em cada serviço**:

```bash
# Health check completo (verifica DB, Redis, Memória)
GET http://localhost:3001/health

# Liveness (apenas verifica se está rodando)
GET http://localhost:3001/liveness

# Readiness (pronto para receber tráfego)
GET http://localhost:3001/readiness
```

**Resposta de exemplo**:

```json
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2025-01-20T14:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 12
    },
    "cache": {
      "status": "up",
      "responseTime": 5
    },
    "memory": {
      "status": "up",
      "details": {
        "heapUsed": "120MB",
        "heapTotal": "256MB",
        "heapPercentage": "46.88%"
      }
    }
  },
  "version": "1.0.0"
}
```

**Status HTTP**:

- `200`: Healthy ou Degraded (funcional com problemas não críticos)
- `503`: Unhealthy (banco offline = crítico)

---

### 5. Graceful Shutdown

**Implementado em todos os serviços** (`src/index.ts`)

**Funcionalidades**:

- Fecha servidor HTTP (para de aceitar novas conexões)
- Desinscreve de eventos (Redis Pub/Sub)
- Fecha conexão com banco de dados
- Fecha conexão com Redis
- Timeout de 10s (força shutdown se travar)

**Teste**:

```bash
# Enviar sinal SIGTERM
docker stop auth-service

# Logs esperados:
# 📥 Recebido sinal SIGTERM - iniciando shutdown graceful
# 🔌 Servidor HTTP fechado
# 📤 Eventos desincritos
# 🗄️ Conexão com banco fechada
# 🔴 Conexão com Redis fechada
# ✅ Shutdown graceful concluído
```

---

## Sistema de Observabilidade

### Arquitetura

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Microserviços│────▶│  Prometheus  │────▶│   Grafana    │
│  (/metrics)   │     │   (Coleta)   │     │ (Visualização)│
└──────────────┘     └──────────────┘     └──────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│   cAdvisor   │     │   Alertas    │
│ (Containers) │     │ (alerts.yml) │
└──────────────┘     └──────────────┘
```

### Acessar Ferramentas

```bash
# Prometheus (coleta de métricas)
http://localhost:9090

# Grafana (dashboards)
http://localhost:3000
# Usuário: admin
# Senha: admin123

# cAdvisor (métricas de containers)
http://localhost:8080

# Node Exporter (métricas do host)
http://localhost:9100/metrics
```

---

## Como Usar

### 1. Iniciar Sistema Completo

```bash
# 1. Navegar para a pasta do projeto
cd nova-api-microservice

# 2. Instalar dependências do shared (necessário para métricas)
cd shared
npm install
cd ..

# 3. Subir todos os serviços (incluindo observabilidade)
docker-compose up -d

# 4. Verificar se todos estão rodando
docker-compose ps

# Serviços esperados:
# - auth-service, usuarios-service, produtos-service, etc.
# - prometheus, grafana, cadvisor, node-exporter
# - redis, api-gateway (nginx)
```

### 2. Verificar Health Checks

```bash
# Verificar cada serviço
curl http://localhost:3001/health  # auth-service
curl http://localhost:3002/health  # usuarios-service
curl http://localhost:3003/health  # unidades-service
curl http://localhost:3004/health  # categorias-service
curl http://localhost:3005/health  # produtos-service
curl http://localhost:3006/health  # movimentacoes-service
curl http://localhost:3007/health  # relatorios-service

# Gateway
curl http://localhost/health
```

### 3. Visualizar Métricas no Prometheus

1. Acessar http://localhost:9090
2. Clicar em "Graph"
3. Testar queries:

```promql
# Taxa de requisições por serviço
rate(http_requests_total[5m])

# Latência P95 por serviço
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Taxa de erro 5xx
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)

# Uso de CPU dos containers
rate(container_cpu_usage_seconds_total{name=~".*-service"}[5m]) * 100

# Memória dos containers
container_memory_usage_bytes{name=~".*-service"} / 1024 / 1024
```

### 4. Criar Dashboard no Grafana

1. Acessar http://localhost:3000
2. Login: admin / admin123
3. Ir em "Data Sources" → "Add data source" → "Prometheus"
4. URL: `http://prometheus:9090`
5. Clicar em "Save & Test"
6. Ir em "Dashboards" → "New Dashboard"
7. Adicionar painéis com as queries acima

**Dashboard sugerido**:

- **Painel 1**: Taxa de Requisições (http_requests_total)
- **Painel 2**: Latência P95 (http_request_duration_seconds)
- **Painel 3**: Taxa de Erro (http_server_errors_total)
- **Painel 4**: CPU por Container
- **Painel 5**: Memória por Container
- **Painel 6**: Cache Hit Rate

---

## 📈 Métricas Disponíveis

### Métricas de Aplicação

| Métrica                           | Tipo      | Descrição                  | Labels                              |
| --------------------------------- | --------- | -------------------------- | ----------------------------------- |
| `http_requests_total`             | Counter   | Total de requisições HTTP  | method, route, status_code, service |
| `http_request_duration_seconds`   | Histogram | Duração das requisições    | method, route, status_code, service |
| `http_server_errors_total`        | Counter   | Total de erros 5xx         | method, route, status_code, service |
| `http_active_connections`         | Gauge     | Conexões ativas            | service                             |
| `cache_hits_total`                | Counter   | Cache hits                 | service, cache_key                  |
| `cache_misses_total`              | Counter   | Cache misses               | service, cache_key                  |
| `cache_hit_rate_percent`          | Gauge     | Taxa de acerto do cache    | service                             |
| `database_operations_total`       | Counter   | Operações de banco         | operation, table, service           |
| `database_query_duration_seconds` | Histogram | Duração de queries         | operation, table, service           |
| `circuit_breaker_state`           | Gauge     | Estado do circuit breaker  | circuit_breaker, service            |
| `circuit_breaker_events_total`    | Counter   | Eventos do circuit breaker | circuit_breaker, event, service     |

### Métricas de Negócio

| Métrica                            | Tipo      | Descrição            | Labels                   |
| ---------------------------------- | --------- | -------------------- | ------------------------ |
| `produtos_cadastrados_total`       | Counter   | Produtos cadastrados | unidade_id, categoria_id |
| `produtos_estoque_total`           | Gauge     | Produtos em estoque  | unidade_id, produto_id   |
| `movimentacoes_total`              | Counter   | Movimentações        | tipo, unidade_id         |
| `produto_aprovacao_tempo_segundos` | Histogram | Tempo de aprovação   | unidade_id               |
| `usuarios_autenticados_total`      | Counter   | Logins realizados    | cargo                    |
| `usuarios_ativos_total`            | Gauge     | Usuários ativos      | cargo                    |

### Métricas de Sistema (Node.js)

- `nodejs_heap_size_total_bytes` - Heap total
- `nodejs_heap_size_used_bytes` - Heap utilizado
- `nodejs_external_memory_bytes` - Memória externa
- `nodejs_eventloop_lag_seconds` - Lag do event loop

---

## Alertas Configurados

### Alertas Críticos (P1)

| Alerta               | Condição        | Duração | Ação Esperada                             |
| -------------------- | --------------- | ------- | ----------------------------------------- |
| ServicoForaDoAr      | `up == 0`       | 2min    | Investigar logs, reiniciar serviço        |
| TaxaDeErro5xxAlta    | `5xx > 5%`      | 5min    | Verificar código, banco, dependências     |
| LatenciaCritica      | `P99 > 5s`      | 10min   | Otimizar queries, escalar horizontalmente |
| CPUCritica           | `CPU > 90%`     | 5min    | Escalar recursos, otimizar código         |
| MemoriaCritica       | `Mem > 90%`     | 5min    | Investigar memory leaks                   |
| CircuitBreakerAberto | `state == OPEN` | 2min    | Verificar serviço downstream              |

### Alertas de Atenção (P2)

| Alerta            | Condição         | Duração | Ação Esperada                     |
| ----------------- | ---------------- | ------- | --------------------------------- |
| LatenciaAlta      | `P95 > 2s`       | 5min    | Revisar código, adicionar índices |
| CPUAlta           | `CPU > 80%`      | 15min   | Monitorar, considerar escalar     |
| MemoriaAlta       | `Mem > 80%`      | 10min   | Monitorar tendência               |
| CacheHitRateBaixo | `Hit rate < 60%` | 30min   | Revisar estratégia de cache       |
| RequisicaoLenta   | `P95 > 1s`       | 5min    | Otimizar endpoint específico      |

**Verificar alertas ativos**:

```bash
# Prometheus
http://localhost:9090/alerts

# Ver regras
docker exec prometheus cat /etc/prometheus/alerts.yml
```

---

## 🐛 Troubleshooting

### Problema: Serviço não expõe métricas

**Sintomas**: Prometheus mostra "UP 0/1" para um serviço

**Solução**:

```bash
# 1. Verificar se o serviço está rodando
docker ps | grep auth-service

# 2. Testar endpoint /metrics manualmente
curl http://localhost:3001/metrics

# 3. Ver logs do serviço
docker logs auth-service

# 4. Verificar se prom-client está instalado
docker exec auth-service npm list prom-client
```

### Problema: Grafana não conecta no Prometheus

**Solução**:

```bash
# 1. Verificar se ambos estão na mesma rede
docker network inspect microservices-network

# 2. No Grafana, usar URL com nome do serviço:
http://prometheus:9090  #  Correto
http://localhost:9090   #  Errado (Docker)

# 3. Testar conexão de dentro do container Grafana
docker exec grafana curl http://prometheus:9090/-/healthy
```

### Problema: Alertas não aparecem

**Solução**:

```bash
# 1. Verificar se alerts.yml está correto
docker exec prometheus promtool check rules /etc/prometheus/alerts.yml

# 2. Ver configuração carregada
docker exec prometheus cat /etc/prometheus/prometheus.yml | grep alerts

# 3. Recarregar configuração
curl -X POST http://localhost:9090/-/reload
```

### Problema: Rate limiting bloqueando requisições legítimas

**Sintomas**: HTTP 429 Too Many Requests

**Solução**:

```bash
# 1. Ver limites atuais no nginx.conf
cat nginx/nginx.conf | grep limit_req_zone

# 2. Ajustar limites:
# - Aumentar rate: rate=100r/s → rate=200r/s
# - Aumentar burst: burst=50 → burst=100

# 3. Recarregar Nginx
docker exec api-gateway nginx -s reload

# 4. Ver requisições bloqueadas nos logs
docker logs api-gateway | grep "limiting requests"
```

### Problema: Circuit Breaker travado em OPEN

**Sintomas**: Serviço retorna erro imediatamente

**Solução**:

```typescript
// Aumentar resetTimeout ou diminuir failureThreshold
const cb = createCircuitBreaker(fn, {
  failureThreshold: 10, // De 5 para 10
  resetTimeout: 60000, // De 30s para 60s
});

// Ou resetar manualmente
cb.reset();
```

### Problema: Memória alta no Node.js

**Solução**:

```bash
# 1. Ver heap snapshot
docker exec auth-service node --expose-gc --inspect=0.0.0.0:9229 src/index.js

# 2. Adicionar limites de memória no Node
NODE_OPTIONS="--max-old-space-size=512"  # 512MB

# 3. Verificar memory leaks comuns:
# - Event listeners não removidos
# - Variáveis globais acumulando
# - Cache sem TTL
# - Conexões não fechadas
```

---

## Referências

- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **prom-client**: https://github.com/siimon/prom-client
- **Circuit Breaker Pattern**: https://martinfowler.com/bliki/CircuitBreaker.html
- **Retry Pattern**: https://docs.microsoft.com/en-us/azure/architecture/patterns/retry

---

## SLOs/SLIs Definidos

| Serviço               | SLO Disponibilidade | SLO Latência P95 | SLO Taxa de Erro |
| --------------------- | ------------------- | ---------------- | ---------------- |
| auth-service          | 99.5%               | < 500ms          | < 1%             |
| usuarios-service      | 99.5%               | < 500ms          | < 1%             |
| produtos-service      | 99.0%               | < 1s             | < 2%             |
| movimentacoes-service | 99.0%               | < 800ms          | < 2%             |
| categorias-service    | 99.0%               | < 200ms          | < 2%             |
| unidades-service      | 99.0%               | < 200ms          | < 2%             |
| relatorios-service    | 98.0%               | < 5s             | < 2%             |

**Como medir disponibilidade**:

```promql
# % de tempo UP nos últimos 30 dias
avg_over_time(up{job="auth-service"}[30d]) * 100
```

**Como medir latência P95**:

```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="auth-service"}[5m])) by (le)
)
```

**Como medir taxa de erro**:

```promql
(
  sum(rate(http_requests_total{service="auth-service", status_code=~"5.."}[5m])) /
  sum(rate(http_requests_total{service="auth-service"}[5m]))
) * 100
```

---

## Checklist de Produção

Antes de colocar em produção, verificar:

- [ ] Todos os serviços expõem `/health`, `/metrics`
- [ ] Prometheus coleta métricas de todos os serviços
- [ ] Grafana tem dashboards configurados
- [ ] Alertas estão funcionando (testar com erro proposital)
- [ ] Rate limiting está adequado ao volume esperado
- [ ] Limites de CPU/memória estão corretos
- [ ] Logs estão sendo persistidos
- [ ] Backup de métricas do Prometheus configurado
- [ ] Documentação de runbooks atualizada
- [ ] Equipe treinada para responder alertas

---

**Autor**: Lucas Da Silva Custódio
**Data**: Outubro 2025  
**Versão**: 1.0.0

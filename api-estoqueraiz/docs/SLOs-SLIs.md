# SLOs e SLIs - Sistema Estoque Raiz

## Service Level Objectives e Service Level Indicators

SLOs sao metas de qualidade que o servico se compromete a manter.
SLIs sao metricas que medem o desempenho real do servico.

---

## 1. DISPONIBILIDADE

### Definicao

Porcentagem de tempo que o servico esta disponivel e respondendo corretamente.

### SLOs por Servico

| Servico               | SLO   | Downtime Permitido/Mes |
| --------------------- | ----- | ---------------------- |
| auth-service          | 99.5% | 3.6 horas              |
| usuarios-service      | 99.5% | 3.6 horas              |
| produtos-service      | 99.0% | 7.2 horas              |
| movimentacoes-service | 99.0% | 7.2 horas              |
| categorias-service    | 99.0% | 7.2 horas              |
| unidades-service      | 99.0% | 7.2 horas              |
| relatorios-service    | 98.0% | 14.4 horas             |
| API Gateway Nginx     | 99.9% | 43 minutos             |
| Redis Cache           | 99.5% | 3.6 horas              |
| PostgreSQL Database   | 99.5% | 3.6 horas              |

### SLI - Como Medir

**Prometheus Query:**

```promql
avg_over_time(up{job="auth-service"}[30d]) * 100
```

**Health Check Script:**

```bash
curl -f http://localhost:3001/health > /dev/null && echo "1" || echo "0"
```

**Calculo Manual:**

```
Disponibilidade = (Total de minutos - Minutos indisponíveis) / Total de minutos * 100
```

### Exemplo de Cálculo

Se em 30 dias (43.200 minutos) o serviço ficou DOWN por 150 minutos:

```
Disponibilidade = (43.200 - 150) / 43.200 * 100 = 99.65%
```

**Está dentro do SLO de 99.5%**

---

## 2. Latência (Latency)

### Definição

Tempo de resposta das requisições HTTP.

### SLOs por Endpoint

| Endpoint                        | P50 (Típico) | P95 (Boa experiência) | P99 (Máximo aceitável) |
| ------------------------------- | ------------ | --------------------- | ---------------------- |
| `POST /api/auth/login`          | < 200ms      | < 500ms               | < 1s                   |
| `GET /api/produtos` (cache)     | < 100ms      | < 300ms               | < 500ms                |
| `GET /api/produtos` (sem cache) | < 500ms      | < 1s                  | < 2s                   |
| `POST /api/movimentacoes`       | < 300ms      | < 800ms               | < 1.5s                 |
| `GET /api/relatorios/curva-abc` | < 2s         | < 5s                  | < 10s                  |
| `GET /api/categorias`           | < 100ms      | < 200ms               | < 500ms                |

### SLI (Como Medir)

**Prometheus**:

```promql
# Latência P50
histogram_quantile(0.50,
  sum(rate(http_request_duration_seconds_bucket{service="auth-service"}[5m])) by (le)
)

# Latência P95
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="auth-service"}[5m])) by (le)
)

# Latência P99
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="auth-service"}[5m])) by (le)
)
```

**Nginx Logs**:

```bash
# Ver tempos de resposta
docker logs api-gateway | grep "request_time" | awk '{print $NF}' | sort -n
```

### Exemplo de Interpretação

Se P95 = 450ms:

- 95% das requisições respondem em até 450ms
- Apenas 5% das requisições são mais lentas

  **Está dentro do SLO de < 500ms**

---

## 3. Taxa de Erro (Error Rate)

### Definição

Porcentagem de requisições que resultam em erro (HTTP 5xx).

### SLOs por Serviço

| Serviço                   | SLO (Taxa Máxima de Erro) | Requisições Permitidas com Erro |
| ------------------------- | ------------------------- | ------------------------------- |
| **auth-service**          | < 1%                      | 1 erro a cada 100 requisições   |
| **usuarios-service**      | < 1%                      | 1 erro a cada 100 requisições   |
| **produtos-service**      | < 2%                      | 2 erros a cada 100 requisições  |
| **movimentacoes-service** | < 2%                      | 2 erros a cada 100 requisições  |
| **categorias-service**    | < 2%                      | 2 erros a cada 100 requisições  |
| **unidades-service**      | < 2%                      | 2 erros a cada 100 requisições  |
| **relatorios-service**    | < 2%                      | 2 erros a cada 100 requisições  |
| **API Gateway**           | < 0.5%                    | 1 erro a cada 200 requisições   |

**⚠️ Nota**: Erros 4xx (cliente) NÃO contam para o SLO!

### SLI (Como Medir)

**Prometheus**:

```promql
# Taxa de erro 5xx nos últimos 5 minutos
(
  sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service) /
  sum(rate(http_requests_total[5m])) by (service)
) * 100
```

**Logs**:

```bash
# Contar erros 5xx
docker logs auth-service | grep "\"status\":5" | wc -l
```

### Exemplo de Cálculo

Em 1 hora:

- Total de requisições: 10.000
- Requisições com erro 5xx: 80

```
Taxa de Erro = (80 / 10.000) * 100 = 0.8%
```

**Está dentro do SLO de < 1%**

---

## 4. Throughput (Taxa de Transferência)

### Definição

Quantidade de requisições processadas por segundo.

### SLOs por Serviço

| Serviço                   | SLO Mínimo (req/s) | Capacidade Esperada |
| ------------------------- | ------------------ | ------------------- |
| **auth-service**          | > 100              | Até 500 req/s       |
| **produtos-service**      | > 200              | Até 1000 req/s      |
| **movimentacoes-service** | > 150              | Até 800 req/s       |
| **Redis Cache**           | > 5000 ops/s       | Até 50k ops/s       |

### SLI (Como Medir)

**Prometheus**:

```promql
# Requisições por segundo nos últimos 5 minutos
sum(rate(http_requests_total{service="auth-service"}[5m]))
```

### Exemplo de Interpretação

Se o valor for 250 req/s:
**Está acima do SLO de > 100 req/s**

---

## 5. Cache Hit Rate

### Definição

Porcentagem de requisições que foram atendidas pelo cache.

### SLOs por Recurso

| Recurso              | SLO (Hit Rate Mínimo) | Impacto se Baixo          |
| -------------------- | --------------------- | ------------------------- |
| **Produtos (GET)**   | > 70%                 | Aumento de carga no banco |
| **Categorias (GET)** | > 80%                 | Performance degradada     |
| **Unidades (GET)**   | > 80%                 | Latência aumenta          |

### SLI (Como Medir)

**Prometheus**:

```promql
# Cache hit rate
(
  sum(rate(cache_hits_total[5m])) /
  (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
) * 100
```

**Nginx Headers**:

```bash
# Ver X-Cache-Status nos logs
docker logs api-gateway | grep "X-Cache-Status: HIT" | wc -l
docker logs api-gateway | grep "X-Cache-Status: MISS" | wc -l
```

### Exemplo de Cálculo

- Cache hits: 750
- Cache misses: 250
- Total: 1000

```
Hit Rate = (750 / 1000) * 100 = 75%
```

**Está dentro do SLO de > 70%**

---

## 6. Saturation (Saturação de Recursos)

### Definição

Nível de utilização dos recursos do sistema.

### SLOs

| Recurso         | Limite de Atenção | Limite Crítico | Ação                    |
| --------------- | ----------------- | -------------- | ----------------------- |
| **CPU**         | 80%               | 90%            | Escalar horizontalmente |
| **Memória**     | 80%               | 90%            | Investigar memory leaks |
| **Disco**       | 80%               | 90%            | Limpar logs, expandir   |
| **Conexões DB** | 80% do pool       | 95% do pool    | Aumentar pool size      |

### SLI (Como Medir)

**Prometheus (CPU)**:

```promql
# CPU do container
rate(container_cpu_usage_seconds_total{name="auth-service"}[5m]) * 100
```

**Prometheus (Memória)**:

```promql
# Memória do container
(container_memory_usage_bytes{name="auth-service"} / container_spec_memory_limit_bytes) * 100
```

**Prometheus (Disco)**:

```promql
# Uso de disco
(
  (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) /
  node_filesystem_size_bytes{mountpoint="/"}
) * 100
```

---

## Tabela Resumida de SLOs

| Métrica             | SLI               | SLO    | Como Medir                      | Alerta Se       |
| ------------------- | ----------------- | ------ | ------------------------------- | --------------- |
| **Disponibilidade** | % tempo UP        | > 99%  | `avg_over_time(up[30d])`        | DOWN > 2min     |
| **Latência P95**    | Tempo de resposta | < 1s   | `histogram_quantile(0.95, ...)` | > 2s por 5min   |
| **Taxa de Erro**    | % requisições 5xx | < 1-2% | `rate(5xx) / rate(total)`       | > 5% por 5min   |
| **Cache Hit**       | % hits/total      | > 70%  | `hits / (hits+misses)`          | < 60% por 30min |
| **CPU**             | % uso             | < 80%  | `rate(cpu_usage)`               | > 80% por 15min |
| **Memória**         | % uso             | < 80%  | `memory / limit`                | > 90% por 5min  |

---

## Como Usar Este Documento

### Para Desenvolvimento

1. Otimizar código para atingir SLOs de latência
2. Adicionar cache para melhorar hit rate
3. Tratar erros para reduzir taxa de erro

### Para Operação

1. Monitorar SLIs no Grafana
2. Responder alertas quando SLOs são violados
3. Escalar recursos quando saturação > 80%

### Para Negócio

1. Usar SLOs como garantia de qualidade
2. Reportar cumprimento de SLOs mensalmente
3. Ajustar SLOs baseado em feedback de usuários

---

## Exemplo de Relatório Mensal

```
Relatório de SLOs - Janeiro 2025
Serviço: auth-service

┌─────────────────┬─────────┬─────────┬────────┐
│ Métrica         │ SLO     │ Real    │ Status │
├─────────────────┼─────────┼─────────┼────────┤
│ Disponibilidade │ 99.5%   │ 99.8%   │ ✅     │
│ Latência P95    │ < 500ms │ 420ms   │ ✅     │
│ Taxa de Erro    │ < 1%    │ 0.3%    │ ✅     │
│ Cache Hit Rate  │ > 70%   │ 82%     │ ✅     │
└─────────────────┴─────────┴─────────┴────────┘

Incidentes: 2
- 15/01: Down por 3min (deploy)
- 22/01: Latência alta por 10min (query lenta)

Ações Tomadas:
- Adicionado índice na tabela usuarios
- Implementado health check pré-deploy
```

---

## Dashboards Recomendados

### Dashboard 1: SLO Overview

- Gauge de disponibilidade por serviço
- Gráfico de latência P50/P95/P99
- Gráfico de taxa de erro

### Dashboard 2: SLI Detalhado

- Heatmap de latência
- Taxa de requisições por endpoint
- Cache hit rate por recurso

### Dashboard 3: Budget de Erro

- Erro budget consumido (quantos erros ainda são permitidos)
- Projeção de quando SLO será violado
- Histórico de violações

---

**Revisão**: Mensal  
**Responsável**: Time de SRE/DevOps  
**Última atualização**: Janeiro 2025

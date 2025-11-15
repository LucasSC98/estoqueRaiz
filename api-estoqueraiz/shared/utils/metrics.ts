import client from "prom-client";
import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de requisições HTTP recebidas",
  labelNames: ["method", "route", "status_code", "service"],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duração das requisições HTTP em segundos",
  labelNames: ["method", "route", "status_code", "service"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpServerErrors = new client.Counter({
  name: "http_server_errors_total",
  help: "Total de erros 5xx do servidor",
  labelNames: ["method", "route", "status_code", "service"],
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: "http_active_connections",
  help: "Número de conexões HTTP ativas",
  labelNames: ["service"],
  registers: [register],
});

export const cacheHitsTotal = new client.Counter({
  name: "cache_hits_total",
  help: "Total de cache hits",
  labelNames: ["service", "cache_key"],
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: "cache_misses_total",
  help: "Total de cache misses",
  labelNames: ["service", "cache_key"],
  registers: [register],
});

export const cacheHitRate = new client.Gauge({
  name: "cache_hit_rate_percent",
  help: "Taxa de acerto do cache em porcentagem",
  labelNames: ["service"],
  registers: [register],
});

export const databaseOperationsTotal = new client.Counter({
  name: "database_operations_total",
  help: "Total de operações de banco de dados",
  labelNames: ["operation", "table", "service"],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: "database_query_duration_seconds",
  help: "Duração das queries do banco de dados em segundos",
  labelNames: ["operation", "table", "service"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const databasePoolConnections = new client.Gauge({
  name: "database_pool_connections",
  help: "Número de conexões no pool do banco de dados",
  labelNames: ["state", "service"],
  registers: [register],
});

export const circuitBreakerEvents = new client.Counter({
  name: "circuit_breaker_events_total",
  help: "Total de eventos do circuit breaker",
  labelNames: ["circuit_breaker", "event", "service"],
  registers: [register],
});

export const circuitBreakerState = new client.Gauge({
  name: "circuit_breaker_state",
  help: "Estado do circuit breaker (0=closed, 1=half-open, 2=open)",
  labelNames: ["circuit_breaker", "service"],
  registers: [register],
});

export const retriesTotal = new client.Counter({
  name: "retries_total",
  help: "Total de tentativas de retry",
  labelNames: ["operation", "success", "service"],
  registers: [register],
});

export const produtosCadastradosTotal = new client.Counter({
  name: "produtos_cadastrados_total",
  help: "Total de produtos cadastrados",
  labelNames: ["unidade_id", "categoria_id"],
  registers: [register],
});

export const produtosEstoqueTotal = new client.Gauge({
  name: "produtos_estoque_total",
  help: "Total de produtos em estoque",
  labelNames: ["unidade_id", "produto_id"],
  registers: [register],
});

export const movimentacoesTotal = new client.Counter({
  name: "movimentacoes_total",
  help: "Total de movimentações de estoque",
  labelNames: ["tipo", "unidade_id"],
  registers: [register],
});

export const produtoAprovacaoTempo = new client.Histogram({
  name: "produto_aprovacao_tempo_segundos",
  help: "Tempo para aprovação de produtos em segundos",
  labelNames: ["unidade_id"],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
  registers: [register],
});

export const usuariosAutenticadosTotal = new client.Counter({
  name: "usuarios_autenticados_total",
  help: "Total de usuários autenticados",
  labelNames: ["cargo"],
  registers: [register],
});

export const usuariosAtivosTotal = new client.Gauge({
  name: "usuarios_ativos_total",
  help: "Número de usuários ativos no momento",
  labelNames: ["cargo"],
  registers: [register],
});

export function metricsMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    activeConnections.inc({ service: serviceName });

    const start = Date.now();

    res.on("finish", () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path.replace(/\/\d+/g, "/:id");

      const labels = {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
        service: serviceName,
      };

      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, duration);

      if (res.statusCode >= 500) {
        httpServerErrors.inc(labels);
      }

      activeConnections.dec({ service: serviceName });

      if (duration > 2) {
        logger.warn(`Requisição lenta detectada`, {
          method: req.method,
          route,
          duration: `${duration.toFixed(3)}s`,
          statusCode: res.statusCode,
        });
      }
    });

    next();
  };
}

export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error("Erro ao gerar métricas", { error });
    res.status(500).end();
  }
}

export function recordCacheMetric(
  serviceName: string,
  cacheKey: string,
  hit: boolean
) {
  if (hit) {
    cacheHitsTotal.inc({ service: serviceName, cache_key: cacheKey });
  } else {
    cacheMissesTotal.inc({ service: serviceName, cache_key: cacheKey });
  }
}

export async function updateCacheHitRate(serviceName: string) {
  try {
    const metricsData = await register.getMetricsAsJSON();

    const hitsMetric = metricsData.find(
      (m: any) => m.name === "cache_hits_total"
    );
    const missesMetric = metricsData.find(
      (m: any) => m.name === "cache_misses_total"
    );

    if (
      hitsMetric &&
      missesMetric &&
      hitsMetric.values &&
      missesMetric.values
    ) {
      const totalHits = hitsMetric.values.reduce(
        (sum: number, val: any) => sum + (val.value || 0),
        0
      );
      const totalMisses = missesMetric.values.reduce(
        (sum: number, val: any) => sum + (val.value || 0),
        0
      );
      const total = totalHits + totalMisses;

      if (total > 0) {
        const rate = (totalHits / total) * 100;
        cacheHitRate.set({ service: serviceName }, rate);
      }
    }
  } catch (error) {
    logger.error("Erro ao atualizar cache hit rate", { error });
  }
}

export function recordCircuitBreakerEvent(
  circuitBreakerName: string,
  serviceName: string,
  event: "open" | "close" | "half_open"
) {
  circuitBreakerEvents.inc({
    circuit_breaker: circuitBreakerName,
    event,
    service: serviceName,
  });

  const stateValue = event === "close" ? 0 : event === "half_open" ? 1 : 2;
  circuitBreakerState.set(
    {
      circuit_breaker: circuitBreakerName,
      service: serviceName,
    },
    stateValue
  );
}

export function recordDatabaseOperation(
  serviceName: string,
  operation: "select" | "insert" | "update" | "delete",
  table: string,
  durationMs: number
) {
  databaseOperationsTotal.inc({
    operation,
    table,
    service: serviceName,
  });

  databaseQueryDuration.observe(
    {
      operation,
      table,
      service: serviceName,
    },
    durationMs / 1000
  );
}

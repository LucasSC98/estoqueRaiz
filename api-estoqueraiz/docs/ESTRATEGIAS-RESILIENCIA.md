# Estrategias de Resiliencia - Sistema Estoque Raiz

## Visao Geral

Este documento lista as estrategias de resiliencia implementadas no sistema para garantir disponibilidade e confiabilidade.

---

## 1. RETRY COM BACKOFF EXPONENCIAL

### Descricao

Tentativas automaticas de reexecucao quando uma operacao falha temporariamente.

### Localizacao

Arquivo: `shared/utils/retry.ts`

### Implementacao

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 30000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      await sleep(delay);
    }
  }
}
```

### Quando Usar

- Chamadas HTTP para servicos externos
- Operacoes com bancos de dados temporariamente indisponiveis
- Conexoes com Redis Cache
- Integracao com ERP AGROTITAN

### Configuracao

| Parametro    | Padrao  | Descricao                      |
| ------------ | ------- | ------------------------------ |
| maxRetries   | 3       | Numero maximo de tentativas    |
| initialDelay | 1000ms  | Delay inicial entre tentativas |
| maxDelay     | 30000ms | Delay maximo entre tentativas  |

### Erros Retryable

- ECONNREFUSED
- ETIMEDOUT
- ENOTFOUND
- ECONNRESET
- HTTP 5xx (500-599)
- HTTP 429 (Rate Limit)

### Exemplo de Uso

```typescript
import { httpRequestWithRetry } from "../../../shared/utils/retry";

const usuarios = await httpRequestWithRetry(
  async () => await axios.get("http://usuarios-service:3002/api/usuarios"),
  { maxRetries: 5, initialDelay: 500 }
);
```

---

## 2. CIRCUIT BREAKER

### Descricao

Previne chamadas para servicos que estao falhando repetidamente, permitindo recuperacao.

### Localizacao

Arquivo: `shared/utils/circuitBreaker.ts`

### Estados do Circuit Breaker

**CLOSED (Fechado)**

- Estado normal
- Requisicoes passam normalmente
- Conta falhas

**OPEN (Aberto)**

- Servico detectado como indisponivel
- Requisicoes falham imediatamente
- Previne sobrecarga

**HALF_OPEN (Meio Aberto)**

- Periodo de teste
- Permite algumas requisicoes
- Decide se volta para CLOSED ou OPEN

### Implementacao

```typescript
export function createCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions
): (...args: T) => Promise<R> {
  let state: CircuitState = "CLOSED";
  let failureCount = 0;
  let successCount = 0;
  let nextAttemptTime = Date.now();

  return async (...args: T): Promise<R> => {
    if (state === "OPEN") {
      if (Date.now() < nextAttemptTime) {
        throw new Error(`Circuit breaker OPEN for ${options.name}`);
      }
      state = "HALF_OPEN";
    }

    try {
      const result = await Promise.race([
        fn(...args),
        timeoutPromise(options.timeout),
      ]);

      if (state === "HALF_OPEN") {
        successCount++;
        if (successCount >= options.successThreshold) {
          state = "CLOSED";
          failureCount = 0;
          successCount = 0;
        }
      }

      return result;
    } catch (error) {
      failureCount++;

      if (failureCount >= options.failureThreshold) {
        state = "OPEN";
        nextAttemptTime = Date.now() + options.resetTimeout;
      }

      throw error;
    }
  };
}
```

### Configuracao

| Parametro        | Padrao  | Descricao                     |
| ---------------- | ------- | ----------------------------- |
| failureThreshold | 5       | Falhas para abrir circuito    |
| successThreshold | 2       | Sucessos para fechar circuito |
| timeout          | 5000ms  | Timeout por requisicao        |
| resetTimeout     | 30000ms | Tempo ate tentar reabrir      |

### Exemplo de Uso

```typescript
import { createCircuitBreaker } from "../../../shared/utils/circuitBreaker";

const buscarProdutoCB = createCircuitBreaker(
  async (id: number) => {
    const response = await fetch(
      `http://produtos-service:3003/api/produtos/${id}`
    );
    return response.json();
  },
  {
    name: "produtos-service",
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 5000,
    resetTimeout: 30000,
  }
);

const produto = await buscarProdutoCB(123);
```

---

## 3. TIMEOUT

### Descricao

Define tempo maximo de espera para operacoes, evitando travamentos.

### Implementacao

```typescript
export function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Operation timeout")), ms);
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, timeoutPromise(timeoutMs)]);
}
```

### Timeouts Configurados

| Operacao       | Timeout | Justificativa           |
| -------------- | ------- | ----------------------- |
| Login          | 3s      | Operacao critica rapida |
| Busca produtos | 5s      | Query com joins         |
| Movimentacao   | 10s     | Transaction complexa    |
| Relatorio ABC  | 30s     | Query pesada            |
| Health check   | 1s      | Deve ser rapido         |

### Exemplo de Uso

```typescript
import { withTimeout } from "../../../shared/utils/retry";

const resultado = await withTimeout(operacaoDemorada(), 5000);
```

---

## 4. RATE LIMITING

### Descricao

Limita numero de requisicoes para prevenir abuso e sobrecarga.

### Implementacao

Configurado no Nginx Gateway:

```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

location /api/auth/login {
    limit_req zone=login burst=3 nodelay;
    proxy_pass http://auth-service:3001;
}

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://upstream;
}
```

### Limites Configurados

| Endpoint        | Rate Limit  | Burst | Motivo               |
| --------------- | ----------- | ----- | -------------------- |
| /api/auth/login | 5 req/min   | 3     | Prevenir brute force |
| /api/ geral     | 100 req/min | 20    | Proteger recursos    |
| /health         | Ilimitado   | -     | Monitoramento        |

### Resposta ao Cliente

Status: 429 Too Many Requests

```json
{
  "erro": true,
  "message": "Rate limit excedido. Tente novamente em 60 segundos."
}
```

---

## 5. HEALTH CHECKS

### Descricao

Endpoints para verificar saude dos servicos.

### Implementacao

Todos os servicos expoe `/health`:

```typescript
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "auth-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

### Health Checks Profundos

```typescript
router.get("/health/deep", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  const healthy = checks.database && checks.redis;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
  });
});
```

### Uso em Kubernetes/Docker

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/deep
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 6. GRACEFUL SHUTDOWN

### Descricao

Encerramento suave do servico, finalizando requisicoes em andamento.

### Implementacao

```typescript
let server: http.Server;

server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");

  server.close(() => {
    console.log("HTTP server closed");
  });

  await sequelize.close();
  await redis.quit();

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");

  server.close(() => {
    console.log("HTTP server closed");
  });

  await sequelize.close();
  await redis.quit();

  process.exit(0);
});
```

### Sequencia de Shutdown

1. Recebe sinal SIGTERM/SIGINT
2. Para de aceitar novas requisicoes
3. Aguarda requisicoes em andamento finalizarem (max 30s)
4. Fecha conexoes com banco de dados
5. Fecha conexoes com Redis
6. Encerra processo

---

## 7. TRANSACOES DE BANCO DE DADOS

### Descricao

Garante atomicidade de operacoes criticas.

### Implementacao

```typescript
export async function criarMovimentacao(req: Request, res: Response) {
  const transaction = await sequelize.transaction();

  try {
    const produto = await Produto.findByPk(req.body.produto_id, {
      transaction,
    });

    if (req.body.tipo === "SAIDA" && produto.quantidade < req.body.quantidade) {
      throw new Error("Estoque insuficiente");
    }

    await Movimentacao.create(req.body, { transaction });

    await produto.update(
      {
        quantidade: produto.quantidade + ajuste,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({ success: true });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ erro: true, message: error.message });
  }
}
```

### Quando Usar

- Movimentacoes de estoque
- Transferencias entre unidades
- Aprovacao de produtos com preco
- Criacao de usuario com permissoes

---

## 8. VALIDACAO DE ENTRADA

### Descricao

Previne dados invalidos e ataques de injecao.

### Implementacao

Middleware de validacao:

```typescript
export function validacaoLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: true,
      message: "Email e senha são obrigatorios",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      erro: true,
      message: "Email invalido",
    });
  }

  if (senha.length < 6) {
    return res.status(400).json({
      erro: true,
      message: "Senha deve ter no minimo 6 caracteres",
    });
  }

  next();
}
```

---

## 9. CACHE COM REDIS

### Descricao

Reduz carga no banco e melhora performance.

### Implementacao

```typescript
import { cacheGet, cacheSet, cacheDel } from "../../../shared/utils/cache";

export async function listarProdutos(req: Request, res: Response) {
  const cacheKey = `produtos:${req.usuario.unidade_id}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  const produtos = await Produto.findAll({
    where: { unidade_id: req.usuario.unidade_id },
  });

  await cacheSet(cacheKey, JSON.stringify(produtos), 300);

  return res.status(200).json(produtos);
}
```

### Estrategia de Cache

| Recurso    | TTL   | Invalidacao                |
| ---------- | ----- | -------------------------- |
| Produtos   | 5min  | Ao criar/atualizar produto |
| Categorias | 1h    | Ao modificar categoria     |
| Unidades   | 1h    | Raramente muda             |
| Usuarios   | 15min | Ao atualizar usuario       |

---

## 10. TRATAMENTO DE ERROS CENTRALIZADO

### Descricao

Captura e formata erros de forma consistente.

### Implementacao

```typescript
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error:", error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      erro: true,
      message: error.message,
      details: error.errors,
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      erro: true,
      message: "Nao autorizado",
    });
  }

  return res.status(500).json({
    erro: true,
    message: "Erro interno do servidor",
  });
}

app.use(errorHandler);
```

---

## MATRIZ DE RESILIENCIA

| Estrategia        | Onde Aplicada          | Configuracao                      | Objetivo                     |
| ----------------- | ---------------------- | --------------------------------- | ---------------------------- |
| Retry             | Chamadas HTTP externas | 3 tentativas, backoff exponencial | Lidar com falhas temporarias |
| Circuit Breaker   | Servicos internos      | 5 falhas, 30s reset               | Prevenir cascata de falhas   |
| Timeout           | Todas operacoes        | 1s-30s conforme operacao          | Evitar travamentos           |
| Rate Limiting     | Nginx Gateway          | 5-100 req/min                     | Prevenir abuso               |
| Health Checks     | Todos servicos         | A cada 10s                        | Detectar servicos down       |
| Graceful Shutdown | Todos servicos         | 30s max wait                      | Zero downtime deploys        |
| Transactions      | Operacoes criticas     | Sequelize                         | Consistencia de dados        |
| Validacao         | Todos endpoints        | Middleware                        | Prevenir dados invalidos     |
| Cache             | Leituras frequentes    | Redis 5-60min TTL                 | Reduzir carga DB             |
| Error Handling    | Toda aplicacao         | Middleware global                 | UX consistente               |

---

## CHECKLIST DE RESILIENCIA

Ao implementar nova funcionalidade:

- [ ] Retry configurado para chamadas externas
- [ ] Circuit breaker em servicos dependentes
- [ ] Timeout definido para operacao
- [ ] Validacao de entrada implementada
- [ ] Tratamento de erros adequado
- [ ] Transacao de banco se necessario
- [ ] Cache implementado se aplicavel
- [ ] Health check atualizado
- [ ] Logs estruturados adicionados
- [ ] Metricas expostas

---

Ultima atualizacao: 15/11/2025
Proxima revisao: 15/12/2025

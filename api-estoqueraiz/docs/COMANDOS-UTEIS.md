# Guia Rápido - Comandos Úteis

## 🚀 Início Rápido

### Subir Todos os Serviços

```bash
# Navegar para a pasta
cd nova-api-microservice

# Instalar dependências do shared
cd shared && npm install && cd ..

# Subir todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### Acessar Interfaces

```bash
# Prometheus
open http://localhost:9090

# Grafana (admin/admin123)
open http://localhost:3000

# cAdvisor
open http://localhost:8080

# Gateway
curl http://localhost/health
```

---

## 📊 Verificar Métricas

### Testar Endpoints de Métricas

```bash
# Auth Service
curl http://localhost:3001/metrics

# Usuarios Service
curl http://localhost:3002/metrics

# Produtos Service
curl http://localhost:3005/metrics

# Ver métricas específicas
curl http://localhost:3001/metrics | grep http_requests_total
```

### Queries Prometheus Úteis

```bash
# Abrir Prometheus
open http://localhost:9090/graph

# Cola essas queries:

# Taxa de requisições por segundo
rate(http_requests_total[5m])

# Latência P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# Taxa de erro
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# CPU dos containers
rate(container_cpu_usage_seconds_total{name=~".*-service"}[5m]) * 100

# Memória dos containers
container_memory_usage_bytes{name=~".*-service"} / 1024 / 1024

# Cache hit rate
(sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))) * 100
```

---

## 🏥 Health Checks

### Verificar Todos os Serviços

```bash
# Loop para testar todos
for port in 3001 3002 3003 3004 3005 3006 3007; do
  echo "Testando porta $port..."
  curl -s http://localhost:$port/health | jq
done

# Verificar Gateway
curl http://localhost/health
```

### Health Check Detalhado

```bash
# Ver status completo
curl http://localhost:3001/health | jq

# Ver apenas status
curl http://localhost:3001/health | jq -r .status

# Verificar uptime
curl http://localhost:3001/health | jq -r .uptime
```

---

## 📝 Logs

### Ver Logs de Serviços

```bash
# Logs em tempo real
docker logs -f auth-service

# Últimas 100 linhas
docker logs --tail 100 auth-service

# Logs com timestamp
docker logs -t auth-service

# Buscar erro específico
docker logs auth-service | grep ERROR

# Ver logs do Nginx
docker logs api-gateway | grep "request_time"
```

### Logs do Prometheus

```bash
# Ver logs do Prometheus
docker logs prometheus

# Ver configuração carregada
docker exec prometheus cat /etc/prometheus/prometheus.yml

# Validar regras de alertas
docker exec prometheus promtool check rules /etc/prometheus/alerts.yml
```

---

## 🔍 Debugging

### Entrar no Container

```bash
# Bash no container
docker exec -it auth-service sh

# Ver processos
docker exec auth-service ps aux

# Ver variáveis de ambiente
docker exec auth-service env

# Ver arquivos
docker exec auth-service ls -la /app
```

### Verificar Conectividade

```bash
# De dentro do container
docker exec auth-service wget -qO- http://redis:6379

# Testar banco de dados
docker exec auth-service node -e "const {Sequelize} = require('sequelize'); const seq = new Sequelize(process.env.DATABASE_URL); seq.authenticate().then(() => console.log('OK')).catch(console.error)"

# Ping no Redis
docker exec auth-service redis-cli -h redis ping
```

### Ver Uso de Recursos

```bash
# CPU e memória de todos os containers
docker stats

# Apenas um serviço
docker stats auth-service --no-stream

# Ver processos no container
docker top auth-service
```

---

## 🔧 Manutenção

### Reiniciar Serviços

```bash
# Reiniciar um serviço
docker-compose restart auth-service

# Reiniciar todos
docker-compose restart

# Rebuild e reiniciar
docker-compose up -d --build auth-service
```

### Limpar Cache e Volumes

```bash
# Limpar cache do Nginx
docker exec api-gateway rm -rf /var/cache/nginx/*
docker exec api-gateway nginx -s reload

# Limpar Redis
docker exec redis-cache redis-cli FLUSHALL

# Limpar volumes do Prometheus
docker-compose down -v
```

### Atualizar Configurações

```bash
# Recarregar Nginx
docker exec api-gateway nginx -s reload

# Recarregar Prometheus
curl -X POST http://localhost:9090/-/reload

# Verificar configuração do Nginx
docker exec api-gateway nginx -t
```

---

## 📦 Build e Deploy

### Rebuild de Imagens

```bash
# Rebuild um serviço
docker-compose build auth-service

# Rebuild todos
docker-compose build

# Rebuild sem cache
docker-compose build --no-cache

# Build e sobe
docker-compose up -d --build
```

### Ver Imagens

```bash
# Listar imagens
docker images | grep nova-api

# Ver tamanho das imagens
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Limpar imagens não usadas
docker image prune -a
```

---

## 🧪 Testes

### Testar Rate Limiting

```bash
# Enviar 100 requisições rápidas
for i in {1..100}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/auth/login
done

# Espera ver alguns 429 (Too Many Requests)
```

### Testar Circuit Breaker

```bash
# 1. Parar serviço downstream
docker stop categorias-service

# 2. Fazer requisições ao produtos-service
for i in {1..10}; do
  curl http://localhost:3005/api/produtos
done

# 3. Verificar logs (deve ver circuit breaker OPEN)
docker logs produtos-service | grep "circuit breaker"

# 4. Religar serviço
docker start categorias-service
```

### Simular Alta Carga

```bash
# Instalar Apache Bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Enviar 1000 requisições com 10 concorrentes
ab -n 1000 -c 10 http://localhost/api/produtos

# Ver métricas no Prometheus
open http://localhost:9090/graph
# Query: rate(http_requests_total[1m])
```

---

## 📈 Monitoramento

### Ver Alertas Ativos

```bash
# Lista de alertas
curl http://localhost:9090/api/v1/alerts | jq

# Apenas alertas firing
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'

# Ver no navegador
open http://localhost:9090/alerts
```

### Exportar Métricas

```bash
# Salvar snapshot das métricas
curl http://localhost:9090/api/v1/query?query=up > metricas_$(date +%Y%m%d).json

# Exportar para CSV
curl http://localhost:9090/api/v1/query?query=http_requests_total | \
  jq -r '.data.result[] | [.metric.service, .metric.status_code, .value[1]] | @csv'
```

---

## 🔐 Segurança

### Ver Logs de Autenticação

```bash
# Logins realizados
docker logs auth-service | grep "Login realizado"

# Tentativas de login falhadas
docker logs auth-service | grep "Login falhou"

# Requisições bloqueadas por rate limit
docker logs api-gateway | grep "limiting requests"
```

### Verificar Conexões Abertas

```bash
# Conexões ao Redis
docker exec redis-cache redis-cli CLIENT LIST

# Conexões ao banco (se PostgreSQL)
# docker exec postgres psql -U user -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🚨 Troubleshooting

### Serviço Não Inicia

```bash
# Ver logs de erro
docker logs auth-service

# Ver último comando executado
docker inspect auth-service | jq '.[0].Config.Cmd'

# Ver variáveis de ambiente
docker inspect auth-service | jq '.[0].Config.Env'

# Verificar se porta está em uso
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### Prometheus Não Coleta Métricas

```bash
# Ver targets do Prometheus
curl http://localhost:9090/api/v1/targets | jq

# Ver target específico
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="auth-service")'

# Testar conectividade
docker exec prometheus wget -qO- http://auth-service:3001/metrics
```

### Container Crashando

```bash
# Ver exit code
docker ps -a | grep auth-service

# Ver eventos
docker events --filter container=auth-service

# Verificar uso de memória antes do crash
docker stats --no-stream auth-service

# Ver OOM kills
dmesg | grep -i "out of memory"
```

---

## 📊 Queries Prometheus Avançadas

### Top 5 Endpoints Mais Lentos

```promql
topk(5,
  histogram_quantile(0.95,
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route, service)
  )
)
```

### Taxa de Erro por Endpoint

```promql
(
  sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route, service) /
  sum(rate(http_requests_total[5m])) by (route, service)
) * 100
```

### Previsão de Quando Atingir Limite

```promql
predict_linear(
  container_memory_usage_bytes{name="auth-service"}[1h], 3600
)
```

### Endpoints com Mais Cache Miss

```promql
topk(5,
  sum(rate(cache_misses_total[5m])) by (cache_key, service) /
  (sum(rate(cache_hits_total[5m])) by (cache_key, service) +
   sum(rate(cache_misses_total[5m])) by (cache_key, service))
)
```

---

## 💡 Dicas

### Aliases Úteis (adicionar ao .bashrc/.zshrc)

```bash
alias dps='docker-compose ps'
alias dup='docker-compose up -d'
alias ddown='docker-compose down'
alias dlogs='docker-compose logs -f'
alias dstats='docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"'
```

### Watch Contínuo

```bash
# Monitorar health checks a cada 5s
watch -n 5 'curl -s http://localhost:3001/health | jq ".status"'

# Monitorar CPU dos containers
watch -n 2 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"'
```

### Backup Rápido de Métricas

```bash
# Criar snapshot do Prometheus
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Copiar para host
docker cp prometheus:/prometheus/snapshots ./backups/
```

---

## 🎓 Recursos de Aprendizado

### Documentação Oficial

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- Docker: https://docs.docker.com/

### Queries PromQL

- https://prometheus.io/docs/prometheus/latest/querying/basics/
- https://promlabs.com/promql-cheat-sheet/

### Dashboards Prontos (Grafana)

- https://grafana.com/grafana/dashboards/
- ID 1860: Node Exporter Full
- ID 893: Docker and System Monitoring

---

**Última atualização**: Janeiro 2025  
**Mantido por**: Time de DevOps

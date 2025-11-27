# Estratégia de Deploy - Sistema Estoque Raiz

## Visão Geral

Este documento define as estratégias de deploy utilizadas no Sistema WMS Estoque Raiz, cobrindo tanto a API (backend de microserviços) quanto o aplicativo mobile (React Native).

---

## 1. Estratégia de Deploy da API

### 1.1 Modelo: Blue-Green Deployment

A API utiliza estratégia de deploy Blue-Green para garantir disponibilidade contínua e capacidade de rollback instantâneo.

### 1.2 Ambientes

#### Staging (Develop Branch)

- URL: https://staging-api.estoqueraiz.com
- Objetivo: Testes de integração e validação antes da produção
- Deploy automático: Sim
- Aprovação manual: Não

#### Production Blue (Main Branch)

- URL: https://api.estoqueraiz.com (ambiente primário)
- Objetivo: Ambiente de produção ativo
- Deploy automático: Sim
- Aprovação manual: Sim (via GitHub Environments)

#### Production Green (Main Branch)

- URL: https://api.estoqueraiz.com (ambiente secundário)
- Objetivo: Ambiente de produção em standby para rollback
- Deploy automático: Não
- Mantido com versão anterior estável

### 1.3 Fluxo de Deploy Blue-Green

```
1. Estado Inicial:
   - Green: Produção ativa (v1.0)
   - Blue: Inativo

2. Deploy Nova Versão:
   - Build da v1.1 → Deploy no Blue
   - Testes automatizados no Blue
   - Health checks no Blue

3. Switch de Tráfego:
   - Load Balancer redireciona de Green → Blue
   - Blue passa a receber 100% do tráfego
   - Green permanece ativo por 1 hora

4. Validação:
   - Monitoramento de métricas (latência, erros, CPU)
   - Se OK: Green é desligado após 1 hora
   - Se ERRO: Rollback imediato para Green

5. Próximo Deploy:
   - Blue vira o novo Green (produção ativa)
   - Processo se inverte
```

### 1.4 Componentes do Deploy

#### Docker Compose Files

**docker-compose.blue.yml**

```yaml
services:
  nginx:
    image: ghcr.io/lucassc98/estoqueraiz-nginx:latest
    ports:
      - "8080:80"
    environment:
      - ENV=blue

  auth-service:
    image: ghcr.io/lucassc98/estoqueraiz-auth-service:latest

  produtos-service:
    image: ghcr.io/lucassc98/estoqueraiz-produtos-service:latest
```

**docker-compose.green.yml**

```yaml
services:
  nginx:
    image: ghcr.io/lucassc98/estoqueraiz-nginx:previous
    ports:
      - "8081:80"
    environment:
      - ENV=green

  auth-service:
    image: ghcr.io/lucassc98/estoqueraiz-auth-service:previous

  produtos-service:
    image: ghcr.io/lucassc98/estoqueraiz-produtos-service:previous
```

#### Load Balancer Configuration

Nginx upstream configurado para alternar entre Blue (8080) e Green (8081):

```nginx
upstream backend {
    server blue-env:8080 weight=100;
    server green-env:8081 weight=0 backup;
}
```

### 1.5 Health Checks

Cada microserviço expõe endpoints de saúde:

```
GET /health
Response:
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.1.0",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

Health checks são executados:

- Durante deploy: A cada 10 segundos por 5 minutos
- Em produção: A cada 30 segundos via Prometheus

### 1.6 Rollback

#### Rollback Automático

Acionado se:

- Health checks falharem por 3 minutos consecutivos
- Taxa de erro > 5% por 2 minutos
- Latência p99 > 2 segundos por 5 minutos

#### Rollback Manual

```bash
docker-compose -f docker-compose.green.yml up -d
```

Tempo de rollback: < 30 segundos

---

## 2. Estratégia de Deploy do App Mobile

### 2.1 Modelo: Over-The-Air (OTA) Updates via Expo

O aplicativo utiliza Expo para atualizações OTA, permitindo deploy de código JavaScript sem reenvio às lojas.

### 2.2 Canais de Release

#### Staging Channel

- Canal: `staging`
- Objetivo: Testes internos pela equipe Agrológica
- Deploy automático: Sim (branch develop)
- Disponível via: Expo Go App

#### Production Channel

- Canal: `production`
- Objetivo: Usuários finais em produção
- Deploy automático: Sim (branch main, após aprovação)
- Disponível via: App instalado das lojas

### 2.3 Fluxo de Deploy OTA

```
1. Build e Teste:
   - CI verifica TypeScript e lint
   - Build APK/IPA para testes

2. Publish Staging:
   - expo publish --release-channel staging
   - QA testa no Expo Go
   - Validação de funcionalidades

3. Publish Production:
   - expo publish --release-channel production
   - Usuários recebem update automaticamente
   - Primeira abertura após deploy carrega nova versão

4. Monitoramento:
   - Crash reports via Sentry
   - Analytics via Firebase
   - Feedback de usuários
```

### 2.4 Atualizações de Binário

Para mudanças que requerem código nativo (permissões, bibliotecas nativas):

```
1. Build nativo:
   - npx expo build:android
   - npx expo build:ios

2. Submissão:
   - Google Play Store (revisão ~2-3 dias)
   - Apple App Store (revisão ~1-2 dias)

3. Lançamento faseado:
   - Dia 1: 10% dos usuários
   - Dia 3: 50% dos usuários
   - Dia 5: 100% dos usuários
```

### 2.5 Rollback de App

#### OTA Rollback

```bash
expo publish --release-channel production --version 1.0.0
```

#### Binário Rollback

- Google Play: Rollback via console (instantâneo)
- App Store: Submeter versão anterior (revisão necessária)

---

## 3. Infraestrutura e Requisitos

### 3.1 Servidores

#### Produção

- Servidor 1 (Blue): 4 vCPU, 8GB RAM, 100GB SSD
- Servidor 2 (Green): 4 vCPU, 8GB RAM, 100GB SSD
- Load Balancer: Nginx (separado)
- Banco de Dados: PostgreSQL 15 (servidor dedicado)
- Cache: Redis Cluster (3 nós)

#### Staging

- Servidor 1: 2 vCPU, 4GB RAM, 50GB SSD
- Banco de Dados: PostgreSQL 15 (compartilhado)
- Cache: Redis standalone

### 3.2 CI/CD

#### GitHub Actions

- Runners: Ubuntu latest
- Secrets necessários:
  - GITHUB_TOKEN (automático)
  - EXPO_TOKEN (Expo account)
  - DOCKER_REGISTRY_TOKEN (GHCR)

#### Artifacts

- Docker images: GitHub Container Registry
- APK/IPA builds: GitHub Actions Artifacts (30 dias)

---

## 4. Métricas e SLOs

### 4.1 SLOs de Deploy

- Frequência de deploy: 2x por semana (mínimo)
- Tempo de deploy: < 10 minutos
- Taxa de sucesso: > 95%
- Tempo de rollback: < 5 minutos

### 4.2 Monitoramento Pós-Deploy

Métricas observadas por 1 hora após deploy:

- Latência p50, p95, p99
- Taxa de erro HTTP (4xx, 5xx)
- Uso de CPU e memória
- Conexões de banco de dados
- Crash rate do app mobile

### 4.3 Critérios de Sucesso

Deploy considerado bem-sucedido se:

- Taxa de erro < 1%
- Latência p99 < 500ms
- CPU < 70% de uso
- Zero crashes críticos no app
- Feedback positivo da equipe Agrológica

---

## 5. Procedimentos de Emergência

### 5.1 Deploy com Problema Crítico

```bash
1. Identificar ambiente problemático (Blue ou Green)
2. Executar rollback imediato:
   ./scripts/rollback-production.sh
3. Notificar equipe via Slack
4. Investigar logs:
   docker-compose logs -f --tail=100
5. Aplicar hotfix em branch separada
6. Testar em staging
7. Re-deploy quando corrigido
```

### 5.2 Perda Total de Ambiente

```bash
1. Restaurar do backup mais recente
2. Subir ambiente Green (sempre mantido)
3. Redirecionar DNS se necessário
4. Validar integridade dos dados
5. Comunicar downtime aos usuários
```

### 5.3 Contatos de Emergência

- DevOps Lead: Disponível 24/7
- CEO Agrológica: Antônio Botelho
- Suporte Técnico: suporte@agrologica.com.br

---

## 6. Checklist de Deploy

### Pré-Deploy

- [ ] Testes passando em staging
- [ ] Documentação atualizada
- [ ] Changelog preenchido
- [ ] Backups validados
- [ ] Equipe notificada

### Durante Deploy

- [ ] Health checks validados
- [ ] Logs monitorados
- [ ] Métricas observadas
- [ ] Testes de fumaça executados

### Pós-Deploy

- [ ] Validação funcional
- [ ] Comunicação aos usuários
- [ ] Documentação de incidentes (se houver)
- [ ] Retrospectiva agendada

---

## 7. Versionamento

### Semantic Versioning

Formato: MAJOR.MINOR.PATCH

- MAJOR: Mudanças incompatíveis (breaking changes)
- MINOR: Novas funcionalidades compatíveis
- PATCH: Correções de bugs

Exemplos:

- 1.0.0 → Lançamento inicial
- 1.1.0 → Nova funcionalidade (relatórios)
- 1.1.1 → Correção de bug (validação)
- 2.0.0 → Mudança na API (breaking)

---

## 8. Integração Futura com ERP AGROTITAN

### Fase 1: Sincronização Unidirecional

- Deploy de serviço de integração separado
- Leitura de dados do AGROTITAN
- Sem impacto em deploys principais

### Fase 2: Sincronização Bidirecional

- Deploy coordenado entre sistemas
- Testes de integração obrigatórios
- Rollback coordenado se necessário

---

## Conclusão

Esta estratégia garante:

- Disponibilidade contínua (zero downtime)
- Rollback rápido e seguro
- Testes adequados antes de produção
- Rastreabilidade completa de versões
- Alinhamento com objetivos da Agrológica

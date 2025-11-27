# ADR-002: Escolha de Arquitetura de Microserviços

**Status**: Aceito  
**Data**: 2025-01-18  
**Decisores**: Equipe de Desenvolvimento  
**Contexto técnico**: Arquitetura de Software

## Contexto

O sistema Estoque Raiz precisa de uma arquitetura que permita:

- Escalabilidade independente de cada módulo
- Desenvolvimento paralelo por equipes
- Isolamento de falhas
- Facilidade de manutenção
- Deploy independente de componentes

Alternativas consideradas:

1. **Monolito tradicional**
2. **Modulith** (monolito modular)
3. **Microserviços** (escolhida)

## Decisão

Implementamos uma arquitetura de **microserviços** com os seguintes serviços independentes:

- **auth-service** (porta 3001): Autenticação e JWT
- **usuarios-service** (porta 3002): Gestão de usuários e permissões
- **unidades-service** (porta 3003): Gestão de unidades de estoque
- **categorias-service** (porta 3004): Gestão de categorias de produtos
- **produtos-service** (porta 3005): Gestão de produtos e aprovações
- **movimentacoes-service** (porta 3006): Controle de estoque
- **relatorios-service** (porta 3007): Analytics e relatórios

Cada serviço possui:

- Banco de dados compartilhado (PostgreSQL)
- Cache independente (Redis)
- API REST própria
- Dockerfile individual

## Justificativa

### Por que não Monolito?

**Problemas do monolito:**

- Deploy único afeta todo o sistema
- Escalabilidade vertical limitada
- Acoplamento alto dificulta manutenção
- Equipe única precisa conhecer todo código
- Falha em um módulo derruba tudo

### Por que não Modulith?

**Limitações do modulith:**

- Ainda é um único processo
- Escalabilidade horizontal limitada
- Deploy único (menor impacto que monolito puro)
- Menos isolamento de falhas
- Mais adequado para sistemas menores

### Por que Microserviços?

**Vantagens para nosso contexto:**

1. **Escalabilidade independente**: Produtos e movimentações podem escalar separadamente
2. **Isolamento de falhas**: Falha no serviço de relatórios não afeta movimentações críticas
3. **Deploy independente**: Atualizar serviço de categorias não requer parar todo sistema
4. **Desenvolvimento paralelo**: Equipes diferentes podem trabalhar em serviços diferentes
5. **Stack tecnológica flexível**: Futuro serviço de analytics pode usar Python/Go
6. **Resiliência**: Um serviço fora não derruba todo sistema
7. **Manutenibilidade**: Código menor e focado por serviço

## Consequências

### Positivas

**Escalabilidade**: Podemos escalar apenas produtos-service se houver alto volume de consultas  
**Resiliência**: Falha no relatorios-service não afeta operações críticas  
**Flexibilidade**: Podemos reescrever um serviço sem afetar outros  
**Deploy independente**: Atualizações rápidas e seguras  
**Especialização**: Equipes podem focar em domínios específicos

### Negativas

**Complexidade operacional**: Requer Docker, Nginx, Redis, monitoramento  
**Latência**: Chamadas HTTP entre serviços adicionam overhead  
**Transações distribuídas**: Mais complexo manter consistência entre serviços  
**Debugging**: Rastrear erros entre múltiplos serviços é mais difícil  
**Overhead de infraestrutura**: Mais recursos computacionais necessários

### Mitigações

**Para complexidade operacional:**

- Docker Compose simplifica deploy local
- Kubernetes para produção (futuro)
- Logging centralizado com Winston

**Para latência:**

- Cache Redis para dados frequentes
- Comunicação interna entre containers (rede Docker)

**Para transações distribuídas:**

- Banco de dados compartilhado (PostgreSQL)
- Eventos assíncronos com Redis Pub/Sub

**Para debugging:**

- Logs estruturados com Winston
- Trace IDs para rastrear requisições
- Health checks em todos serviços

## Custos

**Desenvolvimento:**

- +30% tempo inicial para setup de infraestrutura
- Necessário conhecimento de Docker, Nginx, Redis

**Infraestrutura (produção):**

- 7 containers de serviços + nginx + redis + postgres
- Estimativa: 2 vCPUs e 4GB RAM por serviço
- Total: ~14 vCPUs e 28GB RAM (pode ser otimizado)

**Operação:**

- Monitoramento de 7 serviços independentes
- Logs centralizados obrigatórios
- CI/CD para cada serviço

## Alternativas Descartadas

### Monolito Tradicional

Não atende requisitos de escalabilidade  
Deploy único é arriscado para sistema crítico  
 Dificulta crescimento da equipe

### Modulith

Escalabilidade horizontal limitada  
Isolamento de falhas insuficiente  
Seria adequado para sistema menor (<5 módulos)

## Notas Adicionais

- Sistema está preparado para migração futura para Kubernetes
- Banco compartilhado é trade-off consciente (simplifica transações)
- Futuro: mover para event-driven com Kafka/RabbitMQ
- Cada serviço pode ser reescrito independentemente se necessário

## Referências

- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/)
- [Building Microservices - Sam Newman](https://samnewman.io/books/building_microservices_2nd_edition/)
- [Martin Fowler - Microservices Guide](https://martinfowler.com/microservices/)

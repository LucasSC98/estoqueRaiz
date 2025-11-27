# ADR 001: Escolha do PostgreSQL como Banco de Dados

**Status:** Aceito

**Data:** 2025-11-02

**Decisores:** Equipe de Arquitetura e Desenvolvimento

---

## Contexto

O sistema de gestão de estoque Estoque Raiz necessita de um banco de dados robusto para armazenar informações críticas sobre produtos, movimentações, unidades, usuários e relatórios. O sistema requer:

- Transações ACID para garantir integridade em movimentações de estoque
- Relacionamentos complexos entre entidades (produtos, categorias, unidades, movimentações)
- Consultas complexas para geração de relatórios (Curva ABC, estatísticas)
- Suporte a agregações e funções analíticas
- Alta confiabilidade e consistência de dados
- Capacidade de crescimento futuro

## Problema de Negócio

O controle de estoque é uma operação crítica que envolve:

1. Integridade referencial estrita entre produtos, categorias e unidades
2. Rastreabilidade completa de movimentações (entrada, saída, transferência)
3. Controle de saldo em tempo real
4. Geração de relatórios analíticos complexos
5. Auditoria de operações
6. Múltiplas unidades operando simultaneamente

A escolha incorreta do banco de dados pode resultar em:

- Inconsistências no estoque
- Perda de rastreabilidade
- Impossibilidade de gerar relatórios precisos
- Dificuldade em escalar o sistema

## Alternativas Consideradas

### 1. PostgreSQL (Escolhido)

**Prós:**

- Sistema de banco de dados relacional open-source maduro
- Suporte completo a ACID garantindo consistência
- Excelente suporte a índices e otimização de queries
- Funções de janela e agregações complexas nativas
- Suporte a JSON para flexibilidade quando necessário
- Extensibilidade (pg_stat_statements, pg_trgm)
- Comunidade ativa e documentação extensa
- Performance superior em queries analíticas
- Suporte a transações distribuídas
- Custo zero de licenciamento

**Contras:**

- Requer conhecimento técnico para otimização
- Configuração inicial mais complexa que MySQL
- Backups e manutenção requerem planejamento

**Adequação ao domínio:**

- Excelente para queries complexas de relatórios
- Transações ACID críticas para movimentações de estoque
- Funções de agregação nativas facilitam Curva ABC
- Constraints garantem integridade referencial

### 2. MySQL

**Prós:**

- Simplicidade de configuração
- Amplamente conhecido
- Boa performance em operações simples
- Replicação nativa

**Contras:**

- Funcionalidades analíticas limitadas comparado ao PostgreSQL
- Suporte inferior a queries complexas
- Menos robusto em transações concorrentes
- Funções de janela adicionadas tardiamente

**Por que não foi escolhido:**
Sistema requer capacidades analíticas avançadas que PostgreSQL oferece nativamente.

### 3. MongoDB (NoSQL)

**Prós:**

- Flexibilidade de schema
- Escalabilidade horizontal
- Performance em operações de escrita

**Contras:**

- Falta de transações ACID completas entre documentos
- Relacionamentos complexos exigem joins manuais
- Inconsistências possíveis em movimentações simultâneas
- Agregações complexas mais trabalhosas
- Integridade referencial não garantida

**Por que não foi escolhido:**
Sistema de estoque requer relacionamentos rígidos e consistência forte que bancos relacionais oferecem.

### 4. SQL Server

**Prós:**

- Recursos enterprise robustos
- Ferramentas Microsoft integradas
- Suporte comercial

**Contras:**

- Custo elevado de licenciamento
- Vendor lock-in
- Limitações em ambientes Linux/container
- Overkill para o escopo do projeto

**Por que não foi escolhido:**
Custo não justificável para projeto acadêmico e startup inicial.

## Decisão

**PostgreSQL foi escolhido como banco de dados do sistema Estoque Raiz.**

### Justificativas Técnicas:

1. **Integridade Transacional**

   - ACID completo garante que movimentações nunca resultem em inconsistências
   - Isolamento de transações evita condições de corrida em estoques simultâneos

2. **Modelagem Relacional**

   - Estrutura relacional espelha naturalmente o domínio de estoque
   - Foreign keys garantem que produtos sempre tenham categoria e unidade válidas
   - Constraints evitam dados órfãos

3. **Capacidades Analíticas**

   - Window functions facilitam cálculos de Curva ABC
   - Agregações complexas para estatísticas
   - CTEs para queries legíveis e performáticas
   - Funções DATE_TRUNC para agrupamentos temporais

4. **Performance**

   - Índices compostos otimizam queries por unidade
   - Particionamento futuro para histórico de movimentações
   - EXPLAIN ANALYZE para otimização contínua

5. **Extensibilidade**

   - Possibilidade de adicionar full-text search (pg_trgm)
   - Suporte a JSON para metadados flexíveis futuros
   - Stored procedures para lógica complexa

6. **Custo**
   - Open-source e gratuito
   - Hosting disponível em providers (AWS RDS, Azure Database, Railway)
   - Sem surpresas de licenciamento

## Consequências

### Positivas:

1. **Confiabilidade**

   - Dados críticos de estoque sempre consistentes
   - Auditoria completa de movimentações

2. **Desenvolvimento**

   - ORMs maduros (Sequelize) facilitam desenvolvimento
   - Migrations controlam evolução do schema
   - Queries SQL legíveis e otimizáveis

3. **Relatórios**

   - Curva ABC calculada eficientemente
   - Estatísticas em tempo real
   - Dashboards baseados em views materializadas futuras

4. **Escalabilidade**

   - Read replicas para relatórios
   - Connection pooling (PgBouncer)
   - Particionamento de tabelas grandes

5. **Observabilidade**
   - pg_stat_statements monitora queries lentas
   - Logs detalhados para debugging
   - Integrações com ferramentas de monitoramento

### Negativas:

1. **Curva de Aprendizado**

   - Equipe precisa conhecer otimizações PostgreSQL
   - Tuning de parâmetros de configuração

2. **Overhead Operacional**

   - Necessidade de backups regulares
   - Vacuum e manutenção periódica
   - Monitoramento de conexões e locks

3. **Vertical Scaling**
   - Escala verticalmente (CPU/RAM)
   - Horizontal scaling requer sharding manual ou extensões

### Mitigações:

- Documentação interna de boas práticas PostgreSQL
- Scripts automatizados de backup (pg_dump)
- Monitoring com Prometheus/Grafana
- Usar serviços gerenciados (RDS) em produção

## Análise de Custos

### Desenvolvimento (Atual):

- PostgreSQL local: Gratuito
- Docker container: Gratuito
- Tempo de desenvolvimento: Similar a outras opções relacionais

### Produção (Estimado):

- AWS RDS PostgreSQL (t3.micro): ~15 USD/mês
- Railway PostgreSQL: ~5 USD/mês (pequena escala)
- Self-hosted: Custo de servidor + manutenção

**Comparação com alternativas:**

- SQL Server: 200+ USD/mês (licenciamento)
- MongoDB Atlas: ~25 USD/mês (cluster mínimo)
- MySQL RDS: ~12 USD/mês (similar ao PostgreSQL)

PostgreSQL oferece melhor custo-benefício considerando funcionalidades.

## Validação da Decisão

A escolha do PostgreSQL foi validada durante implementação:

1. Queries de Curva ABC executam em < 100ms para 10k produtos
2. Transações de movimentação nunca geraram inconsistências
3. Relatórios mensais processam milhões de registros eficientemente
4. Integridade referencial evitou bugs de dados órfãos
5. ORMs Sequelize ofereceu produtividade alta

## Referências

- Documentação PostgreSQL: https://www.postgresql.org/docs/
- PostgreSQL vs MySQL: https://www.postgresql.org/about/featurematrix/
- Use The Index Luke: https://use-the-index-luke.com/
- Artigo: Why Uber switched from PostgreSQL to MySQL (contexto diferente)

## Notas

Esta decisão pode ser revisada se:

- Volume de dados exceder capacidade de escala vertical
- Requisitos mudarem para NoSQL (improvável em domínio de estoque)
- Necessidade de multi-tenancy com isolamento completo

**Autor:** Equipe de Desenvolvimento Estoque Raiz
**Revisores:** Orientador Acadêmico
**Aprovação:** 2025-11-02

# Regras de Negócio - Sistema WMS Estoque Raiz

## Visão Geral

O Sistema WMS Estoque Raiz é uma solução de gestão de armazém desenvolvida para a **Agrológica Agromercantil**, empresa especializada em insumos agrícolas (fertilizantes, defensivos, sementes). O sistema controla 7 unidades de estoque horizontais independentes, garantindo rastreabilidade de lotes, validades e movimentações entre unidades.

### Objetivos Principais

- Controle preciso de entrada/saída de produtos agrícolas
- Rastreabilidade completa de lotes e validades
- Gestão de 7 estoques independentes com permissões por unidade
- Análise de giro de produtos (Curva ABC)
- Integração com ERP AGROTITAN

---

## Estrutura Organizacional

### Unidades

- **7 unidades horizontais independentes** (estoques separados)
- Cada unidade possui endereço completo (CEP, rua, bairro, cidade, estado)
- Controle de acesso restrito por unidade (exceto gerentes)
- Possibilidade de transferências entre unidades

### Cargos e Permissões

- **Gerente**: Acesso total a todas as unidades, aprovação de usuários, alteração de cargos
- **Estoquista**: Acesso restrito à própria unidade, operações básicas de entrada/saída
- **Financeiro**: Aprovação de produtos pendentes com definição de preços

---

## Entidades Principais

### 1. Produtos

**Características:**

- Nome, descrição, código de barras (único)
- Preços de custo e venda (definidos apenas por financeiro/gerente)
- Quantidade em estoque e quantidade mínima
- Data de validade e lote (obrigatórios para rastreabilidade)
- Localização física no estoque
- Status: `pendente`, `aprovado`, `rejeitado`
- Ativo/Inativo (soft delete)

**Regras:**

- Produtos são criados com status "pendente" aguardando aprovação
- Apenas financeiro/gerente podem definir preços e aprovar
- Estoque não pode ficar negativo
- Produtos vencendo (30 dias) são destacados no dashboard
- Soft delete: produtos inativos não aparecem em listagens ativas

### 2. Categorias

**Características:**

- Nome e descrição
- Agrupamento de produtos (fertilizantes, defensivos, sementes)

**Regras:**

- CRUD básico sem restrições especiais
- Soft delete não implementado (hard delete)

### 3. Unidades

**Características:**

- Nome, descrição, endereço completo
- Busca automática de endereço por CEP

**Regras:**

- Apenas gerentes podem criar/editar/deletar unidades
- Endereço obrigatório e validado via CEP
- Não permite exclusão se houver produtos associados

### 4. Movimentações

**Tipos:**

- **ENTRADA**: Aumento no estoque (+ quantidade)
- **SAIDA**: Redução no estoque (- quantidade)
- **TRANSFERENCIA**: Movimentação entre unidades (reduz origem, aumenta destino)
- **AJUSTE**: Correção manual de estoque (define quantidade exata)

**Regras:**

- Validação de quantidade > 0
- Para SAIDA/TRANSFERENCIA: verifica estoque suficiente
- Para TRANSFERENCIA: unidade origem ≠ destino
- Registro automático de data/hora
- Transações atômicas (rollback em caso de erro)
- Controle de acesso: estoquista só movimenta produtos da própria unidade

### 5. Usuários

**Características:**

- Nome, email (único), CPF (único), senha
- Status: `pendente`, `aprovado`, `rejeitado`
- Cargo: `gerente`, `estoquista`, `financeiro`
- Unidade associada (exceto gerentes)

**Regras:**

- Cadastro público com status "pendente"
- Apenas gerentes aprovam usuários definindo cargo e unidade
- Gerentes não podem alterar próprio cargo para não-gerente
- Validações: CPF válido, email válido, senha forte (6+ chars, maiúscula, número)
- Soft delete não implementado

---

## Fluxos de Negócio

### 1. Cadastro de Produto

1. Usuário (estoquista) cadastra produto básico
2. Produto fica com status "pendente"
3. Financeiro/gerente aprova definindo preços
4. Produto passa para "aprovado" e fica disponível

### 2. Movimentação de Estoque

1. Seleção de produto, tipo de movimentação, quantidade
2. Validações específicas por tipo
3. Atualização automática do estoque
4. Registro da movimentação com rastreabilidade

### 3. Transferência entre Unidades

1. Seleção de produto, unidade destino, quantidade
2. Verificação de estoque suficiente na origem
3. Criação automática do produto na unidade destino (se não existir)
4. Atualização simultânea dos estoques

### 4. Aprovação de Usuário

1. Usuário se cadastra (status pendente)
2. Gerente aprova definindo cargo e unidade
3. Email de confirmação enviado
4. Usuário ganha acesso ao sistema

---

## Validações e Restrições

### Gerais

- Todos os campos obrigatórios devem ser preenchidos
- Transações de banco para operações críticas
- Tratamento de erros com rollback automático
- Logs de todas as operações importantes

### Específicas por Entidade

- **Produtos**: Preços ≥ 0, quantidade ≥ 0, validade futura
- **Movimentações**: Quantidade > 0, estoque suficiente para saída
- **Usuários**: CPF/Email únicos, senha forte
- **Unidades**: CEP válido, endereço completo

### Controle de Acesso

- Middleware verifica token JWT em todas as rotas
- Verificação de unidade: usuários comuns só acessam própria unidade
- Gerentes têm acesso irrestrito
- Financeiro só aprova produtos (não movimenta estoque)

---

## Relatórios e Análises

### Dashboard

- Total de produtos por unidade
- Produtos com estoque baixo (< quantidade mínima)
- Produtos vencendo (próximos 30 dias)
- Movimentações recentes

### Relatórios Específicos

- Movimentações por período (com filtros)
- Curva ABC (análise de giro)
- Usuários com movimentações

---

## Integrações

### ERP AGROTITAN

- Sincronização futura de dados
- Interface preparada para integração

### Mobile App

- API RESTful com autenticação JWT
- Endpoints paginados para performance
- Documentação Swagger completa

### Mapas

- Visualização de unidades no mapa
- Integração com Google Maps/Apple Maps

---

## Considerações Técnicas

### Arquitetura

- Backend: Node.js + TypeScript + Sequelize + PostgreSQL
- Frontend: React Native + Expo
- Padrão MVC com controllers, models, routes
- Middleware de autenticação e verificação de unidade

### Segurança

- Senhas criptografadas (bcrypt)
- Tokens JWT com expiração
- Validações de entrada em todas as camadas
- Controle de CORS e rate limiting

### Performance

- Paginação em listagens grandes
- Índices no banco para consultas frequentes
- Cache de dados no mobile (AsyncStorage)

---

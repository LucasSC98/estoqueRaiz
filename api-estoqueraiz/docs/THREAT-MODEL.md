# Threat Model - Sistema Estoque Raiz

## Escopo

Análise de ameaças para o sistema WMS da Agrológica Agromercantil, focando nos fluxos críticos de autenticação e movimentação de estoque.

---

## 1. VISÃO GERAL DO SISTEMA

### Ativos Críticos

**Dados:**

- Credenciais de usuários (senhas, tokens JWT)
- Informações de produtos e estoques
- Dados de movimentações financeiras
- Informações de unidades e localização
- Logs de auditoria

**Infraestrutura:**

- API Gateway (Nginx)
- 7 Microserviços (Node.js)
- Banco de dados PostgreSQL
- Redis Cache
- GitHub Container Registry
- Servidor de produção

**Processos:**

- Autenticação e autorização
- Movimentação de estoque
- Transferência entre unidades
- Aprovação de produtos
- Relatórios financeiros

---

## 2. THREAT MODEL - FLUXO DE LOGIN

### 2.1 Diagrama de Fluxo

**Diagrama de Fluxo de Login:**

![Diagrama de Fluxo de Login](https://i.imgur.com/g9lOk2i.png)

### 2.2 Ameaças Identificadas

#### AMEAÇA 1: Credential Stuffing

**Tipo:** Spoofing
**Descrição:** Atacante usa credenciais vazadas de outros sites para tentar login
**Impacto:** Alto - Acesso não autorizado ao sistema
**Probabilidade:** Alta
**Mitigação Atual:**

- Senha forte obrigatória (6+ chars, maiúscula, número)
- Bcrypt para hash de senhas

**Mitigação Adicional Recomendada:**

- Rate limiting no endpoint de login (5 tentativas/minuto)
- Captcha após 3 tentativas falhas
- Bloqueio temporário de IP após 10 tentativas
- Notificação ao usuário de tentativas de login

#### AMEAÇA 2: Token JWT Interceptado

**Tipo:** Information Disclosure
**Descrição:** Atacante intercepta token JWT em trânsito ou armazenamento
**Impacto:** Alto - Acesso total à conta da vítima
**Probabilidade:** Média
**Mitigação Atual:**

- JWT com expiração configurável
- Tokens transmitidos via HTTPS

**Mitigação Adicional Recomendada:**

- Refresh tokens com rotação
- Tokens de curta duração (15 minutos)
- Validação de IP/device fingerprint
- Revogação de tokens no logout

#### AMEAÇA 3: SQL Injection no Login

**Tipo:** Tampering
**Descrição:** Atacante injeta SQL malicioso no campo de email/senha
**Impacto:** Crítico - Acesso ao banco de dados completo
**Probabilidade:** Baixa
**Mitigação Atual:**

- Sequelize ORM com prepared statements
- Validação de entrada via middleware

**Mitigação Adicional Recomendada:**

- WAF (Web Application Firewall)
- Sanitização adicional de inputs
- Monitoramento de queries suspeitas

#### AMEAÇA 4: Brute Force Attack

**Tipo:** Denial of Service
**Descrição:** Atacante tenta múltiplas combinações de senha
**Impacto:** Médio - Sobrecarga do sistema e possível acesso
**Probabilidade:** Alta
**Mitigação Atual:**

- Nenhuma

**Mitigação Adicional Recomendada:**

- Rate limiting por IP e por usuário
- Exponential backoff em tentativas falhas
- Alerta para equipe de segurança

#### AMEAÇA 5: Session Fixation

**Tipo:** Spoofing
**Descrição:** Atacante força vítima a usar token conhecido
**Impacto:** Alto - Sequestro de sessão
**Probabilidade:** Baixa
**Mitigação Atual:**

- Tokens gerados pelo servidor

**Mitigação Adicional Recomendada:**

- Regeneração de token após login
- Validação de origem do token

---

## 3. THREAT MODEL - MOVIMENTAÇÃO DE ESTOQUE

### 3.1 Diagrama de Fluxo

**Diagrama de Fluxo de Movimentação de Estoque:**

![Diagrama de Fluxo de Movimentação](https://i.imgur.com/CJi583J.png)

### 3.2 Ameaças Identificadas

#### AMEAÇA 6: Privilege Escalation

**Tipo:** Elevation of Privilege
**Descrição:** Estoquista tenta movimentar produtos de outra unidade
**Impacto:** Alto - Manipulação de estoque não autorizado
**Probabilidade:** Média
**Mitigação Atual:**

- Middleware verificaUnidade valida usuário vs unidade
- Gerentes têm acesso a todas unidades

**Mitigação Adicional Recomendada:**

- Log de todas as tentativas de acesso negado
- Alerta automático para tentativas suspeitas
- Auditoria de ações de gerentes

#### AMEAÇA 7: Race Condition em Estoque

**Tipo:** Tampering
**Descrição:** Múltiplas requisições simultâneas causam estoque negativo
**Impacto:** Alto - Inconsistência de dados financeiros
**Probabilidade:** Média
**Mitigação Atual:**

- Transações de banco de dados
- Validação de estoque antes de saída

**Mitigação Adicional Recomendada:**

- Row-level locking no PostgreSQL
- Validação atômica com SELECT FOR UPDATE
- Retry logic com exponential backoff

#### AMEAÇA 8: Manipulation of Movement Data

**Tipo:** Tampering
**Descrição:** Atacante modifica quantidade ou tipo de movimentação
**Impacto:** Crítico - Perda financeira e auditoria comprometida
**Probabilidade:** Baixa
**Mitigação Atual:**

- Validação de tipos permitidos
- Registro de usuario_id em cada movimentação

**Mitigação Adicional Recomendada:**

- Assinatura digital de movimentações críticas
- Logs imutáveis (append-only)
- Alertas para movimentações acima de threshold
- Aprovação dupla para movimentações grandes

#### AMEAÇA 9: Replay Attack

**Tipo:** Spoofing
**Descrição:** Atacante reenvia requisição de movimentação válida
**Impacto:** Alto - Duplicação de movimentações
**Probabilidade:** Baixa
**Mitigação Atual:**

- Nenhuma específica

**Mitigação Adicional Recomendada:**

- Nonce ou timestamp em requisições
- Idempotency keys para operações críticas
- TTL curto para tokens de operação

#### AMEAÇA 10: Insider Threat - Gerente Malicioso

**Tipo:** Repudiation
**Descrição:** Gerente com acesso total realiza fraude e nega
**Impacto:** Crítico - Perda financeira significativa
**Probabilidade:** Baixa
**Mitigação Atual:**

- Log de todas as operações com usuario_id
- Timestamps automáticos

**Mitigação Adicional Recomendada:**

- Logs enviados para sistema externo imutável
- Aprovação dupla para ações sensíveis
- Auditoria periódica automática
- Segregação de funções (quem movimenta não aprova)
- Monitoramento de padrões anormais

---

## 4. MAPA DE AMEAÇAS POR CATEGORIA STRIDE

### Spoofing (Falsificação de Identidade)

- Credential stuffing no login
- Session fixation
- Replay attack de movimentações

### Tampering (Adulteração de Dados)

- SQL injection
- Modificação de dados de movimentação
- Race condition em estoque

### Repudiation (Repúdio)

- Insider threat sem auditoria adequada
- Negação de movimentações realizadas

### Information Disclosure (Divulgação de Informação)

- Interceptação de JWT tokens
- Exposição de dados sensíveis em logs
- Vazamento de informações via erro messages

### Denial of Service (Negação de Serviço)

- Brute force em login
- Sobrecarga intencional de API
- Esgotamento de recursos do banco

### Elevation of Privilege (Elevação de Privilégio)

- Estoquista acessando outras unidades
- Bypass de middleware de autorização
- Manipulação de cargo no token

---

## 5. MATRIZ DE RISCO

| Ameaça                | Impacto  | Probabilidade  | Risco  | Prioridade |
| --------------------- | -------- | -------------- | ------ | ---------- |
| SQL Injection         | Crítico  | Baixa          | Alto   | P1         |
| Insider Threat        | Crítico  | Baixa          | Alto   | P1         |
| Token Interceptado    | Alto     | Média          | Alto   | P1         |
| Credential Stuffing   | Alto     | Alta           | Alto   | P1         |
| Privilege Escalation  | Alto     | Média          | Alto   | P2         |
| Race Condition        | Alto     | Média          | Médio  | P2         |
| Brute Force           | Médio    | Alta           | Médio  | P2         |
| Manipulation Data     | Crítico  | Baixa          | Médio  | P3         |
| Replay Attack         | Alto     | Baixa          | Médio  | P3         |
| Session Fixation      | Alto     | Baixa          | Baixo  | P4         |

---

## 6. PLANO DE AÇÃO

### Curto Prazo (1-2 semanas)

- Implementar rate limiting no Nginx
- Adicionar logs de tentativas de acesso negado
- Configurar alertas para padrões suspeitos
- Implementar refresh tokens

### Médio Prazo (1 mês)

- Implementar row-level locking em estoque
- Adicionar idempotency keys
- Implementar sistema de alertas automáticos
- WAF básico no Nginx

### Longo Prazo (2-3 meses)

- Sistema de auditoria externa imutável
- Aprovação dupla para operações críticas
- Monitoramento comportamental de usuários
- Penetration testing profissional

---

## 7. RESPONSABILIDADES

### Equipe de Desenvolvimento

- Implementar mitigações de código
- Manter bibliotecas atualizadas
- Code review focado em segurança
- Testes de segurança automatizados

### Equipe de DevOps

- Configurar WAF e rate limiting
- Monitorar logs e alertas
- Manter infraestrutura atualizada
- Backup e disaster recovery

### Gerência Agrológica

- Definir políticas de acesso
- Aprovar investimentos em segurança
- Treinamento de usuários
- Resposta a incidentes

---

## 8. REVISÃO E ATUALIZAÇÃO

Este Threat Model deve ser revisado:

- Mensalmente pela equipe técnica
- Após cada novo feature implementado
- Após qualquer incidente de segurança
- Anualmente em revisão completa

Última atualização: 15/11/2025
Próxima revisão: 15/12/2025

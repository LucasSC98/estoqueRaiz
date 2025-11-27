# Checklist de Segurança - Pipeline CI/CD

## Verificações Automáticas Implementadas

### 1. ANÁLISE DE DEPENDÊNCIAS

**npm audit**

- Execução: A cada push e pull request
- Nível: moderate ou superior
- Ação: Falha se vulnerabilidades críticas ou altas

**Comando:**

```bash
npm audit --audit-level=moderate
```

**O que detecta:**

- Vulnerabilidades conhecidas em dependências
- CVEs (Common Vulnerabilities and Exposures)
- Pacotes deprecados com falhas de segurança

**Exemplos de vulnerabilidades detectadas:**

- SQL injection em drivers de banco
- XSS em bibliotecas de template
- Prototype pollution
- Denial of Service

---

### 2. VERIFICAÇÃO DE SECRETS EXPOSTOS

**Busca por Hardcoded Secrets**

- Execução: A cada push
- Padrões verificados:
  - password = "valor"
  - apiKey = "valor"
  - secret = "valor"
  - token = "valor"

**Comando:**

```bash
grep -r "password.*=.*['\"]" --include="*.ts" --include="*.js"
```

**O que previne:**

- Credenciais em código-fonte
- Tokens de API commitados
- Senhas de banco hardcoded
- Secrets em repositório

---

### 3. DEPENDÊNCIAS DESATUALIZADAS

**npm outdated**

- Execução: Informativo
- Objetivo: Identificar pacotes antigos
- Não bloqueia pipeline

**Comando:**

```bash
npm outdated
```

**O que monitora:**

- Versões defasadas de bibliotecas
- Pacotes sem patches de segurança
- EOL (End of Life) de dependências

---

### 4. BUILD E TESTES

**TypeScript Compilation**

- Garante type safety
- Previne erros de runtime
- Valida interfaces e tipos

**Testes Unitários**

- Validação de lógica de negócio
- Testes de middleware de autenticação
- Validação de regras de autorização

---

### 5. DOCKER IMAGE SCANNING

**Buildx com Cache**

- Layers otimizados
- Imagens mínimas (Alpine Linux)
- Sem ferramentas desnecessárias

**Boas práticas aplicadas:**

- Multi-stage builds
- Non-root user
- Minimal base image
- No secrets in layers

---

## Checklist Manual de Segurança

### PRÉ-COMMIT

- [ ] Código revisado por par
- [ ] Sem credenciais hardcoded
- [ ] Variáveis sensíveis em .env
- [ ] .env no .gitignore
- [ ] Testes de segurança passando
- [ ] Logs não expõem dados sensíveis

### PRÉ-DEPLOY

- [ ] Audit de dependências limpo
- [ ] Secrets configurados no ambiente
- [ ] HTTPS habilitado
- [ ] Rate limiting configurado
- [ ] Backup do banco atualizado
- [ ] Plano de rollback definido

### PÓS-DEPLOY

- [ ] Health checks funcionando
- [ ] Logs sendo coletados
- [ ] Monitoramento ativo
- [ ] Alertas configurados
- [ ] Teste de smoke realizado
- [ ] Documentação atualizada

---

## Controles de Segurança por Camada

### CÓDIGO

- TypeScript para type safety
- ESLint para qualidade de código
- Validação de entrada em todos os endpoints
- Sanitização de outputs
- Tratamento de erros sem expor stack traces

### DEPENDÊNCIAS

- npm audit executado automaticamente
- Dependências atualizadas regularmente
- Lock files commitados (package-lock.json)
- Renovate Bot para PRs de atualização
- SBOM (Software Bill of Materials) gerado

### SECRETS

- Nunca commitados no repositório
- Armazenados em GitHub Secrets
- Rotacionados periodicamente
- Acesso restrito por ambiente
- Logs não registram valores sensíveis

### INFRAESTRUTURA

- Containers rodando como non-root
- Network isolation entre serviços
- Volumes com permissões restritas
- Imagens de base atualizadas
- Firewall configurado

### RUNTIME

- Autenticação em todos os endpoints
- Autorização baseada em RBAC
- Rate limiting por IP
- Input validation
- Output encoding
- CORS configurado corretamente

---

## Ferramentas de Segurança

### IMPLEMENTADAS

**npm audit**

- Análise de vulnerabilidades em dependências
- Integrado no pipeline CI/CD

**grep patterns**

- Busca por secrets hardcoded
- Validação de padrões inseguros

**TypeScript**

- Type safety em tempo de compilação
- Previne muitos bugs de segurança

### RECOMENDADAS FUTURO

**Snyk**

- Análise contínua de vulnerabilidades
- Integração com GitHub
- Monitoramento de containers

**SonarQube**

- Análise estática de código
- Detecção de code smells
- Security hotspots

**OWASP Dependency-Check**

- CVE scanning
- Relatórios detalhados
- Base de dados atualizada

**Trivy**

- Scanner de vulnerabilidades em containers
- Integração com CI/CD
- Múltiplos formatos de relatório

**GitGuardian**

- Detecção de secrets em commits
- Alertas em tempo real
- Histórico de repositório

---

## Políticas de Segurança

### GESTÃO DE VULNERABILIDADES

**Críticas:**

- Correção imediata (< 24h)
- Hotfix e deploy emergencial
- Comunicação a stakeholders

**Altas:**

- Correção em 7 dias
- Incluída em próximo sprint
- Avaliação de impacto

**Médias:**

- Correção em 30 dias
- Planejamento normal
- Backlog priorizado

**Baixas:**

- Correção em 90 dias
- Próxima janela de manutenção
- Documentada para referência

### GESTÃO DE SECRETS

**Rotação:**

- JWT Secret: A cada 90 dias
- Database passwords: A cada 180 dias
- API keys: Conforme política do provedor

**Acesso:**

- Apenas via variáveis de ambiente
- GitHub Secrets para CI/CD
- Vault para produção (futuro)

**Auditoria:**

- Log de acesso a secrets
- Alertas para acessos anormais
- Revisão trimestral

---

## Métricas de Segurança

### INDICADORES

**Vulnerabilidades por Severidade:**

- Críticas: 0 (meta)
- Altas: < 2
- Médias: < 5
- Baixas: < 10

**Tempo de Correção:**

- Críticas: < 24h
- Altas: < 7 dias
- Médias: < 30 dias

**Cobertura de Testes:**

- Testes de segurança: > 80%
- Endpoints protegidos: 100%
- Validação de input: 100%

**Conformidade:**

- Audit limpo: Todo deploy
- Secrets expostos: 0
- Containers vulneráveis: 0

---

## Resposta a Incidentes

### DETECÇÃO

**Alertas Automáticos:**

- Vulnerabilidade crítica detectada
- Tentativas de acesso não autorizado
- Padrões anormais de requisições
- Falhas de autenticação em massa

### CONTENÇÃO

**Ações Imediatas:**

1. Avaliar severidade e impacto
2. Isolar sistemas afetados
3. Revogar credenciais comprometidas
4. Ativar equipe de resposta

### ERRADICAÇÃO

**Correção:**

1. Identificar causa raiz
2. Aplicar patch ou fix
3. Testar em ambiente isolado
4. Deploy emergencial
5. Validar correção

### RECUPERAÇÃO

**Restauração:**

1. Restaurar serviços afetados
2. Validar integridade dos dados
3. Monitorar por 24-48h
4. Comunicar resolução

### LIÇÕES APRENDIDAS

**Post-Mortem:**

1. Documentar incidente completo
2. Identificar melhorias
3. Atualizar runbooks
4. Treinar equipe
5. Implementar controles adicionais

---

## Treinamento e Conscientização

### EQUIPE DE DESENVOLVIMENTO

**Tópicos:**

- OWASP Top 10
- Secure coding practices
- Threat modeling
- Code review focado em segurança

**Frequência:**

- Onboarding de novos membros
- Atualização trimestral
- Workshops mensais

### USUÁRIOS FINAIS

**Tópicos:**

- Senha forte
- Phishing awareness
- Proteção de credenciais
- Reporte de incidentes

**Frequência:**

- Anual obrigatório
- Campanhas mensais
- Alertas conforme necessário

---

## Compliance e Auditoria

### LOGS OBRIGATÓRIOS

- Todas as tentativas de autenticação
- Acessos negados por autorização
- Modificações em dados sensíveis
- Operações administrativas
- Erros de segurança

### RETENÇÃO

- Logs de segurança: 12 meses
- Logs de auditoria: 5 anos
- Backups: 30 dias
- Incidentes documentados: Permanente

### REVISÕES

- Code review: Todo PR
- Security review: Features sensíveis
- Audit de dependências: Toda build
- Penetration test: Anual
- Compliance check: Trimestral

---

## Contatos de Segurança

**Security Champion:**

- Email: security@estoqueraiz.com
- Escalação: 24/7

**Equipe DevSecOps:**

- Email: devsecops@estoqueraiz.com
- Horário: Comercial + plantão

**Gerência:**

- CEO Agrológica: Antonio Botelho
- CTO: Conforme definido

---

Última atualização: 15/11/2025
Próxima revisão: 15/12/2025
Versão: 1.0

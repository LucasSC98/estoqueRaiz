# Runbook de Incidentes - Sistema Estoque Raiz

## Microserviços (Auth e Usuários)

**Versão:** 2.0  
**Última Atualização:** 15/11/2025

---

## 1. SERVIÇOS INDISPONÍVEIS Ar

### 1.1 Sistema Completamente Fora do

**Sintomas:**

- Gateway retorna 503
- Nenhum serviço responde

**Verificação:**

```bash
curl http://localhost/health
docker ps
```

**Ações:**

1. Verificar status dos containers

```bash
docker-compose ps
```

2. Verificar logs do gateway

```bash
docker logs api-gateway
```

3. Reiniciar todos os serviços

```bash
docker-compose down
docker-compose up -d
```

4. Verificar conectividade Redis

```bash
docker exec -it redis-cache redis-cli ping
```

**Tempo Estimado:** 5-10 minutos

---

### 1.2 Auth Service Fora do Ar

**Sintomas:**

- Login não funciona
- Retorna 502/503 em /api/auth

**Verificação:**

```bash
curl http://localhost:3001/health
docker logs auth-service
```

**Ações:**

1. Verificar logs do serviço

```bash
docker logs auth-service --tail 100
```

2. Reiniciar serviço específico

```bash
docker-compose restart auth-service
```

3. Verificar conexão com banco de dados

```bash
docker exec -it auth-service sh
env | grep DATABASE_URL
```

4. Reconstruir se necessário

```bash
docker-compose build auth-service
docker-compose up -d auth-service
```

**Tempo Estimado:** 3-5 minutos

---

### 1.3 Usuarios Service Fora do Ar

**Sintomas:**

- Cadastro/listagem de usuários falha
- Retorna 502/503 em /api/usuarios

**Verificação:**

```bash
curl http://localhost:3002/health
docker logs usuarios-service
```

**Ações:**

1. Verificar logs

```bash
docker logs usuarios-service --tail 100
```

2. Reiniciar serviço

```bash
docker-compose restart usuarios-service
```

3. Verificar variáveis de ambiente (SMTP)

```bash
docker exec -it usuarios-service sh
env | grep EMAIL
```

4. Reconstruir se necessário

```bash
docker-compose build usuarios-service
docker-compose up -d usuarios-service
```

**Tempo Estimado:** 3-5 minutos

---

## 2. PROBLEMAS DE PERFORMANCE

### 2.1 Lentidão Geral

**Sintomas:**

- Requisições muito lentas
- Timeouts frequentes

**Verificação:**

```bash
docker stats
```

**Ações:**

1. Verificar uso de CPU/memória

```bash
docker stats --no-stream
```

2. Limpar cache Redis

```bash
docker exec -it redis-cache redis-cli FLUSHALL
```

3. Verificar logs de cache

```bash
docker logs auth-service | grep "Cache"
docker logs usuarios-service | grep "Cache"
```

4. Reiniciar Redis

```bash
docker-compose restart redis
```

**Tempo Estimado:** 5 minutos

---

### 2.2 Redis Fora do Ar

**Sintomas:**

- Erros de conexão Redis nos logs
- Cache não funciona

**Verificação:**

```bash
docker logs redis-cache
docker exec -it redis-cache redis-cli ping
```

**Ações:**

1. Verificar status

```bash
docker ps | grep redis
```

2. Reiniciar Redis

```bash
docker-compose restart redis
```

3. Verificar persistência de dados

```bash
docker exec -it redis-cache redis-cli
> KEYS *
```

4. Se corrompido, limpar e reiniciar

```bash
docker-compose down redis
docker volume rm nova-api-microservice_redis-data
docker-compose up -d redis
```

**Tempo Estimado:** 3-5 minutos

---

## 3. ERROS DE AUTENTICAÇÃO

### 3.1 Token Inválido

**Sintomas:**

- Retorna 401 em rotas protegidas
- Mensagem "Token inválido"

**Verificação:**

- Verificar se JWT_SECRET é o mesmo em todos os serviços

**Ações:**

1. Verificar variáveis de ambiente

```bash
docker exec -it auth-service env | grep JWT_SECRET
docker exec -it usuarios-service env | grep JWT_SECRET
```

2. Se diferentes, corrigir no .env e reiniciar

```bash
docker-compose down
docker-compose up -d
```

**Tempo Estimado:** 2-3 minutos

---

### 3.2 Login Não Funciona

**Sintomas:**

- Retorna erro ao fazer login
- Usuário existe mas não consegue logar

**Verificação:**

```bash
docker logs auth-service | grep "Login"
```

**Ações:**

1. Verificar conexão com banco

```bash
docker exec -it auth-service sh
nc -zv postgres 5432
```

2. Verificar status do usuário no banco

```sql
SELECT id, email, status FROM usuarios WHERE email = 'email@usuario.com';
```

3. Verificar logs de eventos

```bash
docker logs auth-service | grep "LOGIN_FALHOU"
```

**Tempo Estimado:** 5 minutos

---

## 4. PROBLEMAS NO BANCO DE DADOS

### 4.1 Conexão com Banco Falha

**Sintomas:**

- Erro "database connection refused"
- Todas as operações falham

**Verificação:**

```bash
docker logs auth-service | grep "database"
```

**Ações:**

1. Verificar se DATABASE_URL está correto

```bash
echo $DATABASE_URL
```

2. Testar conexão manual

```bash
psql $DATABASE_URL
```

3. Reiniciar serviços

```bash
docker-compose restart auth-service usuarios-service
```

**Tempo Estimado:** 3-5 minutos

---

## 5. PROBLEMAS DE MENSAGERIA

### 5.1 Eventos Não São Recebidos

**Sintomas:**

- Logs não mostram "Evento RECEBIDO"
- Fluxos entre serviços não funcionam

**Verificação:**

```bash
docker logs usuarios-service | grep "Evento"
```

**Ações:**

1. Verificar Pub/Sub do Redis

```bash
docker exec -it redis-cache redis-cli
> PUBSUB CHANNELS
```

2. Verificar assinantes

```bash
docker logs usuarios-service | grep "Inscrito"
```

3. Reiniciar serviços

```bash
docker-compose restart usuarios-service
```

**Tempo Estimado:** 3 minutos

---

## 6. NGINX PROBLEMAS

### 6.1 Gateway Retorna 502

**Sintomas:**

- Nginx retorna Bad Gateway
- Serviços estão rodando

**Verificação:**

```bash
docker logs api-gateway
```

**Ações:**

1. Verificar configuração

```bash
docker exec -it api-gateway nginx -t
```

2. Recarregar configuração

```bash
docker exec -it api-gateway nginx -s reload
```

3. Reiniciar Nginx

```bash
docker-compose restart nginx
```

**Tempo Estimado:** 2 minutos

---

## 7. COMANDOS ÚTEIS

### Verificar Status Geral

```bash
docker-compose ps
docker ps
docker stats --no-stream
```

### Ver Logs em Tempo Real

```bash
docker-compose logs -f
docker-compose logs -f auth-service
docker-compose logs -f usuarios-service
```

### Reiniciar Tudo

```bash
docker-compose down
docker-compose up -d
```

### Limpar Completamente

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### Acessar Container

```bash
docker exec -it auth-service sh
docker exec -it usuarios-service sh
docker exec -it redis-cache sh
```

### Monitorar Redis

```bash
docker exec -it redis-cache redis-cli
> MONITOR
> INFO stats
> KEYS *
```

---

## 8. CONTATOS DE EMERGÊNCIA

**Equipe de Desenvolvimento:**

- Email: lucas@estoqueraiz.com
- Telefone: (44) 99921-5551

## 9. CHECKLIST DE RECUPERAÇÃO

- [ ] Verificar status dos containers
- [ ] Verificar logs de todos os serviços
- [ ] Verificar conectividade Redis
- [ ] Verificar conectividade Banco de Dados
- [ ] Verificar variáveis de ambiente
- [ ] Testar endpoints de health
- [ ] Testar login
- [ ] Testar cadastro de usuário
- [ ] Verificar eventos no Redis Pub/Sub
- [ ] Limpar cache se necessário

---

## 10. PREVENÇÃO

### Monitoramento Contínuo

- Implementar health checks automáticos
- Configurar alertas para serviços fora do ar
- Monitorar uso de recursos (CPU, memória)
- Verificar logs regularmente

### Backup

- Backup diário do banco de dados
- Backup de configurações
- Documentar mudanças

### Testes

- Testar deploy em ambiente de homologação
- Realizar testes de carga
- Simular falhas dos serviços

---

## 11. INCIDENTES RELACIONADOS A DEPLOY

### 11.1 Deploy com Falha

**Sintomas:**

- Pipeline CI/CD falha
- Build não completa
- Testes não passam

**Verificação:**

```bash
git log --oneline -5
docker images | head
```

**Ações:**

1. Verificar logs do GitHub Actions
2. Revisar últimas mudanças no código
3. Validar configurações de ambiente
4. Executar testes localmente:

```bash
npm test
npm run build
```

5. Corrigir problemas identificados
6. Fazer novo commit e push

**Prevenção:**

- Sempre testar localmente antes do push
- Revisar código antes de merge
- Manter testes atualizados

### 11.2 Sistema Instável Após Deploy

**Sintomas:**

- Aumento na taxa de erros
- Latência elevada
- Crashes frequentes
- Health checks falhando

**Verificação:**

```bash
docker-compose logs --tail=50
curl http://localhost/health
docker stats
```

**Ações:**

1. Verificar métricas de performance
2. Analisar logs de erro
3. Identificar serviços problemáticos
4. Executar rollback se necessário:

```bash
cd /caminho/deploy
./scripts/rollback.sh
```

**Rollback Manual Blue-Green:**

```bash
docker-compose -f docker-compose.green.yml up -d
```

**Após Rollback:**

1. Notificar equipe
2. Investigar causa raiz
3. Aplicar correção em branch separada
4. Testar em staging
5. Agendar novo deploy

**Tempo Esperado:** < 5 minutos para rollback completo

### 11.3 Falha em Apenas Um Microserviço

**Sintomas:**

- Serviço específico retorna erros
- Outros serviços funcionam normalmente
- Health check de um serviço falha

**Verificação:**

```bash
docker ps | grep <service-name>
docker logs <service-name>
curl http://localhost/api/<service>/health
```

**Ações:**

1. Reiniciar serviço específico:

```bash
docker-compose restart <service-name>
```

2. Se não resolver, fazer rollback do serviço:

```bash
docker pull ghcr.io/lucassc98/estoqueraiz-<service>:previous
docker-compose up -d <service-name>
```

3. Verificar dependências (banco, redis)
4. Analisar logs detalhadamente
5. Aplicar correção e re-deploy

**Tempo Esperado:** < 2 minutos para restart

### 11.4 Banco de Dados com Problema Após Migration

**Sintomas:**

- Erros de SQL nos logs
- Falhas em queries específicas
- Dados inconsistentes

**Verificação:**

```bash
docker exec -it postgres-db psql -U postgres -d estoqueraiz
```

**Ações:**

1. Verificar última migration executada
2. Validar integridade do schema
3. Se necessário, fazer rollback da migration:

```bash
npx sequelize-cli db:migrate:undo
```

4. Restaurar backup se dados corrompidos:

```bash
docker exec -i postgres-db psql -U postgres -d estoqueraiz < backup.sql
```

5. Corrigir migration
6. Testar em staging
7. Re-executar migration

**Prevenção:**

- Sempre fazer backup antes de migrations
- Testar migrations em staging primeiro
- Revisar SQL gerado

### 11.5 Inconsistência entre Ambientes Blue e Green

**Sintomas:**

- Comportamentos diferentes entre ambientes
- Versões conflitantes
- Dados dessincronizados

**Verificação:**

```bash
docker inspect <blue-container> | grep Image
docker inspect <green-container> | grep Image
```

**Ações:**

1. Identificar qual ambiente está correto
2. Parar ambiente problemático
3. Limpar containers e volumes:

```bash
docker-compose -f docker-compose.blue.yml down -v
```

4. Re-deploy do zero no ambiente limpo
5. Validar sincronização de dados
6. Executar switch apenas quando ambos estiverem estáveis

**Tempo Esperado:** 10-15 minutos

### 11.6 Falha no Load Balancer

**Sintomas:**

- Requisições não chegam aos serviços
- Timeout em todas as requisições
- Nginx retorna 502/504

**Verificação:**

```bash
docker logs nginx-lb
curl http://localhost
```

**Ações:**

1. Verificar configuração do Nginx:

```bash
docker exec nginx-lb cat /etc/nginx/nginx.conf
```

2. Testar upstream diretamente:

```bash
curl http://blue-env:8080/health
curl http://green-env:8081/health
```

3. Reiniciar Nginx:

```bash
docker-compose restart nginx
```

4. Se não resolver, restaurar configuração anterior:

```bash
git checkout HEAD~1 nginx/nginx.conf
docker-compose up -d nginx
```

**Tempo Esperado:** < 1 minuto

---

## 12. COMUNICAÇÃO DE INCIDENTES

### 12.1 Durante Incidente

**Notificação Imediata:**

- Postar no Slack canal incidentes
- Enviar email para stakeholders
- Atualizar status page se houver

**Template de Comunicação:**

```
INCIDENTE ATIVO
Severidade: CRITICO/ALTO/MEDIO/BAIXO
Sistema: API/APP/BANCO
Impacto: descrição
Início: HH:MM
Ações em andamento: descrição
Previsão resolução: tempo
Responsável: nome
```

### 12.2 Após Resolução

**Comunicação de Resolução:**

```
INCIDENTE RESOLVIDO
Sistema: API/APP/BANCO
Duração: tempo
Causa raiz: descrição
Ações tomadas: lista
Prevenção futura: medidas
```

**Post-Mortem:**

- Agendar reunião de retrospectiva
- Documentar lições aprendidas
- Atualizar runbook se necessário
- Implementar melhorias identificadas

---

## 13. CONTATOS DE EMERGÊNCIA

### Equipe Técnica

- DevOps Lead: disponível 24/7
- Backend Lead: disponível comercial + plantão
- Suporte Técnico: suporte@estoqueraiz.com

### Agrológica

- CEO: Antônio Botelho
- TI Manager: contato via WhatsApp
- Suporte: suporte@agrologica.com.br

### Fornecedores

- Hosting Provider: suporte via ticket
- GitHub: status.github.com
- Expo: expo.dev/support

---

## 14. SCRIPTS DE EMERGÊNCIA

### 14.1 Rollback Completo

```bash
echo "Iniciando rollback de emergência..."
docker-compose -f docker-compose.green.yml up -d
sleep 30
curl http://localhost/health
echo "Rollback concluído"
```

### 14.2 Restart Total

```bash
echo "Reiniciando todos os serviços..."
docker-compose down
docker-compose up -d
sleep 60
docker-compose ps
echo "Serviços reiniciados"
```

### 14.3 Limpeza de Cache

```bash
echo "Limpando cache Redis..."
docker exec redis-cache redis-cli FLUSHALL
echo "Cache limpo"
```

### 14.4 Backup Emergencial

```bash
echo "Criando backup emergencial..."
timestamp=$(date +%Y%m%d_%H%M%S)
docker exec postgres-db pg_dump -U postgres estoqueraiz > backup_${timestamp}.sql
echo "Backup salvo: backup_${timestamp}.sql"
```

---

## 15. CHECKLIST PÓS-INCIDENTE

- [ ] Incidente resolvido e validado
- [ ] Serviços estáveis por 30 minutos
- [ ] Logs salvos para análise
- [ ] Causa raiz identificada
- [ ] Documentação atualizada
- [ ] Melhorias implementadas ou agendadas
- [ ] Monitoramento adicional configurado
- [ ] Equipe debriefed

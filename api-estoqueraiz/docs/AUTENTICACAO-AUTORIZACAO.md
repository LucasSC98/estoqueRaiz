# Estratégia de Autenticação e Autorização - Sistema Estoque Raiz

## Visão Geral

O Sistema WMS Estoque Raiz implementa autenticação baseada em JWT e autorização via RBAC (Role-Based Access Control) com controle adicional por unidade de estoque.

---

## 1. AUTENTICAÇÃO

### 1.1 Mecanismo Principal: JWT (JSON Web Tokens)

**Fluxo de Autenticação:**

```
1. Cliente envia credenciais (email + senha)
2. Auth Service valida no banco de dados
3. Senha comparada via bcrypt
4. JWT gerado com payload:
   {
     id: usuario_id,
     email: usuario_email,
     cargo: usuario_cargo,
     unidade_id: usuario_unidade_id,
     iat: timestamp_issued,
     exp: timestamp_expiration
   }
5. Token retornado ao cliente
6. Cliente armazena token (AsyncStorage mobile)
7. Cliente envia token em Authorization: Bearer <token>
8. Middleware valida token em cada requisição
```

### 1.2 Implementação Técnica

**Geração de Token:**

Arquivo: auth-service/src/utils/jwt.ts

```typescript
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "secret-key-change-in-production";
const EXPIRATION = "24h";

export function gerarToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRATION });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
```

**Validação de Senha:**

Arquivo: auth-service/src/services/AuthService.ts

```typescript
import bcrypt from "bcrypt";

export async function validarSenha(
  senhaPlana: string,
  senhaHash: string
): Promise<boolean> {
  return await bcrypt.compare(senhaPlana, senhaHash);
}

export async function hashSenha(senha: string): Promise<string> {
  return await bcrypt.hash(senha, 10);
}
```

### 1.3 Segurança da Autenticação

**Senhas:**

- Armazenadas com bcrypt (cost factor 10)
- Nunca retornadas em respostas da API
- Validação de força obrigatória:
  - Mínimo 6 caracteres
  - Ao menos 1 letra maiúscula
  - Ao menos 1 número

**JWT:**

- Assinado com secret key forte
- Expiração configurável (padrão 24h)
- Secret armazenado em variável de ambiente
- Não contém dados sensíveis no payload

**Transporte:**

- HTTPS obrigatório em produção
- Token enviado em header Authorization
- Nunca em query string ou cookies

---

## 2. AUTORIZAÇÃO (RBAC)

### 2.1 Modelo de Cargos

O sistema implementa 3 cargos hierárquicos:

#### GERENTE

**Permissões:**

- Acesso a todas as 7 unidades
- Aprovar/rejeitar usuários pendentes
- Alterar cargo de usuários
- Deletar usuários
- Aprovar produtos com definição de preços
- Todas as operações de estoque
- Visualizar relatórios completos

**Restrições:**

- Não pode alterar próprio cargo para não-gerente
- Todas as ações são auditadas

#### FINANCEIRO

**Permissões:**

- Aprovar produtos pendentes
- Definir preços de custo e venda
- Visualizar relatórios financeiros
- Acesso read-only a movimentações

**Restrições:**

- Não movimenta estoque
- Não gerencia usuários
- Acesso apenas à própria unidade

#### ESTOQUISTA

**Permissões:**

- CRUD de produtos (status pendente)
- Movimentações de estoque (ENTRADA, SAIDA, AJUSTE)
- Transferências entre unidades
- Visualizar relatórios da própria unidade

**Restrições:**

- Acesso restrito à própria unidade
- Não define preços
- Não aprova produtos
- Não gerencia usuários

### 2.2 Implementação de Middleware

**Middleware de Autenticação:**

Arquivo: shared/middleware/autenticacao.ts

```typescript
import { Request, Response, NextFunction } from "express";
import { verificarToken } from "../utils/jwt";

export function autenticacao(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ erro: true, message: "Token não fornecido" });
  }

  try {
    const decoded = verificarToken(token);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ erro: true, message: "Token inválido" });
  }
}

export function apenasGerente(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.cargo !== "gerente") {
    return res.status(403).json({ erro: true, message: "Acesso negado" });
  }
  next();
}

export function apenasFinanceiroOuGerente(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cargosPermitidos = ["gerente", "financeiro"];
  if (!cargosPermitidos.includes(req.usuario?.cargo)) {
    return res.status(403).json({ erro: true, message: "Acesso negado" });
  }
  next();
}
```

**Middleware de Verificação de Unidade:**

Arquivo: shared/middleware/verificaUnidade.ts

```typescript
import { Request, Response, NextFunction } from "express";

export function verificaUnidade(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { cargo, unidade_id } = req.usuario;
  const unidadeRecurso = req.body.unidade_id || req.params.unidade_id;

  if (cargo === "gerente") {
    return next();
  }

  if (unidade_id !== unidadeRecurso) {
    return res.status(403).json({
      erro: true,
      message: "Você não tem permissão para acessar esta unidade",
    });
  }

  next();
}
```

### 2.3 Aplicação nas Rotas

**Exemplo: Rotas de Usuários**

```typescript
import { Router } from "express";
import { autenticacao, apenasGerente } from "../middleware/autenticacao";

const router = Router();

router.post("/", criarUsuario);
router.get("/", autenticacao, listarUsuarios);
router.get("/pendentes", autenticacao, apenasGerente, listarPendentes);
router.patch("/:id/aprovar", autenticacao, apenasGerente, aprovarUsuario);
router.delete("/:id", autenticacao, apenasGerente, deletarUsuario);

export default router;
```

**Exemplo: Rotas de Produtos**

```typescript
import { Router } from "express";
import {
  autenticacao,
  apenasFinanceiroOuGerente,
} from "../middleware/autenticacao";
import { verificaUnidade } from "../middleware/verificaUnidade";

const router = Router();

router.get("/", autenticacao, listarProdutos);
router.post("/", autenticacao, criarProduto);
router.patch(
  "/:id/aprovar",
  autenticacao,
  apenasFinanceiroOuGerente,
  aprovarProduto
);
router.put("/:id", autenticacao, verificaUnidade, atualizarProduto);

export default router;
```

---

## 3. CONTROLE DE ACESSO POR UNIDADE

### 3.1 Regras de Negócio

**Gerentes:**

- Acesso irrestrito a todas as 7 unidades
- Campo unidade_id pode ser NULL

**Financeiro e Estoquistas:**

- Acesso restrito à unidade atribuída
- Campo unidade_id obrigatório
- Validação em todas as operações

### 3.2 Validação em Controllers

```typescript
export async function listarProdutos(req: Request, res: Response) {
  const { cargo, unidade_id } = req.usuario;

  const filtros: any = { ativo: true };

  if (cargo !== "gerente") {
    filtros.unidade_id = unidade_id;
  }

  const produtos = await Produto.findAll({ where: filtros });

  return res.status(200).json(produtos);
}
```

---

## 4. AUDITORIA E LOGS

### 4.1 Logs de Autenticação

Todos os eventos de autenticação são registrados:

```typescript
{
  timestamp: "2025-11-15T10:30:00Z",
  evento: "LOGIN_SUCESSO",
  usuario_email: "usuario@agrologica.com.br",
  ip: "192.168.1.100",
  user_agent: "Mobile App Android 1.0"
}

{
  timestamp: "2025-11-15T10:31:00Z",
  evento: "LOGIN_FALHA",
  usuario_email: "usuario@agrologica.com.br",
  ip: "192.168.1.100",
  motivo: "Senha incorreta"
}
```

### 4.2 Logs de Autorização

Tentativas de acesso negado são auditadas:

```typescript
{
  timestamp: "2025-11-15T10:32:00Z",
  evento: "ACESSO_NEGADO",
  usuario_id: 15,
  cargo: "estoquista",
  recurso: "/api/usuarios/10/aprovar",
  motivo: "Privilégio insuficiente"
}
```

### 4.3 Logs de Operações Críticas

```typescript
{
  timestamp: "2025-11-15T10:35:00Z",
  evento: "MOVIMENTACAO_ESTOQUE",
  usuario_id: 10,
  produto_id: 123,
  tipo: "SAIDA",
  quantidade: 500,
  unidade_id: 3
}
```

---

## 5. PROTEÇÕES ADICIONAIS

### 5.1 Rate Limiting

Implementação no Nginx:

```nginx
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /api/auth/login {
    limit_req zone=login burst=3 nodelay;
    proxy_pass http://auth-service:3001;
}
```

### 5.2 Timeout de Sessão

JWT expira automaticamente após período configurado.
Cliente deve fazer novo login após expiração.

### 5.3 Revogação de Tokens

Para emergências, implementar blacklist no Redis:

```typescript
export async function revogarToken(token: string) {
  const decoded = verificarToken(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.setex(`blacklist:${token}`, ttl, "revoked");
}

export async function tokenRevogado(token: string): Promise<boolean> {
  const revoked = await redis.get(`blacklist:${token}`);
  return revoked !== null;
}
```

---

## 6. FLUXO COMPLETO DE AUTORIZAÇÃO

```
1. Cliente faz login
   POST /api/auth/login
   { email, senha }

2. Auth Service valida credenciais
   - Busca usuário no banco
   - Verifica status = 'aprovado'
   - Valida senha com bcrypt
   - Gera JWT com cargo e unidade_id

3. Cliente armazena token
   AsyncStorage.setItem('token', token)

4. Cliente faz requisição protegida
   GET /api/produtos
   Authorization: Bearer <token>

5. Middleware autenticacao
   - Extrai token do header
   - Verifica assinatura JWT
   - Verifica expiração
   - Adiciona req.usuario com dados do token

6. Middleware verificaUnidade (se aplicável)
   - Verifica cargo
   - Se não gerente, valida unidade_id

7. Middleware apenasGerente (se aplicável)
   - Verifica cargo === 'gerente'
   - Retorna 403 se não

8. Controller executa lógica
   - Filtra dados por unidade (se não gerente)
   - Registra operação em log
   - Retorna resposta

9. Cliente recebe resposta
```

---

## 7. MATRIZ DE PERMISSÕES

| Recurso              | Gerente | Financeiro | Estoquista | Público |
| -------------------- | ------- | ---------- | ---------- | ------- |
| Login                | Sim     | Sim        | Sim        | Sim     |
| Cadastro             | Sim     | Sim        | Sim        | Sim     |
| Listar Produtos      | Todas   | Própria    | Própria    | Não     |
| Criar Produto        | Sim     | Não        | Sim        | Não     |
| Aprovar Produto      | Sim     | Sim        | Não        | Não     |
| Definir Preços       | Sim     | Sim        | Não        | Não     |
| Movimentar Estoque   | Sim     | Não        | Sim        | Não     |
| Transferir Unidades  | Sim     | Não        | Sim        | Não     |
| Listar Usuários      | Sim     | Não        | Não        | Não     |
| Aprovar Usuários     | Sim     | Não        | Não        | Não     |
| Alterar Cargo        | Sim     | Não        | Não        | Não     |
| Deletar Usuários     | Sim     | Não        | Não        | Não     |
| Relatórios Completos | Sim     | Parcial    | Própria    | Não     |

---

## 8. CENÁRIOS DE TESTE

### Cenário 1: Estoquista tenta acessar outra unidade

```
Dado que estoquista está na unidade 1
Quando tentar listar produtos da unidade 2
Então recebe 403 Forbidden
E operação é registrada em log
```

### Cenário 2: Financeiro tenta movimentar estoque

```
Dado que usuário tem cargo 'financeiro'
Quando tentar POST /api/movimentacoes
Então recebe 403 Forbidden
E operação é registrada em log
```

### Cenário 3: Token expirado

```
Dado que token JWT expirou
Quando fazer qualquer requisição autenticada
Então recebe 401 Unauthorized
E cliente redireciona para login
```

### Cenário 4: Gerente com acesso total

```
Dado que usuário tem cargo 'gerente'
Quando acessar qualquer unidade
Então acesso é permitido
E operação é registrada em log
```

---

## 9. MELHORIAS FUTURAS

### Curto Prazo

- Implementar refresh tokens
- Adicionar MFA (Multi-Factor Authentication)
- Rate limiting por usuário

### Médio Prazo

- OAuth2 para integração com ERP
- SSO (Single Sign-On)
- Biometria no app mobile

### Longo Prazo

- Permissões granulares por recurso
- Políticas de acesso dinâmicas
- Machine learning para detecção de anomalias

---

## 10. CONFORMIDADE

### LGPD (Lei Geral de Proteção de Dados)

- Senhas nunca armazenadas em texto plano
- Dados de autenticação criptografados
- Logs de acesso mantidos por 12 meses
- Direito de exclusão de dados implementado

### Boas Práticas

- OWASP Top 10 considerado
- Princípio do menor privilégio aplicado
- Segregação de funções implementada
- Auditoria completa de acessos

---

Última atualização: 15/11/2025
Próxima revisão: 15/12/2025

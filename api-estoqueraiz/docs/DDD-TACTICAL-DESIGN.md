# Domain-Driven Design - Tactical Design

Definição de Entities, Value Objects e Aggregates para os Bounded Contexts do sistema Estoque Raiz.

---

## 1. Produtos Context (Core Domain)

### 1.1 Aggregate: Produto

**Aggregate Root:** Produto

#### Entities

##### Produto (Root)

```typescript
class Produto {
  private id: number;
  private nome: string;
  private descricao: string;
  private codigoBarras: string | null;
  private preco: Preco;
  private estoque: Estoque;
  private imagem: ImagemProduto | null;
  private categoria: CategoriaId;
  private unidade: UnidadeId;
  private statusProduto: StatusProduto;
  private dataValidade: Date | null;
  private ativo: boolean;
  private usuarioCriador: UsuarioId;
  private criadoEm: Date;
  private atualizadoEm: Date;

  constructor(dados: CriarProdutoDTO) {
    this.validarDados(dados);
    this.inicializarProduto(dados);
  }

  aprovar(preco: Preco, aprovador: UsuarioId): void {
    if (this.statusProduto === StatusProduto.APROVADO) {
      throw new Error("Produto já aprovado");
    }
    this.preco = preco;
    this.statusProduto = StatusProduto.APROVADO;
    this.publicarEvento(new ProdutoAprovadoEvent(this.id, aprovador));
  }

  atualizarEstoque(quantidade: number): void {
    this.estoque.atualizarQuantidade(quantidade);
    if (this.estoque.estaBaixo()) {
      this.publicarEvento(
        new EstoqueBaixoEvent(this.id, this.estoque.quantidadeAtual)
      );
    }
  }

  verificarValidade(): boolean {
    if (!this.dataValidade) return true;
    const diasRestantes = this.diasAteVencimento();
    if (diasRestantes <= 30) {
      this.publicarEvento(new ProdutoVencendoEvent(this.id, diasRestantes));
      return false;
    }
    return true;
  }

  private diasAteVencimento(): number {
    if (!this.dataValidade) return Infinity;
    const hoje = new Date();
    const diferenca = this.dataValidade.getTime() - hoje.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  }
}
```

## **Evidência no Código:** [`ProdutosModel.ts`](api-estoqueraiz/produtos-service/src/models/ProdutosModel.ts)

#### Value Objects

##### Preco

```typescript
class Preco {
  private readonly precoCusto: number;
  private readonly precoVenda: number;

  constructor(precoCusto: number, precoVenda: number) {
    this.validar(precoCusto, precoVenda);
    this.precoCusto = precoCusto;
    this.precoVenda = precoVenda;
  }

  private validar(custo: number, venda: number): void {
    if (custo < 0) throw new Error("Preço de custo não pode ser negativo");
    if (venda < 0) throw new Error("Preço de venda não pode ser negativo");
    if (venda < custo)
      throw new Error("Preço de venda não pode ser menor que custo");
  }

  calcularMargem(): number {
    if (this.precoCusto === 0) return 0;
    return ((this.precoVenda - this.precoCusto) / this.precoCusto) * 100;
  }

  getPrecoCusto(): number {
    return this.precoCusto;
  }

  getPrecoVenda(): number {
    return this.precoVenda;
  }

  equals(outro: Preco): boolean {
    return (
      this.precoCusto === outro.precoCusto &&
      this.precoVenda === outro.precoVenda
    );
  }
}
```

**Evidência no Código:** Campos `preco_custo` e `preco_venda` em [`ProdutosModel.ts`](api-estoqueraiz/produtos-service/src/models/ProdutosModel.ts)

##### Estoque

```typescript
class Estoque {
  private readonly quantidadeAtual: number;
  private readonly quantidadeMinima: number;

  constructor(quantidadeAtual: number, quantidadeMinima: number) {
    this.validar(quantidadeAtual, quantidadeMinima);
    this.quantidadeAtual = quantidadeAtual;
    this.quantidadeMinima = quantidadeMinima;
  }

  private validar(atual: number, minima: number): void {
    if (atual < 0) throw new Error("Quantidade atual não pode ser negativa");
    if (minima < 0) throw new Error("Quantidade mínima não pode ser negativa");
  }

  estaBaixo(): boolean {
    return this.quantidadeAtual < this.quantidadeMinima;
  }

  temEstoque(quantidadeNecessaria: number): boolean {
    return this.quantidadeAtual >= quantidadeNecessaria;
  }

  atualizarQuantidade(novaQuantidade: number): Estoque {
    return new Estoque(novaQuantidade, this.quantidadeMinima);
  }

  getQuantidadeAtual(): number {
    return this.quantidadeAtual;
  }

  getQuantidadeMinima(): number {
    return this.quantidadeMinima;
  }
}
```

**Evidência no Código:** Campos `quantidade_estoque` e `estoque_minimo` em [`ProdutosModel.ts`](api-estoqueraiz/produtos-service/src/models/ProdutosModel.ts)

##### ImagemProduto

```typescript
class ImagemProduto {
  private readonly url: string;
  private readonly nomeArquivo: string;
  private readonly tamanhoBytes: number;

  constructor(url: string, nomeArquivo: string, tamanhoBytes: number) {
    this.validar(url, tamanhoBytes);
    this.url = url;
    this.nomeArquivo = nomeArquivo;
    this.tamanhoBytes = tamanhoBytes;
  }

  private validar(url: string, tamanho: number): void {
    if (!url) throw new Error("URL da imagem é obrigatória");
    const extensoesPermitidas = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const extensao = url.substring(url.lastIndexOf(".")).toLowerCase();
    if (!extensoesPermitidas.includes(extensao)) {
      throw new Error("Formato de imagem inválido");
    }
    const TAMANHO_MAXIMO = 5 * 1024 * 1024;
    if (tamanho > TAMANHO_MAXIMO) {
      throw new Error("Imagem excede tamanho máximo de 5MB");
    }
  }

  getUrl(): string {
    return this.url;
  }

  getNomeArquivo(): string {
    return this.nomeArquivo;
  }

  getTamanhoBytes(): number {
    return this.tamanhoBytes;
  }
}
```

**Evidência no Código:** [`produtos-service/src/utils/uploadImagem.ts`](api-estoqueraiz/produtos-service/src/utils/uploadImagem.ts)

##### StatusProduto (Enum)

```typescript
enum StatusProduto {
  PENDENTE = "pendente",
  APROVADO = "aprovado",
}
```

**Evidência no Código:** Campo `statusProduto` em [`ProdutosModel.ts`](api-estoqueraiz/produtos-service/src/models/ProdutosModel.ts)

---

#### Domain Services

##### AprovarProdutoService

```typescript
class AprovarProdutoService {
  constructor(
    private produtoRepository: ProdutoRepository,
    private usuarioRepository: UsuarioRepository
  ) {}

  async executar(
    produtoId: number,
    dados: AprovarProdutoDTO,
    aprovadorId: number
  ): Promise<void> {
    const produto = await this.produtoRepository.buscarPorId(produtoId);
    if (!produto) throw new ErroNaoEncontrado("Produto não encontrado");

    const aprovador = await this.usuarioRepository.buscarPorId(aprovadorId);
    if (!aprovador.podeAprovarProdutos()) {
      throw new ErroProibido("Usuário não tem permissão para aprovar produtos");
    }

    const preco = new Preco(dados.preco_custo, dados.preco_venda);
    produto.aprovar(preco, aprovadorId);

    await this.produtoRepository.salvar(produto);
  }
}
```

**Evidência no Código:** [`produtos-service/src/services/ProdutosService.ts`](api-estoqueraiz/produtos-service/src/services/ProdutosService.ts) método `aprovar`

---

#### Repositories

##### ProdutoRepository (Interface)

```typescript
interface ProdutoRepository {
  buscarPorId(id: number): Promise<Produto | null>;
  listarTodos(filtros?: FiltrosProduto): Promise<Produto[]>;
  salvar(produto: Produto): Promise<void>;
  deletar(id: number): Promise<void>;
  buscarPorCodigoBarras(codigoBarras: string): Promise<Produto | null>;
  buscarProdutosEstoqueBaixo(unidadeId?: number): Promise<Produto[]>;
  buscarProdutosVencendo(dias: number, unidadeId?: number): Promise<Produto[]>;
}
```

**Evidência no Código:** [`produtos-service/src/services/ProdutosService.ts`](api-estoqueraiz/produtos-service/src/services/ProdutosService.ts)

---

#### Domain Events

```typescript
class ProdutoAprovadoEvent {
  constructor(
    public readonly produtoId: number,
    public readonly aprovadorId: number,
    public readonly timestamp: Date = new Date()
  ) {}
}

class EstoqueBaixoEvent {
  constructor(
    public readonly produtoId: number,
    public readonly quantidadeAtual: number,
    public readonly timestamp: Date = new Date()
  ) {}
}

class ProdutoVencendoEvent {
  constructor(
    public readonly produtoId: number,
    public readonly diasRestantes: number,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

**Evidência no Código:** [`shared/eventos/publicador.ts`](api-estoqueraiz/shared/eventos/publicador.ts) - EventosTipo

---

## 2. Movimentações Context (Core Domain)

### 2.1 Aggregate: Movimentacao

**Aggregate Root:** Movimentacao

#### Entities

##### Movimentacao (Root)

```typescript
class Movimentacao {
  private id: number;
  private tipo: TipoMovimentacao;
  private quantidade: Quantidade;
  private dataMovimentacao: Date;
  private observacao: string | null;
  private documento: Documento | null;
  private produto: ProdutoId;
  private usuario: UsuarioId;
  private unidadeOrigem: UnidadeId | null;
  private unidadeDestino: UnidadeId | null;
  private criadoEm: Date;

  constructor(dados: CriarMovimentacaoDTO) {
    this.validarDados(dados);
    this.inicializarMovimentacao(dados);
  }

  private validarDados(dados: CriarMovimentacaoDTO): void {
    if (dados.tipo === TipoMovimentacao.TRANSFERENCIA) {
      if (!dados.unidade_origem_id || !dados.unidade_destino_id) {
        throw new Error("Transferência requer origem e destino");
      }
      if (dados.unidade_origem_id === dados.unidade_destino_id) {
        throw new Error("Origem e destino devem ser diferentes");
      }
    }
    if (dados.tipo === TipoMovimentacao.SAIDA) {
      if (!this.temEstoqueSuficiente(dados.produto_id, dados.quantidade)) {
        throw new Error("Estoque insuficiente para saída");
      }
    }
  }

  aplicarMovimentacao(): void {
    switch (this.tipo) {
      case TipoMovimentacao.ENTRADA:
        this.aumentarEstoque();
        break;
      case TipoMovimentacao.SAIDA:
        this.diminuirEstoque();
        break;
      case TipoMovimentacao.TRANSFERENCIA:
        this.transferirEstoque();
        break;
      case TipoMovimentacao.AJUSTE:
        this.ajustarEstoque();
        break;
    }
    this.publicarEvento(
      new MovimentacaoCriadaEvent(this.id, this.tipo, this.produto)
    );
  }
}
```

**Evidência no Código:** [`movimentacoes-service/src/models/MovimentacoesModel.ts`](api-estoqueraiz/movimentacoes-service/src/models/MovimentacoesModel.ts)

---

#### Value Objects

##### TipoMovimentacao (Enum)

```typescript
enum TipoMovimentacao {
  ENTRADA = "ENTRADA",
  SAIDA = "SAIDA",
  TRANSFERENCIA = "TRANSFERENCIA",
  AJUSTE = "AJUSTE",
}
```

**Evidência no Código:** [`MovimentacoesModel.ts`](api-estoqueraiz/movimentacoes-service/src/models/MovimentacoesModel.ts) tipo `tipo`

##### Quantidade

```typescript
class Quantidade {
  private readonly valor: number;

  constructor(valor: number) {
    this.validar(valor);
    this.valor = valor;
  }

  private validar(valor: number): void {
    if (valor <= 0) throw new Error("Quantidade deve ser positiva");
    if (!Number.isInteger(valor))
      throw new Error("Quantidade deve ser inteira");
  }

  somar(outra: Quantidade): Quantidade {
    return new Quantidade(this.valor + outra.valor);
  }

  subtrair(outra: Quantidade): Quantidade {
    const resultado = this.valor - outra.valor;
    if (resultado < 0) throw new Error("Quantidade não pode ser negativa");
    return new Quantidade(resultado);
  }

  getValor(): number {
    return this.valor;
  }

  equals(outra: Quantidade): boolean {
    return this.valor === outra.valor;
  }
}
```

**Evidência no Código:** Campo `quantidade` em [`MovimentacoesModel.ts`](api-estoqueraiz/movimentacoes-service/src/models/MovimentacoesModel.ts)

##### Documento

```typescript
class Documento {
  private readonly numero: string;
  private readonly tipo: string;

  constructor(numero: string, tipo: string = "GENERICO") {
    this.validar(numero);
    this.numero = numero;
    this.tipo = tipo;
  }

  private validar(numero: string): void {
    if (!numero || numero.trim().length === 0) {
      throw new Error("Número do documento não pode ser vazio");
    }
    if (numero.length > 50) {
      throw new Error("Número do documento muito longo");
    }
  }

  getNumero(): string {
    return this.numero;
  }

  getTipo(): string {
    return this.tipo;
  }
}
```

**Evidência no Código:** Campo `documento` em [`MovimentacoesModel.ts`](api-estoqueraiz/movimentacoes-service/src/models/MovimentacoesModel.ts)

---

#### Domain Services

##### CriarMovimentacaoService

```typescript
class CriarMovimentacaoService {
  constructor(
    private movimentacaoRepository: MovimentacaoRepository,
    private produtoRepository: ProdutoRepository,
    private estoqueService: EstoqueService
  ) {}

  async executar(
    dados: CriarMovimentacaoDTO,
    usuarioId: number
  ): Promise<void> {
    const produto = await this.produtoRepository.buscarPorId(dados.produto_id);
    if (!produto) throw new ErroNaoEncontrado("Produto não encontrado");

    if (dados.tipo === TipoMovimentacao.SAIDA) {
      const temEstoque = await this.estoqueService.verificarDisponibilidade(
        dados.produto_id,
        dados.quantidade
      );
      if (!temEstoque) throw new ErroValidacao("Estoque insuficiente");
    }

    const movimentacao = new Movimentacao({
      ...dados,
      usuario_id: usuarioId,
      data_movimentacao: new Date(),
    });

    await this.movimentacaoRepository.salvar(movimentacao);

    movimentacao.aplicarMovimentacao();
  }
}
```

**Evidência no Código:** [`movimentacoes-service/src/services/MovimentacoesService.ts`](api-estoqueraiz/movimentacoes-service/src/services/MovimentacoesService.ts)

---

#### Repositories

##### MovimentacaoRepository (Interface)

```typescript
interface MovimentacaoRepository {
  buscarPorId(id: number): Promise<Movimentacao | null>;
  listarTodas(filtros?: FiltrosMovimentacao): Promise<Movimentacao[]>;
  salvar(movimentacao: Movimentacao): Promise<void>;
  deletar(id: number): Promise<void>;
  buscarPorProduto(produtoId: number): Promise<Movimentacao[]>;
  buscarPorUnidade(unidadeId: number): Promise<Movimentacao[]>;
  buscarPorPeriodo(dataInicio: Date, dataFim: Date): Promise<Movimentacao[]>;
}
```

**Evidência no Código:** [`movimentacoes-service/src/services/MovimentacoesService.ts`](api-estoqueraiz/movimentacoes-service/src/services/MovimentacoesService.ts)

---

#### Domain Events

```typescript
class MovimentacaoCriadaEvent {
  constructor(
    public readonly movimentacaoId: number,
    public readonly tipo: TipoMovimentacao,
    public readonly produtoId: number,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

**Evidência no Código:** [`shared/eventos/publicador.ts`](api-estoqueraiz/shared/eventos/publicador.ts) - `MOVIMENTACAO_CRIADA`

---

## 3. Usuários Context (Supporting Domain)

### 3.1 Aggregate: Usuario

**Aggregate Root:** Usuario

#### Entities

##### Usuario (Root)

```typescript
class Usuario {
  private id: number;
  private nome: Nome;
  private email: Email;
  private cpf: CPF;
  private senha: SenhaHash;
  private cargo: Cargo | null;
  private status: StatusUsuario;
  private unidade: UnidadeId | null;
  private criadoEm: Date;
  private atualizadoEm: Date;

  constructor(dados: CriarUsuarioDTO) {
    this.validarDados(dados);
    this.inicializarUsuario(dados);
  }

  aprovar(cargo: Cargo, aprovadorId: number): void {
    if (this.status === StatusUsuario.APROVADO) {
      throw new Error("Usuário já aprovado");
    }
    this.cargo = cargo;
    this.status = StatusUsuario.APROVADO;
    this.publicarEvento(new UsuarioAprovadoEvent(this.id, aprovadorId));
  }

  rejeitar(motivo: string, rejeitadorId: number): void {
    if (this.status !== StatusUsuario.PENDENTE) {
      throw new Error("Apenas usuários pendentes podem ser rejeitados");
    }
    this.status = StatusUsuario.REJEITADO;
    this.publicarEvento(
      new UsuarioRejeitadoEvent(this.id, motivo, rejeitadorId)
    );
  }

  alterarCargo(novoCargo: Cargo, alteradorId: number): void {
    if (this.id === alteradorId && novoCargo !== Cargo.GERENTE) {
      throw new Error("Gerente não pode remover próprio cargo");
    }
    this.cargo = novoCargo;
    this.publicarEvento(
      new CargoAlteradoEvent(this.id, novoCargo, alteradorId)
    );
  }

  podeAprovarProdutos(): boolean {
    return this.cargo === Cargo.GERENTE || this.cargo === Cargo.FINANCEIRO;
  }

  podeAcessarTodasUnidades(): boolean {
    return this.cargo === Cargo.GERENTE;
  }
}
```

**Evidência no Código:** [`usuarios-service/src/models/UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts)

---

#### Value Objects

##### Nome

```typescript
class Nome {
  private readonly valor: string;

  constructor(valor: string) {
    this.validar(valor);
    this.valor = valor;
  }

  private validar(valor: string): void {
    if (!valor || valor.trim().length < 3) {
      throw new Error("Nome deve ter no mínimo 3 caracteres");
    }
    if (valor.length > 100) {
      throw new Error("Nome muito longo");
    }
  }

  getValor(): string {
    return this.valor;
  }

  getIniciais(): string {
    const partes = this.valor.split(" ");
    if (partes.length >= 2) {
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }
    return partes[0][0].toUpperCase();
  }
}
```

**Evidência no Código:** Campo `nome` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts)

##### Email

```typescript
class Email {
  private readonly valor: string;

  constructor(valor: string) {
    this.validar(valor);
    this.valor = valor.toLowerCase();
  }

  private validar(valor: string): void {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(valor)) {
      throw new Error("Email inválido");
    }
  }

  getValor(): string {
    return this.valor;
  }

  getDominio(): string {
    return this.valor.split("@")[1];
  }
}
```

**Evidência no Código:** Campo `email` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts)

##### CPF

```typescript
class CPF {
  private readonly valor: string;

  constructor(valor: string) {
    this.validar(valor);
    this.valor = this.limparFormatacao(valor);
  }

  private limparFormatacao(cpf: string): string {
    return cpf.replace(/\D/g, "");
  }

  private validar(cpf: string): void {
    const cpfLimpo = this.limparFormatacao(cpf);
    if (cpfLimpo.length !== 11) {
      throw new Error("CPF deve ter 11 dígitos");
    }
    if (!this.validarDigitos(cpfLimpo)) {
      throw new Error("CPF inválido");
    }
  }

  private validarDigitos(cpf: string): boolean {
    // Algoritmo de validação de CPF
    // Implementação completa omitida por brevidade
    return true; // Simplificado
  }

  getValor(): string {
    return this.valor;
  }

  getFormatado(): string {
    return this.valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
}
```

**Evidência no Código:** Campo `cpf` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts) + validação em [`Cadastro.tsx`](app-estoqueraiz/src/screens/Cadastro.tsx)

##### SenhaHash

```typescript
class SenhaHash {
  private readonly hash: string;

  constructor(senha: string) {
    this.validarSenha(senha);
    this.hash = this.criptografar(senha);
  }

  private validarSenha(senha: string): void {
    if (senha.length < 6) {
      throw new Error("Senha deve ter no mínimo 6 caracteres");
    }
  }

  private criptografar(senha: string): string {
    const bcrypt = require("bcrypt");
    return bcrypt.hashSync(senha, 10);
  }

  verificar(senha: string): boolean {
    const bcrypt = require("bcrypt");
    return bcrypt.compareSync(senha, this.hash);
  }

  getHash(): string {
    return this.hash;
  }
}
```

**Evidência no Código:** Campo `senha` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts) + [`AuthService.ts`](api-estoqueraiz/auth-service/src/services/AuthService.ts) usa bcrypt

##### Cargo (Enum)

```typescript
enum Cargo {
  GERENTE = "gerente",
  ESTOQUISTA = "estoquista",
  FINANCEIRO = "financeiro",
}
```

**Evidência no Código:** Campo `cargo` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts)

##### StatusUsuario (Enum)

```typescript
enum StatusUsuario {
  PENDENTE = "pendente",
  APROVADO = "aprovado",
  REJEITADO = "rejeitado",
}
```

**Evidência no Código:** Campo `status` em [`UsuariosModel.ts`](api-estoqueraiz/usuarios-service/src/models/UsuariosModel.ts)

---

#### Domain Events

```typescript
class UsuarioAprovadoEvent {
  constructor(
    public readonly usuarioId: number,
    public readonly aprovadorId: number,
    public readonly timestamp: Date = new Date()
  ) {}
}

class UsuarioRejeitadoEvent {
  constructor(
    public readonly usuarioId: number,
    public readonly motivo: string,
    public readonly rejeitadorId: number,
    public readonly timestamp: Date = new Date()
  ) {}
}

class CargoAlteradoEvent {
  constructor(
    public readonly usuarioId: number,
    public readonly novoCargo: Cargo,
    public readonly alteradorId: number,
    public readonly timestamp: Date = new Date()
  ) {}
}
```

**Evidência no Código:** [`shared/eventos/publicador.ts`](api-estoqueraiz/shared/eventos/publicador.ts) - `USUARIO_APROVADO`, `USUARIO_REJEITADO`

---

## 4. Resumo Técnico

### 4.1 Padrões Táticos Aplicados

| Padrão             | Contexto                          | Implementação                                                |
| ------------------ | --------------------------------- | ------------------------------------------------------------ |
| **Aggregate**      | Produtos, Movimentações, Usuários | Produto, Movimentacao, Usuario como Aggregate Roots          |
| **Entity**         | Produtos, Movimentações, Usuários | Classes com identidade única (id)                            |
| **Value Object**   | Todos os contextos                | Preco, Estoque, Quantidade, CPF, Email, Nome                 |
| **Domain Service** | Produtos, Movimentações           | AprovarProdutoService, CriarMovimentacaoService              |
| **Repository**     | Todos os contextos                | ProdutoRepository, MovimentacaoRepository, UsuarioRepository |
| **Domain Event**   | Todos os contextos                | 11 tipos de eventos via Redis Pub/Sub                        |
| **Specification**  | Produtos                          | Validação de estoque, validade                               |

### 4.2 Invariantes de Negócio

#### Produtos Context

1. Produto aprovado não pode voltar a pendente
2. Preço de venda >= Preço de custo
3. Estoque não pode ser negativo
4. Imagem máximo 5MB
5. Estoque baixo quando < estoque_minimo

#### Movimentações Context

1. Transferência: origem ≠ destino
2. Saída: estoque suficiente obrigatório
3. Quantidade sempre positiva e inteira
4. Transação atômica em transferências

#### Usuários Context

1. Email único no sistema
2. CPF único e válido
3. Gerente não pode remover próprio cargo
4. Senha mínimo 6 caracteres
5. Apenas gerente pode aprovar usuários

### 4.3 Mapeamento Código vs DDD

| Conceito DDD   | Implementação no Código | Evidência                                                                                |
| -------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Aggregate Root | Sequelize Model classes | [`ProdutosModel.ts`](api-estoqueraiz/produtos-service/src/models/ProdutosModel.ts)       |
| Value Object   | Campos com validação    | `preco_custo`, `preco_venda`, `cpf`, `email`                                             |
| Domain Service | Service classes         | [`ProdutosService.ts`](api-estoqueraiz/produtos-service/src/services/ProdutosService.ts) |
| Repository     | Service layer           | Métodos `listar`, `buscarPorId`, `criar`, `atualizar`                                    |
| Domain Event   | Redis Pub/Sub           | [`publicador.ts`](api-estoqueraiz/shared/eventos/publicador.ts)                          |
| Factory        | Service methods         | `criar`, `cadastrar` methods                                                             |

### 4.4 Benefícios da Aplicação de DDD

1. **Linguagem Ubíqua**: Termos do negócio refletidos no código (Produto, Movimentação, Curva ABC)
2. **Bounded Contexts**: Separação clara entre domínios via microserviços
3. **Isolamento**: Cada contexto com seu próprio modelo de dados
4. **Evolução**: Contextos podem evoluir independentemente
5. **Integridade**: Invariantes garantidas em Aggregates
6. **Rastreabilidade**: Eventos registram mudanças de estado

---

## Referências

- Evans, Eric. "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vernon, Vaughn. "Implementing Domain-Driven Design"
- [`ADR-002 - Arquitetura de Microserviços.md`](api-estoqueraiz/docs/ADR-002%20-%20Arquitetura%20de%20Microserviços.md)
- [`DDD-CONTEXT-MAP.md`](api-estoqueraiz/docs/DDD-CONTEXT-MAP.md)

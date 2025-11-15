import fetch from "node-fetch";
import { logger } from "../../../shared/utils/logger";
import { cacheService } from "../../../shared/utils/cache";
import {
  publicadorEventos,
  EventosTipo,
} from "../../../shared/eventos/publicador";
import {
  ErroValidacao,
  ErroNaoEncontrado,
} from "../../../shared/utils/tratamentoErros";
import ProdutosModel from "../models/ProdutosModel";
import {
  CriarProdutoDTO,
  AtualizarProdutoDTO,
  AprovarProdutoDTO,
} from "../dto/ProdutoDTO";

export class ProdutosService {
  private async buscarDadosRelacionados(produtoJson: any): Promise<any> {
    try {
      // Buscar categoria usando rota interna (sem autenticação)
      if (produtoJson.categoria_id) {
        try {
          const categoriaUrl = `http://categorias-service:3004/api/categorias/internal/${produtoJson.categoria_id}`;
          logger.info(`Buscando categoria: ${categoriaUrl}`);
          const categoriaResponse = await fetch(categoriaUrl);
          if (categoriaResponse.ok) {
            produtoJson.categoria = await categoriaResponse.json();
            logger.info(
              `Categoria encontrada: ${JSON.stringify(produtoJson.categoria)}`
            );
          } else {
            logger.warn(
              `Categoria não encontrada: status ${categoriaResponse.status}`
            );
          }
        } catch (error) {
          logger.warn(
            `Erro ao buscar categoria ${produtoJson.categoria_id}:`,
            error
          );
        }
      }

      // Buscar unidade usando rota interna (sem autenticação)
      if (produtoJson.unidade_id) {
        try {
          const unidadeUrl = `http://unidades-service:3003/api/unidades/internal/${produtoJson.unidade_id}`;
          logger.info(`Buscando unidade: ${unidadeUrl}`);
          const unidadeResponse = await fetch(unidadeUrl);
          if (unidadeResponse.ok) {
            produtoJson.unidade = await unidadeResponse.json();
            logger.info(
              `Unidade encontrada: ${JSON.stringify(produtoJson.unidade)}`
            );
          } else {
            logger.warn(
              `Unidade não encontrada: status ${unidadeResponse.status}`
            );
          }
        } catch (error) {
          logger.warn(
            `Erro ao buscar unidade ${produtoJson.unidade_id}:`,
            error
          );
        }
      }

      // Buscar usuário usando rota interna (sem autenticação)
      if (produtoJson.usuario_id) {
        try {
          const usuarioUrl = `http://usuarios-service:3002/api/usuarios/internal/${produtoJson.usuario_id}`;
          logger.info(`Buscando usuário: ${usuarioUrl}`);
          const usuarioResponse = await fetch(usuarioUrl);
          if (usuarioResponse.ok) {
            const usuario = await usuarioResponse.json();
            produtoJson.usuario = {
              id: usuario.id,
              nome: usuario.nome,
              cargo: usuario.cargo,
            };
            logger.info(
              `Usuário encontrado: ${JSON.stringify(produtoJson.usuario)}`
            );
          } else {
            logger.warn(
              `Usuário não encontrado: status ${usuarioResponse.status}`
            );
          }
        } catch (error) {
          logger.warn(
            `Erro ao buscar usuário ${produtoJson.usuario_id}:`,
            error
          );
        }
      }
    } catch (error) {
      logger.error(
        `Erro ao buscar relacionamentos do produto ${produtoJson.id}:`,
        error
      );
    }

    return produtoJson;
  }

  async listarTodos(unidade_id?: number): Promise<any[]> {
    const cacheKey = unidade_id ? `unidade:${unidade_id}` : "todos";

    return await cacheService.buscarOuExecutar(
      cacheKey,
      async () => {
        const where: any = { ativo: true, statusProduto: "aprovado" };
        if (unidade_id) {
          where.unidade_id = unidade_id;
        }
        const produtos = await ProdutosModel.findAll({
          where,
          order: [["nome", "ASC"]],
        });

        // Buscar dados relacionados para cada produto
        const produtosComRelacionamentos = await Promise.all(
          produtos.map(async (produto: any) => {
            const produtoJson = produto.toJSON();
            return await this.buscarDadosRelacionados(produtoJson);
          })
        );

        return produtosComRelacionamentos;
      },
      { ttl: 600, namespace: "produtos" }
    );
  }

  async buscarPorId(id: number): Promise<any> {
    return await cacheService.buscarOuExecutar(
      `id:${id}`,
      async () => {
        const produto = await ProdutosModel.findByPk(id);
        if (!produto) {
          throw new ErroNaoEncontrado("Produto não encontrado");
        }
        const produtoJson = produto.toJSON();
        return await this.buscarDadosRelacionados(produtoJson);
      },
      { ttl: 600, namespace: "produtos" }
    );
  }

  async criar(dados: CriarProdutoDTO): Promise<any> {
    const { nome, categoria_id, unidade_id, usuario_id, quantidade_estoque } =
      dados;

    if (!nome || !categoria_id || !unidade_id || !usuario_id) {
      throw new ErroValidacao("Campos obrigatórios faltando");
    }

    const novoProduto = await ProdutosModel.create({
      ...dados,
      statusProduto: "pendente",
      ativo: true,
    });

    await publicadorEventos.publicar(
      EventosTipo.PRODUTO_CRIADO,
      { id: novoProduto.id, nome: novoProduto.nome },
      "produtos-service"
    );

    await cacheService.invalidarPorPadrao("*", "produtos");

    logger.info(`Produto criado: ${nome}`);

    return novoProduto.toJSON();
  }

  async atualizar(id: number, dados: AtualizarProdutoDTO): Promise<any> {
    const produto = await ProdutosModel.findByPk(id);
    if (!produto) {
      throw new ErroNaoEncontrado("Produto não encontrado");
    }

    await produto.update(dados);

    await publicadorEventos.publicar(
      EventosTipo.PRODUTO_ATUALIZADO,
      { id: produto.id, nome: produto.nome },
      "produtos-service"
    );

    await cacheService.invalidarPorPadrao("*", "produtos");
    await cacheService.invalidar(`id:${id}`, "produtos");

    logger.info(`Produto atualizado: ID ${id}`);

    return produto.toJSON();
  }

  async deletar(id: number): Promise<void> {
    const produto = await ProdutosModel.findByPk(id);
    if (!produto) {
      throw new ErroNaoEncontrado("Produto não encontrado");
    }

    await produto.update({ ativo: false });

    await publicadorEventos.publicar(
      EventosTipo.PRODUTO_DELETADO,
      { id, nome: produto.nome },
      "produtos-service"
    );

    await cacheService.invalidarPorPadrao("*", "produtos");
    await cacheService.invalidar(`id:${id}`, "produtos");

    logger.info(`Produto desativado (soft delete): ID ${id}`);
  }

  async aprovar(id: number, dados: AprovarProdutoDTO): Promise<any> {
    const produto = await ProdutosModel.findByPk(id);
    if (!produto) {
      throw new ErroNaoEncontrado("Produto não encontrado");
    }

    if (produto.statusProduto !== "pendente") {
      throw new ErroValidacao("Produto já foi processado");
    }

    const { preco_custo, preco_venda } = dados;

    if (!preco_custo || !preco_venda) {
      throw new ErroValidacao("Preço de custo e venda são obrigatórios");
    }

    if (preco_custo < 0 || preco_venda < 0) {
      throw new ErroValidacao("Preços não podem ser negativos");
    }

    await produto.update({
      statusProduto: "aprovado",
      preco_custo,
      preco_venda,
    });

    await publicadorEventos.publicar(
      EventosTipo.PRODUTO_APROVADO,
      { id: produto.id, nome: produto.nome, preco_custo, preco_venda },
      "produtos-service"
    );

    // Invalidar cache de todos os produtos e pendentes
    await cacheService.invalidarPorPadrao("*", "produtos");
    await cacheService.invalidar(`id:${id}`, "produtos");
    await cacheService.invalidar("pendentes", "produtos");

    logger.info(
      `Produto aprovado: ID ${id} - Preço custo: ${preco_custo}, Preço venda: ${preco_venda}`
    );

    return produto.toJSON();
  }

  async rejeitar(id: number): Promise<any> {
    const produto = await ProdutosModel.findByPk(id);
    if (!produto) {
      throw new ErroNaoEncontrado("Produto não encontrado");
    }

    if (produto.statusProduto !== "pendente") {
      throw new ErroValidacao("Produto já foi processado");
    }

    await produto.update({ statusProduto: "rejeitado" });

    await publicadorEventos.publicar(
      EventosTipo.PRODUTO_REJEITADO,
      { id: produto.id, nome: produto.nome },
      "produtos-service"
    );

    // Invalidar cache de todos os produtos e pendentes
    await cacheService.invalidarPorPadrao("*", "produtos");
    await cacheService.invalidar(`id:${id}`, "produtos");
    await cacheService.invalidar("pendentes", "produtos");

    logger.info(`Produto rejeitado: ID ${id}`);

    return produto.toJSON();
  }

  async listarPendentes(): Promise<any[]> {
    return await cacheService.buscarOuExecutar(
      "pendentes",
      async () => {
        const produtos = await ProdutosModel.findAll({
          where: { statusProduto: "pendente" },
          order: [["criado_em", "ASC"]],
        });

        // Buscar dados relacionados para cada produto pendente
        const produtosComRelacionamentos = await Promise.all(
          produtos.map(async (produto: any) => {
            const produtoJson = produto.toJSON();
            return await this.buscarDadosRelacionados(produtoJson);
          })
        );

        return produtosComRelacionamentos;
      },
      { ttl: 300, namespace: "produtos" }
    );
  }
}

export const produtosService = new ProdutosService();

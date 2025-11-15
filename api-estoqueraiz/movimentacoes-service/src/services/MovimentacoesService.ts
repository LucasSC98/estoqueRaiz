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
import MovimentacoesModel from "../models/MovimentacoesModel";
import {
  CriarMovimentacaoDTO,
  FiltroMovimentacoesDTO,
} from "../dto/MovimentacaoDTO";
import { sequelize } from "../../../shared/config/database";
import { Transaction, Op, QueryTypes } from "sequelize";

export class MovimentacoesService {
  async listarTodos(filtros: FiltroMovimentacoesDTO): Promise<any[]> {
    const { produto_id, unidade_id, tipo, data_inicio, data_fim } = filtros;

    const cacheKey = `filtros:${JSON.stringify(filtros)}`;

    return await cacheService.buscarOuExecutar(
      cacheKey,
      async () => {
        const where: any = {};

        if (produto_id) where.produto_id = produto_id;
        if (tipo) where.tipo = tipo;

        if (unidade_id) {
          where[Op.or] = [
            { unidade_origem_id: unidade_id },
            { unidade_destino_id: unidade_id },
          ];
        }

        if (data_inicio && data_fim) {
          where.data_movimentacao = {
            [Op.between]: [new Date(data_inicio), new Date(data_fim)],
          };
        } else if (data_inicio) {
          where.data_movimentacao = {
            [Op.gte]: new Date(data_inicio),
          };
        } else if (data_fim) {
          where.data_movimentacao = {
            [Op.lte]: new Date(data_fim),
          };
        }

        const movimentacoes = await MovimentacoesModel.findAll({
          where,
          order: [["data_movimentacao", "DESC"]],
        });

        const movimentacoesComDados = await Promise.all(
          movimentacoes.map(async (mov) => {
            const movJson = mov.toJSON();

            const produto = await sequelize.query(
              "SELECT id, nome FROM produtos WHERE id = :produto_id LIMIT 1",
              {
                replacements: { produto_id: mov.produto_id },
                type: QueryTypes.SELECT,
              }
            );

            const usuario = await sequelize.query(
              "SELECT id, nome FROM usuarios WHERE id = :usuario_id LIMIT 1",
              {
                replacements: { usuario_id: mov.usuario_id },
                type: QueryTypes.SELECT,
              }
            );

            return {
              ...movJson,
              produto: produto[0] || null,
              usuario: usuario[0] || null,
            };
          })
        );

        return movimentacoesComDados;
      },
      { ttl: 300, namespace: "movimentacoes" }
    );
  }

  async buscarPorId(id: number): Promise<any> {
    return await cacheService.buscarOuExecutar(
      `id:${id}`,
      async () => {
        const movimentacao = await MovimentacoesModel.findByPk(id);
        if (!movimentacao) {
          throw new ErroNaoEncontrado("Movimentação não encontrada");
        }
        return movimentacao.toJSON();
      },
      { ttl: 300, namespace: "movimentacoes" }
    );
  }

  async criar(dados: CriarMovimentacaoDTO): Promise<any> {
    const {
      tipo,
      quantidade,
      produto_id,
      usuario_id,
      unidade_origem_id,
      unidade_destino_id,
    } = dados;

    if (!tipo || !quantidade || !produto_id || !usuario_id) {
      throw new ErroValidacao("Campos obrigatórios faltando");
    }

    if (quantidade <= 0) {
      throw new ErroValidacao("Quantidade deve ser maior que zero");
    }

    if (tipo === "TRANSFERENCIA" && !unidade_destino_id) {
      throw new ErroValidacao("Transferência requer unidade de destino");
    }

    if (tipo === "TRANSFERENCIA" && unidade_origem_id === unidade_destino_id) {
      throw new ErroValidacao(
        "Unidade de origem deve ser diferente da de destino"
      );
    }

    let novaMovimentacao;

    if (tipo === "TRANSFERENCIA") {
      const transaction: Transaction = await sequelize.transaction();

      try {
        novaMovimentacao = await MovimentacoesModel.create(
          {
            tipo,
            quantidade,
            observacao: dados.observacao,
            documento: dados.documento,
            produto_id,
            usuario_id,
            unidade_origem_id,
            unidade_destino_id,
            data_movimentacao: new Date(),
          },
          { transaction }
        );

        await transaction.commit();

        logger.info(
          `Transferência criada com transação atômica: produto ${produto_id} de unidade ${unidade_origem_id} para ${unidade_destino_id}`
        );
      } catch (erro) {
        await transaction.rollback();
        logger.error(
          `Erro ao criar transferência, transação revertida: ${erro}`
        );
        throw erro;
      }
    } else {
      novaMovimentacao = await MovimentacoesModel.create({
        tipo,
        quantidade,
        observacao: dados.observacao,
        documento: dados.documento,
        produto_id,
        usuario_id,
        unidade_origem_id: dados.unidade_origem_id,
        unidade_destino_id,
        data_movimentacao: new Date(),
      });

      logger.info(`Movimentação ${tipo} criada para produto ${produto_id}`);
    }

    await publicadorEventos.publicar(
      EventosTipo.MOVIMENTACAO_CRIADA,
      {
        id: novaMovimentacao.id,
        tipo: novaMovimentacao.tipo,
        produto_id: novaMovimentacao.produto_id,
        quantidade: novaMovimentacao.quantidade,
      },
      "movimentacoes-service"
    );

    await cacheService.invalidarPorPadrao("*", "movimentacoes");
    await cacheService.invalidarPorPadrao("*", "produtos");

    return novaMovimentacao.toJSON();
  }

  async deletar(id: number): Promise<void> {
    const movimentacao = await MovimentacoesModel.findByPk(id);
    if (!movimentacao) {
      throw new ErroNaoEncontrado("Movimentação não encontrada");
    }

    await movimentacao.destroy();

    await publicadorEventos.publicar(
      EventosTipo.MOVIMENTACAO_DELETADA,
      { id },
      "movimentacoes-service"
    );

    await cacheService.invalidarPorPadrao("*", "movimentacoes");
    await cacheService.invalidarPorPadrao("*", "produtos");

    logger.info(`Movimentação ${id} deletada`);
  }
}

export const movimentacoesService = new MovimentacoesService();

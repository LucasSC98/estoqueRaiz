import { Request, Response } from "express";
import { movimentacoesService } from "../services/MovimentacoesService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const listarMovimentacoes = asyncHandler(
  async (req: Request, res: Response) => {
    const { produto_id, unidade_id, tipo, data_inicio, data_fim } = req.query;

    const filtros = {
      produto_id: produto_id ? parseInt(produto_id as string) : undefined,
      unidade_id: unidade_id ? parseInt(unidade_id as string) : undefined,
      tipo: tipo as any,
      data_inicio: data_inicio as string,
      data_fim: data_fim as string,
    };

    logger.info("Listando movimentações com filtros");
    const movimentacoes = await movimentacoesService.listarTodos(filtros);
    res.json(movimentacoes);
  }
);

export const buscarMovimentacao = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Buscando movimentação ID: ${id}`);
    const movimentacao = await movimentacoesService.buscarPorId(parseInt(id));
    res.json(movimentacao);
  }
);

export const criarMovimentacao = asyncHandler(
  async (req: Request, res: Response) => {
    const { tipo, produto_id } = req.body;
    logger.info(`Criando movimentação ${tipo} para produto ${produto_id}`);
    const movimentacao = await movimentacoesService.criar({
      ...req.body,
      usuario_id: req.usuario?.id,
      unidade_origem_id: req.body.unidade_origem_id || req.usuario?.unidade_id,
    });
    res.status(201).json({
      message: "Movimentação criada com sucesso",
      movimentacao,
    });
  }
);

export const deletarMovimentacao = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deletando movimentação ID: ${id}`);
    await movimentacoesService.deletar(parseInt(id));
    res.json({
      message: "Movimentação deletada com sucesso",
    });
  }
);

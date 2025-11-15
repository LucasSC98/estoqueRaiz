import { Request, Response } from "express";
import { categoriasService } from "../services/CategoriasService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const listarCategorias = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info("Listando todas as categorias");
    const categorias = await categoriasService.listarTodas();
    res.json(categorias);
  }
);

export const buscarCategoria = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Buscando categoria ID: ${id}`);
    const categoria = await categoriasService.buscarPorId(parseInt(id));
    res.json(categoria);
  }
);

export const criarCategoria = asyncHandler(
  async (req: Request, res: Response) => {
    const { nome, descricao } = req.body;
    logger.info(`Criando categoria: ${nome}`);
    const categoria = await categoriasService.criar({ nome, descricao });
    res.status(201).json({
      message: "Categoria criada com sucesso",
      categoria,
    });
  }
);

export const atualizarCategoria = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Atualizando categoria ID: ${id}`);
    const categoria = await categoriasService.atualizar(parseInt(id), req.body);
    res.json({
      message: "Categoria atualizada com sucesso",
      categoria,
    });
  }
);

export const deletarCategoria = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deletando categoria ID: ${id}`);
    await categoriasService.deletar(parseInt(id));
    res.json({ message: "Categoria deletada com sucesso" });
  }
);

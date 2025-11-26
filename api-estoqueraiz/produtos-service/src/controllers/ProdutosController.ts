import { Request, Response } from "express";
import { produtosService } from "../services/ProdutosService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const listarProdutos = asyncHandler(
  async (req: Request, res: Response) => {
    const { unidade_id } = req.query;
    const unidadeIdNum = unidade_id
      ? parseInt(unidade_id as string)
      : undefined;

    logger.info("Listando todos os produtos");
    const produtos = await produtosService.listarTodos(unidadeIdNum);
    res.json(produtos);
  }
);

export const buscarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Buscando produto ID: ${id}`);
    const produto = await produtosService.buscarPorId(parseInt(id));
    res.json(produto);
  }
);

export const criarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { nome } = req.body;
    logger.info(`Criando produto: ${nome}`);

    let dadosProduto = {
      ...req.body,
      usuario_id: req.usuario?.id,
    };

    if (req.file) {
      dadosProduto.imagem_url = `/uploads/${req.file.filename}`;
      logger.info(`Imagem recebida: ${req.file.filename}`);
    }

    const produto = await produtosService.criar(dadosProduto);

    res.status(201).json({
      message: "Produto criado com sucesso",
      produto,
    });
  }
);

export const atualizarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Atualizando produto ID: ${id}`);

    let dadosAtualizacao = { ...req.body };

    if (req.file) {
      dadosAtualizacao.imagem_url = `/uploads/${req.file.filename}`;
      logger.info(`Nova imagem recebida: ${req.file.filename}`);
    }

    const produto = await produtosService.atualizar(
      parseInt(id),
      dadosAtualizacao
    );

    res.json({
      message: "Produto atualizado com sucesso",
      produto,
    });
  }
);

export const deletarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deletando produto ID: ${id}`);
    await produtosService.deletar(parseInt(id));
    res.json({ message: "Produto deletado com sucesso" });
  }
);

export const aprovarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { preco_custo, preco_venda } = req.body;
    logger.info(`Aprovando produto ID: ${id}`);
    const produto = await produtosService.aprovar(parseInt(id), {
      preco_custo,
      preco_venda,
    });
    res.json({
      message: "Produto aprovado com sucesso",
      produto,
    });
  }
);

export const listarPendentes = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info("Listando produtos pendentes");
    const produtos = await produtosService.listarPendentes();
    res.json(produtos);
  }
);

export const rejeitarProduto = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Rejeitando produto ID: ${id}`);
    const produto = await produtosService.rejeitar(parseInt(id));
    res.json({
      message: "Produto rejeitado com sucesso",
      produto,
    });
  }
);

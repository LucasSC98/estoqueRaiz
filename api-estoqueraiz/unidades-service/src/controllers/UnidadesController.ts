import { Request, Response } from "express";
import { unidadesService } from "../services/UnidadesService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";
import { buscarCEP } from "../utils/buscarCep";

export const listarUnidades = asyncHandler(
  async (req: Request, res: Response) => {
    logger.info("Listando todas as unidades");
    const unidades = await unidadesService.listarTodas();
    res.json(unidades);
  }
);

export const buscarUnidade = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Buscando unidade ID: ${id}`);
    const unidade = await unidadesService.buscarPorId(parseInt(id));
    res.json(unidade);
  }
);

export const criarUnidade = asyncHandler(
  async (req: Request, res: Response) => {
    const { nome, descricao, rua, numero, bairro, cidade, estado, cep } =
      req.body;
    logger.info(`Criando unidade: ${nome}`);
    const unidade = await unidadesService.criar({
      nome,
      descricao,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    });
    res.status(201).json({
      message: "Unidade criada com sucesso",
      unidade,
    });
  }
);

export const atualizarUnidade = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Atualizando unidade ID: ${id}`);
    const unidade = await unidadesService.atualizar(parseInt(id), req.body);
    res.json({
      message: "Unidade atualizada com sucesso",
      unidade,
    });
  }
);

export const deletarUnidade = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`Deletando unidade ID: ${id}`);
    await unidadesService.deletar(parseInt(id));
    res.json({ message: "Unidade deletada com sucesso" });
  }
);

export const buscarEnderecoCEP = asyncHandler(
  async (req: Request, res: Response) => {
    const { cep } = req.params;
    logger.info(`Buscando endereço para CEP: ${cep}`);

    const dadosCEP = await buscarCEP(cep);

    if (!dadosCEP) {
      return res.status(404).json({ message: "CEP não encontrado" });
    }

    res.json({
      rua: dadosCEP.logradouro,
      bairro: dadosCEP.bairro,
      cidade: dadosCEP.localidade,
      estado: dadosCEP.uf,
      cep: dadosCEP.cep,
    });
  }
);

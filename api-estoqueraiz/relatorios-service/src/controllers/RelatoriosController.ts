import { Request, Response } from "express";
import { relatoriosService } from "../services/RelatoriosService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const gerarCurvaABC = asyncHandler(
  async (req: Request, res: Response) => {
    const { data_inicio, data_fim, unidade_id } = req.query;

    logger.info(`Gerando Curva ABC`);

    const resultado = await relatoriosService.gerarCurvaABC({
      data_inicio: data_inicio as string,
      data_fim: data_fim as string,
      unidade_id: unidade_id ? parseInt(unidade_id as string) : undefined,
    });

    res.json({
      message: "Curva ABC gerada com sucesso",
      ...resultado,
    });
  }
);

export const obterEstatisticas = asyncHandler(
  async (req: Request, res: Response) => {
    const { unidade_id } = req.query;

    logger.info(`Obtendo estatísticas gerais`);

    const resultado = await relatoriosService.obterEstatisticasGerais({
      unidade_id: unidade_id ? parseInt(unidade_id as string) : undefined,
    });

    res.json(resultado);
  }
);

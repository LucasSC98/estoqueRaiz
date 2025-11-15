import { Request, Response } from "express";
import { authService } from "../services/AuthService";
import { asyncHandler } from "../../../shared/utils/tratamentoErros";
import { logger } from "../../../shared/utils/logger";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  logger.info(`Tentativa de login: ${email}`);

  const resultado = await authService.login({ email, senha });

  res.json(resultado);
});

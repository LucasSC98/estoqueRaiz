import { Request, Response, NextFunction } from "express";
import { ErroValidacao } from "../../../shared/utils/tratamentoErros";

export const validacaoLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email, senha } = req.body;

  if (!email) {
    throw new ErroValidacao("Email é obrigatório");
  }

  if (!senha) {
    throw new ErroValidacao("Senha é obrigatória");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ErroValidacao("Email inválido");
  }

  next();
};

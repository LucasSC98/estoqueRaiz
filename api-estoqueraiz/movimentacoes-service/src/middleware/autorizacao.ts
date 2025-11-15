import { Request, Response, NextFunction } from "express";
import {
  ErroNaoAutorizado,
  ErroProibido,
} from "../../../shared/utils/tratamentoErros";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uma_senha_boa_e_segura";

interface PayloadToken {
  id: number;
  email: string;
  cargo: string;
  unidade_id: number;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: PayloadToken;
    }
  }
}

export const autenticacao = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ErroNaoAutorizado("Token não fornecido");
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET) as PayloadToken;
    req.usuario = decoded;

    next();
  } catch (erro) {
    throw new ErroNaoAutorizado("Token inválido");
  }
};

export const apenasGerente = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.usuario?.cargo !== "gerente") {
    throw new ErroProibido("Acesso negado: apenas gerentes");
  }
  next();
};

export const verificarAcessoUnidade = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const unidadeId = req.body.unidade_origem_id || req.query.unidade_id;

  if (req.usuario?.cargo === "gerente") {
    return next();
  }

  if (unidadeId && parseInt(unidadeId as string) !== req.usuario?.unidade_id) {
    throw new ErroProibido("Acesso negado: você só pode acessar sua unidade");
  }

  next();
};

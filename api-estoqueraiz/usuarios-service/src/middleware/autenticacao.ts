import * as dotenv from "dotenv";
dotenv.config();
import { Request, Response, NextFunction } from "express";
import {
  ErroNaoAutorizado,
  ErroProibido,
} from "../../../shared/utils/tratamentoErros";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "uma_senha_pica_secreta";

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
    throw new ErroProibido("Acesso permitido apenas para gerentes");
  }
  next();
};

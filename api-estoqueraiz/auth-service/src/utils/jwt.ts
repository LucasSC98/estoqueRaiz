import jwt from "jsonwebtoken";
import { logger } from "../../../shared/utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "uma_senha_boa_e_segura";
const JWT_EXPIRATION = "2h";

interface PayloadToken {
  id: number;
  email: string;
  cargo: string;
  unidade_id: number;
}

export const gerarToken = (payload: PayloadToken): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

export const verificarToken = (token: string): PayloadToken => {
  try {
    return jwt.verify(token, JWT_SECRET) as PayloadToken;
  } catch (erro) {
    logger.error("Erro ao verificar token:", erro);
    throw new Error("Token inválido");
  }
};

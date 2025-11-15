import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export class ErroAPI extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public detalhes?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErroValidacao extends ErroAPI {
  constructor(message: string, detalhes?: any) {
    super(400, message, detalhes);
  }
}

export class ErroNaoEncontrado extends ErroAPI {
  constructor(message: string = "Recurso não encontrado") {
    super(404, message);
  }
}

export class ErroNaoAutorizado extends ErroAPI {
  constructor(message: string = "Não autorizado") {
    super(401, message);
  }
}

export class ErroProibido extends ErroAPI {
  constructor(message: string = "Acesso negado") {
    super(403, message);
  }
}

export class ErroInterno extends ErroAPI {
  constructor(message: string = "Erro interno do servidor", detalhes?: any) {
    super(500, message, detalhes);
  }
}

export const manipuladorErros = (
  erro: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (erro instanceof ErroAPI) {
    logger.error(`[${erro.statusCode}] ${erro.message}`, {
      url: req.url,
      metodo: req.method,
      detalhes: erro.detalhes,
      stack: erro.stack,
    });

    return res.status(erro.statusCode).json({
      erro: true,
      message: erro.message,
      detalhes: erro.detalhes,
      timestamp: new Date().toISOString(),
    });
  }

  logger.error("Erro não tratado:", {
    erro: erro.message,
    stack: erro.stack,
    url: req.url,
    metodo: req.method,
  });

  return res.status(500).json({
    erro: true,
    message: "Erro interno do servidor",
    timestamp: new Date().toISOString(),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

import { redisPublicador } from "../config/redis";
import { logger } from "../utils/logger";

export enum EventosTipo {
  USUARIO_CRIADO = "usuario:criado",
  USUARIO_ATUALIZADO = "usuario:atualizado",
  USUARIO_DELETADO = "usuario:deletado",
  USUARIO_APROVADO = "usuario:aprovado",
  USUARIO_REJEITADO = "usuario:rejeitado",
  LOGIN_REALIZADO = "login:realizado",
  LOGIN_FALHOU = "login:falhou",
  UNIDADE_CRIADA = "unidade:criada",
  UNIDADE_ATUALIZADA = "unidade:atualizada",
  UNIDADE_DELETADA = "unidade:deletada",
  CATEGORIA_CRIADA = "categoria:criada",
  CATEGORIA_ATUALIZADA = "categoria:atualizada",
  CATEGORIA_DELETADA = "categoria:deletada",
  PRODUTO_CRIADO = "produto:criado",
  PRODUTO_ATUALIZADO = "produto:atualizado",
  PRODUTO_DELETADO = "produto:deletado",
  PRODUTO_APROVADO = "produto:aprovado",
  PRODUTO_REJEITADO = "produto:rejeitado",
  MOVIMENTACAO_CRIADA = "movimentacao:criada",
  MOVIMENTACAO_DELETADA = "movimentacao:deletada",
}

interface EventoPayload {
  tipo: EventosTipo;
  dados: any;
  timestamp: Date;
  servicoOrigem: string;
}

export class PublicadorEventos {
  async publicar(
    tipo: EventosTipo,
    dados: any,
    servicoOrigem: string
  ): Promise<void> {
    const payload: EventoPayload = {
      tipo,
      dados,
      timestamp: new Date(),
      servicoOrigem,
    };

    try {
      const resultado = await redisPublicador.publish(
        tipo,
        JSON.stringify(payload)
      );
      logger.info(`Evento PUBLICADO: ${tipo}`, {
        assinantes: resultado,
        servicoOrigem,
        dados: (dados && (dados.id || dados.email)) || "N/A",
      });
    } catch (erro) {
      logger.error(`Erro ao publicar evento ${tipo}:`, erro);
      throw erro;
    }
  }
}

export const publicadorEventos = new PublicadorEventos();

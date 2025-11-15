import { redisAssinante } from "../config/redis";
import { logger } from "../utils/logger";
import { EventosTipo } from "./publicador";

type ManipuladorEvento = (dados: any) => Promise<void> | void;

export class AssinanteEventos {
  private manipuladores: Map<EventosTipo, ManipuladorEvento[]> = new Map();

  registrarManipulador(
    tipo: EventosTipo,
    manipulador: ManipuladorEvento
  ): void {
    if (!this.manipuladores.has(tipo)) {
      this.manipuladores.set(tipo, []);
    }
    this.manipuladores.get(tipo)!.push(manipulador);
  }

  async inscrever(tipos: EventosTipo[]): Promise<void> {
    await redisAssinante.subscribe(...tipos);

    redisAssinante.on("message", async (canal: string, mensagem: string) => {
      try {
        const payload = JSON.parse(mensagem);
        const tipo = canal as EventosTipo;

        logger.info(`Evento RECEBIDO: ${tipo}`, {
          servicoOrigem: payload.servicoOrigem,
          timestamp: payload.timestamp,
        });

        const manipuladores = this.manipuladores.get(tipo);

        if (manipuladores && manipuladores.length > 0) {
          for (const manipulador of manipuladores) {
            try {
              await manipulador(payload.dados);
              logger.info(`Evento PROCESSADO: ${tipo}`);
            } catch (erro) {
              logger.error(`Erro ao processar evento ${tipo}:`, erro);
            }
          }
        } else {
          logger.warn(`Nenhum manipulador para evento: ${tipo}`);
        }
      } catch (erro) {
        logger.error("Erro ao processar mensagem:", erro);
      }
    });

    logger.info(`Inscrito em ${tipos.length} canais de eventos`);
  }

  async desinscrever(): Promise<void> {
    try {
      await redisAssinante.unsubscribe();
      redisAssinante.removeAllListeners("message");
      logger.info("Desinscrito de todos os eventos");
    } catch (erro) {
      logger.error("Erro ao desinscrever eventos:", erro);
      throw erro;
    }
  }
}

export const assinanteEventos = new AssinanteEventos();
export { EventosTipo };

import { redisClient } from "../config/redis";
import { logger } from "./logger";

interface OpcoesCache {
  ttl?: number;
  namespace?: string;
}

export class CacheService {
  private readonly TTL_PADRAO = 300;

  async buscarOuExecutar<T>(
    chave: string,
    funcaoExecucao: () => Promise<T>,
    opcoes: OpcoesCache = {}
  ): Promise<T> {
    const { ttl = this.TTL_PADRAO, namespace = "default" } = opcoes;
    const chaveCompleta = `${namespace}:${chave}`;

    try {
      const dadosCache = await redisClient.get(chaveCompleta);

      if (dadosCache) {
        logger.info(`Cache HIT: ${chaveCompleta}`);
        return JSON.parse(dadosCache) as T;
      }

      logger.info(`Cache MISS: ${chaveCompleta}`);
      const dados = await funcaoExecucao();
      await redisClient.setex(chaveCompleta, ttl, JSON.stringify(dados));
      logger.info(`Cache ARMAZENADO: ${chaveCompleta} (TTL: ${ttl}s)`);

      return dados;
    } catch (erro) {
      logger.error(`Erro no cache para chave ${chaveCompleta}:`, erro);
      return await funcaoExecucao();
    }
  }

  async invalidar(chave: string, namespace: string = "default"): Promise<void> {
    const chaveCompleta = `${namespace}:${chave}`;
    try {
      await redisClient.del(chaveCompleta);
      logger.info(`Cache INVALIDADO: ${chaveCompleta}`);
    } catch (erro) {
      logger.error(`Erro ao invalidar cache ${chaveCompleta}:`, erro);
    }
  }

  async invalidarPorPadrao(
    padrao: string,
    namespace: string = "default"
  ): Promise<void> {
    try {
      const padraoCompleto = `${namespace}:${padrao}`;
      const chaves = await redisClient.keys(padraoCompleto);
      if (chaves.length > 0) {
        await redisClient.del(...chaves);
        logger.info(
          ` Cache INVALIDADO (${chaves.length} chaves): ${padraoCompleto}`
        );
      }
    } catch (erro) {
      logger.error(`Erro ao invalidar cache por padrão:`, erro);
    }
  }

  async armazenar(
    chave: string,
    valor: any,
    opcoes: OpcoesCache = {}
  ): Promise<void> {
    const { ttl = this.TTL_PADRAO, namespace = "default" } = opcoes;
    const chaveCompleta = `${namespace}:${chave}`;

    try {
      await redisClient.setex(chaveCompleta, ttl, JSON.stringify(valor));
      logger.info(`Cache ARMAZENADO: ${chaveCompleta} (TTL: ${ttl}s)`);
    } catch (erro) {
      logger.error(`Erro ao armazenar cache ${chaveCompleta}:`, erro);
    }
  }

  async buscar<T>(
    chave: string,
    namespace: string = "default"
  ): Promise<T | null> {
    const chaveCompleta = `${namespace}:${chave}`;
    try {
      const dados = await redisClient.get(chaveCompleta);
      if (dados) {
        logger.info(`Cache HIT: ${chaveCompleta}`);
        return JSON.parse(dados);
      }
      logger.info(`Cache MISS: ${chaveCompleta}`);
      return null;
    } catch (erro) {
      logger.error(`Erro ao buscar cache ${chaveCompleta}:`, erro);
      return null;
    }
  }
}

export const cacheService = new CacheService();

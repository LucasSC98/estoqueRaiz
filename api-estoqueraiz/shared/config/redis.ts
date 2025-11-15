import Redis from "ioredis";
import { logger } from "../utils/logger";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export const redisPublicador = new Redis({
  host: redisHost,
  port: redisPort,
});

export const redisAssinante = new Redis({
  host: redisHost,
  port: redisPort,
});

redisClient.on("connect", () => {
  logger.info(" Conectado ao Redis (Cache)");
});

redisClient.on("error", (err: Error) => {
  logger.error(" Erro no Redis:", err);
});

redisPublicador.on("connect", () => {
  logger.info(" Redis Publicador conectado");
});

redisAssinante.on("connect", () => {
  logger.info(" Redis Assinante conectado");
});

export default redisClient;

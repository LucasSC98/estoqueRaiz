import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { conectarBanco, sequelize } from "../../shared/config/database";
import { redisClient } from "../../shared/config/redis";
import { logger } from "../../shared/utils/logger";
import { manipuladorErros } from "../../shared/utils/tratamentoErros";
import { metricsMiddleware, metricsHandler } from "../../shared/utils/metrics";
import {
  healthCheckHandler,
  livenessCheckHandler,
  readinessCheckHandler,
} from "../../shared/utils/healthCheck";
import { assinanteEventos } from "../../shared/eventos/assinante";
import { EventosTipo } from "../../shared/eventos/publicador";
import rotaUsuarios from "./routes/rotaUsuarios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_NAME = "usuarios-service";
const VERSION = "1.0.0";

app.use(cors());
app.use(express.json());

app.use(metricsMiddleware(SERVICE_NAME));

app.get("/health", healthCheckHandler(SERVICE_NAME, VERSION));
app.get("/liveness", livenessCheckHandler);
app.get("/readiness", readinessCheckHandler);
app.get("/metrics", metricsHandler);

app.use("/api/usuarios", rotaUsuarios);

app.use(manipuladorErros);

assinanteEventos.registrarManipulador(
  EventosTipo.LOGIN_REALIZADO,
  async (dados) => {
    logger.info(`Usuário logou no sistema:`, dados);
  }
);

assinanteEventos.registrarManipulador(
  EventosTipo.LOGIN_FALHOU,
  async (dados) => {
    logger.warn(`Tentativa de login falhou:`, dados);
  }
);

let server: any;

async function gracefulShutdown(signal: string) {
  logger.info(` Recebido sinal ${signal} - iniciando shutdown graceful`);

  server.close(async () => {
    logger.info("🔌 Servidor HTTP fechado");

    try {
      await assinanteEventos.desinscrever();
      logger.info("Eventos desincritos");

      await sequelize.close();
      logger.info(" Conexão com banco fechada");

      await redisClient.quit();
      logger.info("Conexão com Redis fechada");

      logger.info(" Shutdown graceful concluído");
      process.exit(0);
    } catch (error) {
      logger.error("Erro durante shutdown graceful", { error });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forçando shutdown após timeout de 10s");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

const iniciar = async () => {
  try {
    await conectarBanco();
    await redisClient.ping();
    await assinanteEventos.inscrever([
      EventosTipo.LOGIN_REALIZADO,
      EventosTipo.LOGIN_FALHOU,
    ]);

    server = app.listen(PORT, () => {
      logger.info(` ${SERVICE_NAME} rodando na porta ${PORT}`);
      logger.info(` Métricas disponíveis em http://localhost:${PORT}/metrics`);
      logger.info(`Health check em http://localhost:${PORT}/health`);
    });
  } catch (erro) {
    logger.error("Erro ao iniciar servidor:", erro);
    process.exit(1);
  }
};

iniciar();

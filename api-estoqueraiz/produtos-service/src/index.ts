import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
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
import rotaProdutos from "./routes/rotaProdutos";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;
const SERVICE_NAME = "produtos-service";
const VERSION = "1.0.0";

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(metricsMiddleware(SERVICE_NAME));

app.get("/health", healthCheckHandler(SERVICE_NAME, VERSION));
app.get("/liveness", livenessCheckHandler);
app.get("/readiness", readinessCheckHandler);
app.get("/metrics", metricsHandler);

app.use("/api/produtos", rotaProdutos);
app.use(manipuladorErros);

assinanteEventos.registrarManipulador(
  EventosTipo.CATEGORIA_CRIADA,
  async (dados) => {
    logger.info(`Nova categoria criada:`, dados);
  }
);

assinanteEventos.registrarManipulador(
  EventosTipo.UNIDADE_CRIADA,
  async (dados) => {
    logger.info(`Nova unidade criada:`, dados);
  }
);

let servidor: any;

async function iniciar() {
  try {
    await conectarBanco();

    await assinanteEventos.inscrever([
      EventosTipo.CATEGORIA_CRIADA,
      EventosTipo.UNIDADE_CRIADA,
    ]);

    servidor = app.listen(PORT, () => {
      logger.info(` produtos-service rodando na porta ${PORT}`);
      logger.info(` Métricas disponíveis em http://localhost:${PORT}/metrics`);
      logger.info(`Health check em http://localhost:${PORT}/health`);
    });
  } catch (erro) {
    logger.error("Erro ao iniciar servidor:", erro);
    process.exit(1);
  }
}

async function desligar() {
  logger.info("Recebido sinal SIGTERM - iniciando shutdown graceful");

  if (servidor) {
    servidor.close(() => {
      logger.info("🔌 Servidor HTTP fechado");
    });
  }

  await assinanteEventos.desinscrever();
  logger.info(" Eventos desincritos");

  await sequelize.close();
  logger.info("Conexão com banco fechada");

  await redisClient.quit();
  logger.info("Conexão com Redis fechada");

  logger.info("Shutdown graceful concluído");
  process.exit(0);
}

process.on("SIGTERM", desligar);
process.on("SIGINT", desligar);

iniciar();

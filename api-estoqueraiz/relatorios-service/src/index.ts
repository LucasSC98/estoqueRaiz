import express from "express";
import { sequelize } from "../../shared/config/database";
import { logger } from "../../shared/utils/logger";
import { redisPublicador, redisAssinante } from "../../shared/config/redis";
import { cacheService } from "../../shared/utils/cache";
import { metricsMiddleware, metricsHandler } from "../../shared/utils/metrics";
import {
  healthCheckHandler,
  livenessCheckHandler,
  readinessCheckHandler,
} from "../../shared/utils/healthCheck";
import { assinanteEventos } from "../../shared/eventos/assinante";
import { EventosTipo } from "../../shared/eventos/publicador";
import { manipuladorErros } from "../../shared/utils/tratamentoErros";
import rotaRelatorios from "./routes/rotaRelatorios";

const app = express();
const PORT = process.env.PORT || 3007;
const SERVICE_NAME = "relatorios-service";
const VERSION = "1.0.0";

app.use(express.json());

app.use(metricsMiddleware(SERVICE_NAME));

app.get("/health", healthCheckHandler(SERVICE_NAME, VERSION));
app.get("/liveness", livenessCheckHandler);
app.get("/readiness", readinessCheckHandler);
app.get("/metrics", metricsHandler);

app.use("/api/relatorios", rotaRelatorios);
app.use(manipuladorErros);

let server: any;

async function gracefulShutdown(signal: string) {
  logger.info(` Recebido sinal ${signal} - iniciando shutdown graceful`);

  server.close(async () => {
    logger.info("🔌 Servidor HTTP fechado");

    try {
      await assinanteEventos.desinscrever();
      logger.info(" Eventos desincritos");

      await sequelize.close();
      logger.info(" A Conexão com banco fechada");

      await redisPublicador.quit();
      await redisAssinante.quit();
      logger.info(" A Conexão com Redis fechada");
      logger.info(" Shutdown graceful concluído");
      process.exit(0);
    } catch (error) {
      logger.error("Erro durante shutdown graceful", { error });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error(" Forçando shutdown após timeout de 10s");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    logger.info("Conectado ao banco de dados");

    logger.info("Conectado ao Redis (Cache)");

    await redisPublicador.ping();
    logger.info("Redis Publicador conectado");

    await redisAssinante.ping();
    logger.info("Redis Assinante conectado");

    assinanteEventos.inscrever([
      EventosTipo.MOVIMENTACAO_CRIADA,
      EventosTipo.PRODUTO_CRIADO,
    ]);

    assinanteEventos.registrarManipulador(
      EventosTipo.MOVIMENTACAO_CRIADA,
      (dados: any) => {
        logger.info(`Movimentação criada - invalidando cache de relatórios`);
        cacheService.invalidarPorPadrao("*", "relatorios");
      }
    );

    assinanteEventos.registrarManipulador(
      EventosTipo.PRODUTO_CRIADO,
      (dados: any) => {
        logger.info(`Produto criado: ${dados.nome}`);
      }
    );

    const canaisInscritos = 2;
    logger.info(`Inscrito em ${canaisInscritos} canais de eventos`);

    server = app.listen(PORT, () => {
      logger.info(` ${SERVICE_NAME} rodando na porta ${PORT}`);
      logger.info(` Métricas disponíveis em http://localhost:${PORT}/metrics`);
      logger.info(` Health check em http://localhost:${PORT}/health`);
    });
  } catch (erro) {
    logger.error(" Erro ao iniciar servidor:", erro);
    process.exit(1);
  }
}

iniciarServidor();

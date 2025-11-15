import { Sequelize } from "sequelize";
import { logger } from "../utils/logger";

const databaseUrl = process.env.DATABASE_URL || "";

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: (msg: string) => logger.debug(msg),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const conectarBanco = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Conectado ao banco de dados");
  } catch (erro) {
    logger.error("Deu erro ao conectar banco:", erro);
    throw erro;
  }
};

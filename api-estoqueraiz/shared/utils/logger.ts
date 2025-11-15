import winston from "winston";

const niveis = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const cores = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(cores);

const formato = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transportes = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info: any) => {
        const mensagem = `${info.timestamp} [${info.level}]: ${info.message}`;
        const metadados = Object.keys(info).filter(
          (key) => !["timestamp", "level", "message", "stack"].includes(key)
        );
        if (metadados.length > 0) {
          const dados = metadados.reduce((acc: any, key) => {
            acc[key] = info[key];
            return acc;
          }, {} as any);
          return `${mensagem} ${JSON.stringify(dados)}`;
        }
        return info.stack ? `${mensagem}\n${info.stack}` : mensagem;
      })
    ),
  }),
  new winston.transports.File({ filename: "logs/erro.log", level: "error" }),
  new winston.transports.File({ filename: "logs/combinado.log" }),
];

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  levels: niveis,
  format: formato,
  transports: transportes,
});

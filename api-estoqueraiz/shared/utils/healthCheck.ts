import { Request, Response } from "express";
import { sequelize } from "../config/database";
import { redisClient } from "../config/redis";
import { logger } from "./logger";

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  service: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    cache: CheckResult;
    memory: CheckResult;
  };
  version?: string;
}

interface CheckResult {
  status: "up" | "down";
  responseTime?: number;
  error?: string;
  details?: any;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await sequelize.authenticate();
    return {
      status: "up",
      responseTime: Date.now() - start,
      details: {
        dialect: sequelize.getDialect(),
        poolSize: sequelize.config.pool?.max || 0,
      },
    };
  } catch (error: any) {
    logger.error("Health check: Database falhou", { error: error.message });
    return {
      status: "down",
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await redisClient.ping();
    return {
      status: "up",
      responseTime: Date.now() - start,
      details: {
        connected: redisClient.status === "ready",
      },
    };
  } catch (error: any) {
    logger.warn("Health check: Redis falhou", { error: error.message });
    return {
      status: "down",
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

function checkMemory(): CheckResult {
  const usage = process.memoryUsage();
  const totalHeap = usage.heapTotal;
  const usedHeap = usage.heapUsed;
  const percentUsed = (usedHeap / totalHeap) * 100;

  return {
    status: percentUsed > 90 ? "down" : "up",
    details: {
      heapUsed: `${Math.round(usedHeap / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(totalHeap / 1024 / 1024)}MB`,
      percentUsed: `${percentUsed.toFixed(2)}%`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    },
  };
}

export function healthCheckHandler(serviceName: string, version?: string) {
  return async (req: Request, res: Response) => {
    try {
      const [databaseCheck, cacheCheck, memoryCheck] = await Promise.all([
        checkDatabase(),
        checkRedis(),
        Promise.resolve(checkMemory()),
      ]);
      let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

      if (databaseCheck.status === "down") {
        overallStatus = "unhealthy";
      } else if (
        cacheCheck.status === "down" ||
        memoryCheck.status === "down"
      ) {
        overallStatus = "degraded";
      }

      const healthStatus: HealthStatus = {
        status: overallStatus,
        service: serviceName,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        checks: {
          database: databaseCheck,
          cache: cacheCheck,
          memory: memoryCheck,
        },
        version,
      };

      const statusCode = overallStatus === "unhealthy" ? 503 : 200;

      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      logger.error("Erro ao executar health check", { error: error.message });

      res.status(503).json({
        status: "unhealthy",
        service: serviceName,
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  };
}

export function readinessCheckHandler(req: Request, res: Response) {
  res.status(200).json({
    status: "ready",
    timestamp: new Date().toISOString(),
  });
}

export function livenessCheckHandler(req: Request, res: Response) {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
}

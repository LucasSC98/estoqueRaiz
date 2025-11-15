import { logger } from "./logger";

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry = (error, attempt) => {
      logger.warn(`Retry ${attempt}/${maxRetries}: ${error.message}`);
    },
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      onRetry(error, attempt + 1);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function isRetryableError(error: any): boolean {
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND" ||
    error.code === "ECONNRESET"
  ) {
    return true;
  }
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  if (error.response?.status === 429) {
    return true;
  }

  if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
    return true;
  }

  return false;
}

export async function httpRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
  }
): Promise<T> {
  return retryWithBackoff(requestFn, {
    ...options,
    shouldRetry: isRetryableError,
    onRetry: (error, attempt) => {
      logger.warn(
        `HTTP request failed, retrying (${attempt}/${
          options?.maxRetries || 3
        }): ${error.message}`,
        {
          error: {
            code: error.code,
            status: error.response?.status,
            url: error.config?.url,
          },
        }
      );
    },
  });
}

import { logger } from "./logger";

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  name?: string;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker<T> {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly asyncFunction: (...args: any[]) => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 5000,
      resetTimeout: options.resetTimeout ?? 30000,
      name: options.name ?? "CircuitBreaker",
      onStateChange: options.onStateChange ?? (() => {}),
    };
  }
  async execute(...args: any[]): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(
          `Circuit breaker is OPEN for ${this.options.name}`
        );
        logger.warn(`Circuit breaker OPEN - rejeitando requisição`, {
          circuitBreaker: this.options.name,
          nextAttempt: new Date(this.nextAttempt),
        });
        throw error;
      }

      this.changeState(CircuitState.HALF_OPEN);
    }

    try {
      const result = await this.executeWithTimeout(args);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private async executeWithTimeout(args: any[]): Promise<T> {
    return Promise.race([
      this.asyncFunction(...args),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${this.options.timeout}ms`)),
          this.options.timeout
        )
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.changeState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  private onFailure(error: any): void {
    this.failureCount++;
    this.successCount = 0;

    logger.error(
      `Circuit breaker failure (${this.failureCount}/${this.options.failureThreshold})`,
      {
        circuitBreaker: this.options.name,
        state: this.state,
        error: error.message,
      }
    );

    if (this.failureCount >= this.options.failureThreshold) {
      this.changeState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  private changeState(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState !== newState) {
      this.state = newState;

      logger.info(`Circuit breaker state change: ${oldState} -> ${newState}`, {
        circuitBreaker: this.options.name,
        from: oldState,
        to: newState,
      });

      this.options.onStateChange(oldState, newState);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();

    logger.info(`Circuit breaker reset`, {
      circuitBreaker: this.options.name,
    });
  }
}

export function createCircuitBreaker<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options?: Partial<CircuitBreakerOptions>
): CircuitBreaker<T> {
  return new CircuitBreaker(asyncFunction, options);
}

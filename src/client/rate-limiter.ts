/**
 * Sliding window rate limiter for Ploomes API (120 req/min default).
 * Queues requests when limit is reached and drains as slots open.
 */

const DEFAULT_RATE_LIMIT = 120;
const WINDOW_MS = 60_000;

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private queue: Array<() => void> = [];
  private drainScheduled = false;

  constructor(maxRequests?: number) {
    this.maxRequests = maxRequests ?? DEFAULT_RATE_LIMIT;
  }

  private pruneOld(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (this.timestamps.length > 0 && this.timestamps[0]! < cutoff) {
      this.timestamps.shift();
    }
  }

  private scheduleDrain(): void {
    if (this.drainScheduled || this.queue.length === 0) return;
    this.drainScheduled = true;

    this.pruneOld();
    const delay =
      this.timestamps.length >= this.maxRequests
        ? this.timestamps[0]! + WINDOW_MS - Date.now() + 10
        : 0;

    setTimeout(() => {
      this.drainScheduled = false;
      this.drain();
    }, Math.max(delay, 0));
  }

  private drain(): void {
    this.pruneOld();
    while (this.queue.length > 0 && this.timestamps.length < this.maxRequests) {
      const resolve = this.queue.shift()!;
      this.timestamps.push(Date.now());
      resolve();
    }
    this.scheduleDrain();
  }

  async acquire(): Promise<void> {
    this.pruneOld();
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(Date.now());
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.scheduleDrain();
    });
  }
}

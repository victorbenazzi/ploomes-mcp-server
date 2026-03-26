/**
 * HTTP client for the Ploomes REST API.
 * Every request goes through the rate limiter. Retries on 429 / 5xx with exponential backoff.
 */

import { RateLimiter } from "./rate-limiter.js";
import { logger } from "../utils/logger.js";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

export interface PloomesClientConfig {
  baseUrl: string;
  userKey: string;
  rateLimit?: number;
}

export class PloomesClient {
  private readonly baseUrl: string;
  private readonly userKey: string;
  private readonly limiter: RateLimiter;

  constructor(config: PloomesClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.userKey = config.userKey;
    this.limiter = new RateLimiter(config.rateLimit);
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const entries = Object.entries(params);
      if (entries.length > 0) {
        const qs = entries
          .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
          .join("&");
        url += `?${qs}`;
      }
    }
    return url;
  }

  private async request<T>(
    method: string,
    path: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.limiter.acquire();

      const url = this.buildUrl(path, params);
      logger.debug(`${method} ${url}`);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "User-Key": this.userKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        if (response.ok) {
          if (response.status === 204) return {} as T;
          const text = await response.text();
          return text ? (JSON.parse(text) as T) : ({} as T);
        }

        const errorBody = await response.text().catch(() => "");

        if (response.status === 429 || response.status >= 500) {
          lastError = new PloomesApiError(response.status, errorBody, path);
          if (attempt < MAX_RETRIES) {
            const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
            logger.warn(
              `Ploomes returned ${response.status} on ${path}. Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})…`
            );
            await sleep(delay);
            continue;
          }
        }

        throw new PloomesApiError(response.status, errorBody, path);
      } catch (err) {
        if (err instanceof PloomesApiError) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn(
            `Network error on ${path}: ${lastError.message}. Retrying in ${delay}ms…`
          );
          await sleep(delay);
          continue;
        }
      }
    }

    throw lastError ?? new Error(`Request failed after ${MAX_RETRIES} retries`);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", path, params);
  }

  async post<T>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", path, params, body);
  }

  async patch<T>(path: string, body: unknown, params?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", path, params, body);
  }

  async delete(path: string): Promise<void> {
    await this.request<void>("DELETE", path);
  }
}

export class PloomesApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly path: string
  ) {
    const detail = parseErrorBody(body);
    super(formatHttpError(status, path, detail));
    this.name = "PloomesApiError";
  }
}

function parseErrorBody(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message ?? parsed?.Message ?? body;
  } catch {
    return body;
  }
}

function formatHttpError(status: number, path: string, detail: string): string {
  switch (status) {
    case 400:
      return `Bad request on ${path}: ${detail}`;
    case 401:
      return `Authentication failed — check your PLOOMES_USER_KEY. (${path})`;
    case 403:
      return `Permission denied on ${path}: ${detail}`;
    case 404:
      return `Resource not found: ${path}`;
    case 429:
      return `Rate limit exceeded on ${path}. Try again later.`;
    default:
      return `Ploomes API error ${status} on ${path}: ${detail}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

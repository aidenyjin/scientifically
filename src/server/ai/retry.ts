import { AiAbortError } from "./errors";

export interface RetryOptions {
  /** Retries after the first attempt (so `retries: 4` = up to 5 attempts). */
  retries: number;
  isRetryable(error: unknown): boolean;
  /** Server-requested delay for this error (e.g. retry-after), if any. */
  retryAfterMs?(error: unknown): number | undefined;
  signal?: AbortSignal;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?(info: { attempt: number; delayMs: number; error: unknown }): void;
  /** Injectable for tests. */
  sleep?(ms: number, signal?: AbortSignal): Promise<void>;
  /** Injectable for tests; returns [0, 1). */
  random?(): number;
}

/** setTimeout-based sleep that rejects with AiAbortError when the signal fires. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/** The signal's reason if it is an Error (e.g. BudgetExceededError), else an AiAbortError. */
export function abortReason(signal: AbortSignal | undefined): Error {
  const reason: unknown = signal?.reason;
  return reason instanceof Error && reason.name !== "AbortError" ? reason : new AiAbortError();
}

/** Exponential backoff with full jitter, honouring server retry-after hints. */
export function backoffDelay(
  attempt: number,
  opts: { baseDelayMs: number; maxDelayMs: number; retryAfterMs?: number; random: () => number },
): number {
  if (opts.retryAfterMs !== undefined && opts.retryAfterMs >= 0) {
    return Math.min(opts.retryAfterMs, opts.maxDelayMs);
  }
  const ceiling = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** attempt);
  return Math.round(ceiling / 2 + (opts.random() * ceiling) / 2);
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? abortableSleep;
  const random = opts.random ?? Math.random;
  for (let attempt = 0; ; attempt++) {
    if (opts.signal?.aborted) throw abortReason(opts.signal);
    try {
      return await fn(attempt);
    } catch (error) {
      if (opts.signal?.aborted) throw abortReason(opts.signal);
      if (attempt >= opts.retries || !opts.isRetryable(error)) throw error;
      const delayMs = backoffDelay(attempt, {
        baseDelayMs: opts.baseDelayMs ?? 2_000,
        maxDelayMs: opts.maxDelayMs ?? 60_000,
        retryAfterMs: opts.retryAfterMs?.(error),
        random,
      });
      opts.onRetry?.({ attempt: attempt + 1, delayMs, error });
      await sleep(delayMs, opts.signal);
    }
  }
}

/** Parse a retry-after header (seconds or HTTP date) into milliseconds. */
export function parseRetryAfter(value: string | null | undefined, nowMs: number): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - nowMs);
}

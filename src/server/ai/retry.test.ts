import { describe, expect, it, vi } from "vitest";
import { AiAbortError, AiProviderError, BudgetExceededError } from "./errors";
import { backoffDelay, parseRetryAfter, withRetry } from "./retry";

const retryable = () => new AiProviderError("overloaded", { retryable: true, status: 529 });
const fatal = () => new AiProviderError("bad request", { retryable: false, status: 400 });
const opts = {
  isRetryable: (e: unknown) => e instanceof AiProviderError && e.retryable,
  retryAfterMs: (e: unknown) => (e instanceof AiProviderError ? e.retryAfterMs : undefined),
  random: () => 0.5,
};

describe("withRetry", () => {
  it("retries retryable errors with growing delays, then succeeds", async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn().mockRejectedValueOnce(retryable()).mockRejectedValueOnce(retryable()).mockResolvedValue("ok");
    await expect(withRetry(fn, { ...opts, retries: 4, sleep, baseDelayMs: 1000 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([750, 1500]);
  });

  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn().mockRejectedValue(fatal());
    await expect(withRetry(fn, { ...opts, retries: 4, sleep: async () => {} })).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry limit", async () => {
    const fn = vi.fn().mockRejectedValue(retryable());
    await expect(withRetry(fn, { ...opts, retries: 2, sleep: async () => {} })).rejects.toThrow("overloaded");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("honours retry-after", async () => {
    const sleep = vi.fn(async () => {});
    const err = new AiProviderError("slow down", { retryable: true, status: 429, retryAfterMs: 4000 });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue(1);
    await withRetry(fn, { ...opts, retries: 1, sleep });
    expect(sleep).toHaveBeenCalledWith(4000, undefined);
  });

  it("stops when the signal aborts, surfacing the abort reason", async () => {
    const controller = new AbortController();
    const fn = vi.fn(async () => {
      controller.abort(new BudgetExceededError(10, 5));
      throw retryable();
    });
    await expect(withRetry(fn, { ...opts, retries: 3, signal: controller.signal })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    const plain = new AbortController();
    plain.abort();
    await expect(withRetry(async () => 1, { ...opts, retries: 0, signal: plain.signal })).rejects.toBeInstanceOf(AiAbortError);
  });
});

describe("backoff helpers", () => {
  it("caps delays and parses retry-after", () => {
    expect(backoffDelay(10, { baseDelayMs: 1000, maxDelayMs: 60_000, random: () => 1 })).toBe(60_000);
    expect(parseRetryAfter("3", 0)).toBe(3000);
    expect(parseRetryAfter(new Date(5000).toUTCString(), 1000)).toBe(4000);
    expect(parseRetryAfter(undefined, 0)).toBeUndefined();
  });
});

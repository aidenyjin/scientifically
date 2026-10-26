/**
 * Error types for the AI pipeline. Kept free of "server-only" so the CLI
 * (plain Node via tsx) can use them; see provider.ts for the runtime guard.
 */

/** Base class for every error the pipeline throws on purpose. */
export class AiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Misconfiguration (missing key, unknown provider). Not retryable. */
export class AiConfigError extends AiError {}

/**
 * The provider could not be reached or rejected the request.
 * `retryable` is true for 429 / 5xx / overloaded / network errors.
 */
export class AiProviderError extends AiError {
  readonly retryable: boolean;
  readonly status: number | undefined;
  /** Milliseconds the server asked us to wait (retry-after), if any. */
  readonly retryAfterMs: number | undefined;
  constructor(
    message: string,
    opts: { retryable: boolean; status?: number; retryAfterMs?: number; cause?: unknown },
  ) {
    super(message, { cause: opts.cause });
    this.retryable = opts.retryable;
    this.status = opts.status;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/**
 * The model answered, but the answer is unusable (not JSON, no tool call,
 * truncated, refused). The generation loop treats this like a failed attempt
 * and retries with the message fed back to the model.
 */
export class AiOutputError extends AiError {
  readonly kind: "invalid_json" | "no_output" | "truncated" | "refusal";
  /** Raw text we got back, if any (for logs and the repair prompt). */
  readonly raw: string | undefined;
  constructor(kind: AiOutputError["kind"], message: string, raw?: string) {
    super(message);
    this.kind = kind;
    this.raw = raw;
  }
}

/** Generation was cancelled through an AbortSignal. */
export class AiAbortError extends AiError {
  constructor(message = "Generation was cancelled") {
    super(message);
  }
}

/** The run used more tokens than `maxTotalTokens` allows. */
export class BudgetExceededError extends AiError {
  readonly used: number;
  readonly limit: number;
  constructor(used: number, limit: number) {
    super(`Token budget exceeded: used ${used.toLocaleString("en")} of ${limit.toLocaleString("en")} tokens`);
    this.used = used;
    this.limit = limit;
  }
}

/** A stage of the pipeline failed for good (e.g. the outline never validated). */
export class GenerationError extends AiError {
  readonly details: string[];
  constructor(message: string, details: string[] = []) {
    super(details.length ? `${message}\n${details.map((d) => `  - ${d}`).join("\n")}` : message);
    this.details = details;
  }
}

/** One lesson could not be produced with at least the minimum number of valid exercises. */
export class LessonGenerationError extends GenerationError {
  readonly lessonId: string;
  constructor(lessonId: string, message: string, details: string[] = []) {
    super(message, details);
    this.lessonId = lessonId;
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof AiAbortError || error instanceof BudgetExceededError) return true;
  return error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError");
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

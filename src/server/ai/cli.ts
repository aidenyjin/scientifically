import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { ContentPack } from "@/content/schema/course";
import { formatIssues } from "@/content/schema/course";
import { now } from "@/lib/clock";
import { chooseDraftPackId, makeGeneratedBy, type GeneratedBy } from "./drafts";
import { AiError, errorMessage } from "./errors";
import { generatePack, type LogLevel } from "./generate";
import { getProvider, type AiProvider } from "./provider";
import { generationParamsSchema, type GenerationParamsInput } from "./schemas";
import { checkPackJson } from "./validate";

/**
 * `npm run generate -- …` (scripts/generate.ts is a thin wrapper).
 * Kept free of "server-only" so it runs under plain tsx; `--save` opens its
 * own Prisma client (like prisma/seed.ts) instead of importing src/server/db.
 */
export const USAGE = `Usage:
  npm run generate -- --subject <s> --topic <t> --level <l> [options]
  npm run generate -- --validate <pack.json>

Generation options:
  --subject <text>       e.g. chemistry                    (required)
  --topic <text>         e.g. "acids and bases"            (required)
  --level <text>         e.g. "High school"                (required)
  --units <1-10>         default 3
  --lessons <2-8>        standard lessons per unit, default 4 (+1 checkpoint)
  --exercises <8-15>     exercises per lesson, default 10
  --types <a,b,...>      allowed exercise types (default: all ready types)
  --tone <text>          e.g. "playful"
  --notes <text>         extra instructions for the model
  --pack-id <slug>       pack id (default: derived from the title)
  --no-checkpoints       no end-of-unit checkpoint lessons
  --max-tokens <n>       abort when input+output tokens exceed n
  --concurrency <n>      parallel lesson calls (default 3)
  --out <file.json>      write the pack JSON here (default content/packs/<id>.json unless --save)
  --save                 save as a draft pack in the database (DATABASE_URL)

Validation:
  --validate <file>      check a pack file (schema + autoChecks); exit 1 on problems; no API call

Environment: AI_PROVIDER (anthropic|openai|mock), AI_MODEL, ANTHROPIC_API_KEY / OPENAI_API_KEY, DATABASE_URL.`;

export interface CliIo {
  out(line: string): void;
  err(line: string): void;
}

const consoleIo: CliIo = { out: (l) => console.log(l), err: (l) => console.error(l) };

export interface CliDeps {
  env?: Record<string, string | undefined>;
  /** Override provider selection (tests). */
  provider?: AiProvider;
  /** Override the DB save (tests). Returns the id the pack was saved under. */
  saveDraft?(pack: ContentPack, generatedBy: GeneratedBy): Promise<string>;
}

function toInt(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new CliUsageError(`--${name} must be a whole number (got "${value}")`);
  return n;
}

class CliUsageError extends Error {}

export async function runCli(argv: string[], io: CliIo = consoleIo, deps: CliDeps = {}): Promise<number> {
  let args;
  try {
    args = parseArgs({
      args: argv,
      allowPositionals: false,
      options: {
        subject: { type: "string" },
        topic: { type: "string" },
        level: { type: "string" },
        units: { type: "string" },
        lessons: { type: "string" },
        exercises: { type: "string" },
        types: { type: "string" },
        tone: { type: "string" },
        notes: { type: "string" },
        "pack-id": { type: "string" },
        "no-checkpoints": { type: "boolean" },
        "max-tokens": { type: "string" },
        concurrency: { type: "string" },
        out: { type: "string" },
        save: { type: "boolean" },
        validate: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    }).values;
  } catch (error) {
    io.err(errorMessage(error));
    io.err(USAGE);
    return 2;
  }

  if (args.help) {
    io.out(USAGE);
    return 0;
  }
  if (args.validate !== undefined) return validateFile(args.validate, io);

  let input: GenerationParamsInput;
  let concurrency: number | undefined;
  try {
    concurrency = toInt("concurrency", args.concurrency);
    input = {
      subject: args.subject ?? "",
      topic: args.topic ?? "",
      level: args.level ?? "",
      units: toInt("units", args.units),
      lessonsPerUnit: toInt("lessons", args.lessons),
      exercisesPerLesson: toInt("exercises", args.exercises),
      types: args.types
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) as GenerationParamsInput["types"],
      tone: args.tone,
      notes: args.notes,
      packId: args["pack-id"],
      includeCheckpoints: args["no-checkpoints"] ? false : undefined,
      maxTotalTokens: toInt("max-tokens", args["max-tokens"]),
    };
  } catch (error) {
    io.err(errorMessage(error));
    return 2;
  }
  const params = generationParamsSchema.safeParse(input);
  if (!params.success) {
    io.err("Invalid options:");
    for (const line of formatIssues(params.error)) io.err(`  ${line}`);
    io.err("\n" + USAGE);
    return 2;
  }

  let provider: AiProvider;
  try {
    provider = deps.provider ?? (await getProvider(deps.env ?? process.env));
  } catch (error) {
    io.err(errorMessage(error));
    return 1;
  }

  const started = now().getTime();
  const stamp = () => `${((now().getTime() - started) / 1000).toFixed(1).padStart(6)}s`;
  const mark: Record<LogLevel, string> = { info: " ", warn: "!", error: "✗" };
  const controller = new AbortController();
  const onSigint = () => {
    io.err("\nCancelling…");
    controller.abort();
  };
  process.once("SIGINT", onSigint);

  try {
    const result = await generatePack(params.data, {
      provider,
      concurrency,
      signal: controller.signal,
      onLog: (level, message) => (level === "info" ? io.out : io.err)(`${stamp()} ${mark[level]} ${message}`),
    });

    const { pack, usage } = result;
    io.out(
      `\nTokens: ${usage.inputTokens.toLocaleString("en")} input + ${usage.outputTokens.toLocaleString("en")} output` +
        ` = ${(usage.inputTokens + usage.outputTokens).toLocaleString("en")} (${provider.name}/${provider.model})`,
    );
    if (result.needsReview.length) {
      io.err(`\n${result.needsReview.length} item(s) need review:`);
      for (const item of result.needsReview) {
        io.err(`  - ${item.lessonId}${item.exerciseId ? ` / ${item.exerciseId}` : ""}: ${item.errors.join(" | ")}`);
      }
    }
    if (result.failedLessons.length) {
      io.err(`\n${result.failedLessons.length} lesson(s) failed and are not in the pack:`);
      for (const f of result.failedLessons) io.err(`  - ${f.lessonId} "${f.title}": ${f.errors.slice(0, 3).join(" | ")}`);
    }

    const generatedBy = makeGeneratedBy({
      source: "cli",
      provider: provider.name,
      model: provider.model,
      params: params.data,
      outline: result.outline,
      needsReview: result.needsReview,
      failedLessons: result.failedLessons,
      generatedAt: now(),
    });

    const outFile = args.out ?? (args.save ? undefined : path.join("content", "packs", `${pack.id}.json`));
    if (outFile) {
      await mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
      await writeFile(outFile, JSON.stringify(pack, null, 2) + "\n", "utf8");
      io.out(`Wrote ${outFile}`);
    }
    if (args.save) {
      const savedId = await (deps.saveDraft ?? saveDraftToDb)(pack, generatedBy);
      io.out(`Saved draft pack "${savedId}" to the database. Review and publish it in /admin.`);
    }
    return 0;
  } catch (error) {
    io.err(`\nGeneration failed: ${errorMessage(error)}`);
    if (!(error instanceof AiError)) io.err(String((error as Error)?.stack ?? ""));
    return 1;
  } finally {
    process.removeListener("SIGINT", onSigint);
  }
}

export async function validateFile(file: string, io: CliIo): Promise<number> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    io.err(`Cannot read ${file}: ${errorMessage(error)}`);
    return 1;
  }
  const result = checkPackJson(text);
  if (result.ok && result.pack && result.stats) {
    io.out(
      `✓ ${file} is valid: pack "${result.pack.id}" — ${result.stats.units} unit(s), ${result.stats.lessons} lessons, ${result.stats.exercises} exercises`,
    );
    return 0;
  }
  io.err(`✗ ${file} has ${result.errors.length} problem(s):`);
  for (const line of result.errors) io.err(`  - ${line}`);
  return 1;
}

/** Upsert a draft ContentPack row with our own Prisma client (mirrors savePack in src/server/repo/packs.ts). */
async function saveDraftToDb(pack: ContentPack, generatedBy: GeneratedBy): Promise<string> {
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
  });
  try {
    const id = await chooseDraftPackId(pack.id, async (candidate) => {
      const row = await db.contentPack.findUnique({ where: { id: candidate }, select: { status: true } });
      return row?.status ?? null;
    });
    const saved = { ...pack, id };
    const data = {
      title: saved.title,
      subject: saved.subject,
      level: saved.level,
      status: "draft",
      json: JSON.stringify(saved),
      generatedBy: JSON.stringify(generatedBy),
    };
    await db.contentPack.upsert({ where: { id }, update: data, create: { id, ...data } });
    return id;
  } finally {
    await db.$disconnect();
  }
}

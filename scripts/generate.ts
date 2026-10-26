/**
 * AI content generation CLI.
 *   npm run generate -- --subject chemistry --topic "acids and bases" --level "High school" --units 1 --lessons 2 --out pack.json
 *   npm run generate -- --validate pack.json
 * Run with --help for every option. Logic lives in src/server/ai/cli.ts.
 */
import "dotenv/config";
import { runCli } from "../src/server/ai/cli";

runCli(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);

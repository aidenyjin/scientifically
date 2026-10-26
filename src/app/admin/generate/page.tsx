import { GenerateForm } from "@/components/admin/GenerateForm";
import { exerciseCores } from "@/content/registry";
import { requireAdmin } from "@/server/admin/auth";
import { getAiStatus } from "@/server/admin/ai-status";
import { isTypeReady } from "@/server/ai";

export default async function GeneratePage() {
  await requireAdmin("/admin/generate");
  const status = await getAiStatus();
  const types = exerciseCores
    .filter((c) => c.type !== "info_card")
    .map((c) => ({ type: c.type, label: c.label, ready: isTypeReady(c.type) }));
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">Generate a course</h1>
        <p className="mt-1 text-ink-soft">
          The AI writes an outline, then each lesson. Everything is validated; problems are flagged for review. The result is
          saved as a <b>draft</b> — nothing reaches learners until you publish it.
        </p>
      </header>
      <div
        className={
          status.ready
            ? "rounded-2xl border-2 border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-soft"
            : "rounded-2xl border-2 border-wrong/40 bg-wrong-soft px-4 py-3 text-sm font-bold text-wrong-ink"
        }
      >
        {status.ready ? (
          <>
            Using <b className="text-ink">{status.provider}</b> · model <code className="text-ink">{status.model}</code>
            {status.isMock && " (mock provider: builds a pack from examples, no API calls)"}
          </>
        ) : (
          <>Not ready: {status.message}</>
        )}
      </div>
      <GenerateForm types={types} disabled={!status.ready} />
    </div>
  );
}

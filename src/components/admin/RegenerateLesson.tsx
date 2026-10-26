"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateLessonAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function RegenerateLesson({
  packId,
  lessonId,
  title,
}: {
  packId: string;
  lessonId: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const r = await regenerateLessonAction(packId, lessonId, notes);
      setResult(
        r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.errors.join(" ") },
      );
      if (r.ok) {
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <RefreshCw className="size-4" /> Regenerate
      </Button>
      {result?.ok && <span className="text-correct-ink text-sm font-bold">{result.text}</span>}
      <Modal
        open={open}
        onClose={() => !pending && setOpen(false)}
        label="Regenerate lesson"
        className="max-w-lg"
      >
        <h2 className="font-display text-xl font-semibold">Regenerate “{title}”</h2>
        <p className="text-ink-soft mt-1 text-sm">
          The AI rewrites this lesson using the course outline. It replaces the current exercises.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Optional notes, e.g. “more numeric questions, fewer true/false”"
          aria-label="Notes for the AI"
          className="border-line bg-surface-2 focus:border-brand mt-3 w-full rounded-2xl border-2 p-3 text-sm font-semibold outline-none"
        />
        {result && !result.ok && (
          <p className="text-wrong-ink mt-2 text-sm font-bold">{result.text}</p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={run} disabled={pending}>
            {pending ? "Generating…" : "Regenerate"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

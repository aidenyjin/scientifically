"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cancelJobAction, getJobAction, type JobSnapshot } from "@/app/admin/actions";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import { StatusPill } from "./StatusPill";

const RUNNING = new Set(["queued", "outlining", "generating"]);

/** A generation job, polled every 2s until it finishes. */
export function JobLive({ initial }: { initial: JobSnapshot }) {
  const [job, setJob] = useState(initial);
  const [cancelling, setCancelling] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const running = RUNNING.has(job.status) && !job.stale;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(async () => {
      const next = await getJobAction(job.id);
      if (next) setJob(next);
    }, 2000);
    return () => window.clearInterval(id);
  }, [running, job.id]);

  // Keep the log pinned to its newest line. Scroll only the list itself:
  // scrollIntoView would also yank the whole page down on every poll.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.log.length]);

  const p = job.params;
  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StatusPill status={job.status} />
            {job.stale && (
              <span className="text-wrong text-sm font-bold">
                Stalled — the server probably restarted. Start a new job.
              </span>
            )}
          </div>
          <h1 className="font-display mt-2 text-3xl font-semibold">
            {p ? `${p.subject}: ${p.topic}` : "Generation job"}
          </h1>
          {p && (
            <p className="text-ink-soft mt-1 font-semibold">
              {p.level} · {p.units} units × {p.lessonsPerUnit} lessons × {p.exercisesPerLesson}{" "}
              exercises
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {running && (
            <Button
              variant="danger"
              disabled={cancelling}
              onClick={() => {
                setCancelling(true);
                void cancelJobAction(job.id).then((r) => !r.ok && setCancelling(false));
              }}
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </Button>
          )}
          {job.packId && (
            <Link
              href={`/admin/packs/${job.packId}`}
              className={buttonClassName({ variant: "success" })}
            >
              Review pack
            </Link>
          )}
        </div>
      </header>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>
            {job.progress
              ? `${job.progress.done} of ${job.progress.total} lessons`
              : job.status === "outlining"
                ? "Writing the outline…"
                : " "}
          </span>
          <span className="text-muted tabular-nums">
            {(job.inputTokens + job.outputTokens).toLocaleString()} tokens (
            {job.inputTokens.toLocaleString()} in / {job.outputTokens.toLocaleString()} out)
          </span>
        </div>
        <ProgressBar
          value={
            job.status === "done"
              ? 1
              : job.progress
                ? job.progress.done / Math.max(1, job.progress.total)
                : 0
          }
          color={job.status === "failed" ? "var(--wrong)" : "var(--brand)"}
          label="Generation progress"
        />
        {job.error && (
          <p className="bg-wrong-soft text-wrong-ink rounded-xl px-4 py-3 text-sm font-bold">
            {job.error}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-[1fr_380px] gap-6">
        <Card className="p-0">
          <p className="border-line font-display border-b-2 px-5 py-3 font-semibold">Log</p>
          <ol
            ref={logRef}
            className="max-h-[480px] overflow-y-auto px-5 py-3 font-mono text-xs leading-relaxed"
          >
            {job.log.map((l, i) => (
              <li
                key={i}
                className={cn(
                  l.level === "error"
                    ? "text-wrong-ink"
                    : l.level === "warn"
                      ? "text-streak-dark"
                      : "text-ink-soft",
                )}
              >
                <span className="text-muted">{new Date(l.at).toLocaleTimeString("en-GB")}</span>{" "}
                {l.message}
              </li>
            ))}
            {job.log.length === 0 && <li className="text-muted">Waiting to start…</li>}
          </ol>
        </Card>
        <Card className="p-0">
          <p className="border-line font-display border-b-2 px-5 py-3 font-semibold">Outline</p>
          {job.outline ? (
            <div className="max-h-[480px] overflow-y-auto px-5 py-3">
              <p className="font-bold">{job.outline.title}</p>
              {job.outline.units.map((u) => (
                <div key={u.id} className="mt-3">
                  <p className="text-brand text-sm font-bold">{u.title}</p>
                  <ul className="text-ink-soft mt-1 text-sm">
                    {u.lessons.map((l) => (
                      <li key={l.id}>
                        {l.kind === "checkpoint" ? "🏆 " : "• "}
                        {l.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted px-5 py-3 text-sm">The outline appears here after stage 1.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

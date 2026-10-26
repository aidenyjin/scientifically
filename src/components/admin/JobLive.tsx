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

  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: "nearest" });
  }, [job.log.length]);

  const p = job.params;
  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StatusPill status={job.status} />
            {job.stale && <span className="text-sm font-bold text-wrong">Stalled — the server probably restarted. Start a new job.</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold">{p ? `${p.subject}: ${p.topic}` : "Generation job"}</h1>
          {p && (
            <p className="mt-1 font-semibold text-ink-soft">
              {p.level} · {p.units} units × {p.lessonsPerUnit} lessons × {p.exercisesPerLesson} exercises
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {running && (
            <Button variant="danger" onClick={() => cancelJobAction(job.id)}>
              Cancel
            </Button>
          )}
          {job.packId && (
            <Link href={`/admin/packs/${job.packId}`} className={buttonClassName({ variant: "success" })}>
              Review pack
            </Link>
          )}
        </div>
      </header>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>{job.progress ? `${job.progress.done} of ${job.progress.total} lessons` : job.status === "outlining" ? "Writing the outline…" : " "}</span>
          <span className="text-muted tabular-nums">
            {(job.inputTokens + job.outputTokens).toLocaleString()} tokens ({job.inputTokens.toLocaleString()} in /{" "}
            {job.outputTokens.toLocaleString()} out)
          </span>
        </div>
        <ProgressBar
          value={job.status === "done" ? 1 : job.progress ? job.progress.done / Math.max(1, job.progress.total) : 0}
          color={job.status === "failed" ? "var(--wrong)" : "var(--brand)"}
          label="Generation progress"
        />
        {job.error && <p className="rounded-xl bg-wrong-soft px-4 py-3 text-sm font-bold text-wrong-ink">{job.error}</p>}
      </Card>

      <div className="grid grid-cols-[1fr_380px] gap-6">
        <Card className="p-0">
          <p className="border-b-2 border-line px-5 py-3 font-display font-semibold">Log</p>
          <ol ref={logRef} className="max-h-[480px] overflow-y-auto px-5 py-3 font-mono text-xs leading-relaxed">
            {job.log.map((l, i) => (
              <li key={i} className={cn(l.level === "error" ? "text-wrong-ink" : l.level === "warn" ? "text-streak-dark" : "text-ink-soft")}>
                <span className="text-muted">{new Date(l.at).toLocaleTimeString("en-GB")}</span> {l.message}
              </li>
            ))}
            {job.log.length === 0 && <li className="text-muted">Waiting to start…</li>}
          </ol>
        </Card>
        <Card className="p-0">
          <p className="border-b-2 border-line px-5 py-3 font-display font-semibold">Outline</p>
          {job.outline ? (
            <div className="max-h-[480px] overflow-y-auto px-5 py-3">
              <p className="font-bold">{job.outline.title}</p>
              {job.outline.units.map((u) => (
                <div key={u.id} className="mt-3">
                  <p className="text-sm font-bold text-brand">{u.title}</p>
                  <ul className="mt-1 text-sm text-ink-soft">
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
            <p className="px-5 py-3 text-sm text-muted">The outline appears here after stage 1.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

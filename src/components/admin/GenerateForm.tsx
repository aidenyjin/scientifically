"use client";

import { useActionState, useState } from "react";
import { startGenerationAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const input =
  "h-11 w-full rounded-xl border-2 border-line bg-surface-2 px-3 font-semibold text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-brand focus:bg-surface";

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("grid content-start gap-1.5", className)}>
      <span className="text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs font-semibold text-muted">{hint}</span>}
    </label>
  );
}

export function GenerateForm({
  types,
  disabled,
}: {
  types: { type: string; label: string; ready: boolean }[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(startGenerationAction, undefined);
  const [units, setUnits] = useState(3);
  const [lessons, setLessons] = useState(4);
  const [exercises, setExercises] = useState(10);
  const [checkpoints, setCheckpoints] = useState(true);
  const [picked, setPicked] = useState<string[]>(types.filter((t) => t.ready).map((t) => t.type));

  const totalLessons = units * (lessons + (checkpoints ? 1 : 0));
  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <form action={action} className="grid gap-6">
      <Card className="grid grid-cols-2 gap-5">
        <Field label="Subject" hint="e.g. chemistry">
          <input name="subject" required className={input} placeholder="Chemistry" autoFocus />
        </Field>
        <Field label="Level / audience" hint="e.g. High school, AP Physics 1, Adult beginner">
          <input name="level" required className={input} placeholder="High school" />
        </Field>
        <Field label="Topic" hint="What the course covers" className="col-span-2">
          <input name="topic" required className={input} placeholder="Acids, bases and the pH scale" />
        </Field>
        <Field label="Units">
          <input name="units" type="number" min={1} max={10} value={units} onChange={(e) => setUnits(+e.target.value)} className={input} />
        </Field>
        <Field label="Lessons per unit" hint="Checkpoints come on top">
          <input name="lessonsPerUnit" type="number" min={2} max={8} value={lessons} onChange={(e) => setLessons(+e.target.value)} className={input} />
        </Field>
        <Field label="Exercises per lesson">
          <input name="exercisesPerLesson" type="number" min={8} max={15} value={exercises} onChange={(e) => setExercises(+e.target.value)} className={input} />
        </Field>
        <Field label="Token budget (optional)" hint="Abort the job if it uses more than this">
          <input name="maxTotalTokens" type="number" min={1000} step={1000} className={input} placeholder="e.g. 2000000" />
        </Field>
        <label className="col-span-2 flex items-center gap-3 text-sm font-bold text-ink">
          <input
            type="checkbox"
            name="includeCheckpoints"
            checked={checkpoints}
            onChange={(e) => setCheckpoints(e.target.checked)}
            className="size-5 accent-[var(--brand)]"
          />
          Add an end-of-unit checkpoint to each unit
        </label>
        <p className="col-span-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-bold text-ink">
          ≈ {units} units × {lessons + (checkpoints ? 1 : 0)} lessons × {exercises} exercises ={" "}
          {totalLessons * exercises} exercises · {totalLessons + 1} AI calls
        </p>
      </Card>

      <Card>
        <p className="text-sm font-bold text-ink">Question types</p>
        <p className="text-xs font-semibold text-muted">Info cards are always included to teach new ideas.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {types.map((t) => (
            <label
              key={t.type}
              className={cn(
                "pressable flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold [--depth:3px]",
                picked.includes(t.type)
                  ? "border-brand bg-brand-soft text-brand [--edge:var(--brand)]"
                  : "border-line bg-surface text-ink-soft [--edge:var(--line)]",
                !t.ready && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                type="checkbox"
                name="types"
                value={t.type}
                checked={picked.includes(t.type)}
                disabled={!t.ready}
                onChange={() => toggle(t.type)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="grid gap-5">
        <Field label="Tone (optional)" hint="e.g. playful, exam-focused, story-driven">
          <input name="tone" className={input} />
        </Field>
        <Field label="Notes for the AI (optional)" hint="Curriculum to follow, things to avoid, examples to use…">
          <textarea name="notes" rows={4} className={cn(input, "h-auto py-2")} />
        </Field>
        <Field label="Pack id (optional)" hint="Lowercase slug; default comes from the title">
          <input name="packId" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
        </Field>
      </Card>

      {state?.errors && (
        <ul className="rounded-2xl bg-wrong-soft p-4 text-sm font-bold text-wrong-ink">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={disabled || pending || picked.length === 0}>
          {pending ? "Starting…" : "Start generating"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { Braces, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteExerciseAction, updateExerciseAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RichText } from "@/components/ui/RichText";
import type { Exercise } from "@/content/registry";
import { cn } from "@/lib/cn";
import { ExercisePreview } from "./ExercisePreview";

export function ExerciseReviewCard({
  packId,
  exercise,
  index,
  label,
  problems,
}: {
  packId: string;
  exercise: Exercise;
  index: number;
  label: string;
  problems: string[];
}) {
  const router = useRouter();
  const [showJson, setShowJson] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const json = JSON.stringify(exercise, null, 2);

  const save = () =>
    start(async () => {
      const result = await updateExerciseAction(packId, exercise.id, draft);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else setErrors(result.errors);
    });

  const remove = () =>
    start(async () => {
      const result = await deleteExerciseAction(packId, exercise.id);
      setConfirmDelete(false);
      if (result.ok) router.refresh();
      else setErrors(result.errors);
    });

  return (
    <article
      id={exercise.id}
      className={cn("rounded-3xl border-2 bg-surface", problems.length ? "border-wrong/50" : "border-line")}
    >
      <header className="flex items-center gap-3 border-b-2 border-line px-5 py-3">
        <span className="font-display text-sm font-bold text-muted">#{index + 1}</span>
        <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{label}</span>
        <span className="text-xs font-bold text-muted">difficulty {exercise.difficulty}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted">{exercise.skillTags.join(", ")}</span>
        <IconButton label="Show JSON" onClick={() => setShowJson((v) => !v)} active={showJson}>
          <Braces className="size-4" />
        </IconButton>
        <IconButton
          label="Edit JSON"
          onClick={() => {
            setDraft(json);
            setErrors([]);
            setEditing(true);
          }}
        >
          <Pencil className="size-4" />
        </IconButton>
        <IconButton label="Delete exercise" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" />
        </IconButton>
      </header>

      {problems.length > 0 && (
        <ul className="border-b-2 border-line bg-wrong-soft px-5 py-3 text-sm font-bold text-wrong-ink">
          {problems.map((p) => (
            <li key={p}>⚠ {p}</li>
          ))}
        </ul>
      )}

      <div className="px-5 py-5">
        <ExercisePreview exercise={exercise} />
        <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-soft">
          <span className="font-bold text-ink">Explanation: </span>
          <RichText text={exercise.explanation} />
          {exercise.hint && (
            <>
              <br />
              <span className="font-bold text-ink">Hint: </span>
              <RichText text={exercise.hint} />
            </>
          )}
        </p>
        {showJson && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-surface-2 p-4 font-mono text-xs leading-relaxed text-ink-soft">
            {json}
          </pre>
        )}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} label="Edit exercise JSON" className="max-w-3xl">
        <h2 className="font-display text-xl font-semibold">Edit exercise</h2>
        <p className="text-sm text-ink-soft">Saved only if the whole pack still validates.</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={22}
          aria-label="Exercise JSON"
          className="mt-3 w-full rounded-2xl border-2 border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink outline-none focus:border-brand"
        />
        {errors.length > 0 && (
          <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl bg-wrong-soft p-3 text-xs font-bold text-wrong-ink">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Delete exercise">
        <h2 className="font-display text-xl font-semibold">Delete this exercise?</h2>
        <p className="mt-1 text-ink-soft">It is removed from the pack. This can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} autoFocus>
            Keep it
          </Button>
          <Button variant="danger" onClick={remove} disabled={pending}>
            Delete
          </Button>
        </div>
      </Modal>
    </article>
  );
}

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-ink-soft transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        active && "bg-brand-soft text-brand",
      )}
    >
      {children}
    </button>
  );
}

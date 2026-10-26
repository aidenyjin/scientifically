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
      } else setErrors(result.errors.map(relativeToExercise));
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
      className={cn(
        "bg-surface rounded-3xl border-2",
        problems.length ? "border-wrong/50" : "border-line",
      )}
    >
      <header className="border-line flex items-center gap-3 border-b-2 px-5 py-3">
        <span className="font-display text-muted text-sm font-bold">#{index + 1}</span>
        <span className="bg-brand-soft text-brand rounded-lg px-2 py-0.5 text-xs font-bold">
          {label}
        </span>
        <span className="text-muted text-xs font-bold">difficulty {exercise.difficulty}</span>
        <span className="text-muted min-w-0 flex-1 truncate text-xs font-semibold">
          {exercise.skillTags.join(", ")}
        </span>
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
        <ul className="border-line bg-wrong-soft text-wrong-ink border-b-2 px-5 py-3 text-sm font-bold">
          {problems.map((p) => (
            <li key={p}>⚠ {p}</li>
          ))}
        </ul>
      )}

      <div className="px-5 py-5">
        <ExercisePreview exercise={exercise} />
        <p className="bg-surface-2 text-ink-soft mt-4 rounded-2xl px-4 py-3 text-sm">
          <span className="text-ink font-bold">Explanation: </span>
          <RichText text={exercise.explanation} />
          {exercise.hint && (
            <>
              <br />
              <span className="text-ink font-bold">Hint: </span>
              <RichText text={exercise.hint} />
            </>
          )}
        </p>
        {showJson && (
          <pre className="bg-surface-2 text-ink-soft mt-4 max-h-96 overflow-auto rounded-2xl p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
            {json}
          </pre>
        )}
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        label="Edit exercise JSON"
        className="max-w-3xl"
      >
        <h2 className="font-display text-xl font-semibold">Edit exercise</h2>
        <p className="text-ink-soft text-sm">Saved only if the whole pack still validates.</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          rows={22}
          aria-label="Exercise JSON"
          className="border-line bg-surface-2 text-ink focus:border-brand mt-3 w-full rounded-2xl border-2 p-3 font-mono text-xs leading-relaxed outline-none"
        />
        {errors.length > 0 && (
          <ul className="bg-wrong-soft text-wrong-ink mt-2 max-h-32 overflow-y-auto rounded-xl p-3 text-xs font-bold">
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
        <p className="text-ink-soft mt-1">
          It is removed from the pack. This can&apos;t be undone.
        </p>
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

/** Pack-level issue paths ("units.0.lessons.1.exercises.3.options: …") read better relative to the exercise. */
function relativeToExercise(error: string): string {
  return error.replace(/^units\.\d+\.lessons\.\d+\.exercises\.\d+(\.|: )/, "");
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
        "text-ink-soft hover:bg-surface-2 hover:text-ink grid size-8 place-items-center rounded-lg transition-colors duration-150",
        active && "bg-brand-soft text-brand",
      )}
    >
      {children}
    </button>
  );
}

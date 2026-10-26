"use client";

import { Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { importPackAction } from "@/app/admin/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Upload a pack JSON file; it is validated and saved as a draft. */
export function ImportPack() {
  const [state, action, pending] = useActionState(importPackAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors ?? [];
  // The action result can't be cleared, so remember which result was dismissed.
  const [dismissed, setDismissed] = useState<typeof state>(undefined);
  const close = () => {
    setDismissed(state);
    formRef.current?.reset();
  };
  return (
    <>
      <form ref={formRef} action={action}>
        <label className="pressable border-line bg-surface font-display text-ink-soft hover:bg-surface-2 has-focus-visible:outline-brand/55 inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 px-5 text-[15px] font-semibold tracking-wide uppercase [--edge:var(--line)] has-focus-visible:outline-3 has-focus-visible:outline-offset-2">
          <Upload className="size-4" />
          {pending ? "Importing…" : "Import JSON"}
          <input
            type="file"
            name="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={() => formRef.current?.requestSubmit()}
          />
        </label>
      </form>
      <Modal
        open={errors.length > 0 && !pending && dismissed !== state}
        onClose={close}
        label="Import failed"
        className="max-w-xl"
      >
        <h2 className="font-display text-wrong-ink text-xl font-semibold">
          Couldn&apos;t import that pack
        </h2>
        <ul className="bg-surface-2 text-ink-soft mt-3 max-h-80 overflow-y-auto rounded-xl p-3 font-mono text-xs leading-relaxed">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        <p className="text-ink-soft mt-3 text-sm">
          Fix the file and import it again. Nothing was saved.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={close} autoFocus>
            Got it
          </Button>
        </div>
      </Modal>
    </>
  );
}

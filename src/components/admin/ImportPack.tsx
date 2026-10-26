"use client";

import { Upload } from "lucide-react";
import { useActionState, useRef } from "react";
import { importPackAction } from "@/app/admin/actions";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/** Upload a pack JSON file; it is validated and saved as a draft. */
export function ImportPack() {
  const [state, action, pending] = useActionState(importPackAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors ?? [];
  return (
    <>
      <form ref={formRef} action={action}>
        <label className="pressable inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 border-line bg-surface px-5 font-display text-[15px] font-semibold tracking-wide text-ink-soft uppercase [--edge:var(--line)] hover:bg-surface-2">
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
      <Modal open={errors.length > 0 && !pending} onClose={() => formRef.current?.reset()} label="Import failed" className="max-w-xl">
        <h2 className="font-display text-xl font-semibold text-wrong-ink">That pack didn&apos;t validate</h2>
        <ul className="mt-3 max-h-80 overflow-y-auto rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-ink-soft">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
        <Button className="mt-4" onClick={() => location.reload()}>
          OK
        </Button>
      </Modal>
    </>
  );
}

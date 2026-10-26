"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePackAction, setPackStatusAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Publish / unpublish / archive / export / delete for one pack. */
export function PackActions({ packId, status }: { packId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const setStatus = (next: "draft" | "published" | "archived") =>
    start(async () => {
      const result = await setPackStatusAction(packId, next);
      setMessage(result.ok ? { ok: true, lines: [result.message ?? "Done."] } : { ok: false, lines: result.errors });
      router.refresh();
    });

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status !== "published" && (
          <Button variant="success" disabled={pending} onClick={() => setStatus("published")}>
            Publish
          </Button>
        )}
        {status === "published" && (
          <Button variant="secondary" disabled={pending} onClick={() => setStatus("draft")}>
            Unpublish
          </Button>
        )}
        {status !== "archived" && (
          <Button variant="secondary" disabled={pending} onClick={() => setStatus("archived")}>
            Archive
          </Button>
        )}
        <a href={`/admin/packs/${packId}/export`} className="pressable inline-flex h-11 items-center rounded-2xl border-2 border-line bg-surface px-5 font-display text-[15px] font-semibold tracking-wide text-ink-soft uppercase [--edge:var(--line)] hover:bg-surface-2">
          Export JSON
        </a>
        <Button variant="ghost" className="text-wrong" onClick={() => setConfirm(true)}>
          Delete
        </Button>
      </div>
      {message && (
        <ul aria-live="polite" className={message.ok ? "text-sm font-bold text-correct-ink" : "max-w-xl rounded-xl bg-wrong-soft p-3 text-xs font-bold text-wrong-ink"}>
          {message.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete pack">
        <h2 className="font-display text-xl font-semibold">Delete this pack?</h2>
        <p className="mt-1 text-ink-soft">
          Learners lose access to it immediately. Their XP stays, but lesson progress for this pack is orphaned. Export it first
          if you might want it back.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(false)} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => start(() => deletePackAction(packId))} disabled={pending}>
            Delete pack
          </Button>
        </div>
      </Modal>
    </div>
  );
}

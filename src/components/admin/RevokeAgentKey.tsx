"use client";

import { useState, useTransition } from "react";
import { revokeAgentKeyAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function RevokeAgentKey({ id, name }: { id: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="ghost" size="sm" className="text-wrong" onClick={() => setConfirm(true)}>
        Revoke
      </Button>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Revoke key">
        <h2 className="font-display text-xl font-semibold">Revoke “{name}”?</h2>
        <p className="text-ink-soft mt-1">
          Agents using this key are locked out immediately. Courses they already made stay as they
          are.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(false)} autoFocus>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => start(() => revokeAgentKeyAction(id).then(() => setConfirm(false)))}
          >
            Revoke key
          </Button>
        </div>
      </Modal>
    </>
  );
}

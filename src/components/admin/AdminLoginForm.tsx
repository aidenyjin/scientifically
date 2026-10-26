"use client";

import { LockKeyhole } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { adminLoginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);
  const invalid = Boolean(state?.error);
  const inputRef = useRef<HTMLInputElement>(null);
  // After a wrong password, put the cursor straight back in the field.
  useEffect(() => {
    if (state?.error) inputRef.current?.focus();
  }, [state]);
  return (
    <Card className="mx-auto mt-16 max-w-sm p-7">
      <form action={action} className="grid gap-3">
        <span className="bg-brand-soft text-brand grid size-11 place-items-center rounded-2xl">
          <LockKeyhole className="size-5" strokeWidth={2.5} aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin login</h1>
          <p className="text-ink-soft text-sm">Generate, review and publish course packs.</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <input
          ref={inputRef}
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Admin password"
          aria-label="Admin password"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "admin-login-error" : undefined}
          className="border-line bg-surface-2 text-ink placeholder:text-muted focus:border-brand focus:bg-surface aria-invalid:border-wrong aria-invalid:focus:border-wrong mt-1 h-12 rounded-2xl border-2 px-4 font-semibold transition-colors duration-150 outline-none"
        />
        <p
          id="admin-login-error"
          aria-live="polite"
          className="text-wrong-ink -my-1 min-h-5 text-sm font-bold"
        >
          {state?.error}
        </p>
        <Button type="submit" disabled={pending} block>
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>
    </Card>
  );
}

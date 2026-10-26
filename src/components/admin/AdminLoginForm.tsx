"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(adminLoginAction, undefined);
  return (
    <form action={action} className="mx-auto mt-16 grid max-w-sm gap-3">
      <h1 className="font-display text-2xl font-semibold">Admin login</h1>
      <input type="hidden" name="next" value={next} />
      <input
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Admin password"
        aria-label="Admin password"
        className="h-12 rounded-2xl border-2 border-line bg-surface-2 px-4 font-semibold outline-none transition-colors duration-150 focus:border-brand focus:bg-surface"
      />
      <p aria-live="polite" className="min-h-5 text-sm font-bold text-wrong">
        {state?.error}
      </p>
      <Button type="submit" disabled={pending} block>
        {pending ? "Checking…" : "Log in"}
      </Button>
    </form>
  );
}

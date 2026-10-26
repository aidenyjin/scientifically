"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { Character } from "@/characters/Character";
import { Button } from "@/components/ui/Button";
import type { FormState } from "./actions";

type Field = { name: string; label: string; type: string; autoComplete: string };

/** Shared login/signup card. */
export function AuthForm({
  title,
  subtitle,
  fields,
  submit,
  action,
  footer,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  submit: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  footer: { text: string; href: string; link: string };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <div className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Character id="lumi" expression={state?.error ? "surprised" : "happy"} size={110} animate />
        <h1 className="mt-3 font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-1 text-ink-soft">{subtitle}</p>
      </div>
      <form action={formAction} className="mt-8 grid gap-3">
        <TimezoneField />
        {fields.map((f, i) => (
          <label key={f.name} className="grid gap-1">
            <span className="sr-only">{f.label}</span>
            <input
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              placeholder={f.label}
              required
              autoFocus={i === 0}
              className="h-13 rounded-2xl border-2 border-line bg-surface-2 px-4 text-[16px] font-semibold text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-brand focus:bg-surface"
            />
          </label>
        ))}
        <p aria-live="polite" className="min-h-5 text-sm font-bold text-wrong">
          {state?.error}
        </p>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "One moment…" : submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm font-semibold text-ink-soft">
        {footer.text}{" "}
        <Link href={footer.href} className="font-bold text-brand hover:underline">
          {footer.link}
        </Link>
      </p>
    </div>
  );
}

/** The browser's time zone, filled in after hydration so SSR markup matches. */
function TimezoneField() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);
  return <input ref={ref} type="hidden" name="timezone" defaultValue="UTC" />;
}

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
  const formRef = useRef<HTMLFormElement>(null);
  // After a failed submit, put the cursor in the field that needs fixing.
  useEffect(() => {
    if (!state?.field) return;
    const input = formRef.current?.elements.namedItem(state.field);
    if (input instanceof HTMLInputElement) input.focus();
  }, [state]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <Character id="lumi" expression={state?.error ? "surprised" : "happy"} size={110} animate />
        <h1 className="font-display mt-3 text-3xl font-semibold">{title}</h1>
        <p className="text-ink-soft mt-1 text-balance">{subtitle}</p>
      </div>
      <form ref={formRef} action={formAction} className="mt-8 grid gap-3">
        <TimezoneField />
        {fields.map((f, i) => {
          const invalid = state?.field === f.name;
          return (
            <label key={f.name} className="grid gap-1">
              <span className="sr-only">{f.label}</span>
              <input
                name={f.name}
                defaultValue={state?.values?.[f.name]}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? "auth-error" : undefined}
                type={f.type}
                autoComplete={f.autoComplete}
                placeholder={f.label}
                required
                autoFocus={i === 0}
                className="border-line bg-surface-2 text-ink placeholder:text-muted focus:border-brand focus:bg-surface aria-invalid:border-wrong aria-invalid:focus:border-wrong h-13 rounded-2xl border-2 px-4 text-[16px] font-semibold transition-colors duration-150 outline-none"
              />
            </label>
          );
        })}
        <p
          id="auth-error"
          aria-live="polite"
          className="text-wrong-ink -my-1 min-h-5 text-sm font-bold"
        >
          {state?.error}
        </p>
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "One moment…" : submit}
        </Button>
      </form>
      <p className="text-ink-soft mt-6 text-center text-sm font-semibold">
        {footer.text}{" "}
        <Link href={footer.href} className="text-brand font-bold hover:underline">
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

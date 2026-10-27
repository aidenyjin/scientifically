"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { createAgentKeyAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "./CopyButton";

const input =
  "h-11 w-full rounded-xl border-2 border-line bg-surface-2 px-3 font-semibold text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-brand focus:bg-surface";

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2">
      <h3 className="text-ink flex items-baseline gap-2 font-bold">
        <span className="bg-brand-soft text-brand grid size-6 shrink-0 place-items-center rounded-full text-xs">
          {n}
        </span>
        {title}
      </h3>
      <p className="text-muted -mt-1 pl-8 text-xs font-semibold">{hint}</p>
      <div className="grid min-w-0 gap-2 pl-8">{children}</div>
    </section>
  );
}

function Snippet({ text, label, multiline }: { text: string; label: string; multiline?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <pre
        className={
          "bg-surface-2 text-ink min-w-0 flex-1 rounded-xl px-3 py-2 font-mono text-xs leading-relaxed " +
          (multiline ? "whitespace-pre-wrap" : "break-all whitespace-pre-wrap")
        }
      >
        {text}
      </pre>
      <CopyButton text={text} label={label} />
    </div>
  );
}

/** Create a key; the key and the text to paste into an agent are shown once. */
export function CreateAgentKey() {
  const [state, action, pending] = useActionState(createAgentKeyAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // The action result can't be cleared, so remember which result was dismissed.
  const [dismissed, setDismissed] = useState<typeof state>(undefined);
  const created = dismissed !== state ? state?.created : undefined;

  if (created) {
    return (
      <Card className="border-brand grid min-w-0 gap-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Key for “{created.name}” is ready</h2>
          <p className="text-wrong-ink mt-1 text-sm font-bold">
            Copy what you need now. The key is only shown once; if you lose it, revoke it and make a
            new one.
          </p>
        </div>
        <Snippet text={created.key} label="Copy key" />
        <Step
          n={1}
          title="Agents that can make web requests"
          hint="Claude Code, Codex, Cursor, ChatGPT agent mode, your own scripts… Paste this message, then ask for a course."
        >
          <Snippet text={created.prompt} label="Copy message" multiline />
        </Step>
        <Step
          n={2}
          title="Chat apps with custom connectors"
          hint="Claude, ChatGPT and other apps that support MCP connectors: add a custom connector with this URL. The key is part of the URL, so keep it private."
        >
          <Snippet text={created.connectorUrl} label="Copy URL" />
        </Step>
        <Step
          n={3}
          title="Claude Code as a connector"
          hint="Run this once in a terminal; the tools then show up in Claude Code."
        >
          <Snippet text={created.claudeCode} label="Copy command" />
        </Step>
        {!created.canPublish && (
          <p className="bg-xp/25 text-ink rounded-xl px-4 py-3 text-sm font-semibold">
            This key can only save drafts. Review and publish its courses under <b>Packs</b>.
          </p>
        )}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setDismissed(state);
              formRef.current?.reset();
            }}
          >
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form ref={formRef} action={action} className="grid gap-4">
        <div className="flex items-end gap-3">
          <label className="grid flex-1 gap-1.5">
            <span className="text-ink text-sm font-bold">Key name</span>
            <input
              name="name"
              required
              maxLength={60}
              className={input}
              placeholder="e.g. Claude on my laptop"
            />
          </label>
          <Button type="submit" disabled={pending}>
            <KeyRound className="size-4" />
            {pending ? "Creating…" : "Create key"}
          </Button>
        </div>
        <label className="text-ink flex items-start gap-3 text-sm font-bold">
          <input
            type="checkbox"
            name="canPublish"
            defaultChecked
            className="mt-0.5 size-5 accent-[var(--brand)]"
          />
          <span>
            Let this agent publish courses to learners
            <span className="text-muted block text-xs font-semibold">
              Courses still have to pass every automatic check first. Untick to keep everything it
              writes as a draft for you to review.
            </span>
          </span>
        </label>
        {state?.errors && (
          <ul aria-live="polite" className="text-wrong-ink text-sm font-bold">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </form>
    </Card>
  );
}

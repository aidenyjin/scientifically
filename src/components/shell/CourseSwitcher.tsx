"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { updateSettings } from "@/server/services/settings";
import { cn } from "@/lib/cn";

type PackOption = { id: string; title: string; subject: string; level: string };

/** The course chip in the stat bar; opens a list of published courses. */
export function CourseSwitcher({ packs, activeId }: { packs: PackOption[]; activeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const active = packs.find((p) => p.id === activeId) ?? packs[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (id: string) =>
    start(async () => {
      await updateSettings({ activePackId: id });
      setOpen(false);
      router.push("/learn");
      router.refresh();
    });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Switch course"
        className="flex h-10 max-w-[170px] items-center gap-1 rounded-xl border-2 border-line px-3 text-sm font-bold whitespace-nowrap text-ink-soft transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="truncate">{active?.subject ?? "No course"}</span>
        {packs.length > 1 && <ChevronDown className="size-4 shrink-0" />}
      </button>
      {open && packs.length > 0 && (
        <ul
          role="listbox"
          aria-label="Courses"
          className="absolute top-[calc(100%+8px)] left-0 z-40 w-72 origin-top-left animate-pop-in rounded-2xl border-2 border-line bg-surface p-2 shadow-pop"
        >
          {packs.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                aria-selected={p.id === active?.id}
                disabled={pending}
                onClick={() => choose(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2",
                  p.id === active?.id && "bg-brand-soft",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{p.title}</span>
                  <span className="block truncate text-xs font-bold text-muted">
                    {p.subject} · {p.level}
                  </span>
                </span>
                {p.id === active?.id && <Check className="size-4 text-brand" strokeWidth={3} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

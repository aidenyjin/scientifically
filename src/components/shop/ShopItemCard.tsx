"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { buyItemAction } from "@/app/(app)/actions";
import { GemIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { play } from "@/sound/sfx";

export interface ShopCardItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  /**
   * Why it can't be bought right now, shown instead of the buy button
   * ("owned" gets a green tick, "neutral" a grey pill), or null to show the price.
   */
  blocked: { label: string; tone: "owned" | "neutral" } | null;
  disabled: boolean;
  /** Small status line, e.g. "Equipped 1 / 2". */
  status?: string;
  /** "active" highlights the status (e.g. a running boost). */
  statusTone?: "active";
}

export function ShopItemCard({ item, preview }: { item: ShopCardItem; preview?: React.ReactNode }) {
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const buy = () =>
    start(async () => {
      const result = await buyItemAction(item.id);
      if (result.ok) {
        play("gem");
        setFlash({ ok: true, text: result.message });
      } else {
        play("wrong");
        setFlash({ ok: false, text: result.error });
      }
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(null), 2400);
    });

  const statusText = flash?.text ?? item.status ?? "";

  return (
    <li className="flex items-center gap-5 border-b-2 border-line py-5 last:border-b-0">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-[40px] leading-none">
        {preview ?? <span aria-hidden>{item.icon}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-ink">{item.name}</p>
        <p className="text-[15px] text-ink-soft">{item.description}</p>
        <p
          aria-live="polite"
          className={cn(
            "text-sm font-bold empty:hidden",
            flash
              ? flash.ok
                ? "animate-rise-in text-correct-ink"
                : "animate-shake text-wrong-ink"
              : item.statusTone === "active"
                ? "text-streak"
                : "text-muted",
            statusText && "mt-1",
          )}
        >
          {statusText}
        </p>
      </div>
      {item.blocked ? (
        <span
          className={cn(
            "inline-flex h-11 min-w-32 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-4 font-display text-[15px] font-semibold tracking-wide uppercase",
            item.blocked.tone === "owned" ? "bg-correct-soft text-correct-ink" : "bg-surface-2 text-muted",
          )}
        >
          {item.blocked.tone === "owned" && <Check className="size-4" strokeWidth={3.5} />}
          {item.blocked.label}
        </span>
      ) : (
        <Button
          variant="secondary"
          className={cn("min-w-32 shrink-0", !item.disabled && !pending && "text-gem")}
          disabled={pending || item.disabled}
          onClick={buy}
          aria-label={`Buy ${item.name} for ${item.price} gems`}
        >
          <GemIcon size={20} /> {item.price}
        </Button>
      )}
    </li>
  );
}

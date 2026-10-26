"use client";

import { useState, useTransition } from "react";
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
  /** Label replacing the price when it can't be bought (e.g. "Owned"), or null to show the price. */
  blocked: string | null;
  disabled: boolean;
  /** Small status line, e.g. "Equipped 1 / 2". */
  status?: string;
}

export function ShopItemCard({ item, preview }: { item: ShopCardItem; preview?: React.ReactNode }) {
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

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
      window.setTimeout(() => setFlash(null), 2400);
    });

  return (
    <li className="flex items-center gap-5 border-b-2 border-line py-5 last:border-b-0">
      <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[40px]">
        {preview ?? <span aria-hidden>{item.icon}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-ink">{item.name}</p>
        <p className="text-[15px] text-ink-soft">{item.description}</p>
        <p
          aria-live="polite"
          className={cn(
            "mt-1 min-h-5 text-sm font-bold",
            flash ? (flash.ok ? "animate-rise-in text-correct-ink" : "animate-shake text-wrong-ink") : "text-muted",
          )}
        >
          {flash?.text ?? item.status ?? ""}
        </p>
      </div>
      <Button
        variant="secondary"
        className={cn("min-w-32", !item.disabled && "text-gem")}
        disabled={pending || item.disabled}
        onClick={buy}
        aria-label={`Buy ${item.name} for ${item.price} gems`}
      >
        {item.blocked ?? (
          <>
            <GemIcon size={20} /> {item.price}
          </>
        )}
      </Button>
    </li>
  );
}

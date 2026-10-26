"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setOutfitAction } from "@/app/(app)/actions";
import { Character } from "@/characters/Character";
import { COSMETICS, type CosmeticId } from "@/characters/cosmetics";
import { cn } from "@/lib/cn";

/** Dress Lumi in owned cosmetics. One item per slot. */
export function OutfitPicker({ owned, wearing }: { owned: string[]; wearing: string[] }) {
  const router = useRouter();
  const [worn, setWorn] = useState<string[]>(wearing);
  const [, start] = useTransition();
  const ownedItems = COSMETICS.filter((c) => owned.includes(c.id));

  const toggle = (id: CosmeticId) => {
    const item = COSMETICS.find((c) => c.id === id)!;
    const wear = !worn.includes(id);
    const next = worn.filter((w) => COSMETICS.find((c) => c.id === w)?.slot !== item.slot);
    setWorn(wear ? [...next, id] : next);
    start(async () => {
      await setOutfitAction("lumi", id, wear);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-6">
      <div className="bg-brand-soft grid size-40 shrink-0 place-items-center rounded-3xl">
        <Character id="lumi" expression="happy" size={136} outfit={worn as CosmeticId[]} animate />
      </div>
      {ownedItems.length === 0 ? (
        <p className="text-ink-soft">
          No outfits yet.{" "}
          <Link href="/shop" className="text-brand font-bold hover:underline">
            Visit the shop
          </Link>{" "}
          to buy some.
        </p>
      ) : (
        <div className="min-w-0">
          <p className="text-muted text-sm font-bold">Tap an item to try it on. One per slot.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ownedItems.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={worn.includes(c.id)}
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "pressable rounded-xl border-2 px-3 py-2 text-sm font-bold [--depth:3px]",
                    worn.includes(c.id)
                      ? "border-brand bg-brand-soft text-brand [--edge:var(--brand)]"
                      : "border-line bg-surface text-ink-soft [--edge:var(--line)]",
                  )}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { CosmeticId } from "./cosmetics";
import type { CharacterId } from "./types";

export type Outfits = Partial<Record<CharacterId, readonly CosmeticId[]>>;

const OutfitContext = createContext<Outfits>({});

/** Makes every <Character> below wear the learner's saved outfit by default. */
export function OutfitProvider({ outfits, children }: { outfits: Outfits; children: React.ReactNode }) {
  return <OutfitContext.Provider value={outfits}>{children}</OutfitContext.Provider>;
}

export function useOutfit(id: CharacterId): readonly CosmeticId[] | undefined {
  return useContext(OutfitContext)[id];
}

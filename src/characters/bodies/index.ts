import type { CharacterArt } from "../art";
import type { CharacterId } from "../types";
import { bond } from "./bond";
import { lumi } from "./lumi";
import { nova } from "./nova";
import { pip } from "./pip";
import { terra } from "./terra";
import { volt } from "./volt";

export const ART: Record<CharacterId, CharacterArt> = { lumi, nova, pip, bond, volt, terra };

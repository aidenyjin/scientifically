/** Shop cosmetics characters can wear. Rendering lives in the characters module. */
export const COSMETICS = [
  { id: "goggles", name: "Lab goggles", price: 150, slot: "eyes" },
  { id: "round-glasses", name: "Round glasses", price: 150, slot: "eyes" },
  { id: "party-hat", name: "Party hat", price: 200, slot: "head" },
  { id: "grad-cap", name: "Graduation cap", price: 300, slot: "head" },
  { id: "bow-tie", name: "Bow tie", price: 200, slot: "neck" },
  { id: "crown", name: "Nobel crown", price: 800, slot: "head" },
] as const;

export type CosmeticId = (typeof COSMETICS)[number]["id"];
export type CosmeticSlot = (typeof COSMETICS)[number]["slot"];

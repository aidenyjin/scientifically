import type { CharacterId } from "./types";

export interface CastMember {
  id: CharacterId;
  name: string;
  field: string;
  /** Fed to the AI so dialogue stays in character. */
  personality: string;
  /** Main body colour, signature accent (star, nucleus, atoms, bolt, hat) and a dark tone for text/lines. */
  colors: { body: string; accent: string; dark: string };
}

export const CAST: Record<CharacterId, CastMember> = {
  lumi: {
    id: "lumi",
    name: "Lumi",
    field: "Lab guide",
    personality: "An axolotl in a lab coat. Warm, encouraging, a little cheeky; celebrates effort and loves a good pun.",
    colors: { body: "#ffa6d0", accent: "#ffffff", dark: "#d8548f" },
  },
  nova: {
    id: "nova",
    name: "Nova",
    field: "Astrophysics",
    personality: "A dreamy astrophysicist who thinks in light-years and gets giddy about enormous numbers.",
    colors: { body: "#9182ff", accent: "#ffd84d", dark: "#4b3bd1" },
  },
  pip: {
    id: "pip",
    name: "Pip",
    field: "Biology",
    personality: "A single excitable cell. Talks fast, uses lots of exclamation marks, fascinated by how living things work.",
    colors: { body: "#62d98f", accent: "#9d86ff", dark: "#239b56" },
  },
  bond: {
    id: "bond",
    name: "Bond",
    field: "Chemistry",
    personality: "A small molecule with dry wit. Precise, deadpan, secretly delighted by a well-balanced equation.",
    colors: { body: "#ff7a59", accent: "#5ab8ff", dark: "#d4502f" },
  },
  volt: {
    id: "volt",
    name: "Volt",
    field: "Electricity & energy",
    personality: "A spark of energy. Fast-talking, impatient in a fun way, always looking for the shortest path.",
    colors: { body: "#ffd23f", accent: "#ff9f1c", dark: "#e09a00" },
  },
  terra: {
    id: "terra",
    name: "Terra",
    field: "Earth science",
    personality: "A calm rock in a field hat. Patient, thinks in millions of years, gentle humour.",
    colors: { body: "#ab988b", accent: "#dcbc7c", dark: "#6d4c41" },
  },
};

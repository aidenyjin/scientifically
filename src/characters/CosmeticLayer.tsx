"use client";

/**
 * Shop cosmetics drawn over any character, placed by the character's anchor
 * points (hat seat, eyes, neck). Art is drawn around (0, 0) at a common scale.
 */
import type { CharacterArt } from "./art";
import { COSMETICS, type CosmeticId, type CosmeticSlot } from "./cosmetics";
import { INK } from "./parts";

export type Outfit = Partial<Record<CosmeticSlot, CosmeticId>>;

const SLOT: Record<CosmeticId, CosmeticSlot> = Object.fromEntries(COSMETICS.map((c) => [c.id, c.slot])) as Record<
  CosmeticId,
  CosmeticSlot
>;

/** One item per slot; later items win. Unknown ids are ignored. */
export function resolveOutfit(items: readonly string[] | undefined): Outfit {
  const out: Outfit = {};
  for (const id of items ?? []) {
    const slot = SLOT[id as CosmeticId];
    if (slot) out[slot] = id as CosmeticId;
  }
  return out;
}

function PartyHat({ uid }: { uid: string }) {
  const cone = "M-12.5 0L-1.2 -27.5Q0 -29.5 1.2 -27.5L12.5 0Q0 4 -12.5 0Z";
  return (
    <>
      <clipPath id={`${uid}-ph`}>
        <path d={cone} />
      </clipPath>
      <path d={cone} fill="#6c5ce7" />
      <g clipPath={`url(#${uid}-ph)`}>
        <path d="M-20 -6L20 -16V-10L-20 0Z" fill="#ffc800" />
        <path d="M-20 -19L20 -29V-23L-20 -13Z" fill="#ffc800" />
        <path d="M4 -30L16 0H20V-30Z" fill="#000" opacity={0.14} />
      </g>
      <path d="M-12.5 0Q0 4 12.5 0" fill="none" stroke="#ff86c8" strokeWidth={3} strokeLinecap="round" />
      <circle cx={0} cy={-29} r={4.2} fill="#ff86c8" />
      <circle cx={-1.3} cy={-30.3} r={1.4} fill="#fff" opacity={0.7} />
    </>
  );
}

function GradCap() {
  return (
    <>
      <path d="M-13 -1V-9.5H13V-1Q0 3 -13 -1Z" fill="#2f2c47" />
      <path d="M0 -21L25 -12.5L0 -4L-25 -12.5Z" fill="#3d3960" stroke="#3d3960" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M0 -21L25 -12.5L0 -4Z" fill="#000" opacity={0.15} />
      <path d="M0 -12.5Q12 -12 17 -9.5V1" fill="none" stroke="#ffc800" strokeWidth={1.7} strokeLinecap="round" />
      <path d="M15.2 0.5H18.8L19.6 6.5H14.4Z" fill="#ffc800" strokeLinejoin="round" stroke="#ffc800" strokeWidth={1} />
      <circle cx={0} cy={-12.5} r={1.9} fill="#ffc800" />
    </>
  );
}

function Crown() {
  const d = "M-15 0V-13L-7.5 -6.5L0 -17L7.5 -6.5L15 -13V0Z";
  return (
    <>
      <path d={d} fill="#ffc800" stroke="#ffc800" strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M0 -17L7.5 -6.5L15 -13V0H0Z" fill="#e0a800" opacity={0.55} />
      <rect x={-16} y={-4.5} width={32} height={5.5} rx={2} fill="#e0a800" />
      <circle cx={-15} cy={-14} r={2} fill="#ffe27a" />
      <circle cx={0} cy={-18} r={2.2} fill="#ffe27a" />
      <circle cx={15} cy={-14} r={2} fill="#ffe27a" />
      <circle cx={-8} cy={-1.8} r={1.7} fill="#ff4b6e" />
      <circle cx={0} cy={-1.8} r={1.9} fill="#1cb0f6" />
      <circle cx={8} cy={-1.8} r={1.7} fill="#2bc46b" />
    </>
  );
}

function BowTie() {
  return (
    <>
      <path d="M-1 0L-11.5 -6.5Q-14 0 -11.5 6.5Z" fill="#ff4b6e" stroke="#ff4b6e" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M1 0L11.5 -6.5Q14 0 11.5 6.5Z" fill="#ff4b6e" stroke="#ff4b6e" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M1 0L11.5 6.5Q13.6 2 13 -1Z" fill="#d8335a" opacity={0.7} />
      <path d="M-1 0L-11.5 6.5Q-13.6 2 -13 -1Z" fill="#d8335a" opacity={0.7} />
      <rect x={-3.4} y={-4} width={6.8} height={8} rx={2.4} fill="#d8335a" />
    </>
  );
}

function EyeWear({ kind, art }: { kind: "goggles" | "round-glasses"; art: CharacterArt }) {
  const { eyeDx: dx, rx, ry } = art.face;
  const band = art.anchors.band;
  const r = Math.max(rx, ry);
  if (kind === "goggles") {
    const lr = r + 3;
    return (
      <>
        {[-1, 1].map((s) => (
          <path key={s} d={`M${s * (dx + lr - 1)} 0L${s * (band + 0.5)} -1`} stroke="#3d6f8f" strokeWidth={6} />
        ))}
        <path d={`M${-dx + lr - 1} -1H${dx - lr + 1}`} stroke="#5d7488" strokeWidth={5} />
        {[-dx, dx].map((x) => (
          <g key={x}>
            <circle cx={x} cy={0} r={lr} fill="#bfe9ff" opacity={0.38} />
            <circle cx={x} cy={0} r={lr} fill="none" stroke="#5d7488" strokeWidth={3.2} />
            <path
              d={`M${x - lr * 0.55} ${-lr * 0.2}A${lr * 0.6} ${lr * 0.6} 0 0 1 ${x - lr * 0.1} ${-lr * 0.6}`}
              fill="none"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              opacity={0.9}
            />
          </g>
        ))}
      </>
    );
  }
  const gr = r + 2.2;
  return (
    <>
      {[-1, 1].map((s) => (
        <path key={s} d={`M${s * (dx + gr)} -1L${s * band} -2.5`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <path d={`M${-dx + gr} -0.5Q0 -4 ${dx - gr} -0.5`} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      {[-dx, dx].map((x) => (
        <g key={x}>
          <circle cx={x} cy={0} r={gr} fill="#fff" opacity={0.14} />
          <circle cx={x} cy={0} r={gr} fill="none" stroke={INK} strokeWidth={2.1} />
          <path
            d={`M${x - gr * 0.5} ${-gr * 0.35}A${gr * 0.55} ${gr * 0.55} 0 0 1 ${x - gr * 0.05} ${-gr * 0.62}`}
            fill="none"
            stroke="#fff"
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.8}
          />
        </g>
      ))}
    </>
  );
}

export function CosmeticLayer({ outfit, art, uid }: { outfit: Outfit; art: CharacterArt; uid: string }) {
  const { hat, neck } = art.anchors;
  const cx = art.face.cx ?? 60;
  return (
    <>
      {outfit.neck === "bow-tie" && (
        <g transform={`translate(${neck.x} ${neck.y}) scale(${neck.s})`}>
          <BowTie />
        </g>
      )}
      {(outfit.eyes === "goggles" || outfit.eyes === "round-glasses") && (
        <g transform={`translate(${cx} ${art.face.eyeY})`}>
          <EyeWear kind={outfit.eyes} art={art} />
        </g>
      )}
      {outfit.head && (
        <g transform={`translate(${hat.x} ${hat.y}) rotate(${hat.r}) scale(${hat.s})`}>
          {outfit.head === "party-hat" && <PartyHat uid={uid} />}
          {outfit.head === "grad-cap" && <GradCap />}
          {outfit.head === "crown" && <Crown />}
        </g>
      )}
    </>
  );
}

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

const O = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function PartyHat({ uid }: { uid: string }) {
  const cone = "M-12.5 0L-1.2 -27.5Q0 -29.5 1.2 -27.5L12.5 0Q0 4 -12.5 0Z";
  return (
    <>
      <clipPath id={`${uid}-ph`}>
        <path d={cone} />
      </clipPath>
      <path d={cone} fill="#d9826b" />
      <g clipPath={`url(#${uid}-ph)`}>
        <path d="M-20 -6L20 -16V-11L-20 -1Z" fill="#f2d48a" />
        <path d="M-20 -19L20 -29V-24L-20 -14Z" fill="#f2d48a" />
      </g>
      <path d={cone} fill="none" {...O} />
      <circle cx={0} cy={-29.5} r={3.6} fill="#f2d48a" {...O} />
    </>
  );
}

function GradCap() {
  return (
    <>
      <path d="M-13 -1V-9.5H13V-1Q0 3 -13 -1Z" fill="#3a3632" {...O} />
      <path d="M0 -21L25 -12.5L0 -4L-25 -12.5Z" fill="#4a4540" {...O} />
      <path d="M0 -12.5Q12 -12 17 -9.5V1" fill="none" stroke="#c29a1e" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M15.2 0.5H18.8L19.6 6.5H14.4Z" fill="#c29a1e" />
      <circle cx={0} cy={-12.5} r={1.8} fill="#c29a1e" />
    </>
  );
}

function Crown() {
  const d = "M-15 0V-13L-7.5 -6.5L0 -17L7.5 -6.5L15 -13V0Z";
  return (
    <>
      <path d={d} fill="#e2c46a" {...O} />
      <path d="M-15 -4.5H15" fill="none" {...O} strokeWidth={1.2} />
      <circle cx={-15} cy={-14} r={1.9} fill="#e2c46a" {...O} strokeWidth={1.2} />
      <circle cx={0} cy={-18} r={2.1} fill="#e2c46a" {...O} strokeWidth={1.2} />
      <circle cx={15} cy={-14} r={1.9} fill="#e2c46a" {...O} strokeWidth={1.2} />
      <circle cx={-7.5} cy={-1.8} r={1.5} fill="#b4463b" />
      <circle cx={0} cy={-1.8} r={1.7} fill="#2d4a7a" />
      <circle cx={7.5} cy={-1.8} r={1.5} fill="#5f8a5a" />
    </>
  );
}

function BowTie() {
  return (
    <>
      <path d="M-1.5 0L-11.5 -6.5Q-14 0 -11.5 6.5Z" fill="#b4463b" {...O} />
      <path d="M1.5 0L11.5 -6.5Q14 0 11.5 6.5Z" fill="#b4463b" {...O} />
      <rect x={-3.4} y={-4} width={6.8} height={8} rx={2.4} fill="#8e3229" {...O} />
    </>
  );
}

function EyeWear({ kind, art }: { kind: "goggles" | "round-glasses"; art: CharacterArt }) {
  const { eyeDx: dx, rx, ry } = art.face;
  const band = art.anchors.band;
  // Eyes are small dots now; lenses keep a readable minimum size.
  const r = Math.max(rx, ry, 4.6);
  if (kind === "goggles") {
    const lr = r + 3;
    return (
      <>
        {[-1, 1].map((s) => (
          <path key={s} d={`M${s * (dx + lr - 1)} 0L${s * (band + 0.5)} -1`} stroke={INK} strokeWidth={3} />
        ))}
        <path d={`M${-dx + lr - 1} -1H${dx - lr + 1}`} stroke={INK} strokeWidth={2.4} />
        {[-dx, dx].map((x) => (
          <g key={x}>
            <circle cx={x} cy={0} r={lr} fill="#cfe1ee" opacity={0.55} />
            <circle cx={x} cy={0} r={lr} fill="none" stroke={INK} strokeWidth={2.2} />
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

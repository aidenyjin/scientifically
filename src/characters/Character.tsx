"use client";

import { cn } from "@/lib/cn";
import { CAST } from "./cast";
import type { CharacterId, Expression } from "./types";

// PLACEHOLDER art — replaced by the characters milestone (same props).
export function Character({
  id,
  expression = "neutral",
  size = 96,
  className,
}: {
  id: CharacterId;
  expression?: Expression;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const c = CAST[id];
  const happy = expression === "happy" || expression === "celebrate";
  const sad = expression === "sad";
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${c.name}, ${expression}`}
      className={cn("shrink-0", className)}
    >
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="black" opacity="0.08" />
      <circle cx="50" cy="52" r="36" fill={c.colors.body} />
      <circle cx="38" cy="47" r="6" fill="#2d2d3f" />
      <circle cx="62" cy="47" r="6" fill="#2d2d3f" />
      <circle cx="40" cy="45" r="2" fill="white" />
      <circle cx="64" cy="45" r="2" fill="white" />
      <path
        d={happy ? "M38 62 Q50 74 62 62" : sad ? "M40 68 Q50 60 60 68" : "M42 65 L58 65"}
        stroke="#2d2d3f"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

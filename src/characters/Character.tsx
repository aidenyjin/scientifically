"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { ART } from "./bodies";
import { CAST } from "./cast";
import type { CosmeticId } from "./cosmetics";
import { CosmeticLayer, resolveOutfit } from "./CosmeticLayer";
import { Arms, Blush, Brows, Extras, Eyes, GroundShadow, Mouth } from "./parts";
import { faceFor, phase } from "./rig";
import { CharacterStyles } from "./styles";
import type { CharacterId, Expression } from "./types";
import { useReducedMotionPref } from "./useReducedMotionPref";

export interface CharacterProps {
  id: CharacterId;
  expression?: Expression;
  /** Rendered width/height in px. The art reads well from 48 to 200. */
  size?: number;
  className?: string;
  /** Idle bob, blinks, hops. Off by default; always off with reduced motion. */
  animate?: boolean;
  /** Shop cosmetics to wear (one per slot; later items win). */
  outfit?: readonly CosmeticId[];
}

const ORIGIN = "60px 112px";

/** Loop on the whole figure (+ the matching ground-shadow loop). */
function loopFor(expression: Expression, idle: "bob" | "jelly" | "float"): [body: string, shadow?: string] {
  switch (expression) {
    case "celebrate":
      return ["ch-hop", "ch-hop-s"];
    case "sad":
      return ["ch-sigh"];
    case "sleepy":
      return ["ch-doze", "ch-doze-s"];
    case "happy":
      return idle === "bob" ? ["ch-bob-fast", "ch-bob-fast-s"] : [`ch-${idle}`, `ch-${idle}-s`];
    default:
      return [`ch-${idle}`, `ch-${idle}-s`];
  }
}

/** One-shot accents played when an expression arrives. */
const ACCENT: Partial<Record<Expression, string>> = { surprised: "ch-pop", happy: "ch-perk" };

/** Held posture, transitioned (so it morphs and can be interrupted). */
const POSE: Record<Expression, string> = {
  neutral: "translateY(0px) rotate(0deg) scale(1, 1)",
  happy: "translateY(0px) rotate(0deg) scale(1, 1)",
  celebrate: "translateY(0px) rotate(0deg) scale(1, 1)",
  sad: "translateY(1.5px) rotate(0deg) scale(1.03, 0.95)",
  thinking: "translateY(0px) rotate(-2.5deg) scale(1, 1)",
  surprised: "translateY(-1px) rotate(0deg) scale(0.985, 1.025)",
  sleepy: "translateY(0.5px) rotate(0deg) scale(1.02, 0.97)",
};

/** Random 3–6 s blinks, sometimes a double blink. Client-only timers. */
function useBlink(enabled: boolean): boolean {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const next = () => 3000 + Math.random() * 3000;
    const schedule = (ms: number) => {
      timer = window.setTimeout(() => {
        setBlinking(true);
        timer = window.setTimeout(() => {
          setBlinking(false);
          schedule(Math.random() < 0.2 ? 200 : next());
        }, 170);
      }, ms);
    };
    schedule(next());
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return enabled && blinking;
}

/** A cast member drawn in SVG. Same props everywhere; see /dev/characters. */
export function Character({
  id,
  expression = "neutral",
  size = 96,
  className,
  animate = false,
  outfit,
}: CharacterProps) {
  const art = ART[id];
  const cast = CAST[id];
  const reduced = useReducedMotionPref();
  const animated = animate && !reduced;
  const uid = `ch${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const face = faceFor(expression, art.overrides);
  const blink = useBlink(animated && face.eye === "open");
  const worn = resolveOutfit(outfit);
  const [loop, shadowLoop] = animated ? loopFor(expression, art.idle ?? "bob") : [undefined, undefined];
  // Desync idle loops between characters on one screen. A celebration starts
  // from its anticipation squash instead (just a small stagger).
  const ph = phase(uid + id);
  const delay = expression === "celebrate" ? `${(ph * 0.2).toFixed(2)}s` : `${(-ph * 3).toFixed(2)}s`;
  const props = { uid, face, expression, animated, headwear: Boolean(worn.head) };
  const { Back, Body, Front } = art;

  return (
    <>
      <CharacterStyles />
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label={`${cast.name}, ${expression}`}
        overflow="visible"
        className={cn("shrink-0 select-none", className)}
      >
        <GroundShadow rx={art.shadow ?? 27} className={shadowLoop} delay={delay} />
        <g className={loop} style={{ transformOrigin: ORIGIN, animationDelay: delay }}>
          <g className={animated ? ACCENT[expression] : undefined} style={{ transformOrigin: ORIGIN }}>
            <g
              className={expression === "sad" ? "ch-pose-slow" : "ch-pose"}
              style={{ transformOrigin: ORIGIN, transform: POSE[expression] }}
            >
              {Back && <Back {...props} />}
              <Body {...props} />
              <Blush spec={art.face} face={face} />
              <Eyes spec={art.face} face={face} uid={uid} blink={blink} />
              <Brows spec={art.face} face={face} />
              <Mouth spec={art.face} face={face} uid={uid} />
              {Front && <Front {...props} />}
              <Arms spec={art.arms} face={face} chin={art.anchors.chin} />
              <CosmeticLayer outfit={worn} art={art} uid={uid} />
            </g>
          </g>
        </g>
        <Extras extra={face.extra} anchors={art.anchors} accent={cast.colors.dark} animated={animated} />
      </svg>
    </>
  );
}

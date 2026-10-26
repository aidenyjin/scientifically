"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Animate an integer from `from` to `target` with an ease-out curve. */
export function useCountUp(
  target: number,
  { from = 0, duration = 600, delay = 0 }: { from?: number; duration?: number; delay?: number } = {},
): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / duration));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, from, duration, delay, reduce]);

  return reduce ? target : value;
}

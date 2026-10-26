"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

function subscribeReduceMotion(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
  return () => observer.disconnect();
}

/** True when the OS or the app's own setting asks for reduced motion: scenes then hold a static pose. */
export function useStaticPose(): boolean {
  const os = useReducedMotion();
  const app = useSyncExternalStore(
    subscribeReduceMotion,
    () => document.documentElement.dataset.reduceMotion === "true",
    () => false,
  );
  return Boolean(os) || app;
}

/**
 * Drive an animation with requestAnimationFrame. The callback gets elapsed
 * seconds and the frame delta (capped, so a background tab doesn't jump).
 * It should write to the DOM through refs (transform/opacity), not set state.
 * When `animate` is false it runs once after each render with (0, 0), so
 * static poses still follow the params.
 */
export function useFrame(onFrame: (seconds: number, dt: number) => void, animate: boolean): void {
  const callback = useRef(onFrame);
  useLayoutEffect(() => {
    callback.current = onFrame;
  });

  useLayoutEffect(() => {
    if (!animate) callback.current(0, 0);
  });

  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      callback.current((now - start) / 1000, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);
}

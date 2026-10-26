"use client";

import { useSyncExternalStore } from "react";

/*
 * Reduced motion = the OS setting OR the app's own setting, which
 * ClientSettings mirrors onto <html data-reduce-motion="true">.
 * Read through useSyncExternalStore so hydration uses the server value
 * (motion off is never assumed on the server) and then updates — no
 * hydration mismatch. One shared listener pair serves every character.
 */
const QUERY = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!teardown && typeof window !== "undefined") {
    const media = window.matchMedia?.(QUERY);
    media?.addEventListener("change", notify);
    const observer = typeof MutationObserver !== "undefined" ? new MutationObserver(notify) : null;
    observer?.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    teardown = () => {
      media?.removeEventListener("change", notify);
      observer?.disconnect();
    };
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      teardown?.();
      teardown = null;
    }
  };
}

function getSnapshot(): boolean {
  return (
    document.documentElement.dataset.reduceMotion === "true" || Boolean(window.matchMedia?.(QUERY).matches)
  );
}

const getServerSnapshot = () => false;

export function useReducedMotionPref(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

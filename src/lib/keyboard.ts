"use client";

import { useEffect, useRef } from "react";

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

/**
 * Register keyboard shortcuts while `enabled`. Keys are `KeyboardEvent.key`
 * values ("1", "Enter", "Escape", "ArrowUp", "Backspace", "h"). Letter keys
 * match case-insensitively. Shortcuts are ignored while typing in an input,
 * except keys listed in `allowInInputs` (e.g. "Enter").
 */
export function useHotkeys(
  map: HotkeyMap,
  { enabled = true, allowInInputs = [] as string[] } = {},
): void {
  const mapRef = useRef(map);
  const allowRef = useRef(allowInInputs);
  useEffect(() => {
    mapRef.current = map;
    allowRef.current = allowInInputs;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const handler = mapRef.current[key] ?? mapRef.current[event.key];
      if (!handler) return;
      if (isTypingTarget(event.target) && !allowRef.current.includes(key)) return;
      if (event.repeat && key === "Enter") return;
      event.preventDefault();
      handler(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/** Digit keys "1".."9" for option index 0..8. */
export function digitKeys(count: number, onPick: (index: number) => void): HotkeyMap {
  const map: HotkeyMap = {};
  for (let i = 0; i < Math.min(count, 9); i++) map[String(i + 1)] = () => onPick(i);
  return map;
}

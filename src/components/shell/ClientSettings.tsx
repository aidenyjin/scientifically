"use client";

import { useEffect } from "react";
import { setSoundEnabled } from "@/sound/sfx";

/** Applies per-user settings that live in the browser (sound, reduced motion). */
export function ClientSettings({ sound, reduceMotion }: { sound: boolean; reduceMotion: boolean }) {
  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
  return null;
}

"use client";

import { useSyncExternalStore } from "react";
import { isSoundEnabled, setSoundEnabled, subscribeSound } from "./sfx";

/**
 * The live sound on/off flag, for toggles. This only changes the in-memory
 * setting; persisting it (user settings) is the caller's job.
 */
export function useSoundSetting(): [enabled: boolean, setEnabled: (value: boolean) => void] {
  const enabled = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);
  return [enabled, setSoundEnabled];
}

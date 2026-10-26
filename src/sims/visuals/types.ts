export interface SimVisualProps {
  params: Record<string, number>;
  outputs: Record<string, number>;
  /** The exercise goal, so a scene can mark the target (e.g. a flag at the target range). */
  goal?: { output: string; target: number; tolerance: number };
}

/** Every scene draws into this viewBox. */
export const SCENE = { w: 560, h: 210 } as const;

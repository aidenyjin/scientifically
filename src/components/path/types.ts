export type NodeState = "locked" | "current" | "completed";

export interface PathLesson {
  id: string;
  title: string;
  kind: "standard" | "checkpoint";
  objectives: string[];
  state: NodeState;
  /** 1-based position within the unit, for "Lesson 2 of 5". */
  number: number;
  /** Lessons in this unit (excluding checkpoints). */
  of: number;
}

export interface PathUnit {
  id: string;
  index: number;
  title: string;
  description: string;
  color: string;
  lessons: PathLesson[];
  completed: number;
}

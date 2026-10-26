"use server";

import type { CompletionSummary, LessonCompletionInput, RefillResult } from "@/engine/summary";
import { requireUser } from "@/server/repo/users";
import {
  completeLessonForUser,
  loseHearts,
  refillHeartsWithGems,
} from "@/server/services/lesson-completion";

export async function completeLessonAction(input: LessonCompletionInput): Promise<CompletionSummary> {
  const user = await requireUser();
  return completeLessonForUser(user, input);
}

export async function abandonLessonAction(input: { heartsLost: number }): Promise<void> {
  const user = await requireUser();
  await loseHearts(user, Math.max(0, Math.floor(input.heartsLost)));
}

export async function refillHeartsAction(): Promise<RefillResult> {
  const user = await requireUser();
  return refillHeartsWithGems(user);
}

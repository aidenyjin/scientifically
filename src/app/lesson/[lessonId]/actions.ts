"use server";

import type { CompletionSummary, LessonCompletionInput, RefillResult } from "@/engine/summary";
import { getCurrentUser } from "@/server/repo/users";
import {
  completeLessonForUser,
  loseHearts,
  refillHeartsWithGems,
} from "@/server/services/lesson-completion";

export async function completeLessonAction(input: LessonCompletionInput): Promise<CompletionSummary> {
  const user = await getCurrentUser();
  return completeLessonForUser(user.id, input);
}

export async function abandonLessonAction(input: { heartsLost: number }): Promise<void> {
  const user = await getCurrentUser();
  await loseHearts(user.id, Math.max(0, Math.floor(input.heartsLost)));
}

export async function refillHeartsAction(): Promise<RefillResult> {
  const user = await getCurrentUser();
  return refillHeartsWithGems(user.id);
}

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

export async function refillHeartsAction(input: { heartsLost: number }): Promise<RefillResult> {
  // Hearts lost in the lesson so far are only known to the browser: record them first,
  // otherwise the server thinks hearts are still full and refuses the refill.
  await loseHearts(await requireUser(), Math.max(0, Math.floor(input?.heartsLost ?? 0)));
  return refillHeartsWithGems(await requireUser());
}

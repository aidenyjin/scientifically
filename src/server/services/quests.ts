import "server-only";
import { questById, questsForDay } from "@/game";
import { localDateString } from "@/lib/clock";
import { db } from "@/server/db";
import type { CurrentUser } from "@/server/repo/users";

/** Today's three quests with progress, creating the rows on first view. */
export async function getQuestsToday(user: CurrentUser, now: Date) {
  const date = localDateString(now, user.timezone);
  const defs = questsForDay(date, user.id);
  const rows = await db.questProgress.findMany({ where: { userId: user.id, date } });
  const missing = defs.filter((d) => !rows.some((r) => r.questId === d.id));
  if (missing.length) {
    await db.$transaction(
      missing.map((d) =>
        db.questProgress.upsert({
          where: { userId_date_questId: { userId: user.id, date, questId: d.id } },
          update: {},
          create: { userId: user.id, date, questId: d.id, target: d.target },
        }),
      ),
    );
  }
  const all = missing.length ? await db.questProgress.findMany({ where: { userId: user.id, date } }) : rows;
  return defs.map((d) => {
    const row = all.find((r) => r.questId === d.id);
    return {
      id: d.id,
      title: d.title,
      rewardGems: d.rewardGems,
      difficulty: d.difficulty,
      progress: row?.progress ?? 0,
      target: d.target,
      completed: (row?.progress ?? 0) >= d.target,
      claimed: row?.claimed ?? false,
    };
  });
}

export type QuestView = Awaited<ReturnType<typeof getQuestsToday>>[number];

export function questTitle(id: string): string {
  return questById(id)?.title ?? id;
}

import { Character } from "@/characters/Character";
import { QuestList } from "@/components/quests/QuestList";
import { Card } from "@/components/ui/Card";
import { now } from "@/lib/clock";
import { requireUser } from "@/server/repo/users";
import { getQuestsToday } from "@/server/services/quests";
import { MidnightCountdown } from "@/components/quests/MidnightCountdown";

export default async function QuestsPage() {
  const user = await requireUser();
  const quests = await getQuestsToday(user, now());
  const done = quests.filter((q) => q.completed).length;
  return (
    <div className="grid gap-8">
      <header className="flex items-center gap-6 rounded-3xl bg-streak px-7 py-6 text-white shadow-[0_4px_0_var(--streak-dark)]">
        <div className="flex-1">
          <p className="font-display text-sm font-semibold tracking-wider text-white/80 uppercase">Daily quests</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">
            {done === quests.length ? "All done — legendary!" : `${done} of ${quests.length} complete`}
          </h1>
          <p className="mt-1 font-semibold text-white/90">
            {done === quests.length ? "Come back tomorrow for new quests." : "Finish quests to win gems. New quests every day."}
          </p>
        </div>
        <Character id="volt" expression={done === quests.length ? "celebrate" : "happy"} size={110} animate />
      </header>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Today</h2>
          <MidnightCountdown timeZone={user.timezone} />
        </div>
        <div className="mt-2">
          <QuestList quests={quests} />
        </div>
      </Card>
      <p className="text-center text-sm font-semibold text-muted">Rewards are added to your gems automatically.</p>
    </div>
  );
}

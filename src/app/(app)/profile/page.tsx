import { BoltIcon, FlameIcon, SnowflakeIcon, TrophyIcon } from "@/components/icons";
import { LeagueBadge } from "@/components/leagues/LeagueBadge";
import { AchievementGrid } from "@/components/profile/AchievementGrid";
import { OutfitPicker } from "@/components/profile/OutfitPicker";
import { SettingsPanel } from "@/components/profile/SettingsPanel";
import { StreakCalendar } from "@/components/profile/StreakCalendar";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TIERS } from "@/game";
import { now } from "@/lib/clock";
import { requireUser } from "@/server/repo/users";
import { getProfile } from "@/server/services/profile";

export default async function ProfilePage() {
  const user = await requireUser();
  const t = now();
  const p = await getProfile(user, t);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: p.timezone }).format(t);
  const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(p.joined);

  return (
    <div className="grid gap-6">
      <header className="flex items-center gap-5">
        <div className="grid size-20 shrink-0 place-items-center rounded-full bg-brand font-display text-3xl font-bold text-white">
          {p.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-semibold" title={p.name}>
            {p.name}
          </h1>
          <p className="truncate text-sm font-bold text-muted">
            {p.isGuest ? "Guest" : p.email} · Joined {joined}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-display text-sm font-semibold text-brand">Level {p.level.level}</span>
            <ProgressBar value={p.level.progress} color="var(--brand)" height={10} className="max-w-60" label="Level progress" />
            <span className="text-xs font-bold text-muted tabular-nums">
              {p.level.xpIntoLevel}/{p.level.xpForNext} XP
            </span>
          </div>
        </div>
      </header>

      <section aria-label="Statistics" className="grid grid-cols-2 gap-3">
        <Stat icon={<FlameIcon size={30} muted={p.streak === 0} />} value={p.streak} label="Day streak" />
        <Stat icon={<BoltIcon size={30} />} value={p.totalXp} label="Total XP" />
        <Stat
          icon={<LeagueBadge tier={Math.max(0, TIERS.indexOf((p.league ?? "Quark") as (typeof TIERS)[number]))} size={28} />}
          value={p.league ?? "—"}
          label="Current league"
        />
        <Stat icon={<TrophyIcon size={30} />} value={p.perfectLessons} label="Perfect lessons" />
        <Stat icon={<span className="text-2xl">📚</span>} value={p.lessons} label="Lessons finished" />
        <Stat icon={<SnowflakeIcon size={30} />} value={p.freezes} label="Streak freezes" />
      </section>

      <Card className="grid grid-cols-[1fr_300px] items-center gap-8">
        <div className="flex flex-col items-center text-center">
          <FlameIcon size={88} muted={p.streak === 0} />
          <p className={`mt-1 font-display text-5xl font-bold tabular-nums ${p.streak > 0 ? "text-streak" : "text-muted"}`}>{p.streak}</p>
          <p className="font-display text-lg font-semibold text-ink">day streak</p>
          <dl className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
            <StreakFact label="Longest" value={p.longestStreak} />
            <StreakFact label={p.freezes === 1 ? "Freeze" : "Freezes"} value={p.freezes} />
            <StreakFact label="Minutes" value={p.minutes} />
          </dl>
        </div>
        <StreakCalendar days={p.calendar} monthLabel={monthLabel} />
      </Card>

      <Card>
        <CardTitle>Wardrobe</CardTitle>
        <div className="mt-4">
          <OutfitPicker owned={p.ownedCosmetics} wearing={p.outfit} />
        </div>
      </Card>

      <Card>
        <CardTitle>Achievements</CardTitle>
        <div className="mt-2">
          <AchievementGrid items={p.achievements} />
        </div>
      </Card>

      <Card id="settings">
        <CardTitle>Settings</CardTitle>
        <div className="mt-4">
          <SettingsPanel
            dailyGoalXp={p.dailyGoalXp}
            sound={p.settings.sound}
            reduceMotion={p.settings.reduceMotion}
            timezone={p.timezone}
            isGuest={p.isGuest}
            email={p.email}
          />
        </div>
      </Card>
    </div>
  );
}

function StreakFact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-1.5">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="font-display text-base font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="grid size-10 place-items-center">{icon}</span>
      <div>
        <p className="font-display text-xl font-bold text-ink tabular-nums">{value}</p>
        <p className="text-sm font-bold text-muted">{label}</p>
      </div>
    </div>
  );
}

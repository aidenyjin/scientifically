"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logout } from "@/app/(auth)/actions";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { GAME } from "@/game/config";
import { cn } from "@/lib/cn";
import { setSoundEnabled } from "@/sound/sfx";
import { updateSettings } from "@/server/services/settings";

const GOAL_LABELS: Record<number, string> = { 10: "Casual", 20: "Regular", 30: "Serious", 50: "Intense" };

export function SettingsPanel({
  dailyGoalXp,
  sound,
  reduceMotion,
  timezone,
  isGuest,
  email,
}: {
  dailyGoalXp: number;
  sound: boolean;
  reduceMotion: boolean;
  timezone: string;
  isGuest: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [goal, setGoal] = useState(dailyGoalXp);
  const [soundOn, setSoundOn] = useState(sound);
  const [motion, setMotion] = useState(reduceMotion);
  const [deviceTz, setDeviceTz] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDeviceTz(Intl.DateTimeFormat().resolvedOptions().timeZone), 0);
    return () => window.clearTimeout(id);
  }, []);

  const save = (patch: Parameters<typeof updateSettings>[0]) =>
    start(async () => {
      await updateSettings(patch);
      router.refresh();
    });

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-bold text-ink">Daily goal</p>
        <div role="radiogroup" aria-label="Daily goal" className="mt-2 grid grid-cols-4 gap-2">
          {GAME.dailyGoalOptions.map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={goal === g}
              onClick={() => {
                setGoal(g);
                save({ dailyGoalXp: g });
              }}
              className={cn(
                "pressable rounded-2xl border-2 px-2 py-2.5 text-center [--depth:3px]",
                goal === g ? "border-brand bg-brand-soft text-brand [--edge:var(--brand)]" : "border-line bg-surface text-ink-soft [--edge:var(--line)]",
              )}
            >
              <span className="block font-display font-semibold">{GOAL_LABELS[g]}</span>
              <span className="block text-xs font-bold opacity-80">{g} XP</span>
            </button>
          ))}
        </div>
      </div>

      <Row label="Sound effects" hint="Chimes for right and wrong answers.">
        <Switch
          label="Sound effects"
          checked={soundOn}
          onChange={(v) => {
            setSoundOn(v);
            setSoundEnabled(v);
            save({ sound: v });
          }}
        />
      </Row>
      <Row label="Reduce motion" hint="Fewer animations and no confetti.">
        <Switch
          label="Reduce motion"
          checked={motion}
          onChange={(v) => {
            setMotion(v);
            document.documentElement.dataset.reduceMotion = String(v);
            save({ reduceMotion: v });
          }}
        />
      </Row>
      <Row label="Time zone" hint={`Streaks and quests reset at midnight in ${timezone}.`}>
        {deviceTz && deviceTz !== timezone ? (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => save({ timezone: deviceTz })}>
            Use {deviceTz}
          </Button>
        ) : (
          <span className="text-sm font-bold text-muted">{timezone}</span>
        )}
      </Row>

      <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-line p-4">
        <div>
          <p className="font-bold text-ink">{isGuest ? "You're learning as a guest" : "Signed in"}</p>
          <p className="text-sm text-ink-soft">
            {isGuest ? "Create a profile to keep your progress safe." : email}
          </p>
        </div>
        {isGuest ? (
          <Link href="/signup" className={buttonClassName({ size: "sm" })}>
            Create profile
          </Link>
        ) : (
          <form action={logout}>
            <Button size="sm" variant="secondary" type="submit">
              Log out
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="font-bold text-ink">{label}</p>
        <p className="text-sm text-ink-soft">{hint}</p>
      </div>
      {children}
    </div>
  );
}

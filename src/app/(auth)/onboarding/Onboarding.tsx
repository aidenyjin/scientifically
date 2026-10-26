"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Character } from "@/characters/Character";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ChoiceOption } from "@/exercises/_shared/ChoiceOption";
import { GAME } from "@/game/config";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { startAsGuest } from "../actions";

type Pack = { id: string; title: string; subject: string; level: string };

const GOAL_LABELS: Record<number, string> = {
  10: "Casual",
  20: "Regular",
  30: "Serious",
  50: "Intense",
};
const GOAL_MINUTES: Record<number, string> = {
  10: "5 min / day",
  20: "10 min / day",
  30: "15 min / day",
  50: "20 min / day",
};

export function Onboarding({ packs }: { packs: Pack[] }) {
  const router = useRouter();
  const hasCourseStep = packs.length > 1;
  const [step, setStep] = useState(hasCourseStep ? 0 : 1);
  const [packId, setPackId] = useState<string | null>(packs[0]?.id ?? null);
  const [goal, setGoal] = useState<number>(20);
  const [pending, start] = useTransition();
  const goals = GAME.dailyGoalOptions;

  const finish = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("dailyGoal", String(goal));
      if (packId) fd.set("packId", packId);
      fd.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      await startAsGuest(fd);
    });

  const next = () => (step === 0 ? setStep(1) : finish());

  useHotkeys(
    {
      ...(step === 0
        ? digitKeys(packs.length, (i) => setPackId(packs[i].id))
        : digitKeys(goals.length, (i) => setGoal(goals[i]))),
      Enter: () => !pending && next(),
    },
    { enabled: !pending },
  );

  // Steps shown so far over (steps + 1), so the bar never looks finished before "Start learning".
  const progress = hasCourseStep ? (step + 1) / 3 : 1 / 2;
  const bubble =
    step === 0 ? "What would you like to learn?" : "How much time do you want to spend each day?";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1040px] items-center gap-5 px-8 pt-8">
        <button
          type="button"
          aria-label="Back"
          onClick={() => (step === 1 && hasCourseStep ? setStep(0) : router.push("/welcome"))}
          className="text-muted hover:bg-surface-2 grid size-10 place-items-center rounded-xl transition-colors duration-150"
        >
          <ArrowLeft className="size-6" strokeWidth={2.75} />
        </button>
        <ProgressBar value={progress} height={18} label="Setup progress" />
      </header>

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-8 px-8 py-10">
        <div key={step} className="animate-rise-in flex items-end gap-4">
          <Character id="lumi" expression={step === 0 ? "happy" : "thinking"} size={120} animate />
          <div className="border-line bg-surface shadow-card relative mb-6 rounded-3xl border-2 px-5 py-4">
            <span
              aria-hidden
              className="border-line bg-surface absolute bottom-4 -left-[9px] size-4 rotate-45 border-b-2 border-l-2"
            />
            <p className="font-display relative text-[22px] font-semibold">{bubble}</p>
          </div>
        </div>

        {step === 0 ? (
          <div role="radiogroup" aria-label="Course" className="grid gap-3 sm:grid-cols-2">
            {packs.map((p, i) => (
              <ChoiceOption
                key={p.id}
                shortcut={i + 1}
                state={packId === p.id ? "selected" : "idle"}
                onClick={() => setPackId(p.id)}
              >
                <span className="block">
                  <span className="font-display block text-lg leading-snug">{p.title}</span>
                  <span className="text-muted mt-0.5 block text-sm font-bold">
                    {p.subject} · {p.level}
                  </span>
                </span>
              </ChoiceOption>
            ))}
          </div>
        ) : (
          <div role="radiogroup" aria-label="Daily goal" className="grid gap-3">
            {goals.map((g, i) => (
              <ChoiceOption
                key={g}
                shortcut={i + 1}
                state={goal === g ? "selected" : "idle"}
                onClick={() => setGoal(g)}
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-lg">{GOAL_LABELS[g]}</span>
                  <span className="text-muted text-sm font-bold">
                    {GOAL_MINUTES[g]} · {g} XP
                  </span>
                </span>
              </ChoiceOption>
            ))}
          </div>
        )}
      </main>

      <footer className="border-line border-t-2">
        <div className="mx-auto flex min-h-[120px] w-full max-w-[1040px] items-center justify-end gap-3 px-8">
          <Kbd className="hidden lg:inline-flex">Enter</Kbd>
          <Button
            variant="success"
            size="lg"
            className="min-w-44"
            disabled={pending || (step === 0 && !packId)}
            onClick={next}
          >
            {pending ? "Setting up…" : step === 0 ? "Continue" : "Start learning"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

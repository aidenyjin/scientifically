"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { play, SFX, type Sfx } from "@/sound/sfx";
import { useSoundSetting } from "@/sound/useSoundSetting";
import { CAST } from "./cast";
import { Character } from "./Character";
import { COSMETICS, type CosmeticId } from "./cosmetics";
import { reactionFor, reactionPool } from "./reactions";
import { EXPRESSIONS, type CharacterId, type Expression, type ReactionEvent } from "./types";

const IDS = Object.keys(CAST) as CharacterId[];
const EVENTS: ReactionEvent[] = [
  "correct",
  "incorrect",
  "combo5",
  "combo10",
  "lessonComplete",
  "perfect",
  "failed",
  "streakExtended",
  "streakLost",
  "dailyGoal",
  "levelUp",
  "leaguePromoted",
  "idle",
];
const SIZES = [48, 96, 160];
const LOOKS: { label: string; outfit: CosmeticId[] }[] = [
  ...COSMETICS.map((c) => ({ label: c.name, outfit: [c.id as CosmeticId] })),
  { label: "Party", outfit: ["party-hat", "round-glasses", "bow-tie"] },
  { label: "Laureate", outfit: ["crown", "goggles", "bow-tie"] },
];

export type GallerySection = "play" | "grid" | "sizes" | "cosmetics" | "sounds";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border-2 border-line bg-surface p-6 shadow-card">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        {hint && <p className="text-sm font-semibold text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Pill({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick(): void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "pressable inline-flex h-9 items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold [--depth:3px]",
        active
          ? "border-brand bg-brand-soft text-brand [--edge:var(--brand)]"
          : "border-line bg-surface text-ink-soft [--edge:var(--line)] hover:bg-surface-2",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Playground({ animate }: { animate: boolean }) {
  const [id, setId] = useState<CharacterId>("lumi");
  const [expression, setExpression] = useState<Expression>("neutral");
  const [outfit, setOutfit] = useState<CosmeticId[]>([]);
  const [line, setLine] = useState<string | null>("Ready when you are, lab partner.");
  const [seed, setSeed] = useState(0);
  const [cycling, setCycling] = useState(false);

  useHotkeys(digitKeys(EXPRESSIONS.length, (i) => setExpression(EXPRESSIONS[i])));

  useEffect(() => {
    if (!cycling) return;
    const t = window.setInterval(() => {
      setExpression((e) => EXPRESSIONS[(EXPRESSIONS.indexOf(e) + 1) % EXPRESSIONS.length]);
    }, 1400);
    return () => window.clearInterval(t);
  }, [cycling]);

  const react = (event: ReactionEvent) => {
    const r = reactionFor(event, id, seed);
    setSeed((s) => s + 1);
    setExpression(r.expression);
    setLine(r.line ?? null);
    const sound: Partial<Record<ReactionEvent, Sfx>> = {
      correct: "correct",
      incorrect: "wrong",
      combo5: "combo",
      combo10: "combo",
      lessonComplete: "complete",
      perfect: "complete",
      failed: "fail",
      dailyGoal: "gem",
      levelUp: "levelUp",
      leaguePromoted: "levelUp",
      streakExtended: "complete",
    };
    const s = sound[event];
    if (s) play(s);
  };

  const toggle = (c: CosmeticId) =>
    setOutfit((o) => {
      const slot = COSMETICS.find((x) => x.id === c)?.slot;
      if (o.includes(c)) return o.filter((x) => x !== c);
      return [...o.filter((x) => COSMETICS.find((y) => y.id === x)?.slot !== slot), c];
    });

  return (
    <Section title="Playground" hint="Press 1–7 to switch expression">
      <div className="grid grid-cols-[minmax(0,420px)_1fr] gap-8">
        <div className="flex flex-col items-center justify-end gap-4 rounded-2xl bg-bg px-6 pt-8 pb-6">
          <div className="relative min-h-[64px] w-full">
            {line && (
              <div
                key={line}
                className="mx-auto w-fit max-w-full animate-pop-in rounded-2xl border-2 border-line bg-surface px-4 py-2.5 text-center font-display text-lg font-semibold text-ink shadow-card"
              >
                {line}
              </div>
            )}
          </div>
          <Character id={id} expression={expression} size={200} animate={animate} outfit={outfit} />
          <p className="font-display text-sm font-semibold tracking-wide text-muted uppercase">
            {CAST[id].name} · {expression}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Character</h3>
            <div className="flex flex-wrap gap-2">
              {IDS.map((c) => (
                <Pill key={c} active={c === id} onClick={() => setId(c)}>
                  <Character id={c} size={24} /> {CAST[c].name}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Expression</h3>
            <div className="flex flex-wrap gap-2">
              {EXPRESSIONS.map((e, i) => (
                <Pill key={e} active={e === expression} onClick={() => setExpression(e)}>
                  <Kbd className="h-5 min-w-5 text-[11px]">{i + 1}</Kbd> {e}
                </Pill>
              ))}
              <Pill active={cycling} onClick={() => setCycling((v) => !v)}>
                {cycling ? "Stop cycling" : "Cycle all"}
              </Pill>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Outfit</h3>
            <div className="flex flex-wrap gap-2">
              {COSMETICS.map((c) => (
                <Pill key={c.id} active={outfit.includes(c.id)} onClick={() => toggle(c.id)}>
                  {c.name}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">React to an event</h3>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((e) => (
                <Pill key={e} onClick={() => react(e)}>
                  {e}
                </Pill>
              ))}
            </div>
          </div>
          <details className="rounded-2xl border-2 border-line px-4 py-3 text-sm">
            <summary className="cursor-pointer font-bold text-ink-soft">All of {CAST[id].name}&apos;s lines</summary>
            <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
              {EVENTS.map((e) => (
                <div key={e} className="contents">
                  <dt className="font-bold text-muted">{e}</dt>
                  <dd className="text-ink-soft">
                    {reactionPool(e, id)
                      .map((r) => `${r.line} (${r.expression})`)
                      .join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>
    </Section>
  );
}

function Grid({ animate }: { animate: boolean }) {
  return (
    <Section title="Every character × every expression" hint={animate ? "Animated" : "Static"}>
      <div className="grid grid-cols-[88px_repeat(7,minmax(0,1fr))] items-center gap-y-3">
        <span />
        {EXPRESSIONS.map((e) => (
          <span key={e} className="text-center text-xs font-bold tracking-wider text-muted uppercase">
            {e}
          </span>
        ))}
        {IDS.map((id) => (
          <div key={id} className="contents">
            <span className="font-display text-base font-semibold text-ink">{CAST[id].name}</span>
            {EXPRESSIONS.map((e) => (
              <div key={e} className="flex justify-center">
                <Character id={id} expression={e} size={112} animate={animate} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Sizes({ animate }: { animate: boolean }) {
  return (
    <Section title="Sizes" hint="48 · 96 · 160 px">
      <div className="grid grid-cols-3 gap-6">
        {IDS.map((id) => (
          <div key={id} className="flex items-end justify-center gap-4 rounded-2xl bg-bg px-4 py-5">
            {SIZES.map((s) => (
              <Character key={s} id={id} size={s} expression="happy" animate={animate} />
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Cosmetics({ animate }: { animate: boolean }) {
  return (
    <Section title="Cosmetics" hint="Positioned per character from anchor points">
      <div className="grid grid-cols-[88px_repeat(8,minmax(0,1fr))] items-center gap-y-3">
        <span />
        {LOOKS.map((l) => (
          <span key={l.label} className="text-center text-xs font-bold tracking-wider text-muted uppercase">
            {l.label}
          </span>
        ))}
        {IDS.map((id) => (
          <div key={id} className="contents">
            <span className="font-display text-base font-semibold text-ink">{CAST[id].name}</span>
            {LOOKS.map((l) => (
              <div key={l.label} className="flex justify-center">
                <Character id={id} size={100} outfit={l.outfit} animate={animate} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Sounds() {
  const [on, setOn] = useSoundSetting();
  return (
    <Section title="Sounds" hint="Synthesised with Web Audio">
      <div className="flex flex-wrap items-center gap-3">
        {SFX.map((s) => (
          <Button key={s} variant="secondary" size="sm" onClick={() => play(s)} className="normal-case">
            {s}
          </Button>
        ))}
        <span className="mx-2 h-8 w-0.5 bg-line" aria-hidden />
        <Button variant={on ? "primary" : "secondary"} size="sm" onClick={() => setOn(!on)} aria-pressed={on}>
          {on ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Sound {on ? "on" : "off"}
        </Button>
      </div>
    </Section>
  );
}

export function CharacterGallery({ animate = true, only }: { animate?: boolean; only?: GallerySection }) {
  const show = (s: GallerySection) => !only || only === s;
  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-8 py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">The cast</h1>
        <p className="mt-1 text-ink-soft">
          Six characters drawn in SVG, seven expressions each. Dev only.
        </p>
      </header>
      {show("play") && <Playground animate={animate} />}
      {show("sounds") && <Sounds />}
      {show("grid") && <Grid animate={animate} />}
      {show("sizes") && <Sizes animate={animate} />}
      {show("cosmetics") && <Cosmetics animate={animate} />}
    </main>
  );
}

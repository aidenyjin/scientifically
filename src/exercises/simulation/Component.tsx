"use client";

import { useEffect, useId, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { getSimModel, resolveParams } from "@/sims/models";
import type { SimModel, SimParam } from "@/sims/types";
import { SimScene } from "@/sims/visuals";
import { formatNumber } from "../_shared/numbers";
import { withUnit } from "./format";
import { chosenParams } from "./grade";
import { GoalReadout } from "./GoalReadout";
import type { Simulation, SimulationResponse } from "./schema";
import { SimSlider, type SliderTone } from "./SimSlider";

type Props = ExerciseProps<Simulation, SimulationResponse>;

export function SimulationView(props: Props) {
  const model = getSimModel(props.exercise.modelId);
  if (!model) {
    return <p className="font-semibold text-wrong-ink">Unknown simulation “{props.exercise.modelId}”.</p>;
  }
  return <SimulationStage {...props} model={model} />;
}

function SimulationStage({ exercise, status, onChange, model }: Props & { model: SimModel }) {
  const locked = status !== "answering";
  const sliders = exercise.adjustable
    .map((name) => model.params.find((p) => p.name === name))
    .filter((p): p is SimParam => p !== undefined);
  const [chosen, setChosen] = useState(() => chosenParams(model, exercise, {}));
  const idBase = useId();
  const sliderId = (i: number) => `${idBase}-slider-${i}`;

  // Focus the first slider so arrow keys work straight away (without scrolling the page).
  useEffect(() => {
    document.getElementById(sliderId(0))?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // The response is always valid: report the starting sliders too.
  useEffect(() => {
    onChange({ params: chosen });
  }, [chosen, onChange]);

  const focusSlider = (digit: number) => {
    const el = digit >= 1 && digit <= sliders.length ? document.getElementById(sliderId(digit - 1)) : null;
    if (!el) return false;
    el.focus();
    return true;
  };
  useHotkeys(
    digitKeys(sliders.length, (i) => focusSlider(i + 1)),
    { enabled: !locked },
  );

  const params = resolveParams(model, exercise.fixed, chosen);
  const outputs = model.run(params);
  const conditions = model.params.filter((p) => !exercise.adjustable.includes(p.name));
  const tone: SliderTone = status === "correct" ? "correct" : status === "incorrect" ? "wrong" : "brand";

  return (
    <div className="grid gap-4">
      <section className="relative overflow-hidden rounded-3xl border-2 border-line bg-surface shadow-card" aria-label={model.title}>
        {conditions.length > 0 && (
          <div className="absolute top-3 left-4 z-10">
            <ul className="flex flex-wrap gap-1.5" aria-label="Conditions">
              {conditions.map((p) => (
                <li key={p.name} className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-bold text-ink-soft">
                  {p.label} <RichText text={withUnit(formatNumber(params[p.name]), p.unit)} className="text-ink" />
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* The scene shrinks on short screens so the sliders stay above the Check footer at 1280×800. */}
        <div className="px-3 pt-2 [--sim-chrome:604px] [@media(min-height:841px)]:[--sim-chrome:680px] [&>svg]:mx-auto [&>svg]:max-h-[clamp(168px,calc(100dvh-var(--sim-chrome)),236px)]">
          <SimScene modelId={model.id} params={params} outputs={outputs} goal={exercise.goal} />
        </div>
        <GoalReadout model={model} goal={exercise.goal} outputs={outputs} status={status} />
      </section>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sliders.length}, minmax(0, 1fr))` }}>
        {sliders.map((p, i) => (
          <SimSlider
            key={p.name}
            param={p}
            value={chosen[p.name]}
            shortcut={i + 1}
            tone={tone}
            disabled={locked}
            id={sliderId(i)}
            onValue={(v) => setChosen((c) => ({ ...c, [p.name]: v }))}
            onDigit={focusSlider}
          />
        ))}
      </div>
    </div>
  );
}

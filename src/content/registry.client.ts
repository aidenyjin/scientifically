"use client";

import type { ComponentType } from "react";
import { CategorizeView } from "@/exercises/categorize/Component";
import { DialogueView } from "@/exercises/dialogue/Component";
import { EquationBalanceView } from "@/exercises/equation_balance/Component";
import { FillBlankView } from "@/exercises/fill_blank/Component";
import { GraphPlotView } from "@/exercises/graph_plot/Component";
import { GraphReadView } from "@/exercises/graph_read/Component";
import { InfoCardView } from "@/exercises/info_card/Component";
import { MatchPairsView } from "@/exercises/match_pairs/Component";
import { MultiSelectView } from "@/exercises/multi_select/Component";
import { MultipleChoiceView } from "@/exercises/multiple_choice/Component";
import { NumericView } from "@/exercises/numeric/Component";
import { OrderingView } from "@/exercises/ordering/Component";
import { SimulationView } from "@/exercises/simulation/Component";
import { SpotErrorView } from "@/exercises/spot_error/Component";
import { TrueFalseView } from "@/exercises/true_false/Component";
import { WordBankView } from "@/exercises/word_bank/Component";
import type { ExerciseProps } from "./types";
import type { Exercise, ExerciseType } from "./registry";

type LooseView = ComponentType<ExerciseProps<Exercise, unknown>>;

const views: Record<ExerciseType, unknown> = {
  info_card: InfoCardView,
  multiple_choice: MultipleChoiceView,
  true_false: TrueFalseView,
  multi_select: MultiSelectView,
  fill_blank: FillBlankView,
  word_bank: WordBankView,
  match_pairs: MatchPairsView,
  ordering: OrderingView,
  categorize: CategorizeView,
  spot_error: SpotErrorView,
  numeric: NumericView,
  equation_balance: EquationBalanceView,
  graph_read: GraphReadView,
  graph_plot: GraphPlotView,
  simulation: SimulationView,
  dialogue: DialogueView,
};

export function getView(type: ExerciseType): LooseView {
  return views[type] as LooseView;
}

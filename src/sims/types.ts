export interface SimParam {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface SimOutput {
  name: string;
  label: string;
  unit: string;
}

/** A pure simulation model. Its visual lives in src/sims/visuals (React). */
export interface SimModel {
  id: string;
  title: string;
  /** One line for the AI prompt: what it models and what is worth asking. */
  description: string;
  params: SimParam[];
  outputs: SimOutput[];
  run(params: Record<string, number>): Record<string, number>;
}

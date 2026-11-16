export type DistributionId = "normal" | "binomial" | "poisson" | "exponential";

/** Current slider values for one distribution, keyed by slider key. */
export type Values = Record<string, number>;

/** A slider bound: either a fixed number or computed from the current values. */
export type Bound = number | ((values: Values) => number);

export interface SliderDef {
  key: string;
  label: string;
  hint: string;
  min: Bound;
  max: Bound;
  step: number;
}

/** A small piece of typeset maths: plain text or a superscript. */
export type ExprPart = string | { sup: string };
export type Expr = ExprPart[];

export interface TableRow {
  label: string;
  value: Expr;
  highlight?: boolean;
}

export interface CurvePlotSpec {
  kind: "curve";
  xMin: number;
  xMax: number;
  /** Density function sampled by the visualizer at pixel resolution. */
  density: (x: number) => number;
  /** Highest value of the density over the range (used for y autoscale). */
  yPeak: number;
  shade?: { from: number; to: number };
  mean: number;
  xLabel: string;
  yLabel: string;
}

export interface BarPlotSpec {
  kind: "bars";
  bars: { x: number; y: number }[];
  highlight: number;
  mean: number;
  xLabel: string;
  yLabel: string;
}

export type PlotSpec = CurvePlotSpec | BarPlotSpec;

export interface BuildResult {
  plot: PlotSpec;
  rows: TableRow[];
  ariaLabel: string;
}

export interface DistributionConfig {
  id: DistributionId;
  name: string;
  description: string;
  defaults: Values;
  sliders: SliderDef[];
  /** Applies the distribution's rules (a ≤ b, k ≤ n, …) after `changedKey` was edited. */
  normalize: (next: Values, changedKey: string) => Values;
  build: (values: Values) => BuildResult;
}

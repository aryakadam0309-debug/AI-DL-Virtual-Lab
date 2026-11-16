export interface PlotPoint {
  p: number;
  prior: number;
  likelihood: number | null;
  posterior: number;
}

export interface PlotSpec {
  points: PlotPoint[];
  mean: number;
  lower: number;
  upper: number;
  yMax: number;
}

export interface PosteriorSummary {
  alpha: number;
  beta: number;
  heads: number;
  tails: number;
  n: number;
  posteriorAlpha: number;
  posteriorBeta: number;
  totalStrength: number;
  mean: number;
  priorShare: number;
  lower: number;
  upper: number;
}
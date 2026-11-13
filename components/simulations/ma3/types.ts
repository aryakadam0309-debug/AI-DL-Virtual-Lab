export type Status =
  | "converged-global"
  | "converged-local"
  | "stalled-peak"
  | "diverged"
  | "oscillating"
  | "max-iter";

export interface GDStep {
  k: number;
  x: number;
  fx: number;
  dfx: number;
  d2fx: number;
  v: number;
  nextX: number | null;
}

export interface CriticalPoint {
  name: string;
  x: number;
  fx: number;
  d2fx: number;
  type: "global-min" | "local-max" | "local-min";
  stabilityLimit: number; // 2 / f''(x)
}

export const CRITICAL_POINTS: CriticalPoint[] = [
  {
    name: "Global Minimum",
    x: -1.484,
    fx: -1.435,
    d2fx: 4.61,
    type: "global-min",
    stabilityLimit: 0.434, // 2 / 4.61
  },
  {
    name: "Local Maximum (Ridge)",
    x: 0.152,
    fx: 0.023,
    d2fx: -1.93,
    type: "local-max",
    stabilityLimit: Infinity,
  },
  {
    name: "Local Minimum (Trap)",
    x: 1.332,
    fx: -0.588,
    d2fx: 3.32,
    type: "local-min",
    stabilityLimit: 0.602, // 2 / 3.32
  },
];

export interface Preset {
  id: string;
  label: string;
  x0: number;
  lr: number;
  momentum: number;
  maxIter: number;
  hint: string;
}

export const PRESETS: Preset[] = [
  {
    id: "worked_local_trap",
    label: "x₀ = 1.0, η = 0.1, β = 0  (Worked Example: Local Min Trap)",
    x0: 1.0,
    lr: 0.1,
    momentum: 0.0,
    maxIter: 35,
    hint: "From PDF Page 9: Start at x₀ = 1.0 with η = 0.1. Gradient is negative, so it moves right and falls into the local minimum trap at x ≈ 1.332 instead of finding the global minimum.",
  },
  {
    id: "worked_global_escape",
    label: "x₀ = −0.5, η = 0.1, β = 0  (Worked Example: Global Minimum)",
    x0: -0.5,
    lr: 0.1,
    momentum: 0.0,
    maxIter: 35,
    hint: "From PDF Page 9: Starting at x₀ = −0.5 puts the iterate to the left of the hill (x ≈ 0.152), rolling smoothly down into the true global minimum at x ≈ −1.484.",
  },
  {
    id: "momentum_escape",
    label: "x₀ = 1.0, η = 0.08, β = 0.85  (Momentum Escapes the Trap!)",
    x0: 1.0,
    lr: 0.08,
    momentum: 0.85,
    maxIter: 60,
    hint: "High momentum β = 0.85 builds accumulated velocity. It rolls into the right valley, climbs up and over the hill at x ≈ 0.152, and reaches the deeper global minimum!",
  },
  {
    id: "high_lr_divergence",
    label: "x₀ = 1.0, η = 0.72, β = 0  (Unstable: Exceeds 2/L Limit)",
    x0: 1.0,
    lr: 0.72,
    momentum: 0.0,
    maxIter: 25,
    hint: "Near the local min, curvature L ≈ 3.32, so stability requires η < 2/L ≈ 0.60. With η = 0.72, the updates overshoot violently and diverge to infinity.",
  },
  {
    id: "critical_start_peak",
    label: "x₀ = 0.152, η = 0.1, β = 0  (Unstable Peak: f′(x) ≈ 0)",
    x0: 0.152,
    lr: 0.1,
    momentum: 0.0,
    maxIter: 30,
    hint: "Starts at the local maximum. Because f′(0.152) ≈ 0, gradient descent takes almost zero step initially, highlighting that f′=0 does NOT guarantee a minimum!",
  },
  {
    id: "small_lr_slow",
    label: "x₀ = 1.0, η = 0.015, β = 0  (Small Learning Rate: Crawling)",
    x0: 1.0,
    lr: 0.015,
    momentum: 0.0,
    maxIter: 80,
    hint: "A tiny learning rate takes minuscule safe steps, requiring hundreds of iterations to reach the bottom of the basin.",
  },
];


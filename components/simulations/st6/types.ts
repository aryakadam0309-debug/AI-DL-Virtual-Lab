export interface SubgroupData {
  subgroupId: number; // 1 .. k
  values: number[];
  mean: number;
  range: number;
  min: number;
  max: number;
  isShifted: boolean;
  outOfControlXbar: boolean;
  outOfControlR: boolean;
}

export interface ControlLimits {
  center: number;
  ucl: number;
  lcl: number;
  se: number;
  sigma1Upper?: number;
  sigma1Lower?: number;
  sigma2Upper?: number;
  sigma2Lower?: number;
}

export interface SQCFactors {
  n: number;
  d2: number;
  D3: number;
  D4: number;
  A2: number;
}

// Standard ASTM / Montgomery SPC factors table for n = 2 .. 10
export const SPC_FACTORS: Record<number, SQCFactors> = {
  2: { n: 2, d2: 1.128, D3: 0.0, D4: 3.267, A2: 1.88 },
  3: { n: 3, d2: 1.693, D3: 0.0, D4: 2.574, A2: 1.023 },
  4: { n: 4, d2: 2.059, D3: 0.0, D4: 2.282, A2: 0.729 },
  5: { n: 5, d2: 2.326, D3: 0.0, D4: 2.114, A2: 0.577 }, // Syllabus standard
  6: { n: 6, d2: 2.534, D3: 0.0, D4: 2.004, A2: 0.483 },
  7: { n: 7, d2: 2.704, D3: 0.076, D4: 1.924, A2: 0.419 },
  8: { n: 8, d2: 2.847, D3: 0.136, D4: 1.864, A2: 0.373 },
  9: { n: 9, d2: 2.97, D3: 0.184, D4: 1.816, A2: 0.337 },
  10: { n: 10, d2: 3.078, D3: 0.223, D4: 1.777, A2: 0.308 },
};

export interface SQCPreset {
  id: string;
  name: string;
  description: string;
  mu0: number;
  sigma0: number;
  subgroupSize: number;
  totalSubgroups: number;
  shiftDelta: number; // in sigma units
  shiftStart: number; // subgroup index where shift starts
}

export const SQC_PRESETS: SQCPreset[] = [
  {
    id: "worked_example",
    name: "Worked Example from Theory Notes (μ₀ = 50, σ = 2, n = 5, δ = 1.0)",
    description: "From Theory: Standard error = 2/√5 = 0.8944, limits = [47.32, 52.68]. At subgroup 12, mean shifts by 1σ. Theoretical ARL₁ ≈ 4.5 subgroups.",
    mu0: 50,
    sigma0: 2,
    subgroupSize: 5,
    totalSubgroups: 28,
    shiftDelta: 1.0,
    shiftStart: 12,
  },
  {
    id: "in_control_baseline",
    name: "In-Control Baseline (δ = 0, Pure Common Cause)",
    description: "Process operates in stable statistical control with only common-cause variation. False alarms are rare (ARL₀ ≈ 370).",
    mu0: 50,
    sigma0: 2,
    subgroupSize: 5,
    totalSubgroups: 25,
    shiftDelta: 0.0,
    shiftStart: 25,
  },
  {
    id: "small_shift_challenge",
    name: "Small Shift Challenge (δ = 0.5σ, Slow Detection)",
    description: "Subtle 0.5σ shift introduced at subgroup 10. The 3σ Shewhart chart requires on average ARL₁ ≈ 15.5 subgroups to signal.",
    mu0: 50,
    sigma0: 2,
    subgroupSize: 5,
    totalSubgroups: 35,
    shiftDelta: 0.5,
    shiftStart: 10,
  },
  {
    id: "large_severe_shift",
    name: "Severe Sudden Shift (δ = 2.0σ, Immediate Alarm)",
    description: "Major tool breakage or raw material change causes a 2.0σ jump at subgroup 8. Almost immediately triggers alarm (ARL₁ ≈ 1.2).",
    mu0: 50,
    sigma0: 2,
    subgroupSize: 5,
    totalSubgroups: 25,
    shiftDelta: 2.0,
    shiftStart: 8,
  },
  {
    id: "large_subgroup_size",
    name: "Increased Subgroup Size (n = 9, Faster Detection)",
    description: "By increasing subgroup size to n = 9, the standard error drops to 2/√9 = 0.667, making the chart much more sensitive to moderate shifts.",
    mu0: 50,
    sigma0: 2,
    subgroupSize: 9,
    totalSubgroups: 28,
    shiftDelta: 0.8,
    shiftStart: 12,
  },
];


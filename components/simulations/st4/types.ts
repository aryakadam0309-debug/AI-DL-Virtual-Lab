export type ResampleMode = "bootstrap" | "permutation";

export type StatisticId = "diff-means" | "diff-medians" | "trimmed-diff" | "ratio-means";

export interface StatisticDefinition {
  id: StatisticId;
  name: string;
  shortName: string;
  formula: string;
  compute: (groupA: number[], groupB: number[]) => number;
}

export interface DatasetPreset {
  id: string;
  name: string;
  description: string;
  groupAName: string;
  groupBName: string;
  groupA: number[];
  groupB: number[];
}

export interface BootstrapResult {
  resampleValues: number[];
  observed: number;
  bootstrapSE: number;
  ciLower: number; // 2.5th percentile
  ciUpper: number; // 97.5th percentile
  ciCoverage: number; // 95%
}

export interface PermutationResult {
  nullValues: number[];
  observed: number;
  extremeCount: number; // count where |T| >= |T_obs|
  totalShuffles: number;
  pValue: number; // (extremeCount + 1) / (totalShuffles + 1)
  exactAvailable: boolean;
  exactPValue?: number;
}

export const STATISTIC_DEFINITIONS: Record<StatisticId, StatisticDefinition> = {
  "diff-means": {
    id: "diff-means",
    name: "Difference in Means (X̄_B − X̄_A)",
    shortName: "Δ Mean",
    formula: "mean(B) − mean(A)",
    compute: (a, b) => {
      const meanA = a.reduce((s, x) => s + x, 0) / (a.length || 1);
      const meanB = b.reduce((s, x) => s + x, 0) / (b.length || 1);
      return meanB - meanA;
    },
  },
  "diff-medians": {
    id: "diff-medians",
    name: "Difference in Medians (Median_B − Median_A)",
    shortName: "Δ Median",
    formula: "median(B) − median(A)",
    compute: (a, b) => {
      const med = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((x, y) => x - y);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };
      return med(b) - med(a);
    },
  },
  "trimmed-diff": {
    id: "trimmed-diff",
    name: "Trimmed Mean Difference (20% Trimmed)",
    shortName: "Trimmed Δ",
    formula: "trimmedMean(B, 0.2) − trimmedMean(A, 0.2)",
    compute: (a, b) => {
      const trimMean = (arr: number[], trim = 0.2) => {
        if (arr.length < 3) return arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
        const sorted = [...arr].sort((x, y) => x - y);
        const k = Math.floor(arr.length * trim);
        const sliced = sorted.slice(k, arr.length - k);
        return sliced.reduce((s, x) => s + x, 0) / sliced.length;
      };
      return trimMean(b) - trimMean(a);
    },
  },
  "ratio-means": {
    id: "ratio-means",
    name: "Ratio of Means (X̄_B / X̄_A)",
    shortName: "Ratio",
    formula: "mean(B) / mean(A)",
    compute: (a, b) => {
      const meanA = a.reduce((s, x) => s + x, 0) / (a.length || 1);
      const meanB = b.reduce((s, x) => s + x, 0) / (b.length || 1);
      return Math.abs(meanA) > 1e-9 ? meanB / meanA : 1.0;
    },
  },
};

export const DATASET_PRESETS: DatasetPreset[] = [
  {
    id: "worked_example",
    name: "Worked Example from Theory Notes (n₁ = 5, n₂ = 5)",
    description: "Group A = [12, 15, 14, 10, 13] (mean 12.8) and Group B = [16, 18, 15, 17, 19] (mean 17.0). Observed Δ = 4.2. Exact p = 4/252 = 0.016.",
    groupAName: "Group A (Control)",
    groupBName: "Group B (Treatment)",
    groupA: [12, 15, 14, 10, 13],
    groupB: [16, 18, 15, 17, 19],
  },
  {
    id: "clinical_recovery",
    name: "Clinical Drug Trial: Recovery Days (n₁ = 8, n₂ = 8)",
    description: "Comparing recovery speed under standard care vs new therapy. Moderate variance with slight positive skew.",
    groupAName: "Placebo / Standard",
    groupBName: "New Compound",
    groupA: [14.2, 18.5, 12.0, 16.4, 21.0, 13.5, 17.8, 15.1],
    groupB: [9.8, 11.5, 14.0, 8.5, 10.2, 12.4, 11.0, 9.1],
  },
  {
    id: "web_conversion",
    name: "Website A/B Checkout Latency (Skewed Seconds)",
    description: "Server response latency with heavy right-tail outliers. Ideal for testing difference in Medians or Trimmed Means.",
    groupAName: "Layout A (Legacy)",
    groupBName: "Layout B (Optimized)",
    groupA: [1.8, 2.1, 2.4, 1.9, 8.5, 2.0, 2.3, 1.7, 2.2, 6.2],
    groupB: [1.2, 1.5, 1.3, 1.4, 1.6, 1.1, 1.7, 1.3, 1.5, 1.2],
  },
];


import {
  type BootstrapResult,
  type PermutationResult,
  type StatisticDefinition,
} from "./types";

export function resampleWithReplacement(arr: number[]): number[] {
  const n = arr.length;
  const res = new Array(n);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * n);
    res[i] = arr[idx];
  }
  return res;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = a[i];
    a[i] = a[j];
    a[j] = temp;
  }
  return a;
}

export function runBootstrap(
  groupA: number[],
  groupB: number[],
  statDef: StatisticDefinition,
  B: number
): BootstrapResult {
  const observed = statDef.compute(groupA, groupB);
  const values = new Float64Array(B);

  for (let b = 0; b < B; b++) {
    const bootA = resampleWithReplacement(groupA);
    const bootB = resampleWithReplacement(groupB);
    values[b] = statDef.compute(bootA, bootB);
  }

  const sorted = Array.from(values).sort((x, y) => x - y);

  // Mean & SE
  let sum = 0;
  for (let i = 0; i < B; i++) sum += sorted[i];
  const bootMean = sum / B;

  let sumSq = 0;
  for (let i = 0; i < B; i++) {
    const d = sorted[i] - bootMean;
    sumSq += d * d;
  }
  const bootstrapSE = Math.sqrt(sumSq / (B - 1 || 1));

  // 95% Percentile Confidence Interval: [2.5th, 97.5th]
  const idxLower = Math.max(0, Math.floor(0.025 * B));
  const idxUpper = Math.min(B - 1, Math.floor(0.975 * B));

  return {
    resampleValues: sorted,
    observed,
    bootstrapSE,
    ciLower: sorted[idxLower],
    ciUpper: sorted[idxUpper],
    ciCoverage: 0.95,
  };
}

// Compute combinations count C(n, k)
export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  for (let i = 1; i <= k; i++) {
    c = (c * (n - (k - i))) / i;
  }
  return Math.round(c);
}

// Generates all exact combinations of indices of length k from total n
function* chooseIndices(n: number, k: number): Generator<number[]> {
  const indices: number[] = [];
  function* helper(start: number, depth: number): Generator<number[]> {
    if (depth === k) {
      yield [...indices];
      return;
    }
    for (let i = start; i <= n - (k - depth); i++) {
      indices.push(i);
      yield* helper(i + 1, depth + 1);
      indices.pop();
    }
  }
  yield* helper(0, 0);
}

export function runPermutationTest(
  groupA: number[],
  groupB: number[],
  statDef: StatisticDefinition,
  M: number
): PermutationResult {
  const observed = statDef.compute(groupA, groupB);
  const absObserved = Math.abs(observed);

  const nA = groupA.length;
  const nB = groupB.length;
  const pooled = [...groupA, ...groupB];
  const totalN = nA + nB;

  const totalCombs = combinations(totalN, nA);

  // If small enough (<= 5000), compute EXACT permutation distribution!
  if (totalCombs <= 5000) {
    const nullValues: number[] = [];
    let extremeCount = 0;

    for (const aIndices of chooseIndices(totalN, nA)) {
      const setA = new Set(aIndices);
      const permA: number[] = [];
      const permB: number[] = [];
      for (let i = 0; i < totalN; i++) {
        if (setA.has(i)) permA.push(pooled[i]);
        else permB.push(pooled[i]);
      }
      const t = statDef.compute(permA, permB);
      nullValues.push(t);
      if (Math.abs(t) >= absObserved - 1e-9) {
        extremeCount++;
      }
    }

    return {
      nullValues: nullValues.sort((x, y) => x - y),
      observed,
      extremeCount,
      totalShuffles: totalCombs,
      pValue: extremeCount / totalCombs,
      exactAvailable: true,
      exactPValue: extremeCount / totalCombs,
    };
  }

  // Monte Carlo random shuffles
  const nullValues = new Float64Array(M);
  let extremeCount = 0;

  for (let m = 0; m < M; m++) {
    const shuffled = shuffleArray(pooled);
    const permA = shuffled.slice(0, nA);
    const permB = shuffled.slice(nA);
    const t = statDef.compute(permA, permB);
    nullValues[m] = t;
    if (Math.abs(t) >= absObserved - 1e-9) {
      extremeCount++;
    }
  }

  // Phipson and Smyth (2010): p = (extremeCount + 1) / (M + 1)
  const pValue = (extremeCount + 1) / (M + 1);

  return {
    nullValues: Array.from(nullValues).sort((x, y) => x - y),
    observed,
    extremeCount,
    totalShuffles: M,
    pValue,
    exactAvailable: false,
  };
}

export interface HistBin {
  x0: number;
  x1: number;
  count: number;
  density: number;
}

export function buildHistogram(data: number[], numBins = 32, xMin?: number, xMax?: number): { bins: HistBin[]; maxCount: number } {
  if (data.length === 0) return { bins: [], maxCount: 0 };
  const minVal = xMin !== undefined ? xMin : Math.min(...data);
  const maxVal = xMax !== undefined ? xMax : Math.max(...data);
  const range = Math.max(1e-6, maxVal - minVal);
  const binWidth = range / numBins;

  const bins: HistBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const x0 = minVal + i * binWidth;
    const x1 = x0 + binWidth;
    bins.push({ x0, x1, count: 0, density: 0 });
  }

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    let idx = Math.floor((v - minVal) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= numBins) idx = numBins - 1;
    bins[idx].count++;
  }

  let maxCount = 0;
  for (let i = 0; i < numBins; i++) {
    if (bins[i].count > maxCount) maxCount = bins[i].count;
  }

  return { bins, maxCount };
}

export function fmt(val: number, decimals = 3): string {
  if (!Number.isFinite(val)) return "—";
  return val.toFixed(decimals);
}


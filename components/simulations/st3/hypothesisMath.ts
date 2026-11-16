// Pure maths for "The café claim". No dependencies, no side effects
// (randomness is passed in as `rng` so results can be reproduced in tests).
import { Preference, TestResult, TownKind } from "./types";

export type Rng = () => number;

export const POPULATION_SIZE = 400;
export const CLAIMED_SHARE = 0.5;
export const STUDY_COUNT = 100;

/** Exact number of tea drinkers in each town of 400. */
export const TOWN_TEA_COUNT: Record<TownKind, number> = { wrong: 260, right: 200 };

/** Error function, Abramowitz and Stegun 7.1.26 approximation. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * ax);
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

/** Standard normal CDF Φ(x) = 0.5 × (1 + erf(x/√2)). */
export function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Two-sided p-value 2 × (1 − Φ(|z|)), clamped to [0, 1]. */
export function twoSidedPValue(z: number): number {
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return Math.min(1, Math.max(0, p));
}

/** One-proportion z-test of "the share is p₀". Doubt the claim when p < α. */
export function proportionZTest(tea: number, n: number, alpha: number, p0: number = CLAIMED_SHARE): TestResult {
  const pHat = tea / n;
  const se = Math.sqrt((p0 * (1 - p0)) / n);
  const z = (pHat - p0) / se;
  const pValue = twoSidedPValue(z);
  return { n, tea, pHat, p0, expected: Math.round(n * p0), se, z, pValue, alpha, doubt: pValue < alpha };
}

/** Full Fisher-Yates shuffle into a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/** A shuffled town of exactly 400 people with the town's fixed tea count. */
export function makeTown(kind: TownKind, rng: Rng): Preference[] {
  const tea = TOWN_TEA_COUNT[kind];
  const people: Preference[] = Array.from({ length: POPULATION_SIZE }, (_, i) => (i < tea ? "tea" : "coffee"));
  return shuffle(people, rng);
}

/** `count` distinct indices from 0..size-1: partial Fisher-Yates, without replacement. */
export function sampleIndices(size: number, count: number, rng: Rng): number[] {
  const k = Math.min(count, size);
  const pool = Array.from({ length: size }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (size - i));
    const tmp = pool[i] as number;
    pool[i] = pool[j] as number;
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

export function countTea(town: readonly Preference[], indices: readonly number[]): number {
  let tea = 0;
  for (const i of indices) if (town[i] === "tea") tea++;
  return tea;
}

/** Runs `count` separate studies on one town; true = that study doubted the claim. */
export function runStudies(kind: TownKind, n: number, alpha: number, rng: Rng, count: number = STUDY_COUNT): boolean[] {
  const town = makeTown(kind, rng);
  const out: boolean[] = [];
  for (let s = 0; s < count; s++) {
    const tea = countTea(town, sampleIndices(town.length, n, rng));
    out.push(proportionZTest(tea, n, alpha).doubt);
  }
  return out;
}

// ---------- surprise meter ----------

/** Meter fill = min(1, −log10(p) / 3). */
export function surpriseFill(p: number): number {
  if (p <= 0) return 1;
  return Math.min(1, Math.max(0, -Math.log10(p) / 3));
}

/** Where the strictness line sits on the meter: −log10(α) / 3. */
export function strictnessMark(alpha: number): number {
  return Math.min(1, -Math.log10(alpha) / 3);
}

export function surpriseWord(fill: number): string {
  if (fill < 0.15) return "Not surprising";
  if (fill < 0.35) return "A bit surprising";
  if (fill < 0.6) return "Quite surprising";
  return "Very surprising";
}

// ---------- formatting ----------

const MINUS = "\u2212";

export function formatFixed(x: number, decimals: number): string {
  const f = Math.pow(10, decimals);
  let r = Math.round(x * f) / f;
  if (Object.is(r, -0)) r = 0;
  const s = r.toFixed(decimals);
  return s.startsWith("-") ? MINUS + s.slice(1) : s;
}

/** A probability as a friendly percentage number, e.g. 0.0897 → "9", 0.0253 → "2.5", 0.0073 → "0.7". */
export function formatPercent(p: number): string {
  const pct = p * 100;
  if (pct >= 10) return String(Math.round(pct));
  if (pct >= 0.1) return String(Math.round(pct * 10) / 10);
  if (pct > 0) return "less than 0.1";
  return "0";
}

export type Preference = "tea" | "coffee";

/** The hidden truth: is the café's "half prefer tea" claim wrong or right? */
export type TownKind = "wrong" | "right";

export type StrictnessId = "easygoing" | "normal" | "strict";

export type SampleSize = 10 | 20 | 50 | 100;

/** The learner's gut call in step 3. */
export type Call = "doubt" | "keep";

export type StepNumber = 1 | 2 | 3 | 4 | 5;

export type Outcome = "falseAlarm" | "correctKeep" | "correctCatch" | "missedMistake";

export interface TestResult {
  n: number;
  tea: number;
  /** Sample share p̂ = tea / n. */
  pHat: number;
  /** Claimed share p₀. */
  p0: number;
  /** Tea drinkers expected in the sample if the claim is true. */
  expected: number;
  /** Standard error √(p₀(1−p₀)/n). */
  se: number;
  z: number;
  /** Two-sided p-value. */
  pValue: number;
  alpha: number;
  /** True when p < α, i.e. we doubt the claim. */
  doubt: boolean;
}

export interface HistoryEntry {
  id: number;
  tea: number;
  n: number;
}

/** Plain words with an optional technical term shown small beside them. */
export type RichPart = string | { tech: string };
export type Rich = RichPart[];

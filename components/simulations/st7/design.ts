export type FactorCount = 2 | 3 | 4;
export type EffectTerm = string; // e.g. A, AB, ABC
export interface FactorSpec { name: string; low: number; high: number }
export interface DesignConfig {
  factors: FactorSpec[];
  replicates: number;
  noiseSd: number;
  seed: number;
  intercept: number;
  effects: Record<EffectTerm, number>; // conventional factorial effects, not beta coefficients
}
export interface DesignRun {
  run: number;
  combination: string;
  levels: Record<string, -1 | 1>;
  replicate: number;
  response: number;
}
export interface EffectResult {
  term: string;
  effect: number;
  contrast: number;
  sumSquares: number;
  df: number;
  meanSquare: number;
  fStatistic: number | null;
  pValue: number | null;
}
export interface AnovaResult {
  rows: EffectResult[];
  errorSS: number;
  errorDf: number;
  errorMS: number | null;
  totalSS: number;
  totalDf: number;
  modelSS: number;
  modelDf: number;
  grandMean: number;
  canTest: boolean;
  message: string;
}

export function factorialTerms(names: string[]): string[] {
  const out: string[] = [];
  for (let mask = 1; mask < (1 << names.length); mask++) {
    let term = "";
    names.forEach((name, i) => { if (mask & (1 << i)) term += name; });
    out.push(term);
  }
  return out.sort((a, b) => a.length - b.length || a.localeCompare(b));
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normalGenerator(random: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const value = spare; spare = null; return value; }
    let u = 0, v = 0;
    while (u <= Number.EPSILON) u = random();
    v = random();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

export function generateFactorialDesign(config: DesignConfig): DesignRun[] {
  const k = config.factors.length;
  if (k < 2 || k > 4) throw new Error("A full factorial design requires 2 to 4 factors.");
  if (!Number.isInteger(config.replicates) || config.replicates < 1 || config.replicates > 30) throw new Error("Replicates must be an integer from 1 to 30.");
  if (!Number.isFinite(config.noiseSd) || config.noiseSd < 0) throw new Error("Noise standard deviation must be non-negative.");
  if (!Number.isFinite(config.intercept)) throw new Error("Baseline response must be finite.");
  const names = config.factors.map(f => f.name);
  if (new Set(names).size !== names.length || names.some(n => !/^[A-D]$/.test(n))) throw new Error("Factor names must be unique letters A to D.");
  for (const f of config.factors) {
    if (![f.low, f.high].every(Number.isFinite) || f.low >= f.high) throw new Error(`Factor ${f.name}: high level must be greater than low level.`);
  }
  const terms = factorialTerms(names);
  for (const [term, effect] of Object.entries(config.effects)) {
    if (!terms.includes(term)) throw new Error(`Unknown effect term: ${term}`);
    if (!Number.isFinite(effect)) throw new Error(`Effect ${term} must be finite.`);
  }

  const random = mulberry32(config.seed);
  const normal = normalGenerator(random);
  const runs: Omit<DesignRun, "run">[] = [];
  const combinations = 1 << k;
  for (let mask = 0; mask < combinations; mask++) {
    const coded: Record<string, -1 | 1> = {};
    const levels: Record<string, -1 | 1> = {};
    config.factors.forEach((factor, i) => {
      const sign = (mask & (1 << i)) ? 1 : -1;
      coded[factor.name] = sign;
      levels[factor.name] = sign;
    });
    // Conventional factorial effect = high-minus-low main effect (or half-difference for interactions).
    // Thus the corresponding coded-model coefficient is effect / 2.
    let meanResponse = config.intercept;
    for (const term of terms) {
      let product = 1;
      for (const name of term) product *= coded[name];
      meanResponse += ((config.effects[term] ?? 0) / 2) * product;
    }
    for (let replicate = 1; replicate <= config.replicates; replicate++) {
      runs.push({ combination: names.map(n => `${n}${coded[n] > 0 ? "+" : "−"}`).join(" "), levels, replicate,
        response: meanResponse + config.noiseSd * normal() });
    }
  }
  // Randomise run order while preserving the factor combination and replicate metadata.
  for (let i = runs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [runs[i], runs[j]] = [runs[j], runs[i]];
  }
  return runs.map((r, i) => ({ ...r, run: i + 1 }));
}

function logGamma(z: number): number {
  const p = [676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.9999999999998099;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaFraction(a: number, b: number, x: number): number {
  const maxIter = 200, eps = 3e-14, fpmin = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c; if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  if (x < (a + 1) / (a + b + 2)) return bt * betaFraction(a, b, x) / a;
  return 1 - bt * betaFraction(b, a, 1 - x) / b;
}

export function fSurvivalProbability(f: number, df1: number, df2: number): number {
  if (f < 0 || df1 <= 0 || df2 <= 0 || ![f, df1, df2].every(Number.isFinite)) return NaN;
  if (f === 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return Math.max(0, Math.min(1, regularizedBeta(x, df2 / 2, df1 / 2)));
}

export function analyzeFactorial(runs: DesignRun[], factorNames: string[], replicates: number): AnovaResult {
  const k = factorNames.length;
  const nComb = 1 << k;
  if (runs.length !== nComb * replicates) throw new Error("The dataset is not a balanced full-factorial design.");
  const byCell = new Map<string, number[]>();
  for (const run of runs) {
    const key = factorNames.map(n => run.levels[n] > 0 ? "+" : "-").join("");
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key)!.push(run.response);
  }
  if (byCell.size !== nComb || [...byCell.values()].some(v => v.length !== replicates)) throw new Error("Every treatment combination must have the same number of replicates.");
  const totalN = runs.length;
  const grandMean = runs.reduce((s, r) => s + r.response, 0) / totalN;
  const totalSS = runs.reduce((s, r) => s + (r.response - grandMean) ** 2, 0);
  let errorSS = 0;
  const cellMeans = new Map<string, number>();
  for (const [key, values] of byCell) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    cellMeans.set(key, mean);
    errorSS += values.reduce((s, v) => s + (v - mean) ** 2, 0);
  }
  const errorDf = nComb * (replicates - 1);
  const errorMS = errorDf > 0 ? errorSS / errorDf : null;
  const terms = factorialTerms(factorNames);
  const rows: EffectResult[] = terms.map(term => {
    let contrast = 0;
    for (const [key, mean] of cellMeans) {
      let sign = 1;
      for (const name of term) sign *= key[factorNames.indexOf(name)] === "+" ? 1 : -1;
      contrast += sign * mean;
    }
    // contrast is computed from treatment-cell means, so multiply by r to match
    // SS = (replicate-summed contrast)^2 / (2^k * r).
    const ss = (contrast ** 2 * replicates) / nComb;
    const effect = 2 * contrast / nComb;
    const df = 1;
    const f = errorMS !== null && errorMS > 0 ? ss / errorMS : null;
    const p = f !== null ? fSurvivalProbability(f, df, errorDf) : null;
    return { term, effect, contrast, sumSquares: ss, df, meanSquare: ss, fStatistic: f, pValue: p };
  });
  const modelSS = rows.reduce((s, r) => s + r.sumSquares, 0);
  const modelDf = terms.length;
  const canTest = errorDf > 0 && errorMS !== null && errorMS > 0;
  const message = errorDf === 0
    ? "ANOVA F-tests and p-values are unavailable: one observation per combination leaves no pure-error degrees of freedom. Add replicates."
    : errorMS === 0
      ? "The estimated pure error is zero. F-statistics are undefined or uninformative; increase the noise or inspect the data."
      : "F-tests compare each factorial effect with replicated within-combination error under the ANOVA assumptions.";
  return { rows, errorSS, errorDf, errorMS, totalSS, totalDf: totalN - 1, modelSS, modelDf, grandMean, canTest, message };
}

export function aggregateMainEffects(runs: DesignRun[], factorNames: string[]): { factor: string; low: number; high: number; effect: number }[] {
  return factorNames.map(factor => {
    const low = runs.filter(r => r.levels[factor] === -1).reduce((s, r) => s + r.response, 0) / runs.filter(r => r.levels[factor] === -1).length;
    const high = runs.filter(r => r.levels[factor] === 1).reduce((s, r) => s + r.response, 0) / runs.filter(r => r.levels[factor] === 1).length;
    return { factor, low, high, effect: high - low };
  });
}

export function aggregateInteraction(runs: DesignRun[], factorA: string, factorB: string) {
  return [-1, 1].map(levelB => {
    const rows = runs.filter(r => r.levels[factorB] === levelB);
    const lowRows = rows.filter(r => r.levels[factorA] === -1);
    const highRows = rows.filter(r => r.levels[factorA] === 1);
    const low = lowRows.reduce((s, r) => s + r.response, 0) / lowRows.length;
    const high = highRows.reduce((s, r) => s + r.response, 0) / highRows.length;
    return { levelB: levelB as -1 | 1, low, high };
  });
}

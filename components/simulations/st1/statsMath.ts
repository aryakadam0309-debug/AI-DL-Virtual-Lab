// Pure maths helpers for the probability distributions simulator.
// No dependencies, no side effects.

const MINUS = "\u2212";

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

export function normalPdf(x: number, mu: number, sigma: number): number {
  const z = x - mu;
  return Math.exp(-(z * z) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

export function normalCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/** n choose k, computed multiplicatively. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const kk = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** ln(k!) as a sum of logs. */
export function logFactorial(k: number): number {
  let s = 0;
  for (let i = 2; i <= k; i++) s += Math.log(i);
  return s;
}

export function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  return Math.exp(-lambda + k * Math.log(lambda) - logFactorial(k));
}

export function exponentialPdf(x: number, lambda: number): number {
  return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
}

export function exponentialCdf(x: number, lambda: number): number {
  return x < 0 ? 0 : 1 - Math.exp(-lambda * x);
}

// ---------- number helpers ----------

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

/** Number of decimals implied by a step such as 0.1 or 0.05. */
export function decimalsOf(step: number): number {
  const s = String(step);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

export function roundTo(x: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(x * f) / f;
}

function withMinus(s: string): string {
  return s.startsWith("-") ? MINUS + s.slice(1) : s;
}

/** Rounds to at most `maxDecimals`, strips trailing zeros, uses a typographic minus. */
export function formatNumber(x: number, maxDecimals = 4): string {
  let r = roundTo(x, maxDecimals);
  if (Object.is(r, -0)) r = 0;
  let s = r.toFixed(maxDecimals);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return withMinus(s);
}

/** Fixed number of decimals with a typographic minus. */
export function formatFixed(x: number, decimals: number): string {
  let r = roundTo(x, decimals);
  if (Object.is(r, -0)) r = 0;
  return withMinus(r.toFixed(decimals));
}

/** Integer with thousands separators, e.g. 126,410,606,437,752. */
export function formatInteger(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "0.6827 (68.27%)" */
export function formatProbability(p: number): string {
  return `${formatFixed(p, 4)} (${formatFixed(p * 100, 2)}%)`;
}

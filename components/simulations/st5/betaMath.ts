import type { PosteriorSummary } from "./types";

const LANCZOS_COEFFICIENTS = [
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9.984369578019572e-6,
  1.5056327351493116e-7,
  0,
];

/** Natural logarithm of the gamma function using Lanczos' g=7 approximation. */
export function logGamma(z: number): number {
  if (!Number.isFinite(z) || z <= 0) return Number.NaN;
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  const shifted = z - 1;
  let sum = 0.9999999999998099;
  for (let index = 0; index < 8; index += 1) {
    sum += (LANCZOS_COEFFICIENTS[index] ?? 0) / (shifted + index + 1);
  }
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/** Probability density of a Beta(a, b) distribution. */
export function betaPdf(p: number, a: number, b: number): number {
  if (p < 0 || p > 1 || a <= 0 || b <= 0) return 0;
  const logNormalizer = -logBeta(a, b);
  if (p === 0) {
    if (a < 1) return Number.POSITIVE_INFINITY;
    if (a > 1) return 0;
    return Math.exp(logNormalizer);
  }
  if (p === 1) {
    if (b < 1) return Number.POSITIVE_INFINITY;
    if (b > 1) return 0;
    return Math.exp(logNormalizer);
  }
  return Math.exp(logNormalizer + (a - 1) * Math.log(p) + (b - 1) * Math.log1p(-p));
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 300;
  const epsilon = 3e-14;
  const minValue = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < minValue) d = minValue;
  d = 1 / d;
  let result = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;
    let coefficient = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + coefficient * d;
    if (Math.abs(d) < minValue) d = minValue;
    c = 1 + coefficient / c;
    if (Math.abs(c) < minValue) c = minValue;
    d = 1 / d;
    result *= d * c;

    coefficient = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + coefficient * d;
    if (Math.abs(d) < minValue) d = minValue;
    c = 1 + coefficient / c;
    if (Math.abs(c) < minValue) c = minValue;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

/** Regularised incomplete beta function I_x(a, b), evaluated with Lentz's method. */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (a <= 0 || b <= 0 || Number.isNaN(x)) return Number.NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front = Math.exp(a * Math.log(x) + b * Math.log1p(-x) - logBeta(a, b));
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Cumulative distribution function for Beta(a, b). */
export function betaCdf(p: number, a: number, b: number): number {
  return regularizedIncompleteBeta(p, a, b);
}

/** Inverts the Beta CDF using 64 bisection steps. */
export function inverseBetaCdf(probability: number, a: number, b: number): number {
  if (probability <= 0) return 0;
  if (probability >= 1) return 1;
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 64; iteration += 1) {
    const middle = (low + high) / 2;
    if (betaCdf(middle, a, b) < probability) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

export function credibleInterval(a: number, b: number): [number, number] {
  return [inverseBetaCdf(0.025, a, b), inverseBetaCdf(0.975, a, b)];
}

export function posteriorMean(alpha: number, beta: number, heads: number, tails: number): number {
  return (alpha + heads) / (alpha + beta + heads + tails);
}

export function priorShare(alpha: number, beta: number, heads: number, tails: number): number {
  return (alpha + beta) / (alpha + beta + heads + tails);
}

export function posteriorSummary(alpha: number, beta: number, heads: number, tails: number): PosteriorSummary {
  const posteriorAlpha = alpha + heads;
  const posteriorBeta = beta + tails;
  const n = heads + tails;
  const [lower, upper] = credibleInterval(posteriorAlpha, posteriorBeta);
  return {
    alpha,
    beta,
    heads,
    tails,
    n,
    posteriorAlpha,
    posteriorBeta,
    totalStrength: alpha + beta,
    mean: posteriorMean(alpha, beta, heads, tails),
    priorShare: priorShare(alpha, beta, heads, tails),
    lower,
    upper,
  };
}

export function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatFixed(value: number, decimals: number): string {
  const scale = 10 ** decimals;
  const roundingAdjustment = Math.sign(value) * Number.EPSILON * Math.max(1, Math.abs(value));
  return (Math.round((value + roundingAdjustment) * scale) / scale).toFixed(decimals);
}

export function incrementCount(value: number): number {
  return Math.min(100, value + 1);
}
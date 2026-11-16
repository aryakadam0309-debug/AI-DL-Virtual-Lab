import { firstDifference } from "./series";

export interface CorrelogramPoint { lag: number; value: number; significant: boolean }
export interface AcfPacfResult { acf: CorrelogramPoint[]; pacf: CorrelogramPoint[]; confidence: number; }

export function calculateAcfPacf(values: number[], maxLag = Math.min(24, Math.floor(values.length / 3))): AcfPacfResult {
  if (values.length < 8 || values.some(v => !Number.isFinite(v))) throw new Error("ACF/PACF requires at least 8 finite observations.");
  const max = Math.min(Math.max(1, Math.floor(maxLag)), values.length - 2);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const centered = values.map(v => v - avg);
  const denominator = centered.reduce((s, v) => s + v * v, 0);
  if (denominator <= 1e-20) throw new Error("ACF/PACF is undefined for a constant series.");
  const acfValues = [1];
  for (let lag = 1; lag <= max; lag++) {
    let sum = 0;
    for (let t = lag; t < values.length; t++) sum += centered[t] * centered[t - lag];
    acfValues.push(sum / denominator);
  }
  // Durbin-Levinson recursion converts ACF values into partial autocorrelations.
  const pacfValues = [1];
  let phi: number[] = [];
  let variance = 1;
  for (let k = 1; k <= max; k++) {
    let numerator = acfValues[k];
    for (let j = 1; j < k; j++) numerator -= (phi[j - 1] ?? 0) * acfValues[k - j];
    const reflection = Math.max(-1, Math.min(1, numerator / Math.max(variance, 1e-12)));
    const next = Array(k).fill(0);
    for (let j = 1; j < k; j++) next[j - 1] = phi[j - 1] - reflection * phi[k - j - 1];
    next[k - 1] = reflection;
    phi = next;
    variance *= Math.max(1e-12, 1 - reflection * reflection);
    pacfValues.push(reflection);
  }
  const confidence = 1.96 / Math.sqrt(values.length);
  return {
    acf: acfValues.slice(1).map((value, i) => ({ lag: i + 1, value, significant: Math.abs(value) > confidence })),
    pacf: pacfValues.slice(1).map((value, i) => ({ lag: i + 1, value, significant: Math.abs(value) > confidence })),
    confidence,
  };
}

export interface OlsResult { coefficients: number[]; standardErrors: number[]; residuals: number[]; sse: number; df: number; }
export function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error("Regression design matrix is singular. Reduce the lag order or use more observations.");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error("Regression design matrix is singular. Reduce the lag order or use more observations.");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let row = 0; row < n; row++) if (row !== col) {
      const f = a[row][col];
      for (let j = 0; j < 2 * n; j++) a[row][j] -= f * a[col][j];
    }
  }
  return a.map(row => row.slice(n));
}

export function ordinaryLeastSquares(x: number[][], y: number[]): OlsResult {
  if (x.length !== y.length || x.length === 0 || x.some(row => row.length !== x[0].length)) throw new Error("Invalid regression matrix dimensions.");
  const n = x.length, k = x[0].length;
  if (n <= k) throw new Error("Regression requires more observations than coefficients.");
  const xtx = Array.from({ length: k }, () => Array(k).fill(0));
  const xty = Array(k).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) {
    xty[a] += x[i][a] * y[i];
    for (let b = 0; b < k; b++) xtx[a][b] += x[i][a] * x[i][b];
  }
  const coefficients = solveLinearSystem(xtx, xty);
  const residuals = y.map((v, i) => v - x[i].reduce((s, value, j) => s + value * coefficients[j], 0));
  const sse = residuals.reduce((s, v) => s + v * v, 0);
  const df = n - k;
  const covariance = invertMatrix(xtx);
  const sigma2 = sse / df;
  const standardErrors = covariance.map((row, i) => Math.sqrt(Math.max(0, row[i] * sigma2)));
  return { coefficients, standardErrors, residuals, sse, df };
}

export type AdfDeterministic = "none" | "constant" | "trend";
export interface AdfResult {
  statistic: number;
  pValueBand: string;
  criticalValues: { one: number; five: number; ten: number };
  lags: number;
  observations: number;
  deterministic: AdfDeterministic;
  decision: string;
  warning: string;
}

// Asymptotic MacKinnon-style DF/ADF critical-value reference approximations.
// These are intentionally presented as approximate critical bands, not exact finite-sample p-values.
const ADF_CRITICAL: Record<AdfDeterministic, { one: number; five: number; ten: number }> = {
  none: { one: -2.58, five: -1.95, ten: -1.62 },
  constant: { one: -3.43, five: -2.86, ten: -2.57 },
  trend: { one: -3.96, five: -3.41, ten: -3.12 },
};

export function augmentedDickeyFuller(values: number[], lags = 0, deterministic: AdfDeterministic = "constant"): AdfResult {
  if (values.length < 20 || values.some(v => !Number.isFinite(v))) throw new Error("ADF requires at least 20 finite observations.");
  if (!Number.isInteger(lags) || lags < 0 || lags > Math.min(12, Math.floor(values.length / 4))) throw new Error(`ADF lag order must be from 0 to ${Math.min(12, Math.floor(values.length / 4))}.`);
  const diff = firstDifference(values);
  const rows: number[][] = [], target: number[] = [];
  const start = lags + 1;
  for (let t = start; t < values.length; t++) {
    const row: number[] = [];
    if (deterministic !== "none") row.push(1);
    if (deterministic === "trend") row.push(t + 1);
    row.push(values[t - 1]);
    for (let j = 1; j <= lags; j++) row.push(diff[t - j - 1]);
    rows.push(row); target.push(diff[t - 1]);
  }
  const fit = ordinaryLeastSquares(rows, target);
  const gammaIndex = deterministic === "none" ? 0 : deterministic === "constant" ? 1 : 2;
  const gamma = fit.coefficients[gammaIndex], se = fit.standardErrors[gammaIndex];
  if (!(se > 0)) throw new Error("ADF statistic is undefined because the estimated standard error is zero.");
  const statistic = gamma / se;
  const criticalValues = ADF_CRITICAL[deterministic];
  const pValueBand = statistic <= criticalValues.one ? "< 0.01" : statistic <= criticalValues.five ? "0.01–0.05" : statistic <= criticalValues.ten ? "0.05–0.10" : "> 0.10";
  const decision = statistic < criticalValues.five
    ? "Reject the unit-root null at the 5% reference level; this is evidence against a unit root."
    : "Do not reject the unit-root null at the 5% reference level; the test has not established stationarity.";
  return {
    statistic, pValueBand, criticalValues, lags, observations: rows.length, deterministic, decision,
    warning: "Critical values are asymptotic reference approximations. Small samples, structural breaks, seasonal roots and lag selection can affect the result; non-rejection does not prove non-stationarity.",
  };
}

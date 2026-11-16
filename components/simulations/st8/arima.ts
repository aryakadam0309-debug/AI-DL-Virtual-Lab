export interface ArimaConfig { p: number; d: number; q: number; horizon: number; interval: 80 | 95; includeConstant: boolean }
export interface ForecastPoint { step: number; value: number; lower: number; upper: number; standardError: number }
export interface ArimaFit {
  config: ArimaConfig;
  constant: number;
  ar: number[];
  ma: number[];
  residuals: number[];
  sigma2: number;
  sse: number;
  aic: number;
  observationsUsed: number;
  forecasts: ForecastPoint[];
  converged: boolean;
  warnings: string[];
}

const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
const variance = (x: number[]) => {
  const m = mean(x);
  return x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, x.length - 1);
};

function difference(values: number[], d: number): number[] {
  let out = values.slice();
  for (let k = 0; k < d; k++) out = out.slice(1).map((v, i) => v - out[i]);
  return out;
}

function stableCoefficients(raw: number[], order: number): number[] {
  let coeff: number[] = [];
  for (let m = 1; m <= order; m++) {
    const reflection = 0.98 * Math.tanh(raw[m - 1] ?? 0);
    const next = Array(m).fill(0);
    for (let j = 0; j < m - 1; j++) next[j] = coeff[j] - reflection * coeff[m - j - 2];
    next[m - 1] = reflection;
    coeff = next;
  }
  return coeff;
}

function unpack(params: number[], config: ArimaConfig) {
  let at = 0;
  const constant = config.includeConstant ? params[at++] : 0;
  const ar = stableCoefficients(params.slice(at, at + config.p), config.p); at += config.p;
  // Invertibility of the MA polynomial 1 + theta(B) is obtained by
  // negating the coefficients of a stable AR polynomial.
  const ma = stableCoefficients(params.slice(at, at + config.q), config.q).map(v => -v);
  return { constant, ar, ma };
}

function cssResiduals(values: number[], constant: number, ar: number[], ma: number[]) {
  const e = Array(values.length).fill(0);
  for (let t = 0; t < values.length; t++) {
    let prediction = constant;
    for (let i = 1; i <= ar.length; i++) prediction += ar[i - 1] * (values[t - i] ?? 0);
    for (let i = 1; i <= ma.length; i++) prediction += ma[i - 1] * (e[t - i] ?? 0);
    e[t] = values[t] - prediction;
  }
  const burn = Math.max(ar.length, ma.length);
  return { residuals: e.slice(burn), allResiduals: e, burn };
}

function objective(params: number[], values: number[], config: ArimaConfig): number {
  const model = unpack(params, config);
  const fit = cssResiduals(values, model.constant, model.ar, model.ma);
  const sse = fit.residuals.reduce((s, v) => s + v * v, 0);
  return Number.isFinite(sse) && fit.residuals.length > 0 ? sse : Number.MAX_VALUE / 100;
}

function nelderMead(fn: (x: number[]) => number, start: number[], steps: number[], maxIterations = 1200) {
  const n = start.length;
  if (n === 0) return { x: [], value: fn([]), converged: true, iterations: 0 };
  const simplex = [start.slice()];
  for (let i = 0; i < n; i++) { const p = start.slice(); p[i] += steps[i]; simplex.push(p); }
  let vals = simplex.map(fn);
  let converged = false, iteration = 0;
  for (; iteration < maxIterations; iteration++) {
    const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    const points = order.map(i => simplex[i]);
    const values = order.map(i => vals[i]);
    for (let i = 0; i <= n; i++) { simplex[i] = points[i]; vals[i] = values[i]; }
    const spread = Math.max(...vals) - Math.min(...vals);
    const size = Math.max(...simplex.slice(1).map(p => Math.sqrt(p.reduce((s, v, i) => s + (v - simplex[0][i]) ** 2, 0))));
    if (spread < 1e-10 * (1 + Math.abs(vals[0])) && size < 1e-5) { converged = true; break; }
    const centroid = Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const worst = simplex[n];
    const reflected = centroid.map((v, i) => v + (v - worst[i]));
    const fr = fn(reflected);
    if (fr < vals[0]) {
      const expanded = centroid.map((v, i) => v + 2 * (reflected[i] - v));
      const fe = fn(expanded);
      if (fe < fr) { simplex[n] = expanded; vals[n] = fe; } else { simplex[n] = reflected; vals[n] = fr; }
    } else if (fr < vals[n - 1]) {
      simplex[n] = reflected; vals[n] = fr;
    } else {
      const contracted = centroid.map((v, i) => v + 0.5 * (worst[i] - v));
      const fc = fn(contracted);
      if (fc < vals[n]) { simplex[n] = contracted; vals[n] = fc; }
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          vals[i] = fn(simplex[i]);
        }
      }
    }
  }
  const best = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)[0];
  return { x: simplex[best.i], value: best.v, converged, iterations: iteration };
}

function impulseWeights(ar: number[], ma: number[], count: number): number[] {
  const psi = Array(count).fill(0);
  psi[0] = 1;
  for (let j = 1; j < count; j++) {
    let value = j <= ma.length ? ma[j - 1] : 0;
    for (let i = 1; i <= Math.min(ar.length, j); i++) value += ar[i - 1] * psi[j - i];
    psi[j] = value;
  }
  return psi;
}

function normalCritical(interval: 80 | 95) { return interval === 80 ? 1.2815515655446004 : 1.959963984540054; }

export function fitArima(values: number[], config: ArimaConfig): ArimaFit {
  if (values.length < 20 || values.some(v => !Number.isFinite(v))) throw new Error("ARIMA fitting requires at least 20 finite observations.");
  if (![config.p, config.d, config.q].every(Number.isInteger) || config.p < 0 || config.p > 3 || config.q < 0 || config.q > 3 || config.d < 0 || config.d > 2) throw new Error("Use p and q from 0 to 3 and d from 0 to 2.");
  if (!Number.isInteger(config.horizon) || config.horizon < 1 || config.horizon > 36) throw new Error("Forecast horizon must be 1 to 36.");
  const differenced = difference(values, config.d);
  const parameterCount = (config.includeConstant ? 1 : 0) + config.p + config.q;
  const burn = Math.max(config.p, config.q);
  const nEff = differenced.length - burn;
  if (nEff <= parameterCount + 2) throw new Error("Too few usable observations for this ARIMA order. Reduce p/q/d or upload more data.");
  const scale = Math.sqrt(Math.max(variance(differenced), 1e-8));
  const start: number[] = [];
  const steps: number[] = [];
  if (config.includeConstant) { start.push(mean(differenced)); steps.push(Math.max(scale * 0.05, 0.001)); }
  for (let i = 0; i < config.p + config.q; i++) { start.push(0); steps.push(0.12); }
  const optimized = nelderMead(x => objective(x, differenced, config), start, steps);
  const model = unpack(optimized.x, config);
  const residualFit = cssResiduals(differenced, model.constant, model.ar, model.ma);
  const residuals = residualFit.residuals;
  const sse = residuals.reduce((s, e) => s + e * e, 0);
  const sigma2 = sse / Math.max(1, residuals.length - parameterCount);
  if (!Number.isFinite(sigma2) || sigma2 <= 0) throw new Error("Model residual variance is zero or non-finite; an interval cannot be calculated.");
  // Gaussian CSS information criterion counts the innovation variance as an estimated parameter.
  const aic = residuals.length * Math.log(sse / residuals.length) + 2 * (parameterCount + 1);

  const predictedDiff: number[] = [];
  const z = differenced.slice();
  const errors = residualFit.allResiduals.slice();
  for (let h = 0; h < config.horizon; h++) {
    let pred = model.constant;
    for (let i = 1; i <= model.ar.length; i++) pred += model.ar[i - 1] * (z[z.length - i] ?? 0);
    for (let i = 1; i <= model.ma.length; i++) pred += model.ma[i - 1] * (errors[errors.length - i] ?? 0);
    predictedDiff.push(pred);
    z.push(pred);
    errors.push(0); // Expected future innovations are zero.
  }
  // Invert differencing recursively. Each order retains its own last observed / forecasted value.
  const differenceLevels: number[][] = [values.slice()];
  for (let d = 1; d <= config.d; d++) differenceLevels.push(difference(differenceLevels[d - 1], 1));
  const forecasts: number[] = [];
  for (const diffForecast of predictedDiff) {
    let value = diffForecast;
    for (let level = config.d - 1; level >= 0; level--) {
      value = differenceLevels[level][differenceLevels[level].length - 1] + value;
      differenceLevels[level].push(value);
    }
    forecasts.push(value);
  }

  // MA(infinity) weights for ARMA, then cumulative sums for each integration order.
  let weights = impulseWeights(model.ar, model.ma, config.horizon);
  for (let d = 0; d < config.d; d++) {
    const integrated = Array(weights.length).fill(0);
    let running = 0;
    for (let i = 0; i < weights.length; i++) { running += weights[i]; integrated[i] = running; }
    weights = integrated;
  }
  const zCrit = normalCritical(config.interval);
  const resultForecasts = forecasts.map((value, i) => {
    const standardError = Math.sqrt(sigma2 * weights.slice(0, i + 1).reduce((s, w) => s + w * w, 0));
    return { step: i + 1, value, lower: value - zCrit * standardError, upper: value + zCrit * standardError, standardError };
  });
  const warnings: string[] = [];
  if (!optimized.converged) warnings.push("The conditional-sum-of-squares optimizer reached its iteration limit. Treat parameter estimates cautiously.");
  if (config.d > 0 && config.includeConstant) warnings.push("The constant is a drift term in the differenced model.");
  if (model.ar.some(v => Math.abs(v) > 0.95) || model.ma.some(v => Math.abs(v) > 0.95)) warnings.push("At least one fitted dynamic coefficient is close to the stability/invertibility boundary.");
  warnings.push("Prediction intervals are approximate Gaussian intervals conditional on fitted parameters; they do not include parameter-estimation uncertainty or structural breaks.");
  return { config, ...model, residuals, sigma2, sse, aic, observationsUsed: residuals.length, forecasts: resultForecasts, converged: optimized.converged, warnings };
}

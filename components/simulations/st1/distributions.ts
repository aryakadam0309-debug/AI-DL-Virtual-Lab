import {
  binomialPmf,
  choose,
  clamp,
  exponentialCdf,
  exponentialPdf,
  formatFixed,
  formatInteger,
  formatNumber,
  formatProbability,
  normalCdf,
  normalPdf,
  poissonPmf,
  roundTo,
} from "./statsMath";
import type { DistributionConfig, DistributionId, Values } from "./types";

const MINUS = "\u2212";

const v = (values: Values, key: string): number => values[key] ?? 0;

// ---------- Normal ----------

const normal: DistributionConfig = {
  id: "normal",
  name: "Normal distribution",
  description: "A bell curve, like the heights of adults in a city.",
  defaults: { mu: 0, sigma: 1, a: -1, b: 1 },
  sliders: [
    { key: "mu", label: "Centre (μ)", hint: "Moves the bell left or right", min: -5, max: 5, step: 0.1 },
    { key: "sigma", label: "Spread (σ)", hint: "Bigger makes the bell wider and shorter", min: 0.2, max: 3, step: 0.1 },
    { key: "a", label: "Interval start (a)", hint: "Left edge of the shaded area", min: -8, max: 8, step: 0.1 },
    { key: "b", label: "Interval end (b)", hint: "Right edge of the shaded area", min: -8, max: 8, step: 0.1 },
  ],
  normalize(next, changedKey) {
    const out = { ...next };
    const a = v(out, "a");
    const b = v(out, "b");
    if (changedKey === "a" && a > b) out["b"] = a;
    if (changedKey === "b" && b < a) out["a"] = b;
    return out;
  },
  build(values) {
    const mu = v(values, "mu");
    const sigma = v(values, "sigma");
    const a = v(values, "a");
    const b = v(values, "b");
    const Fa = normalCdf(a, mu, sigma);
    const Fb = normalCdf(b, mu, sigma);
    const result = Fb - Fa;
    return {
      plot: {
        kind: "curve",
        xMin: -10,
        xMax: 10,
        density: (x) => normalPdf(x, mu, sigma),
        yPeak: normalPdf(mu, mu, sigma),
        shade: { from: a, to: b },
        mean: mu,
        xLabel: "x",
        yLabel: "Density f(x)",
      },
      rows: [
        { label: "Formula", value: [`P(a < X ≤ b) = F(b) ${MINUS} F(a)`] },
        { label: "With your numbers", value: [`F(${formatNumber(b)}) ${MINUS} F(${formatNumber(a)})`] },
        { label: "F(b)", value: [formatFixed(Fb, 4)] },
        { label: "F(a)", value: [formatFixed(Fa, 4)] },
        {
          label: "Result",
          value: [`${formatFixed(Fb, 4)} ${MINUS} ${formatFixed(Fa, 4)} = ${formatProbability(result)}`],
          highlight: true,
        },
        { label: "Mean (μ)", value: [formatNumber(mu)] },
        { label: "Variance (σ²)", value: [formatNumber(sigma * sigma)] },
      ],
      ariaLabel: `Normal distribution bell curve with centre ${formatNumber(mu)} and spread ${formatNumber(
        sigma,
      )}. The area between ${formatNumber(a)} and ${formatNumber(b)} is shaded, probability ${formatFixed(result, 4)}.`,
    };
  },
};

// ---------- Binomial ----------

const binomial: DistributionConfig = {
  id: "binomial",
  name: "Binomial distribution",
  description: "The number of heads when you flip n coins.",
  defaults: { n: 10, p: 0.5, k: 5 },
  sliders: [
    { key: "n", label: "Coins flipped (n)", hint: "How many independent trials", min: 1, max: 50, step: 1 },
    { key: "p", label: "Chance of heads (p)", hint: "Chance of success on each flip", min: 0, max: 1, step: 0.05 },
    { key: "k", label: "Heads wanted (k)", hint: "The bar we calculate", min: 0, max: (vals) => v(vals, "n"), step: 1 },
  ],
  normalize(next) {
    return { ...next, k: clamp(v(next, "k"), 0, v(next, "n")) };
  },
  build(values) {
    const n = v(values, "n");
    const p = v(values, "p");
    const k = v(values, "k");
    const q = roundTo(1 - p, 2);
    const c = choose(n, k);
    const result = binomialPmf(k, n, p);
    const bars = Array.from({ length: n + 1 }, (_, i) => ({ x: i, y: binomialPmf(i, n, p) }));
    return {
      plot: { kind: "bars", bars, highlight: k, mean: n * p, xLabel: "Number of heads", yLabel: "P(X = k)" },
      rows: [
        { label: "Formula", value: ["P(X=k) = C(n,k) p", { sup: "k" }, ` (1${MINUS}p)`, { sup: `n${MINUS}k` }] },
        {
          label: "With your numbers",
          value: [
            `C(${n},${k}) × ${formatNumber(p)}`,
            { sup: String(k) },
            ` × ${formatNumber(q)}`,
            { sup: String(n - k) },
            `, where C(${n},${k}) = ${formatInteger(c)}`,
          ],
        },
        { label: "Result", value: [formatProbability(result)], highlight: true },
        { label: "Mean (np)", value: [formatNumber(n * p)] },
        { label: `Variance (np(1${MINUS}p))`, value: [formatNumber(n * p * (1 - p))] },
      ],
      ariaLabel: `Binomial distribution bar chart for ${n} coin flips with chance of heads ${formatNumber(
        p,
      )}. The bar for ${k} heads is highlighted, probability ${formatFixed(result, 4)}.`,
    };
  },
};

// ---------- Poisson ----------

export function poissonKMax(lambda: number): number {
  return Math.max(10, Math.ceil(lambda + 5 * Math.sqrt(lambda) + 2));
}

const poisson: DistributionConfig = {
  id: "poisson",
  name: "Poisson distribution",
  description: "How many calls reach a help desk in one hour.",
  defaults: { lambda: 3, k: 2 },
  sliders: [
    { key: "lambda", label: "Average count (λ)", hint: "Typical number of events per interval", min: 0.5, max: 15, step: 0.5 },
    { key: "k", label: "Count wanted (k)", hint: "The bar we calculate", min: 0, max: (vals) => poissonKMax(v(vals, "lambda")), step: 1 },
  ],
  normalize(next) {
    return { ...next, k: clamp(v(next, "k"), 0, poissonKMax(v(next, "lambda"))) };
  },
  build(values) {
    const lambda = v(values, "lambda");
    const k = v(values, "k");
    const max = poissonKMax(lambda);
    const result = poissonPmf(k, lambda);
    const bars = Array.from({ length: max + 1 }, (_, i) => ({ x: i, y: poissonPmf(i, lambda) }));
    const L = formatNumber(lambda);
    return {
      plot: { kind: "bars", bars, highlight: k, mean: lambda, xLabel: "Number of events", yLabel: "P(X = k)" },
      rows: [
        { label: "Formula", value: ["P(X=k) = e", { sup: `${MINUS}λ` }, " λ", { sup: "k" }, " / k!"] },
        { label: "With your numbers", value: ["e", { sup: `${MINUS}${L}` }, ` × ${L}`, { sup: String(k) }, ` / ${k}!`] },
        { label: "Result", value: [formatProbability(result)], highlight: true },
        { label: "Mean (λ)", value: [L] },
        { label: "Variance (λ)", value: [L] },
      ],
      ariaLabel: `Poisson distribution bar chart with an average of ${L} events. The bar for ${k} events is highlighted, probability ${formatFixed(
        result,
        4,
      )}.`,
    };
  },
};

// ---------- Exponential ----------

export function exponentialXMax(lambda: number): number {
  return Math.ceil(6 / lambda);
}

const exponential: DistributionConfig = {
  id: "exponential",
  name: "Exponential distribution",
  description: "How long you wait for the next call.",
  defaults: { lambda: 0.5, x: 2 },
  sliders: [
    { key: "lambda", label: "Rate (λ)", hint: "Events per unit of time; bigger means shorter waits", min: 0.1, max: 3, step: 0.1 },
    {
      key: "x",
      label: "Waiting time (x)",
      hint: "Shaded area is the chance of waiting longer than x",
      min: 0,
      max: (vals) => exponentialXMax(v(vals, "lambda")),
      step: 0.1,
    },
  ],
  normalize(next) {
    return { ...next, x: clamp(v(next, "x"), 0, exponentialXMax(v(next, "lambda"))) };
  },
  build(values) {
    const lambda = v(values, "lambda");
    const x = v(values, "x");
    const xMax = exponentialXMax(lambda);
    const result = 1 - exponentialCdf(x, lambda);
    const product = roundTo(lambda * x, 4);
    const L = formatNumber(lambda);
    return {
      plot: {
        kind: "curve",
        xMin: 0,
        xMax,
        density: (t) => exponentialPdf(t, lambda),
        yPeak: lambda,
        shade: { from: x, to: xMax },
        mean: 1 / lambda,
        xLabel: "Waiting time x",
        yLabel: "Density f(x)",
      },
      rows: [
        { label: "Formula", value: ["P(X > x) = e", { sup: `${MINUS}λx` }] },
        {
          label: "With your numbers",
          value: [
            "e",
            { sup: `(${MINUS}${L} × ${formatNumber(x)})` },
            " = e",
            { sup: product === 0 ? "0" : `${MINUS}${formatNumber(product)}` },
          ],
        },
        { label: "Result", value: [formatProbability(result)], highlight: true },
        { label: "Mean (1/λ)", value: [formatNumber(1 / lambda)] },
        { label: "Variance (1/λ²)", value: [formatNumber(1 / (lambda * lambda))] },
      ],
      ariaLabel: `Exponential distribution curve with rate ${L}. The area to the right of waiting time ${formatNumber(
        x,
      )} is shaded, probability ${formatFixed(result, 4)}.`,
    };
  },
};

export const DISTRIBUTIONS: Record<DistributionId, DistributionConfig> = {
  normal,
  binomial,
  poisson,
  exponential,
};

export const DISTRIBUTION_ORDER: DistributionId[] = ["normal", "binomial", "poisson", "exponential"];

export const DISTRIBUTION_OPTION_LABELS: Record<DistributionId, string> = {
  normal: "Normal",
  binomial: "Binomial",
  poisson: "Poisson",
  exponential: "Exponential",
};

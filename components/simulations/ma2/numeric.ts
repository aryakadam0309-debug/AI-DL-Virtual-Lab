export type Status = "converged" | "max-iter" | "zero-derivative" | "cycle" | "diverged" | "no-bracket";

export type Preset = {
  id: string;
  label: string;
  f: (x: number) => number;
  df: (x: number) => number;
  root: number;
  a: number;
  b: number;
  x0: number;
  view: { x: [number, number]; y: [number, number] };
  hint: string;
};

export const PRESETS: Preset[] = [
  {
    id: "sqrt2", label: "x² − 2 = 0  (start here)",
    f: (x) => x * x - 2, df: (x) => 2 * x, root: Math.SQRT2,
    a: 1, b: 2, x0: 1, view: { x: [0, 2.5], y: [-2.5, 4.5] },
    hint: "The worked example. Newton-Raphson has six correct decimals after 4 steps; bisection has only narrowed the interval to 0.0625.",
  },
  {
    id: "cos", label: "cos x − x = 0",
    f: (x) => Math.cos(x) - x, df: (x) => -Math.sin(x) - 1, root: 0.7390851332151607,
    a: 0, b: 1, x0: 0.5, view: { x: [-0.5, 1.5], y: [-1.8, 1.8] },
    hint: "No algebra can solve this one, but both methods find the root without trouble.",
  },
  {
    id: "cycle", label: "x³ − 2x + 2 = 0  (cycling)",
    f: (x) => x ** 3 - 2 * x + 2, df: (x) => 3 * x * x - 2, root: -1.7692923542386314,
    a: -2.5, b: 0, x0: 0, view: { x: [-2.5, 2], y: [-10, 8] },
    hint: "From x₀ = 0 Newton-Raphson bounces 0, 1, 0, 1 … forever. Bisection on [−2.5, 0] still succeeds.",
  },
  {
    id: "zero", label: "x² − 2 = 0 from x₀ = 0  (zero derivative)",
    f: (x) => x * x - 2, df: (x) => 2 * x, root: Math.SQRT2,
    a: 1, b: 2, x0: 0, view: { x: [-2.5, 2.5], y: [-3, 5] },
    hint: "At x₀ = 0 the tangent is horizontal, so Newton-Raphson cannot take a step. Bisection is unaffected.",
  },
  {
    id: "repeated", label: "(x − 1)² = 0  (repeated root)",
    f: (x) => (x - 1) ** 2, df: (x) => 2 * (x - 1), root: 1,
    a: 0, b: 2, x0: 3, view: { x: [-0.5, 3], y: [-1, 4] },
    hint: "The curve touches zero without crossing, so bisection finds no sign change. Newton-Raphson works, but only linearly.",
  },
  {
    id: "wild", label: "x³ − x − 1 = 0 from x₀ = 0.5  (wild jump)",
    f: (x) => x ** 3 - x - 1, df: (x) => 3 * x * x - 1, root: 1.324717957244746,
    a: 1, b: 2, x0: 0.5, view: { x: [-2, 2.5], y: [-8, 13] },
    hint: "x₀ = 0.5 sits near a flat spot, so the first tangent throws the iterate far to the left before it recovers.",
  },
];

export type BisectionStep = { n: number; a: number; b: number; c: number; fc: number; na: number; nb: number; err: number };
export type NewtonStep = { n: number; x: number; fx: number; dfx: number; next: number | null; err: number };

export function bisection(p: Preset, a: number, b: number, tol: number, maxIter = 100) {
  const steps: BisectionStep[] = [];
  let lo = Math.min(a, b), hi = Math.max(a, b);
  let fl = p.f(lo);
  if (!(fl * p.f(hi) < 0)) return { steps, status: "no-bracket" as Status };
  let status: Status = "max-iter";
  for (let n = 1; n <= maxIter; n++) {
    const c = (lo + hi) / 2, fc = p.f(c);
    const half = (hi - lo) / 2;
    let na = lo, nb = hi;
    if (fl * fc < 0) nb = c; else { na = c; fl = fc; }
    steps.push({ n, a: lo, b: hi, c, fc, na, nb, err: Math.abs(c - p.root) });
    const stuck = c === lo || c === hi;
    lo = na; hi = nb;
    if (fc === 0 || half < tol || stuck) { status = "converged"; break; }
  }
  return { steps, status };
}

export function newton(p: Preset, x0: number, tol: number, maxIter = 50) {
  const steps: NewtonStep[] = [];
  let x = x0;
  let status: Status = "max-iter";
  for (let n = 0; n <= maxIter; n++) {
    const fx = p.f(x), d = p.df(x);
    const s: NewtonStep = { n, x, fx, dfx: d, next: null, err: Math.abs(x - p.root) };
    steps.push(s);
    if (!isFinite(x) || Math.abs(x) > 1e6) { status = "diverged"; break; }
    if (Math.abs(d) < 1e-12) { status = "zero-derivative"; break; }
    const next = x - fx / d;
    s.next = next;
    if (Math.abs(next - x) < tol) {
      steps.push({ n: n + 1, x: next, fx: p.f(next), dfx: p.df(next), next: null, err: Math.abs(next - p.root) });
      status = "converged"; break;
    }
    if (n >= 1 && Math.abs(next - steps[n - 1].x) < 1e-9 && Math.abs(next - x) > 1e-6) {
      steps.push({ n: n + 1, x: next, fx: p.f(next), dfx: p.df(next), next: null, err: Math.abs(next - p.root) });
      status = "cycle"; break;
    }
    x = next;
  }
  return { steps, status };
}

export const sub = (n: number) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[+d]);
export const digits = (err: number) => (err <= 0 ? 16 : Math.min(16, Math.max(0, -Math.log10(err))));
export const fmtErr = (v: number | null | undefined) => (v == null || !isFinite(v) ? "—" : v === 0 ? "0" : v.toExponential(2));
export const fmt = (v: number | null | undefined, d = 6) =>
  v == null || !isFinite(v) ? "—" : Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-4) ? v.toExponential(2) : v.toFixed(d);

export function niceTicks(min: number, max: number, target = 6) {
  const raw = (max - min) / target, mag = 10 ** Math.floor(Math.log10(raw)), norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) out.push(Math.abs(t) < step * 1e-9 ? 0 : +t.toFixed(10));
  return out;
}

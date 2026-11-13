import { CRITICAL_POINTS, type GDStep, type Status } from "./types";

/**
 * The experiment's function from PDF Page 9:
 * f(x) = x⁴/4 − x² + 0.3x
 */
export function f(x: number): number {
  return (x ** 4) / 4 - x ** 2 + 0.3 * x;
}

/**
 * Gradient: f′(x) = x³ − 2x + 0.3
 */
export function df(x: number): number {
  return x ** 3 - 2 * x + 0.3;
}

/**
 * Curvature (2nd derivative): f″(x) = 3x² − 2
 */
export function d2f(x: number): number {
  return 3 * x ** 2 - 2;
}

/**
 * Run Gradient Descent with optional Polyak Momentum:
 * v_{k+1} = β · v_k − η · f′(x_k)
 * x_{k+1} = x_k + v_{k+1}
 */
export function runGradientDescent(
  x0: number,
  lr: number,
  momentum: number,
  maxIter: number = 50,
  tol: number = 1e-4
): { steps: GDStep[]; status: Status } {
  const steps: GDStep[] = [];
  let x = x0;
  let v = 0;
  let status: Status = "max-iter";

  for (let k = 0; k <= maxIter; k++) {
    const fx = f(x);
    const grad = df(x);
    const curv = d2f(x);

    const step: GDStep = {
      k,
      x,
      fx,
      dfx: grad,
      d2fx: curv,
      v,
      nextX: null,
    };
    steps.push(step);

    // Divergence check
    if (!Number.isFinite(x) || Math.abs(x) > 25) {
      status = "diverged";
      break;
    }

    // Momentum update:
    // v_{k+1} = β * v_k - η * grad
    const vNext = momentum * v - lr * grad;
    const nextX = x + vNext;
    step.nextX = nextX;

    // Convergence check
    const stepMag = Math.abs(nextX - x);
    const gradMag = Math.abs(grad);

    if (k > 0 && gradMag < tol && stepMag < tol) {
      // Check which critical point it reached
      if (Math.abs(x - CRITICAL_POINTS[0].x) < 0.15) {
        status = "converged-global";
      } else if (Math.abs(x - CRITICAL_POINTS[2].x) < 0.15) {
        status = "converged-local";
      } else if (Math.abs(x - CRITICAL_POINTS[1].x) < 0.15) {
        status = "stalled-peak";
      } else {
        status = "converged-local";
      }
      break;
    }

    // Oscillation detection
    if (k >= 8) {
      const last5 = steps.slice(-5);
      const diffs = last5.map((s, i) => (i > 0 ? s.x - last5[i - 1].x : 0)).slice(1);
      const signChanges = diffs.slice(1).filter((d, i) => d * diffs[i] < 0).length;
      if (signChanges >= 3 && stepMag > 0.3) {
        status = "oscillating";
      }
    }

    x = nextX;
    v = vNext;
  }

  // If stopped at max iterations without diverging, classify end point
  if (status === "max-iter") {
    const last = steps[steps.length - 1];
    if (Math.abs(last.dfx) < 0.05) {
      if (Math.abs(last.x - CRITICAL_POINTS[0].x) < 0.15) status = "converged-global";
      else if (Math.abs(last.x - CRITICAL_POINTS[2].x) < 0.15) status = "converged-local";
      else if (Math.abs(last.x - CRITICAL_POINTS[1].x) < 0.15) status = "stalled-peak";
    }
  }

  return { steps, status };
}

export const round = (v: number, decimals: number = 3): number => {
  if (Math.abs(v) < 1e-9) return 0;
  const factor = 10 ** decimals;
  return Math.round(v * factor) / factor;
};

export const fmt = (v: number | null | undefined, d: number = 4): string => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e5 || (v !== 0 && Math.abs(v) < 1e-4)) return v.toExponential(2);
  return v.toFixed(d);
};

export function niceTicks(min: number, max: number, target: number = 6): number[] {
  const raw = (max - min) / target;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-6)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
    out.push(Math.abs(t) < step * 1e-9 ? 0 : +t.toFixed(6));
  }
  return out;
}


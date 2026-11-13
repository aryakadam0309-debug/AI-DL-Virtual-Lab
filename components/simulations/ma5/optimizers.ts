import { gradientNorm, safeEvaluate, type Landscape, type Point2 } from "./landscapes";

export type OptimizerId = "gd" | "momentum" | "adam";
export type OptimizerStatus = "converged" | "stationary-point" | "max-iterations" | "diverged";
export type OptimizerPoint = Point2 & { loss: number; gradNorm: number };
export type Trajectory = { start: Point2; points: OptimizerPoint[]; status: OptimizerStatus; message: string; optimizer: OptimizerId };
export type OptimizerConfig = { learningRate: number; maxIterations: number; tolerance?: number; beta1?: number; beta2?: number; epsilon?: number; momentum?: number };

const clampFinite = (v: number) => Math.max(-1e6, Math.min(1e6, v));

export function optimise(landscape: Landscape, start: Point2, optimizer: OptimizerId, config: OptimizerConfig): Trajectory {
  const lr = config.learningRate;
  const maxIterations = Math.max(1, Math.floor(config.maxIterations));
  const tolerance = config.tolerance ?? 1e-5;
  const beta1 = config.beta1 ?? 0.9;
  const beta2 = config.beta2 ?? 0.999;
  const epsilon = config.epsilon ?? 1e-8;
  const beta = config.momentum ?? 0.9;
  let p = { ...start };
  let velocity = { x: 0, y: 0 };
  let m = { x: 0, y: 0 };
  let v = { x: 0, y: 0 };
  const initialGrad = landscape.gradient(p);
  const points: OptimizerPoint[] = [{ ...p, loss: safeEvaluate(landscape.f, p), gradNorm: gradientNorm(initialGrad) }];
  let status: OptimizerStatus = "max-iterations";
  let message = `Stopped after ${maxIterations} iterations; the gradient tolerance was not reached.`;

  if (![p.x, p.y, lr, tolerance].every(Number.isFinite) || lr <= 0 || tolerance <= 0) {
    return { start, points: [], status: "diverged", message: "Invalid starting point or optimizer configuration.", optimizer };
  }

  for (let t = 1; t <= maxIterations; t += 1) {
    const g = landscape.gradient(p);
    const gNorm = gradientNorm(g);
    if (!Number.isFinite(gNorm) || !Number.isFinite(landscape.f(p))) {
      status = "diverged"; message = "The loss or gradient became non-finite; the run stopped safely."; break;
    }
    if (gNorm <= tolerance) {
      status = landscape.id === "saddle" ? "stationary-point" : "converged";
      message = landscape.id === "saddle"
        ? "Gradient is small at a stationary point. This saddle function has no global minimum, so a stationary point is not automatically a solution."
        : "Gradient norm is below the selected tolerance. This is a stationary point; on a non-convex surface it need not be the global minimum.";
      break;
    }

    let next: Point2;
    if (optimizer === "gd") {
      next = { x: p.x - lr * g.x, y: p.y - lr * g.y };
    } else if (optimizer === "momentum") {
      velocity = { x: beta * velocity.x + g.x, y: beta * velocity.y + g.y };
      next = { x: p.x - lr * velocity.x, y: p.y - lr * velocity.y };
    } else {
      m = { x: beta1 * m.x + (1 - beta1) * g.x, y: beta1 * m.y + (1 - beta1) * g.y };
      v = { x: beta2 * v.x + (1 - beta2) * g.x * g.x, y: beta2 * v.y + (1 - beta2) * g.y * g.y };
      const mHat = { x: m.x / (1 - beta1 ** t), y: m.y / (1 - beta1 ** t) };
      const vHat = { x: v.x / (1 - beta2 ** t), y: v.y / (1 - beta2 ** t) };
      next = { x: p.x - lr * mHat.x / (Math.sqrt(vHat.x) + epsilon), y: p.y - lr * mHat.y / (Math.sqrt(vHat.y) + epsilon) };
    }

    if (![next.x, next.y].every(Number.isFinite) || Math.max(Math.abs(next.x), Math.abs(next.y)) > 1e6) {
      status = "diverged";
      message = "The next update became non-finite or exceeded the safety boundary. Try a smaller learning rate.";
      break;
    }
    p = { x: clampFinite(next.x), y: clampFinite(next.y) };
    const loss = safeEvaluate(landscape.f, p);
    const nextGrad = landscape.gradient(p);
    const nextNorm = gradientNorm(nextGrad);
    if (!Number.isFinite(loss) || !Number.isFinite(nextNorm)) {
      status = "diverged"; message = "The updated point produced a non-finite loss or gradient; the run stopped safely."; break;
    }
    points.push({ ...p, loss, gradNorm: nextNorm });
    if (nextNorm <= tolerance) {
      status = landscape.id === "saddle" ? "stationary-point" : "converged";
      message = landscape.id === "saddle"
        ? "Gradient is small at a stationary point. A saddle is not a local minimum."
        : "Gradient norm is below the selected tolerance. On a non-convex surface, the result may be a local rather than global minimum.";
      break;
    }
  }
  return { start, points, status, message, optimizer };
}

export function statusLabel(status: OptimizerStatus): string {
  switch (status) {
    case "converged": return "Converged to a stationary point";
    case "stationary-point": return "Stationary point (not necessarily a minimum)";
    case "max-iterations": return "Iteration limit reached";
    case "diverged": return "Stopped: unstable or non-finite update";
  }
}

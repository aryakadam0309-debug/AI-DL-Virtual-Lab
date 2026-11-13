export type LandscapeId = "bowl" | "saddle" | "rosenbrock" | "rastrigin";
export type Point2 = { x: number; y: number };
export type Landscape = {
  id: LandscapeId;
  label: string;
  xBounds: [number, number];
  yBounds: [number, number];
  description: string;
  contourLevels: number[];
  f: (p: Point2) => number;
  gradient: (p: Point2) => Point2;
  globalMinimum: Point2 | null;
  globalMinimumValue: number | null;
};

const twoPi = 2 * Math.PI;
const rastrigin1D = (x: number) => x * x - 10 * Math.cos(twoPi * x);

export const LANDSCAPES: Record<LandscapeId, Landscape> = {
  bowl: {
    id: "bowl", label: "Convex bowl", xBounds: [-4, 4], yBounds: [-4, 4],
    description: "A smooth convex surface with one global minimum. Every direction curves upward away from the origin.",
    contourLevels: [0.2, 0.5, 1, 2, 3, 4.5, 6.5, 9, 12],
    f: ({ x, y }) => 0.5 * (x * x + y * y),
    gradient: ({ x, y }) => ({ x, y }),
    globalMinimum: { x: 0, y: 0 }, globalMinimumValue: 0,
  },
  saddle: {
    id: "saddle", label: "Saddle surface", xBounds: [-4, 4], yBounds: [-4, 4],
    description: "The origin is a stationary saddle, not a minimum: the function rises along x but falls along y. In the downhill direction this surface is unbounded.",
    contourLevels: [-12, -8, -5, -3, -1, 1, 3, 5, 8, 12],
    f: ({ x, y }) => x * x - y * y,
    gradient: ({ x, y }) => ({ x: 2 * x, y: -2 * y }),
    globalMinimum: null, globalMinimumValue: null,
  },
  rosenbrock: {
    id: "rosenbrock", label: "Rosenbrock valley", xBounds: [-2.5, 2.5], yBounds: [-1.5, 3.5],
    description: "A narrow, curved valley leads to the global minimum at (1, 1). A long, zig-zagging path can result even when the loss decreases.",
    contourLevels: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200],
    f: ({ x, y }) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    gradient: ({ x, y }) => ({ x: 2 * (x - 1) - 400 * x * (y - x * x), y: 200 * (y - x * x) }),
    globalMinimum: { x: 1, y: 1 }, globalMinimumValue: 0,
  },
  rastrigin: {
    id: "rastrigin", label: "Many local minima (Rastrigin)", xBounds: [-5.12, 5.12], yBounds: [-5.12, 5.12],
    description: "A non-convex, periodic surface with many local minima. An optimizer may reach a nearby minimum rather than the global minimum at the origin.",
    contourLevels: [2, 5, 8, 12, 16, 20, 25, 30, 38, 48, 60, 75],
    f: ({ x, y }) => 20 + rastrigin1D(x) + rastrigin1D(y),
    gradient: ({ x, y }) => ({ x: 2 * x + 20 * Math.PI * Math.sin(twoPi * x), y: 2 * y + 20 * Math.PI * Math.sin(twoPi * y) }),
    globalMinimum: { x: 0, y: 0 }, globalMinimumValue: 0,
  },
};

export function safeEvaluate(fn: (p: Point2) => number, p: Point2): number {
  const value = fn(p);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function gradientNorm(g: Point2): number {
  return Math.hypot(g.x, g.y);
}

export function defaultStart(id: LandscapeId): Point2 {
  switch (id) {
    case "saddle": return { x: 1.5, y: 1.25 };
    case "rosenbrock": return { x: -1.5, y: 1.5 };
    case "rastrigin": return { x: 3, y: 2 };
    default: return { x: 3, y: 2 };
  }
}

export function clampStart(id: LandscapeId, p: Point2): Point2 {
  const l = LANDSCAPES[id];
  const clamp = (v: number, bounds: [number, number]) => Math.max(bounds[0], Math.min(bounds[1], v));
  return { x: clamp(p.x, l.xBounds), y: clamp(p.y, l.yBounds) };
}

export function comparisonStarts(id: LandscapeId, primary: Point2): Point2[] {
  const l = LANDSCAPES[id];
  const [x0, x1] = l.xBounds, [y0, y1] = l.yBounds;
  const candidates = [
    primary,
    { x: x0 + (x1 - x0) * 0.2, y: y0 + (y1 - y0) * 0.25 },
    { x: x0 + (x1 - x0) * 0.78, y: y0 + (y1 - y0) * 0.72 },
    { x: x0 + (x1 - x0) * 0.25, y: y0 + (y1 - y0) * 0.78 },
    { x: x0 + (x1 - x0) * 0.72, y: y0 + (y1 - y0) * 0.22 },
  ];
  return candidates.map((p) => ({ x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)) }));
}

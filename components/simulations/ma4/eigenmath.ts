export type Matrix2 = { a: number; b: number; c: number; d: number };
export type Vec2 = { x: number; y: number };
export type Eigenpair = { value: number; vector: Vec2 | null; multiplicity: number };
export type EigenAnalysis = {
  trace: number;
  determinant: number;
  discriminant: number;
  real: boolean;
  eigenvalues: number[];
  pairs: Eigenpair[];
  scalarMatrix: boolean;
};

const EPS = 1e-10;
const norm = (v: Vec2) => Math.hypot(v.x, v.y);
const dot = (u: Vec2, v: Vec2) => u.x * v.x + u.y * v.y;

export function multiplyVector(A: Matrix2, v: Vec2): Vec2 {
  return { x: A.a * v.x + A.b * v.y, y: A.c * v.x + A.d * v.y };
}

export function analyseMatrix(A: Matrix2): EigenAnalysis {
  const trace = A.a + A.d;
  const determinant = A.a * A.d - A.b * A.c;
  const rawDiscriminant = trace * trace - 4 * determinant;
  const scale = Math.max(1, Math.abs(trace * trace), Math.abs(4 * determinant));
  const discriminant = Math.abs(rawDiscriminant) <= EPS * scale ? 0 : rawDiscriminant;
  const real = discriminant >= 0;
  const eigenvalues = real
    ? discriminant === 0
      ? [trace / 2]
      : [(trace + Math.sqrt(discriminant)) / 2, (trace - Math.sqrt(discriminant)) / 2].sort((x, y) => y - x)
    : [];
  const scalarMatrix = Math.abs(A.b) <= EPS && Math.abs(A.c) <= EPS && Math.abs(A.a - A.d) <= EPS;
  const pairs: Eigenpair[] = eigenvalues.map((value) => ({
    value,
    vector: eigenvectorFor(A, value),
    multiplicity: discriminant === 0 ? 2 : 1,
  }));
  return { trace, determinant, discriminant, real, eigenvalues, pairs, scalarMatrix };
}

/** Returns a unit eigenvector for a real eigenvalue, or null if numerical degeneracy prevents a stable direction. */
export function eigenvectorFor(A: Matrix2, lambda: number): Vec2 | null {
  const r1 = { x: A.a - lambda, y: A.b };
  const r2 = { x: A.c, y: A.d - lambda };
  const n1 = norm(r1), n2 = norm(r2);
  const row = n1 >= n2 ? r1 : r2;
  if (Math.max(n1, n2) <= EPS * Math.max(1, Math.abs(lambda), Math.abs(A.a), Math.abs(A.b), Math.abs(A.c), Math.abs(A.d))) return null;
  const n = norm(row);
  if (!Number.isFinite(n) || n <= EPS) return null;
  // A perpendicular vector lies in the null space of the selected row.
  let v = { x: -row.y / n, y: row.x / n };
  const Av = multiplyVector(A, v);
  const residual = norm({ x: Av.x - lambda * v.x, y: Av.y - lambda * v.y });
  if (residual > 1e-6 * Math.max(1, norm(Av), Math.abs(lambda))) {
    // Try the other row when the larger-row construction suffers from round-off.
    const alt = n1 >= n2 ? r2 : r1;
    const an = norm(alt);
    if (an <= EPS) return null;
    v = { x: -alt.y / an, y: alt.x / an };
    const Aalt = multiplyVector(A, v);
    const altResidual = norm({ x: Aalt.x - lambda * v.x, y: Aalt.y - lambda * v.y });
    if (altResidual > 1e-6 * Math.max(1, norm(Aalt), Math.abs(lambda))) return null;
  }
  // Canonical sign makes the display stable as inputs move.
  if (v.x < -EPS || (Math.abs(v.x) <= EPS && v.y < 0)) v = { x: -v.x, y: -v.y };
  return v;
}

export type Alignment = {
  isEigenvector: boolean;
  scalar: number | null;
  residual: number;
  transformed: Vec2;
};

export function testEigenvector(A: Matrix2, v: Vec2, tolerance = 1e-3): Alignment {
  const transformed = multiplyVector(A, v);
  const vNormSquared = dot(v, v);
  if (!Number.isFinite(vNormSquared) || vNormSquared <= EPS) {
    return { isEigenvector: false, scalar: null, residual: Number.POSITIVE_INFINITY, transformed };
  }
  const scalar = dot(v, transformed) / vNormSquared;
  const residual = norm({ x: transformed.x - scalar * v.x, y: transformed.y - scalar * v.y });
  const scale = Math.max(1, norm(transformed), Math.abs(scalar) * Math.sqrt(vNormSquared));
  return {
    isEigenvector: Number.isFinite(residual) && residual <= tolerance * scale,
    scalar: Number.isFinite(scalar) ? scalar : null,
    residual,
    transformed,
  };
}

export function formatNumber(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  const clean = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return clean.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function normalise(v: Vec2): Vec2 {
  const n = norm(v);
  return n <= EPS ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n };
}

export function determinantLabel(det: number): string {
  if (Math.abs(det) <= EPS) return "Singular (area collapses)";
  return det < 0 ? "Orientation reverses" : "Orientation preserved";
}

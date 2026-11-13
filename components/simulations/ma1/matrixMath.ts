import type { Matrix2x2, Vector2D, MatrixProperties } from './types';

export const IDENTITY_MATRIX: Matrix2x2 = [
  [1, 0],
  [0, 1],
];

/**
 * Apply 2x2 matrix to vector: Av = [a*x + b*y, c*x + d*y]
 */
export function transformVector(m: Matrix2x2, v: Vector2D): Vector2D {
  const [[a, b], [c, d]] = m;
  const [x, y] = v;
  return [a * x + b * y, c * x + d * y];
}

/**
 * Multiply two 2x2 matrices: C = A * B
 */
export function multiplyMatrices(A: Matrix2x2, B: Matrix2x2): Matrix2x2 {
  const [[a1, b1], [c1, d1]] = A;
  const [[a2, b2], [c2, d2]] = B;

  return [
    [a1 * a2 + b1 * c2, a1 * b2 + b1 * d2],
    [c1 * a2 + d1 * c2, c1 * b2 + d1 * d2],
  ];
}

/**
 * Determinant: det(A) = ad - bc
 */
export function calculateDeterminant(m: Matrix2x2): number {
  const [[a, b], [c, d]] = m;
  const det = a * d - b * c;
  return Math.abs(det) < 1e-10 ? 0 : det;
}

/**
 * Trace: tr(A) = a + d
 */
export function calculateTrace(m: Matrix2x2): number {
  return m[0][0] + m[1][1];
}

/**
 * Inverse: A^-1 = 1/(ad - bc) * [[d, -b], [-c, a]]
 */
export function calculateInverse(m: Matrix2x2): Matrix2x2 | null {
  const [[a, b], [c, d]] = m;
  const det = calculateDeterminant(m);
  if (Math.abs(det) < 1e-9) {
    return null;
  }
  const invDet = 1 / det;
  return [
    [d * invDet, -b * invDet],
    [-c * invDet, a * invDet],
  ];
}

/**
 * Get matrix properties (det, trace, eigenvalues, invertibility)
 */
export function getMatrixProperties(m: Matrix2x2): MatrixProperties {
  const det = calculateDeterminant(m);
  const absDet = Math.abs(det);
  const trace = calculateTrace(m);
  const inverse = calculateInverse(m);
  const isInvertible = inverse !== null;

  let orientation: MatrixProperties['orientation'] = 'preserved';
  if (det === 0) orientation = 'collapsed';
  else if (det < 0) orientation = 'reversed';

  const discriminant = trace * trace - 4 * det;
  const hasRealEigenvalues = discriminant >= -1e-10;

  let lambda1: number | undefined;
  let lambda2: number | undefined;

  if (hasRealEigenvalues) {
    const sqrtDisc = Math.sqrt(Math.max(0, discriminant));
    lambda1 = (trace + sqrtDisc) / 2;
    lambda2 = (trace - sqrtDisc) / 2;
  }

  return {
    det,
    absDet,
    trace,
    isInvertible,
    inverse,
    orientation,
    eigenvaluesPreview: {
      sum: trace,
      product: det,
      hasRealEigenvalues,
      lambda1,
      lambda2,
    },
  };
}

/**
 * Linear interpolation from identity to target matrix for animation
 */
export function interpolateMatrix(target: Matrix2x2, t: number): Matrix2x2 {
  return [
    [1 + (target[0][0] - 1) * t, target[0][1] * t],
    [target[1][0] * t, 1 + (target[1][1] - 1) * t],
  ];
}

/**
 * Preset matrices as defined in the PDF
 */
export function getPresetMatrix(
  type: 'identity' | 'scaling' | 'rotation' | 'shear' | 'reflection_x' | 'reflection_y' | 'collapse' | 'worked_strang',
  param: { sx?: number; sy?: number; angleDeg?: number; k?: number } = {}
): Matrix2x2 {
  switch (type) {
    case 'identity':
      return [
        [1, 0],
        [0, 1],
      ];

    case 'scaling': {
      const sx = param.sx ?? 1.5;
      const sy = param.sy ?? 0.8;
      return [
        [sx, 0],
        [0, sy],
      ];
    }

    case 'rotation': {
      const rad = ((param.angleDeg ?? 45) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return [
        [round(cos, 4), round(-sin, 4)],
        [round(sin, 4), round(cos, 4)],
      ];
    }

    case 'shear': {
      const k = param.k ?? 1;
      return [
        [1, k],
        [0, 1],
      ];
    }

    case 'reflection_x':
      return [
        [1, 0],
        [0, -1],
      ];

    case 'reflection_y':
      return [
        [-1, 0],
        [0, 1],
      ];

    case 'collapse':
      return [
        [1, 1],
        [1, 1],
      ];

    case 'worked_strang':
      return [
        [2, 1],
        [0, 1],
      ];

    default:
      return IDENTITY_MATRIX;
  }
}

export function round(value: number, decimals: number = 2): number {
  if (Math.abs(value) < 1e-9) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}


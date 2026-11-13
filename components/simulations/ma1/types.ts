export type Matrix2x2 = [[number, number], [number, number]]; // [[a, b], [c, d]]
export type Vector2D = [number, number]; // [x, y]

export interface MatrixProperties {
  det: number;
  absDet: number;
  trace: number;
  isInvertible: boolean;
  inverse: Matrix2x2 | null;
  orientation: 'preserved' | 'reversed' | 'collapsed';
  eigenvaluesPreview?: {
    sum: number;
    product: number;
    hasRealEigenvalues: boolean;
    lambda1?: number;
    lambda2?: number;
  };
}

export type Preset = {
  id: string;
  label: string;
  matrix: Matrix2x2;
  hint: string;
};

export const PRESETS: Preset[] = [
  {
    id: 'worked_strang',
    label: 'A = [2 1; 0 1]  (Start here - Strang Worked Example)',
    matrix: [
      [2, 1],
      [0, 1],
    ],
    hint: 'From Strang (PDF p. 3). e₁ lands at (2,0) and e₂ lands at (1,1). Unit square becomes a parallelogram of area 2. det(A) = 2, tr(A) = 3.',
  },
  {
    id: 'shear',
    label: 'A = [1 1; 0 1]  (Horizontal Shear)',
    matrix: [
      [1, 1],
      [0, 1],
    ],
    hint: 'Slants the unit square into a parallelogram without changing its height or base. det(A) = 1, so area is unchanged.',
  },
  {
    id: 'rotation90',
    label: 'A = [0 −1; 1 0]  (90° Rotation)',
    matrix: [
      [0, -1],
      [1, 0],
    ],
    hint: 'Rotates the entire plane 90° counterclockwise about origin. det(A) = 1 (area unchanged), tr(A) = 0. Notice AB ≠ BA when composed with shear!',
  },
  {
    id: 'scaling',
    label: 'A = [1.5 0; 0 0.8]  (Non-Uniform Scaling)',
    matrix: [
      [1.5, 0],
      [0, 0.8],
    ],
    hint: 'Stretches horizontally by 1.5 and compresses vertically by 0.8. det(A) = 1.2, so all areas grow by 20%.',
  },
  {
    id: 'reflection_x',
    label: 'A = [1 0; 0 −1]  (Reflection across X-Axis)',
    matrix: [
      [1, 0],
      [0, -1],
    ],
    hint: 'Flips the plane across the x-axis. det(A) = −1. The negative sign means spatial orientation is reversed (clockwise becomes counterclockwise).',
  },
  {
    id: 'collapse',
    label: 'A = [1 1; 1 1]  (Singular Matrix: Det = 0 Collapse)',
    matrix: [
      [1, 1],
      [1, 1],
    ],
    hint: 'det(A) = 0! The 2D plane collapses onto a single line (x = y). No inverse exists because 2D information has been flattened into 1D.',
  },
  {
    id: 'identity',
    label: 'A = [1 0; 0 1]  (Identity: No Change)',
    matrix: [
      [1, 0],
      [0, 1],
    ],
    hint: 'Leaves every point and basis vector unchanged: e₁ stays at (1,0) and e₂ stays at (0,1). det(A) = 1, tr(A) = 2.',
  },
];

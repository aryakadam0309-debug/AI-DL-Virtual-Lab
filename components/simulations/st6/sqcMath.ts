import {
  type SubgroupData,
  type ControlLimits,
  SPC_FACTORS,
} from "./types";

// Box-Muller standard normal generator
export function randomNormal(mean = 0, sd = 1): number {
  const u1 = Math.max(1e-10, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * sd;
}

// Standard normal cumulative distribution function (Abramowitz & Stegun approximation)
export function standardNormalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;

  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228; // 1 / sqrt(2 * pi)

  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t;
  const pdf = c * Math.exp(-0.5 * absZ * absZ);
  const tail = pdf * poly;

  return z >= 0 ? 1.0 - tail : tail;
}

export function computeXbarLimits(mu0: number, sigma0: number, n: number): ControlLimits {
  const se = sigma0 / Math.sqrt(n);
  return {
    center: mu0,
    ucl: mu0 + 3 * se,
    lcl: mu0 - 3 * se,
    se,
    sigma1Upper: mu0 + se,
    sigma1Lower: mu0 - se,
    sigma2Upper: mu0 + 2 * se,
    sigma2Lower: mu0 - 2 * se,
  };
}

export function computeRLimits(meanR: number, n: number): { center: number; ucl: number; lcl: number } {
  const factors = SPC_FACTORS[n] || SPC_FACTORS[5];
  return {
    center: meanR,
    ucl: factors.D4 * meanR,
    lcl: factors.D3 * meanR,
  };
}

export function calculateTheoreticalARL(delta: number, n: number): { arl1: number; detectionProb: number } {
  if (Math.abs(delta) < 1e-6) {
    const p0 = 2 * (1 - standardNormalCdf(3.0)); // ~0.0026998
    return { arl1: 1 / p0, detectionProb: p0 };
  }
  const shiftInSE = delta * Math.sqrt(n);
  const pUpper = 1.0 - standardNormalCdf(3.0 - shiftInSE);
  const pLower = standardNormalCdf(-3.0 - shiftInSE);
  const p = pUpper + pLower;
  const arl1 = p > 0 ? 1 / p : Infinity;
  return { arl1, detectionProb: p };
}

export function generateSubgroups(
  k: number,
  n: number,
  mu0: number,
  sigma0: number,
  delta: number,
  shiftStart: number,
  xbarLimits: ControlLimits,
  rLimits: { ucl: number; lcl: number }
): SubgroupData[] {
  const subgroups: SubgroupData[] = [];

  for (let i = 1; i <= k; i++) {
    const isShifted = i >= shiftStart && delta !== 0;
    const currentMean = isShifted ? mu0 + delta * sigma0 : mu0;

    const values = new Array(n);
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let j = 0; j < n; j++) {
      const val = randomNormal(currentMean, sigma0);
      values[j] = val;
      sum += val;
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const mean = sum / n;
    const range = max - min;

    const outOfControlXbar = mean > xbarLimits.ucl || mean < xbarLimits.lcl;
    const outOfControlR = range > rLimits.ucl || range < rLimits.lcl;

    subgroups.push({
      subgroupId: i,
      values,
      mean,
      range,
      min,
      max,
      isShifted,
      outOfControlXbar,
      outOfControlR,
    });
  }

  return subgroups;
}

export function fmt(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return "—";
  return val.toFixed(decimals);
}


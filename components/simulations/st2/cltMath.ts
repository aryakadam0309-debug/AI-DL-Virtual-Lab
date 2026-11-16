import { type PopulationConfig, type SampleRun } from "./types";

export function drawSample(pop: PopulationConfig, n: number): SampleRun {
  const points: number[] = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const val = pop.sample();
    points[i] = val;
    sum += val;
  }
  return {
    points,
    mean: sum / n,
  };
}

export function drawMultipleSampleMeans(pop: PopulationConfig, n: number, count: number): number[] {
  const means = new Float64Array(count);
  for (let c = 0; c < count; c++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += pop.sample();
    }
    means[c] = sum / n;
  }
  return Array.from(means);
}

export interface SummaryStats {
  count: number;
  mean: number;
  sd: number;
  skewness: number;
  min: number;
  max: number;
}

export function computeSummaryStats(data: number[]): SummaryStats {
  const count = data.length;
  if (count === 0) {
    return { count: 0, mean: 0, sd: 0, skewness: 0, min: 0, max: 0 };
  }

  let sum = 0;
  let min = data[0];
  let max = data[0];
  for (let i = 0; i < count; i++) {
    const v = data[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / count;

  let sumSq = 0;
  let sumCube = 0;
  for (let i = 0; i < count; i++) {
    const diff = data[i] - mean;
    sumSq += diff * diff;
    sumCube += diff * diff * diff;
  }

  const variance = count > 1 ? sumSq / (count - 1) : 0;
  const sd = Math.sqrt(variance);

  // Sample skewness formula
  let skewness = 0;
  if (count > 2 && sd > 1e-9) {
    const m3 = sumCube / count;
    const s3 = Math.pow(sumSq / count, 1.5);
    skewness = s3 > 0 ? m3 / s3 : 0;
  }

  return {
    count,
    mean,
    sd,
    skewness,
    min,
    max,
  };
}

export interface HistogramBin {
  x0: number;
  x1: number;
  mid: number;
  count: number;
  density: number; // density = count / (N * binWidth)
}

export function computeHistogram(data: number[], numBins = 30, xMin?: number, xMax?: number): { bins: HistogramBin[]; maxDensity: number } {
  if (data.length === 0) return { bins: [], maxDensity: 0 };

  const minVal = xMin !== undefined ? xMin : Math.min(...data);
  const maxVal = xMax !== undefined ? xMax : Math.max(...data);
  const range = Math.max(1e-6, maxVal - minVal);
  const binWidth = range / numBins;

  const bins: HistogramBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const x0 = minVal + i * binWidth;
    const x1 = x0 + binWidth;
    bins.push({
      x0,
      x1,
      mid: (x0 + x1) / 2,
      count: 0,
      density: 0,
    });
  }

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    let binIdx = Math.floor((v - minVal) / binWidth);
    if (binIdx < 0) binIdx = 0;
    if (binIdx >= numBins) binIdx = numBins - 1;
    bins[binIdx].count++;
  }

  const total = data.length;
  let maxDensity = 0;
  for (let i = 0; i < numBins; i++) {
    bins[i].density = bins[i].count / (total * binWidth);
    if (bins[i].density > maxDensity) {
      maxDensity = bins[i].density;
    }
  }

  return { bins, maxDensity };
}

export function normalPdf(x: number, mean: number, sd: number): number {
  if (sd <= 1e-9) return 0;
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export function fmt(val: number, decimals = 4): string {
  if (!Number.isFinite(val)) return "—";
  return val.toFixed(decimals);
}


export interface TimeSeriesData { values: number[]; labels: string[]; source: "generated" | "csv"; description: string }
export interface SeriesConfig {
  preset: "ar1" | "randomWalk" | "trend" | "seasonal" | "combined";
  length: number;
  seed: number;
  intercept: number;
  trend: number;
  amplitude: number;
  period: number;
  noiseSd: number;
  phi: number;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(random: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const x = spare; spare = null; return x; }
    let u = 0; while (u <= Number.EPSILON) u = random();
    const v = random(), mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

export function generateSeries(c: SeriesConfig): TimeSeriesData {
  if (!Number.isInteger(c.length) || c.length < 24 || c.length > 1000) throw new Error("Series length must be an integer from 24 to 1,000.");
  if ((c.preset === "seasonal" || c.preset === "combined") && (!Number.isInteger(c.period) || c.period < 2 || c.period > Math.floor(c.length / 2))) throw new Error("Seasonal period must be between 2 and half the series length.");
  if (![c.intercept, c.trend, c.amplitude, c.noiseSd, c.phi].every(Number.isFinite) || c.noiseSd < 0 || (c.preset === "ar1" && Math.abs(c.phi) >= 0.98)) throw new Error("Invalid series parameter. Noise must be non-negative and an AR(1) coefficient must have |phi| below 0.98.");
  const random = mulberry32(c.seed), noise = gaussian(random);
  const values: number[] = [];
  let previous = c.intercept;
  for (let t = 0; t < c.length; t++) {
    const e = c.noiseSd * noise();
    let y: number;
    switch (c.preset) {
      case "ar1": y = c.intercept * (1 - c.phi) + c.phi * previous + e; previous = y; break;
      case "randomWalk": y = (t === 0 ? c.intercept : previous) + e; previous = y; break;
      case "trend": y = c.intercept + c.trend * t + e; break;
      case "seasonal": y = c.intercept + c.amplitude * Math.sin(2 * Math.PI * t / c.period) + e; break;
      default: y = c.intercept + c.trend * t + c.amplitude * Math.sin(2 * Math.PI * t / c.period) + e;
    }
    values.push(y);
  }
  const labels = values.map((_, i) => String(i + 1));
  return { values, labels, source: "generated", description: c.preset };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell.length > 0 || row.length > 0) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

const TIME_HEADERS = new Set(["time", "date", "datetime", "timestamp", "period", "month", "year", "index"]);
const VALUE_HEADERS = new Set(["value", "values", "y", "observation", "observations", "close", "sales", "amount", "demand"]);

export function parseTimeSeriesCsv(csvText: string): TimeSeriesData {
  if (!csvText.trim()) throw new Error("The CSV file is empty.");
  const rows = parseCsvRows(csvText.replace(/^\uFEFF/, ""));
  if (rows.length < 12) throw new Error("CSV must contain at least 12 non-empty rows of observations.");
  const width = Math.max(...rows.map(r => r.length));
  if (width < 1 || width > 20) throw new Error("CSV must contain between 1 and 20 columns.");
  if (rows.some(r => r.length !== width)) throw new Error("CSV rows have inconsistent column counts. Check delimiters and quoted values.");

  const first = rows[0].map(x => x.toLowerCase().replace(/[^a-z]/g, ""));
  const recognisedHeader = first.some(x => TIME_HEADERS.has(x) || VALUE_HEADERS.has(x));
  const allFirstRowCellsNonNumeric = rows[0].every(x => x.trim() !== "" && !Number.isFinite(Number(x)));
  const hasHeader = recognisedHeader || allFirstRowCellsNonNumeric;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length < 12) throw new Error("CSV must contain at least 12 observations after the header.");
  let valueCol = hasHeader ? first.findIndex(x => VALUE_HEADERS.has(x)) : -1;
  let timeCol = hasHeader ? first.findIndex(x => TIME_HEADERS.has(x)) : -1;
  const numericColumns = Array.from({ length: width }, (_, i) => i).filter(i => dataRows.every(r => r[i].trim() !== "" && Number.isFinite(Number(r[i]))));
  if (valueCol < 0) {
    if (numericColumns.length !== 1) throw new Error("Could not identify one unambiguous numeric value column. Name it 'value' or 'y' in the CSV header.");
    valueCol = numericColumns[0];
  }
  if (!hasHeader && timeCol < 0 && width > 1) {
    const textColumns = Array.from({ length: width }, (_, i) => i).filter(i => i !== valueCol && dataRows.every(r => r[i].trim() !== "" && !Number.isFinite(Number(r[i]))));
    if (textColumns.length === 1) timeCol = textColumns[0];
  }
  const values: number[] = [], labels: string[] = [];
  dataRows.forEach((row, index) => {
    const raw = row[valueCol]?.trim();
    if (!raw) throw new Error(`Missing observation at data row ${index + 1}. Missing values are not silently dropped.`);
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`Non-numeric observation '${raw}' at data row ${index + 1}.`);
    values.push(value);
    labels.push(timeCol >= 0 ? row[timeCol] : String(index + 1));
  });
  if (timeCol >= 0) {
    const parsed = labels.map(x => {
      const n = Number(x); if (x.trim() !== "" && Number.isFinite(n)) return n;
      const d = Date.parse(x); return Number.isFinite(d) ? d : NaN;
    });
    if (!parsed.every(Number.isFinite)) {
      throw new Error("The selected time/date column contains values that cannot be interpreted as increasing numeric times or dates. Use consistent numeric indices or valid dates.");
    }
    for (let i = 1; i < parsed.length; i++) {
      if (parsed[i] <= parsed[i - 1]) throw new Error("Time/date values must be unique and strictly increasing in the CSV. Sort the data chronologically first.");
    }
  }
  return { values, labels, source: "csv", description: "Uploaded CSV" };
}

export function firstDifference(values: number[], order = 1): number[] {
  if (!Number.isInteger(order) || order < 0 || order > 2) throw new Error("Differencing order must be 0, 1 or 2.");
  let out = values.slice();
  for (let d = 0; d < order; d++) out = out.slice(1).map((v, i) => v - out[i]);
  return out;
}

function mean(a: number[]) { return a.reduce((s, v) => s + v, 0) / a.length; }
function movingAverageCentered(values: number[], period: number): (number | null)[] {
  const n = values.length, out: (number | null)[] = Array(n).fill(null);
  if (period % 2 === 1) {
    const half = Math.floor(period / 2);
    for (let t = half; t < n - half; t++) out[t] = mean(values.slice(t - half, t + half + 1));
  } else {
    const half = period / 2;
    const ma = Array(n - period + 1).fill(0).map((_, i) => mean(values.slice(i, i + period)));
    for (let t = half; t < n - half; t++) {
      const left = ma[t - half], right = ma[t - half + 1];
      if (Number.isFinite(left) && Number.isFinite(right)) out[t] = (left + right) / 2;
    }
  }
  return out;
}

export interface Decomposition { trend: (number | null)[]; seasonal: number[]; remainder: (number | null)[]; mode: "additive" | "multiplicative"; period: number; }
export function decomposeSeries(values: number[], period: number, mode: "additive" | "multiplicative" = "additive"): Decomposition {
  if (!Number.isInteger(period) || period < 2 || period > Math.floor(values.length / 2)) throw new Error("Seasonal period must be between 2 and half the series length.");
  if (mode === "multiplicative" && values.some(v => v <= 0)) throw new Error("Multiplicative decomposition requires every observation to be positive. Use additive mode for zero or negative values.");
  const trend = movingAverageCentered(values, period);
  const buckets: number[][] = Array.from({ length: period }, () => []);
  values.forEach((v, i) => {
    if (trend[i] !== null && trend[i] !== 0) buckets[i % period].push(mode === "additive" ? v - trend[i]! : v / trend[i]!);
  });
  let seasonal = buckets.map(b => b.length ? mean(b) : mode === "additive" ? 0 : 1);
  if (mode === "additive") {
    const correction = mean(seasonal);
    seasonal = seasonal.map(v => v - correction);
  } else {
    const correction = mean(seasonal);
    if (!Number.isFinite(correction) || correction <= 0) throw new Error("Could not estimate positive multiplicative seasonal indices.");
    seasonal = seasonal.map(v => v / correction);
  }
  const remainder = values.map((v, i) => trend[i] === null ? null : mode === "additive" ? v - trend[i]! - seasonal[i % period] : v / (trend[i]! * seasonal[i % period]));
  return { trend, seasonal, remainder, mode, period };
}

export function seasonallyAdjust(values: number[], decomposition: Decomposition): number[] {
  return values.map((v, i) => decomposition.mode === "additive" ? v - decomposition.seasonal[i % decomposition.period] : v / decomposition.seasonal[i % decomposition.period]);
}
export function reapplySeasonality(value: number, futureIndex: number, decomposition: Decomposition): number {
  const seasonal = decomposition.seasonal[futureIndex % decomposition.period];
  return decomposition.mode === "additive" ? value + seasonal : value * seasonal;
}

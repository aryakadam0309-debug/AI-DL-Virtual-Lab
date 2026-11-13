"use client";

import type { Trajectory } from "./optimizers";
import styles from "./ma5sim.module.css";

const W = 680, H = 220, M = { l: 54, r: 18, t: 16, b: 34 };
const COLORS = ["#2563eb", "#0f766e", "#9333ea", "#d97706", "#dc2626"];
export default function LossPlot({ trajectories, activeIteration }: { trajectories: Trajectory[]; activeIteration: number }) {
  const visible = trajectories.map((t) => t.points.slice(0, Math.min(activeIteration, t.points.length - 1) + 1)).filter((p) => p.length > 0);
  const values = trajectories.flatMap((t) => t.points.map((p) => p.loss)).filter(Number.isFinite);
  let min = Math.min(0, ...values), max = Math.max(1, ...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (max - min < 1e-8) { max += 0.5; min -= 0.5; }
  const maxN = Math.max(10, ...trajectories.map((t) => t.points.length - 1));
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const sx = (n: number) => M.l + n / maxN * pw;
  const sy = (loss: number) => M.t + (max - Math.max(min, Math.min(max, loss))) / (max - min) * ph;
  const yticks = Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4);
  return <svg viewBox={`0 0 ${W} ${H}`} className={styles.lossPlot} role="img" aria-label="Objective value against iteration for the optimizer trajectories currently shown. The vertical scale is linear." >
    {yticks.map((t, i) => <g key={`y${i}`}><line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className={styles.plotGrid} /><text x={M.l - 8} y={sy(t) + 4} textAnchor="end" className={styles.plotTick}>{Math.abs(t) >= 1000 ? t.toExponential(1) : Number(t.toPrecision(3))}</text></g>)}
    <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className={styles.plotAxis} />
    {visible.map((points, i) => <g key={`loss${i}`}>
      <polyline points={points.map((p, n) => `${sx(n)},${sy(p.loss)}`).join(" ")} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={i === 0 ? 2.7 : 1.8} strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && <circle cx={sx(points.length - 1)} cy={sy(points[points.length - 1].loss)} r="4" fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />}
    </g>)}
    <line x1={sx(Math.min(activeIteration, maxN))} x2={sx(Math.min(activeIteration, maxN))} y1={M.t} y2={H - M.b} className={styles.iterationCursor} />
    <text x={M.l + pw / 2} y={H - 6} textAnchor="middle" className={styles.plotLabel}>iteration</text>
    <text x={12} y={M.t + ph / 2} textAnchor="middle" transform={`rotate(-90 12 ${M.t + ph / 2})`} className={styles.plotLabel}>objective f(x, y)</text>
    {visible.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" className={styles.plotTick}>Run the optimizer to see loss history</text>}
  </svg>;
}

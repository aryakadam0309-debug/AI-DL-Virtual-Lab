"use client";

import { useId, useMemo, type MouseEvent } from "react";
import { LANDSCAPES, type Landscape, type LandscapeId, type Point2 } from "./landscapes";
import type { Trajectory } from "./optimizers";
import styles from "./ma5sim.module.css";

const W = 680, H = 470, M = { l: 48, r: 18, t: 18, b: 42 };
const PATH_COLORS = ["#2563eb", "#0f766e", "#9333ea", "#d97706", "#dc2626"];
type Segment = { level: number; d: string };
type Cell = { x: number; y: number; w: number; h: number; fill: string };

function colorFor(t: number): string {
  const stops = [
    { t: 0, c: [236, 242, 250] }, { t: 0.32, c: [154, 194, 218] },
    { t: 0.62, c: [240, 212, 139] }, { t: 1, c: [191, 94, 80] },
  ];
  const q = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < stops.length - 2 && q > stops[i + 1].t) i += 1;
  const a = stops[i], b = stops[i + 1], u = (q - a.t) / (b.t - a.t);
  const c = a.c.map((v, j) => Math.round(v + (b.c[j] - v) * u));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function makeSurface(l: Landscape, sx: (x: number) => number, sy: (y: number) => number, nx = 48, ny = 42): { cells: Cell[]; segments: Segment[] } {
  const [x0, x1] = l.xBounds, [y0, y1] = l.yBounds;
  const xs = Array.from({ length: nx + 1 }, (_, i) => x0 + (x1 - x0) * i / nx);
  const ys = Array.from({ length: ny + 1 }, (_, i) => y0 + (y1 - y0) * i / ny);
  const values = ys.map((y) => xs.map((x) => {
    const value = l.f({ x, y });
    return Number.isFinite(value) ? Math.max(-1e5, Math.min(1e5, value)) : 1e5;
  }));
  const all = values.flat();
  let low = Math.min(...all), high = Math.max(...all);
  // Clip a few extreme corners on the Rosenbrock surface so the valley remains visible.
  if (l.id === "rosenbrock") { low = 0; high = 200; }
  const cells: Cell[] = [];
  for (let j = 0; j < ny; j += 1) for (let i = 0; i < nx; i += 1) {
    const vals = [values[j][i], values[j][i + 1], values[j + 1][i + 1], values[j + 1][i]];
    const v = vals.reduce((s, x) => s + Math.max(low, Math.min(high, x)), 0) / vals.length;
    cells.push({ x: sx(xs[i]), y: sy(ys[j + 1]), w: sx(xs[i + 1]) - sx(xs[i]) + 0.4, h: sy(ys[j]) - sy(ys[j + 1]) + 0.4, fill: colorFor((v - low) / Math.max(1e-10, high - low)) });
  }
  const segments: Segment[] = [];
  for (const level of l.contourLevels) {
    let d = "";
    for (let j = 0; j < ny; j += 1) for (let i = 0; i < nx; i += 1) {
      const xL = xs[i], xR = xs[i + 1], yT = ys[j], yB = ys[j + 1];
      // Corner order top-left, top-right, bottom-right, bottom-left.
      const ps: Point2[] = [{ x: xL, y: yT }, { x: xR, y: yT }, { x: xR, y: yB }, { x: xL, y: yB }];
      const vs = [values[j][i], values[j][i + 1], values[j + 1][i + 1], values[j + 1][i]];
      const intersections: Point2[] = [];
      for (let edge = 0; edge < 4; edge += 1) {
        const next = (edge + 1) % 4, va = vs[edge], vb = vs[next];
        if ((va < level && vb >= level) || (va >= level && vb < level)) {
          const den = vb - va;
          const t = Math.abs(den) < 1e-14 ? 0.5 : (level - va) / den;
          intersections.push({ x: ps[edge].x + t * (ps[next].x - ps[edge].x), y: ps[edge].y + t * (ps[next].y - ps[edge].y) });
        }
      }
      for (let k = 0; k + 1 < intersections.length; k += 2) {
        const a = intersections[k], b = intersections[k + 1];
        d += `M${sx(a.x).toFixed(2)},${sy(a.y).toFixed(2)}L${sx(b.x).toFixed(2)},${sy(b.y).toFixed(2)}`;
      }
    }
    segments.push({ level, d });
  }
  return { cells, segments };
}

function pathFor(points: { x: number; y: number }[], sx: (x: number) => number, sy: (y: number) => number) {
  return points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" ");
}

export default function ContourPlot({ landscapeId, trajectories, activeIteration, start, onPick }: {
  landscapeId: LandscapeId; trajectories: Trajectory[]; activeIteration: number; start: Point2; onPick: (p: Point2) => void;
}) {
  const l = LANDSCAPES[landscapeId];
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const sx = (x: number) => M.l + ((x - l.xBounds[0]) / (l.xBounds[1] - l.xBounds[0])) * pw;
  const sy = (y: number) => M.t + ((l.yBounds[1] - y) / (l.yBounds[1] - l.yBounds[0])) * ph;
  const uniqueId = useId().replace(/:/g, "");
  const uid = `${uniqueId}-contour-${landscapeId}`;
  const surface = useMemo(() => makeSurface(
    l,
    (x) => M.l + ((x - l.xBounds[0]) / (l.xBounds[1] - l.xBounds[0])) * pw,
    (y) => M.t + ((l.yBounds[1] - y) / (l.yBounds[1] - l.yBounds[0])) * ph,
  ), [l, pw, ph]);
  const xticks = [l.xBounds[0], (3 * l.xBounds[0] + l.xBounds[1]) / 4, (l.xBounds[0] + l.xBounds[1]) / 2, (l.xBounds[0] + 3 * l.xBounds[1]) / 4, l.xBounds[1]];
  const yticks = [l.yBounds[0], (3 * l.yBounds[0] + l.yBounds[1]) / 4, (l.yBounds[0] + l.yBounds[1]) / 2, (l.yBounds[0] + 3 * l.yBounds[1]) / 4, l.yBounds[1]];
  const click = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    const py = (e.clientY - rect.top) / rect.height * H;
    if (px < M.l || px > W - M.r || py < M.t || py > H - M.b) return;
    const x = l.xBounds[0] + ((px - M.l) / pw) * (l.xBounds[1] - l.xBounds[0]);
    const y = l.yBounds[1] - ((py - M.t) / ph) * (l.yBounds[1] - l.yBounds[0]);
    onPick({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  };
  const globalMin = l.globalMinimum;
  return <svg viewBox={`0 0 ${W} ${H}`} className={styles.contourPlot} role="img" aria-label={`Interactive contour plot of ${l.label}. The colored background indicates objective value; lines show contours and colored paths show optimizer updates. Click inside to change the starting point.`} onClick={click}>
    <defs><clipPath id={uid}><rect x={M.l} y={M.t} width={pw} height={ph} /></clipPath></defs>
    <rect x={M.l} y={M.t} width={pw} height={ph} rx="6" fill="#f3f6fa" />
    <g clipPath={`url(#${uid})`}>
      {surface.cells.map((c, i) => <rect key={`cell${i}`} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} />)}
      {xticks.map((t, i) => <line key={`gx${i}`} x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} className={styles.plotGrid} />)}
      {yticks.map((t, i) => <line key={`gy${i}`} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className={styles.plotGrid} />)}
      {surface.segments.map((s, i) => <path key={`contour${i}`} d={s.d} className={styles.contourLine} />)}
      {trajectories.map((tr, i) => {
        const visible = tr.points.slice(0, Math.min(activeIteration, tr.points.length - 1) + 1);
        if (visible.length < 1) return null;
        const color = PATH_COLORS[i % PATH_COLORS.length];
        const last = visible[visible.length - 1];
        return <g key={`trajectory${i}`}>
          {visible.length > 1 && <path d={pathFor(visible, sx, sy)} fill="none" stroke={color} strokeWidth={i === 0 ? 3.1 : 2.1} strokeLinecap="round" strokeLinejoin="round" opacity={i === 0 ? 1 : 0.82} />}
          {visible.length > 1 && visible.filter((_, j) => j % Math.max(1, Math.ceil(visible.length / 9)) === 0).map((p, j) => <circle key={`step${j}`} cx={sx(p.x)} cy={sy(p.y)} r="2.8" fill={color} stroke="white" strokeWidth=".8" />)}
          <circle cx={sx(last.x)} cy={sy(last.y)} r={i === 0 ? 6 : 4.5} fill={color} stroke="white" strokeWidth="2" />
        </g>;
      })}
      {globalMin && <g><circle cx={sx(globalMin.x)} cy={sy(globalMin.y)} r="8" fill="none" stroke="#166534" strokeWidth="2.5" /><path d={`M${sx(globalMin.x)-4},${sy(globalMin.y)}L${sx(globalMin.x)-1},${sy(globalMin.y)+3}L${sx(globalMin.x)+5},${sy(globalMin.y)-4}`} fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g>}
    </g>
    {xticks.map((t, i) => <text key={`xt${i}`} x={sx(t)} y={H - M.b + 20} textAnchor="middle" className={styles.plotTick}>{Number(t.toFixed(2))}</text>)}
    {yticks.map((t, i) => <text key={`yt${i}`} x={M.l - 9} y={sy(t) + 4} textAnchor="end" className={styles.plotTick}>{Number(t.toFixed(2))}</text>)}
    <text x={M.l + pw / 2} y={H - 6} className={styles.plotLabel} textAnchor="middle">x</text>
    <text x={12} y={M.t + ph / 2} className={styles.plotLabel} textAnchor="middle" transform={`rotate(-90 12 ${M.t + ph / 2})`}>y</text>
    {trajectories.length > 0 && <text x={W - M.r - 5} y={M.t + 15} textAnchor="end" className={styles.plotMeta}>iteration {activeIteration}</text>}
    <g><circle cx={sx(start.x)} cy={sy(start.y)} r="5.5" fill="#1d4ed8" stroke="#fff" strokeWidth="2" /><text x={sx(start.x) + 8} y={sy(start.y) - 8} className={styles.startLabel}>start</text></g>
  </svg>;
}

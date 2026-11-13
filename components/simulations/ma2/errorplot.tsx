import { useRef } from "react";
import styles from "./classNames";
import { niceTicks, type BisectionStep, type NewtonStep } from "./numeric";
import usePlotWidth from "./usePlotWidth";

const BASE_W = 560, BASE_H = 260, M = { l: 48, r: 14, t: 12, b: 34 };
const lg = (e: number) => Math.log10(Math.max(e, 1e-17));

type Props = {
  bis: BisectionStep[]; newt: NewtonStep[]; nB: number; nN: number;
  showB: boolean; showN: boolean; cur: number; maxN: number;
};

export default function ErrorPlot({ bis, newt, nB, nN, showB, showN, cur, maxN }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = usePlotWidth(svgRef, BASE_W);
  const H = (W * BASE_H) / BASE_W;
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const xmax = Math.max(maxN, 4);
  const all = [...(showB ? bis.map((s) => lg(s.err)) : []), ...(showN ? newt.map((s) => lg(s.err)) : [])];
  const yTop = Math.max(1, Math.ceil(Math.max(0, ...all))), yBot = -17;
  const sx = (n: number) => M.l + (n / xmax) * pw;
  const sy = (v: number) => M.t + ((yTop - v) / (yTop - yBot)) * ph;
  const bp = bis.slice(0, nB).map((s) => [sx(s.n), sy(lg(s.err))]);
  const np = newt.slice(0, nN + 1).map((s) => [sx(s.n), sy(lg(s.err))]);
  const yt: number[] = [];
  for (let v = -16; v <= yTop; v += 4) yt.push(v);
  const empty = (showB ? bis.length : 0) + (showN ? newt.length : 0) === 0;
  const pts = (a: number[][]) => a.map((p) => p.join(",")).join(" ");

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.plot} role="img"
      aria-label="Error against iteration number on a log scale. A straight line means linear convergence; a steep drop means quadratic convergence.">
      {yt.map((v) => (
        <g key={`y${v}`}><line className={styles.gl} x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} />
          <text className={styles.tick} x={M.l - 6} y={sy(v) + 4} textAnchor="end">1e{v}</text></g>
      ))}
      {niceTicks(0, xmax, 8).filter(Number.isInteger).map((t) => (
        <text key={`x${t}`} className={styles.tick} x={sx(t)} y={H - M.b + 16} textAnchor="middle">{t}</text>
      ))}
      <text className={styles.tick} x={M.l + pw / 2} y={H - 4} textAnchor="middle">iteration n</text>
      <line className={styles.axis} x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />
      <line className={styles.limit} x1={M.l} x2={W - M.r} y1={sy(Math.log10(2.2e-16))} y2={sy(Math.log10(2.2e-16))} />
      <text className={styles.tick} x={W - M.r - 4} y={sy(Math.log10(2.2e-16)) - 5} textAnchor="end">double precision limit</text>
      <line className={styles.cursor} x1={sx(Math.min(cur, xmax))} x2={sx(Math.min(cur, xmax))} y1={M.t} y2={H - M.b} />
      {empty && <text className={styles.tick} x={M.l + pw / 2} y={M.t + ph / 2} textAnchor="middle">No iterations to plot</text>}
      {showB && <><polyline className={styles.serB} points={pts(bp)} />
        {bp.map((p, i) => <rect key={`b${i}`} className={styles.mkB} x={p[0] - 3.5} y={p[1] - 3.5} width={7} height={7} />)}</>}
      {showN && <><polyline className={styles.serN} points={pts(np)} />
        {np.map((p, i) => <circle key={`n${i}`} className={styles.mkN} cx={p[0]} cy={p[1]} r={4} />)}</>}
    </svg>
  );
}

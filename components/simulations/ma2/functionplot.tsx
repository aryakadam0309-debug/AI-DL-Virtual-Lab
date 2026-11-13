import { useId, useRef } from "react";
import styles from "./classNames";
import { niceTicks, sub, type BisectionStep, type NewtonStep, type Preset } from "./numeric";
import usePlotWidth from "./usePlotWidth";

const BASE_W = 560, BASE_H = 320, M = { l: 40, r: 14, t: 12, b: 28 };

type Props = {
  preset: Preset; a: number; b: number; showB: boolean; showN: boolean;
  bis: BisectionStep[]; newt: NewtonStep[]; onPick?: (x: number) => void;
};

export default function FunctionPlot({ preset: p, a, b, showB, showN, bis, newt, onPick }: Props) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const W = usePlotWidth(svgRef, BASE_W);
  const H = (W * BASE_H) / BASE_W;
  const [x0, x1] = p.view.x, [y0, y1] = p.view.y;
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const sx = (x: number) => M.l + ((x - x0) / (x1 - x0)) * pw;
  const sy = (y: number) => M.t + (1 - (y - y0) / (y1 - y0)) * ph;
  const inX = (x: number) => x >= x0 && x <= x1;

  let d = "";
  for (let i = 0; i <= 240; i++) {
    const x = x0 + ((x1 - x0) * i) / 240;
    d += `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(p.f(x)).toFixed(1)}`;
  }

  const lastB = bis[bis.length - 1];
  const lo = lastB ? lastB.na : Math.min(a, b), hi = lastB ? lastB.nb : Math.max(a, b);
  const cn = newt[newt.length - 1];
  const yAxis = sy(Math.min(Math.max(0, y0), y1));

  const click = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPick || !showN) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = x0 + ((((e.clientX - r.left) / r.width) * W - M.l) / pw) * (x1 - x0);
    if (inX(x)) onPick(Math.round(x * 1000) / 1000);
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className={styles.plot} onClick={click} style={{ cursor: showN && onPick ? "crosshair" : "default" }}
      role="img" aria-label="Graph of f(x) showing the bisection interval and the Newton-Raphson tangent line at the current step">
      <defs><clipPath id={`${uid}c`}><rect x={M.l} y={M.t} width={pw} height={ph} /></clipPath></defs>
      {niceTicks(y0, y1, 5).map((t) => (
        <g key={`y${t}`}><line className={styles.gl} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} />
          <text className={styles.tick} x={M.l - 6} y={sy(t) + 4} textAnchor="end">{t}</text></g>
      ))}
      {niceTicks(x0, x1, 6).map((t) => (
        <g key={`x${t}`}><line className={styles.gl} x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} />
          <text className={styles.tick} x={sx(t)} y={H - M.b + 16} textAnchor="middle">{t}</text></g>
      ))}
      <line className={styles.axis} x1={M.l} x2={W - M.r} y1={yAxis} y2={yAxis} />
      {inX(0) && <line className={styles.axis} x1={sx(0)} x2={sx(0)} y1={M.t} y2={H - M.b} />}
      <g clipPath={`url(#${uid}c)`}>
        <line className={styles.rootLine} x1={sx(p.root)} x2={sx(p.root)} y1={M.t} y2={H - M.b} />
        <path className={styles.curve} d={d} />
        {showB && (<>
          {lastB && <rect className={styles.ghost} x={sx(lastB.a)} y={M.t} width={sx(lastB.b) - sx(lastB.a)} height={ph} />}
          <rect className={styles.band} x={sx(lo)} y={M.t} width={Math.max(sx(hi) - sx(lo), 1.5)} height={ph} />
          {lastB && <line className={styles.mid} x1={sx(lastB.c)} x2={sx(lastB.c)} y1={M.t} y2={H - M.b} />}
          <circle key="lo" className={styles.bisDot} cx={sx(lo)} cy={sy(p.f(lo))} r={4.5} />
          <circle key="hi" className={styles.bisDot} cx={sx(hi)} cy={sy(p.f(hi))} r={4.5} />
        </>)}
        {showN && cn && (<>
          {newt.map((s) => <circle key={s.n} className={styles.hist} cx={sx(s.x)} cy={yAxis} r={3} />)}
          <line className={styles.drop} x1={sx(cn.x)} x2={sx(cn.x)} y1={yAxis} y2={sy(cn.fx)} />
          {isFinite(cn.dfx) && (
            <line className={styles.tangent} x1={sx(x0)} y1={sy(cn.fx + cn.dfx * (x0 - cn.x))} x2={sx(x1)} y2={sy(cn.fx + cn.dfx * (x1 - cn.x))} />
          )}
          <circle className={styles.newDot} cx={sx(cn.x)} cy={sy(cn.fx)} r={5} />
          {cn.next !== null && (
            <polygon className={styles.nextMark} points={`${sx(cn.next)},${yAxis - 8} ${sx(cn.next) - 6},${yAxis + 4} ${sx(cn.next) + 6},${yAxis + 4}`} />
          )}
        </>)}
      </g>
      <text className={styles.rootTxt} x={Math.min(sx(p.root) + 5, W - 40)} y={M.t + 12}>root</text>
      {showN && cn && inX(cn.x) && <text className={styles.lbl} x={sx(cn.x)} y={yAxis + (cn.fx >= 0 ? 16 : -8)} textAnchor="middle">x{sub(cn.n)}</text>}
      {showN && cn && cn.next !== null && inX(cn.next) && <text className={styles.lbl} x={sx(cn.next)} y={yAxis + 18} textAnchor="middle">x{sub(cn.n + 1)}</text>}
    </svg>
  );
}

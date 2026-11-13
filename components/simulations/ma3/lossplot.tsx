import { useRef } from "react";
import styles from "./classNames";
import { type GDStep } from "./types";
import { niceTicks, round } from "./gdMath";
import usePlotWidth from "./usePlotWidth";

const BASE_W = 560;
const BASE_H = 240;
const M = { l: 48, r: 18, t: 16, b: 34 };

interface LossPlotProps {
  steps: GDStep[];
  currentStepIndex: number;
  maxK: number;
}

export default function LossPlot({ steps, currentStepIndex, maxK }: LossPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = usePlotWidth(svgRef, BASE_W);
  const H = (W * BASE_H) / BASE_W;

  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  const xmax = Math.max(maxK, 5);
  const validValues = steps.map((s) => s.fx).filter(Number.isFinite);
  const maxLoss = validValues.length > 0 ? Math.max(2.0, ...validValues) : 2.0;
  const minLoss = validValues.length > 0 ? Math.min(-1.6, ...validValues) : -1.6;

  const yTop = Math.ceil(maxLoss * 2) / 2;
  const yBot = Math.floor(minLoss * 2) / 2;

  const sx = (k: number) => M.l + (k / xmax) * pw;
  const sy = (v: number) => M.t + ((yTop - v) / (yTop - yBot)) * ph;

  const visibleSteps = steps.slice(0, currentStepIndex + 1);
  const polyPoints = visibleSteps
    .filter((s) => Number.isFinite(s.fx))
    .map((s) => `${sx(s.k)},${sy(s.fx)}`)
    .join(" ");

  const cur = visibleSteps[visibleSteps.length - 1];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={styles.plot}
      role="img"
      aria-label="Loss f(x_k) versus iteration step k"
    >
      {/* Horizontal grid lines */}
      {niceTicks(yBot, yTop, 5).map((v) => (
        <g key={`y${v}`}>
          <line className={styles.gl} x1={M.l} x2={W - M.r} y1={sy(v)} y2={sy(v)} />
          <text className={styles.tick} x={M.l - 6} y={sy(v) + 4} textAnchor="end">
            {v}
          </text>
        </g>
      ))}

      {/* Vertical iteration ticks */}
      {niceTicks(0, xmax, 6)
        .filter(Number.isInteger)
        .map((k) => (
          <text key={`k${k}`} className={styles.tick} x={sx(k)} y={H - M.b + 16} textAnchor="middle">
            {k}
          </text>
        ))}

      <text className={styles.tick} x={M.l + pw / 2} y={H - 4} textAnchor="middle">
        Iteration step (k)
      </text>

      {/* Axis line */}
      <line className={styles.axis} x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} />

      {/* Global Minimum Reference Line (-1.435) */}
      <line
        className={styles.limit}
        x1={M.l}
        x2={W - M.r}
        y1={sy(-1.435)}
        y2={sy(-1.435)}
        stroke="#16a34a"
        strokeDasharray="4 3"
      />
      <text
        className={styles.tick}
        x={W - M.r - 4}
        y={sy(-1.435) - 4}
        textAnchor="end"
        style={{ fill: "#16a34a", fontSize: "11px", fontWeight: 600 }}
      >
        Global minimum level: −1.435
      </text>

      {/* Local Minimum Reference Line (-0.588) */}
      <line
        className={styles.limit}
        x1={M.l}
        x2={W - M.r}
        y1={sy(-0.588)}
        y2={sy(-0.588)}
        stroke="#ea580c"
        strokeDasharray="2 3"
      />
      <text
        className={styles.tick}
        x={W - M.r - 4}
        y={sy(-0.588) - 4}
        textAnchor="end"
        style={{ fill: "#ea580c", fontSize: "11px" }}
      >
        Local trap level: −0.588
      </text>

      {/* Vertical Current Step Cursor */}
      {cur && (
        <line
          className={styles.cursor}
          x1={sx(cur.k)}
          x2={sx(cur.k)}
          y1={M.t}
          y2={H - M.b}
          stroke="#74243a"
          strokeWidth={1.5}
        />
      )}

      {/* Loss Trajectory Line */}
      {visibleSteps.length > 1 && (
        <polyline fill="none" stroke="#74243a" strokeWidth={2.5} points={polyPoints} />
      )}

      {/* Step points */}
      {visibleSteps
        .filter((s) => Number.isFinite(s.fx))
        .map((s, idx) => (
          <circle
            key={s.k}
            cx={sx(s.k)}
            cy={sy(s.fx)}
            r={idx === visibleSteps.length - 1 ? 5 : 3.5}
            fill={idx === visibleSteps.length - 1 ? "#74243a" : "#a24d64"}
            stroke="#ffffff"
            strokeWidth={idx === visibleSteps.length - 1 ? 2 : 1}
          />
        ))}

      {/* Current loss readout */}
      {cur && Number.isFinite(cur.fx) && (
        <text
          x={sx(cur.k)}
          y={sy(cur.fx) - 10}
          textAnchor="middle"
          style={{ fill: "#74243a", fontWeight: 700, fontSize: "11px" }}
        >
          {round(cur.fx, 3)}
        </text>
      )}
    </svg>
  );
}


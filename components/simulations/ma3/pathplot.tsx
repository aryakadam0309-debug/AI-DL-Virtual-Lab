import { useId, useRef } from "react";
import styles from "./classNames";
import { CRITICAL_POINTS, type GDStep } from "./types";
import { f, niceTicks, round } from "./gdMath";
import usePlotWidth from "./usePlotWidth";

const BASE_W = 560;
const BASE_H = 340;
const M = { l: 44, r: 18, t: 16, b: 32 };

interface PathPlotProps {
  steps: GDStep[];
  currentStepIndex: number;
  onPickStart?: (x: number) => void;
}

export default function PathPlot({
  steps,
  currentStepIndex,
  onPickStart,
}: PathPlotProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const W = usePlotWidth(svgRef, BASE_W);
  const H = (W * BASE_H) / BASE_W;

  const xRange: [number, number] = [-2.6, 2.4];
  const yRange: [number, number] = [-1.9, 2.5];
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;

  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  const sx = (x: number) => M.l + ((x - x0) / (x1 - x0)) * pw;
  const sy = (y: number) => M.t + (1 - (y - y0) / (y1 - y0)) * ph;

  // Generate smooth function curve
  let curvePath = "";
  const samples = 200;
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    const y = f(x);
    curvePath += `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`;
  }

  // Active step
  const validSteps = steps.slice(0, currentStepIndex + 1);
  const cur = validSteps[validSteps.length - 1];

  // Click on plot to pick x0
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPickStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const mathX = x0 + (((px / rect.width) * W - M.l) / pw) * (x1 - x0);
    if (mathX >= x0 && mathX <= x1) {
      onPickStart(round(mathX, 2));
    }
  };

  // Tangent line at current step
  const tangentLength = 0.6;
  const tX1 = cur ? cur.x - tangentLength : 0;
  const tY1 = cur ? cur.fx - cur.dfx * tangentLength : 0;
  const tX2 = cur ? cur.x + tangentLength : 0;
  const tY2 = cur ? cur.fx + cur.dfx * tangentLength : 0;

  // Path polyline points
  const pathPoints = validSteps.map((s) => `${sx(s.x)},${sy(s.fx)}`).join(" ");

  const yAxisZero = sy(0);
  const xAxisZero = sx(0);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={styles.plot}
      onClick={handleClick}
      role="img"
      aria-label="Landscape of f(x) with gradient descent path and ball position"
      style={{ cursor: onPickStart ? "crosshair" : "default" }}
    >
      <defs>
        <clipPath id={`${uid}clip`}>
          <rect x={M.l} y={M.t} width={pw} height={ph} />
        </clipPath>
        <marker
          id={`${uid}arrow`}
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#74243a" />
        </marker>
      </defs>

      {/* Grid lines */}
      {niceTicks(y0, y1, 5).map((t) => (
        <g key={`y${t}`}>
          <line className={styles.gl} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} />
          <text className={styles.tick} x={M.l - 6} y={sy(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}

      {niceTicks(x0, x1, 6).map((t) => (
        <g key={`x${t}`}>
          <line className={styles.gl} x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} />
          <text className={styles.tick} x={sx(t)} y={H - M.b + 16} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}

      {/* Axes */}
      <line className={styles.axis} x1={M.l} x2={W - M.r} y1={yAxisZero} y2={yAxisZero} />
      <line className={styles.axis} x1={xAxisZero} x2={xAxisZero} y1={M.t} y2={H - M.b} />
      <text className={styles.tick} x={W - M.r + 10} y={yAxisZero + 4} textAnchor="start">
        x
      </text>
      <text className={styles.tick} x={xAxisZero} y={M.t - 4} textAnchor="middle">
        f(x)
      </text>

      {/* Clipped content */}
      <g clipPath={`url(#${uid}clip)`}>
        {/* Critical Point Vertical Reference Lines */}
        {CRITICAL_POINTS.map((cp) => (
          <line
            key={cp.name}
            className={styles.limit}
            x1={sx(cp.x)}
            x2={sx(cp.x)}
            y1={M.t}
            y2={H - M.b}
            strokeDasharray="3 3"
          />
        ))}

        {/* Function Curve */}
        <path className={styles.curve} d={curvePath} />

        {/* Critical Points on the Curve */}
        {CRITICAL_POINTS.map((cp) => (
          <g key={cp.name}>
            <circle
              cx={sx(cp.x)}
              cy={sy(cp.fx)}
              r={cp.type === "global-min" ? 5 : 4}
              fill={
                cp.type === "global-min"
                  ? "#16a34a"
                  : cp.type === "local-max"
                  ? "#e11d48"
                  : "#ea580c"
              }
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </g>
        ))}

        {/* Trajectory Polyline */}
        {validSteps.length > 1 && (
          <polyline
            fill="none"
            stroke="#a24d64"
            strokeWidth={2}
            strokeDasharray="4 3"
            points={pathPoints}
          />
        )}

        {/* Previous Steps (Dots) */}
        {validSteps.map((s, idx) => (
          <circle
            key={s.k}
            cx={sx(s.x)}
            cy={sy(s.fx)}
            r={idx === validSteps.length - 1 ? 0 : 3}
            fill="#a24d64"
            opacity={0.4}
          />
        ))}

        {/* Current Tangent Line */}
        {cur && Number.isFinite(cur.x) && (
          <line
            x1={sx(tX1)}
            y1={sy(tY1)}
            x2={sx(tX2)}
            y2={sy(tY2)}
            stroke="#e11d48"
            strokeWidth={2}
          />
        )}

        {/* Current Iterate: The Rolling Ball */}
        {cur && Number.isFinite(cur.x) && (
          <g>
            <circle
              cx={sx(cur.x)}
              cy={sy(cur.fx)}
              r={7}
              fill="#74243a"
              stroke="#ffffff"
              strokeWidth={2}
            />
            {/* Step direction indicator arrow */}
            {cur.nextX !== null && Number.isFinite(cur.nextX) && (
              <line
                x1={sx(cur.x)}
                y1={sy(cur.fx)}
                x2={sx(cur.nextX)}
                y2={sy(f(cur.nextX))}
                stroke="#74243a"
                strokeWidth={2.5}
                markerEnd={`url(#${uid}arrow)`}
              />
            )}
          </g>
        )}
      </g>

      {/* Critical Point Labels */}
      <text
        className={styles.tick}
        x={sx(CRITICAL_POINTS[0].x)}
        y={sy(CRITICAL_POINTS[0].fx) + 16}
        textAnchor="middle"
        style={{ fill: "#16a34a", fontWeight: 700 }}
      >
        Global Min (−1.484)
      </text>
      <text
        className={styles.tick}
        x={sx(CRITICAL_POINTS[1].x)}
        y={sy(CRITICAL_POINTS[1].fx) - 10}
        textAnchor="middle"
        style={{ fill: "#e11d48", fontWeight: 600 }}
      >
        Peak (0.152)
      </text>
      <text
        className={styles.tick}
        x={sx(CRITICAL_POINTS[2].x)}
        y={sy(CRITICAL_POINTS[2].fx) + 16}
        textAnchor="middle"
        style={{ fill: "#ea580c", fontWeight: 700 }}
      >
        Trap (1.332)
      </text>

      {/* Current Step Label */}
      {cur && Number.isFinite(cur.x) && (
        <text
          x={sx(cur.x)}
          y={sy(cur.fx) - 12}
          textAnchor="middle"
          style={{ fill: "#74243a", fontWeight: 700, fontSize: "12px" }}
        >
          x_{cur.k} ({round(cur.x, 2)})
        </text>
      )}
    </svg>
  );
}


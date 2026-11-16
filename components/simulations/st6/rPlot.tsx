import { useRef } from "react";
import usePlotWidth from "./usePlotWidth";
import { type SubgroupData } from "./types";
import { fmt } from "./sqcMath";
import styles from "./classNames";

interface RPlotProps {
  subgroups: SubgroupData[];
  rLimits: { center: number; ucl: number; lcl: number };
}

export default function RPlot({ subgroups, rLimits }: RPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 180;

  const padLeft = 56;
  const padRight = 28;
  const padTop = 22;
  const padBottom = 34;

  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const k = subgroups.length || 1;

  const allRanges = subgroups.map((s) => s.range);
  const dataMax = allRanges.length > 0 ? Math.max(...allRanges) : rLimits.ucl;

  const yMin = 0;
  const yMax = Math.max(rLimits.ucl * 1.15, dataMax * 1.15, 1);
  const ySpan = Math.max(1e-6, yMax - yMin);

  const scaleX = (idx: number) => padLeft + ((idx - 0.5) / k) * plotW;
  const scaleY = (y: number) => padTop + plotH - ((y - yMin) / ySpan) * plotH;

  const uclY = scaleY(rLimits.ucl);
  const clY = scaleY(rLimits.center);
  const lclY = scaleY(rLimits.lcl);

  let polylinePoints = "";
  if (subgroups.length > 0) {
    polylinePoints = subgroups
      .map((s, idx) => `${scaleX(idx + 1)},${scaleY(s.range)}`)
      .join(" ");
  }

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>2. R (Subgroup Range) Dispersion Chart</h4>
          <span className={styles.plotBadge}>Within-Subgroup Spread</span>
        </div>
        <div className={styles.plotMetrics}>
          <span>UCL (D₄·R̄): <strong>{fmt(rLimits.ucl, 2)}</strong></span>
          <span>R̄: <strong>{fmt(rLimits.center, 2)}</strong></span>
          <span>LCL (D₃·R̄): <strong>{fmt(rLimits.lcl, 2)}</strong></span>
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="R Control Chart"
      >
        {/* Upper Control Limit (UCL) */}
        <line
          x1={padLeft}
          y1={uclY}
          x2={padLeft + plotW}
          y2={uclY}
          stroke="#e03131"
          strokeWidth="1.8"
        />
        <text
          x={padLeft - 6}
          y={uclY + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="bold"
          fill="#e03131"
        >
          UCL {fmt(rLimits.ucl, 1)}
        </text>

        {/* Center Line (CL) */}
        <line
          x1={padLeft}
          y1={clY}
          x2={padLeft + plotW}
          y2={clY}
          stroke="#1c7ed6"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text
          x={padLeft - 6}
          y={clY + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="bold"
          fill="#1c7ed6"
        >
          R̄ {fmt(rLimits.center, 1)}
        </text>

        {/* Lower Control Limit (LCL) */}
        {rLimits.lcl > 0 && (
          <>
            <line
              x1={padLeft}
              y1={lclY}
              x2={padLeft + plotW}
              y2={lclY}
              stroke="#e03131"
              strokeWidth="1.8"
            />
            <text
              x={padLeft - 6}
              y={lclY + 4}
              textAnchor="end"
              fontSize="10"
              fontWeight="bold"
              fill="#e03131"
            >
              LCL {fmt(rLimits.lcl, 1)}
            </text>
          </>
        )}

        {/* Subgroup index ticks */}
        {subgroups.map((_, idx) => {
          const x = scaleX(idx + 1);
          if (idx % 2 === 0 || idx === subgroups.length - 1) {
            return (
              <text
                key={idx}
                x={x}
                y={padTop + plotH + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#755f65"
              >
                {idx + 1}
              </text>
            );
          }
          return null;
        })}

        {/* Trajectory */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#1c7ed6"
            strokeWidth="1.6"
          />
        )}

        {/* Points */}
        {subgroups.map((s, idx) => {
          const cx = scaleX(idx + 1);
          const cy = scaleY(s.range);
          const isOut = s.outOfControlR;

          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isOut ? "5" : "3.5"}
              fill={isOut ? "#e03131" : "#1c7ed6"}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Baseline */}
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={padLeft + plotW}
          y2={padTop + plotH}
          stroke="#4b1e2a"
          strokeWidth="1.5"
        />
      </svg>
      <div className={styles.plotCaption}>
        <span>Tracks whether variability is stable. In-control variability must be confirmed before interpreting X̄ chart.</span>
      </div>
    </div>
  );
}

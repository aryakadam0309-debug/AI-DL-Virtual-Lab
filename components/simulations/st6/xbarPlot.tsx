import { useRef, useState } from "react";
import usePlotWidth from "./usePlotWidth";
import { type SubgroupData, type ControlLimits } from "./types";
import { fmt } from "./sqcMath";
import styles from "./classNames";

interface XbarPlotProps {
  subgroups: SubgroupData[];
  limits: ControlLimits;
  shiftStart: number;
  delta: number;
}

export default function XbarPlot({ subgroups, limits, shiftStart, delta }: XbarPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 250;

  const [hoveredSubgroup, setHoveredSubgroup] = useState<SubgroupData | null>(null);

  const padLeft = 56;
  const padRight = 28;
  const padTop = 26;
  const padBottom = 38;

  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const k = subgroups.length || 1;

  // Y-axis range
  const allMeans = subgroups.map((s) => s.mean);
  const dataMin = allMeans.length > 0 ? Math.min(...allMeans) : limits.lcl;
  const dataMax = allMeans.length > 0 ? Math.max(...allMeans) : limits.ucl;

  const yMin = Math.min(limits.lcl - limits.se * 0.8, dataMin - limits.se * 0.5);
  const yMax = Math.max(limits.ucl + limits.se * 0.8, dataMax + limits.se * 0.5);
  const ySpan = Math.max(1e-6, yMax - yMin);

  const scaleX = (idx: number) => padLeft + ((idx - 0.5) / k) * plotW;
  const scaleY = (y: number) => padTop + plotH - ((y - yMin) / ySpan) * plotH;

  const uclY = scaleY(limits.ucl);
  const clY = scaleY(limits.center);
  const lclY = scaleY(limits.lcl);

  // Line path for subgroup means
  let polylinePoints = "";
  if (subgroups.length > 0) {
    polylinePoints = subgroups
      .map((s, idx) => `${scaleX(idx + 1)},${scaleY(s.mean)}`)
      .join(" ");
  }

  // Shift onset X
  const hasShift = delta !== 0 && shiftStart <= k;
  const shiftX = hasShift ? scaleX(shiftStart) : 0;

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>1. X̄ (Subgroup Mean) Control Chart</h4>
          <span className={styles.plotBadge}>3σ Shewhart Limits</span>
        </div>
        <div className={styles.plotMetrics}>
          <span>UCL: <strong>{fmt(limits.ucl, 2)}</strong></span>
          <span>CL: <strong>{fmt(limits.center, 2)}</strong></span>
          <span>LCL: <strong>{fmt(limits.lcl, 2)}</strong></span>
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="X-bar Control Chart"
      >
        <defs>
          <linearGradient id="inControlZone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#40c057" stopOpacity="0.06" />
            <stop offset="50%" stopColor="#40c057" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#40c057" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* In-control shaded zone between LCL and UCL */}
        <rect
          x={padLeft}
          y={uclY}
          width={plotW}
          height={Math.max(0, lclY - uclY)}
          fill="url(#inControlZone)"
        />

        {/* 1-sigma & 2-sigma zone guides */}
        {limits.sigma1Upper && (
          <line
            x1={padLeft}
            y1={scaleY(limits.sigma1Upper)}
            x2={padLeft + plotW}
            y2={scaleY(limits.sigma1Upper)}
            stroke="#e7d9dd"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
        )}
        {limits.sigma1Lower && (
          <line
            x1={padLeft}
            y1={scaleY(limits.sigma1Lower)}
            x2={padLeft + plotW}
            y2={scaleY(limits.sigma1Lower)}
            stroke="#e7d9dd"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
        )}

        {/* Shift Onset Vertical Line */}
        {hasShift && (
          <g>
            <line
              x1={shiftX}
              y1={padTop}
              x2={shiftX}
              y2={padTop + plotH}
              stroke="#fd7e14"
              strokeDasharray="4 3"
              strokeWidth="1.5"
            />
            <text
              x={shiftX + 4}
              y={padTop + 14}
              fontSize="10"
              fontWeight="bold"
              fill="#d9480f"
            >
              Shift (δ = {delta}σ)
            </text>
          </g>
        )}

        {/* Upper Control Limit (UCL) */}
        <line
          x1={padLeft}
          y1={uclY}
          x2={padLeft + plotW}
          y2={uclY}
          stroke="#e03131"
          strokeWidth="2"
        />
        <text
          x={padLeft - 6}
          y={uclY + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="bold"
          fill="#e03131"
        >
          UCL {fmt(limits.ucl, 1)}
        </text>

        {/* Center Line (CL) */}
        <line
          x1={padLeft}
          y1={clY}
          x2={padLeft + plotW}
          y2={clY}
          stroke="#74243a"
          strokeWidth="1.8"
          strokeDasharray="5 3"
        />
        <text
          x={padLeft - 6}
          y={clY + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="bold"
          fill="#74243a"
        >
          CL {fmt(limits.center, 1)}
        </text>

        {/* Lower Control Limit (LCL) */}
        <line
          x1={padLeft}
          y1={lclY}
          x2={padLeft + plotW}
          y2={lclY}
          stroke="#e03131"
          strokeWidth="2"
        />
        <text
          x={padLeft - 6}
          y={lclY + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="bold"
          fill="#e03131"
        >
          LCL {fmt(limits.lcl, 1)}
        </text>

        {/* Subgroup index ticks */}
        {subgroups.map((_, idx) => {
          const x = scaleX(idx + 1);
          if (idx % 2 === 0 || idx === subgroups.length - 1) {
            return (
              <text
                key={idx}
                x={x}
                y={padTop + plotH + 16}
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

        {/* Trajectory Polyline */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#74243a"
            strokeWidth="1.8"
          />
        )}

        {/* Subgroup Points */}
        {subgroups.map((s, idx) => {
          const cx = scaleX(idx + 1);
          const cy = scaleY(s.mean);
          const isOut = s.outOfControlXbar;

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredSubgroup(s)}
              onMouseLeave={() => setHoveredSubgroup(null)}
              style={{ cursor: "pointer" }}
            >
              {isOut && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="8"
                  fill="none"
                  stroke="#e03131"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={isOut ? "5.5" : "4"}
                fill={isOut ? "#e03131" : "#74243a"}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
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
        <div className={styles.legendRow}>
          <span><span className={styles.legendLine} style={{ borderColor: "#e03131" }}></span> 3σ Control Limits (UCL / LCL)</span>
          <span><span className={styles.legendLine} style={{ borderColor: "#74243a" }}></span> Process Target (CL = μ₀)</span>
          <span><span className={styles.legendBox} style={{ background: "#e03131" }}></span> Out-of-Control Signal</span>
          {hoveredSubgroup && (
            <span style={{ marginLeft: "auto", fontWeight: 600, color: hoveredSubgroup.outOfControlXbar ? "#e03131" : "#74243a" }}>
              Subgroup #{hoveredSubgroup.subgroupId}: Mean = {fmt(hoveredSubgroup.mean, 2)}
              {hoveredSubgroup.outOfControlXbar ? " [SIGNAL: OUT OF CONTROL!]" : " [In Control]"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

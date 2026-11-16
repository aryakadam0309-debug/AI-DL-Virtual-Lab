import { useRef } from "react";
import usePlotWidth from "./usePlotWidth";
import {
  type ResampleMode,
  type BootstrapResult,
  type PermutationResult,
  type StatisticDefinition,
} from "./types";
import { buildHistogram, fmt } from "./resampleMath";
import styles from "./classNames";

interface DistributionPlotProps {
  mode: ResampleMode;
  statDef: StatisticDefinition;
  bootstrapResult: BootstrapResult | null;
  permutationResult: PermutationResult | null;
}

export default function DistributionPlot({
  mode,
  statDef,
  bootstrapResult,
  permutationResult,
}: DistributionPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 260;

  const padLeft = 52;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 42;

  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const data =
    mode === "bootstrap"
      ? bootstrapResult?.resampleValues || []
      : permutationResult?.nullValues || [];

  const observed =
    mode === "bootstrap"
      ? bootstrapResult?.observed || 0
      : permutationResult?.observed || 0;

  // View bounds
  let minVal = data.length > 0 ? Math.min(...data) : -5;
  let maxVal = data.length > 0 ? Math.max(...data) : 5;

  if (mode === "bootstrap") {
    // Include 0 for reference
    minVal = Math.min(minVal, 0, observed);
    maxVal = Math.max(maxVal, 0, observed);
  } else {
    // Permutation null is symmetric around 0, include +/- |observed|
    const maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal), Math.abs(observed) * 1.15, 1);
    minVal = -maxAbs;
    maxVal = maxAbs;
  }

  const range = Math.max(1e-6, maxVal - minVal);
  const xSpanMin = minVal - range * 0.06;
  const xSpanMax = maxVal + range * 0.06;
  const xSpan = Math.max(1e-6, xSpanMax - xSpanMin);

  const { bins, maxCount } = buildHistogram(data, 34, xSpanMin, xSpanMax);

  const scaleX = (x: number) => padLeft + ((x - xSpanMin) / xSpan) * plotW;
  const scaleY = (count: number) => padTop + plotH - (count / (maxCount * 1.15 || 1)) * plotH;

  // Ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => xSpanMin + (i / tickCount) * xSpan);

  const obsX = scaleX(observed);
  const zeroX = scaleX(0);

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>
            {mode === "bootstrap"
              ? "2. Bootstrap Distribution of the Statistic (T*)"
              : "2. Permutation Null Distribution (Under H₀: No Effect)"}
          </h4>
          <span className={mode === "bootstrap" ? styles.plotBadge : styles.plotBadgeSuccess}>
            {statDef.shortName} • {data.length.toLocaleString()} Resamples
          </span>
        </div>

        <div className={styles.plotMetrics}>
          {mode === "bootstrap" && bootstrapResult && (
            <>
              <span>95% CI: <strong>[{fmt(bootstrapResult.ciLower, 2)}, {fmt(bootstrapResult.ciUpper, 2)}]</strong></span>
              <span>Bootstrap SE: <strong>{fmt(bootstrapResult.bootstrapSE, 3)}</strong></span>
            </>
          )}
          {mode === "permutation" && permutationResult && (
            <>
              <span>
                p-value: <strong>{fmt(permutationResult.pValue, 4)}</strong>
                {permutationResult.exactAvailable && " (Exact)"}
              </span>
              <span>
                Extreme: <strong>{permutationResult.extremeCount} / {permutationResult.totalShuffles}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="Resampling Histogram Plot"
      >
        <defs>
          <linearGradient id="bootGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#74243a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a24d64" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="extremeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e03131" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#c92a2a" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Bootstrap 95% Confidence Interval Shaded Band */}
        {mode === "bootstrap" && bootstrapResult && (
          <rect
            x={scaleX(bootstrapResult.ciLower)}
            y={padTop}
            width={Math.max(0, scaleX(bootstrapResult.ciUpper) - scaleX(bootstrapResult.ciLower))}
            height={plotH}
            fill="#74243a"
            fillOpacity="0.08"
          />
        )}

        {/* Ticks and Vertical Grid */}
        {ticks.map((t, i) => {
          const x = scaleX(t);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={padTop + plotH}
                stroke="#e7d9dd"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padTop + plotH + 15}
                textAnchor="middle"
                fontSize="11"
                fill="#755f65"
              >
                {t.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Histogram Bars */}
        {bins.map((bin, idx) => {
          const bx0 = scaleX(bin.x0);
          const bx1 = scaleX(bin.x1);
          const bw = Math.max(1, bx1 - bx0 - 1);
          const barY = scaleY(bin.count);
          const bh = Math.max(0, padTop + plotH - barY);

          // In permutation mode: check if bar is extreme (|mid| >= |observed|)
          const isExtreme = mode === "permutation" && Math.abs(bin.x0 + (bin.x1 - bin.x0) / 2) >= Math.abs(observed) - 1e-6;

          return (
            <rect
              key={idx}
              x={bx0}
              y={barY}
              width={bw}
              height={bh}
              fill={isExtreme ? "url(#extremeGrad)" : "url(#bootGrad)"}
              stroke={isExtreme ? "#c92a2a" : "#5a1827"}
              strokeWidth="0.75"
              rx="1.5"
            >
              <title>{`Bin [${bin.x0.toFixed(2)}, ${bin.x1.toFixed(2)}]: count ${bin.count}`}</title>
            </rect>
          );
        })}

        {/* Zero Line */}
        <line
          x1={zeroX}
          y1={padTop}
          x2={zeroX}
          y2={padTop + plotH}
          stroke="#868e96"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <text x={zeroX + 4} y={padTop + 14} fontSize="10" fill="#868e96">
          0 (Null Effect)
        </text>

        {/* Observed Statistic Line */}
        <line
          x1={obsX}
          y1={padTop}
          x2={obsX}
          y2={padTop + plotH}
          stroke="#e03131"
          strokeWidth="2.5"
        />
        <text
          x={obsX}
          y={padTop - 8}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#e03131"
        >
          T_obs = {fmt(observed, 2)}
        </text>

        {/* Permutation: Symmetric Opposite Line -|T_obs| */}
        {mode === "permutation" && Math.abs(observed) > 1e-4 && (
          <line
            x1={scaleX(-Math.abs(observed))}
            y1={padTop}
            x2={scaleX(-Math.abs(observed))}
            y2={padTop + plotH}
            stroke="#e03131"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Bootstrap: CI Guide Lines */}
        {mode === "bootstrap" && bootstrapResult && (
          <>
            <line
              x1={scaleX(bootstrapResult.ciLower)}
              y1={padTop}
              x2={scaleX(bootstrapResult.ciLower)}
              y2={padTop + plotH}
              stroke="#74243a"
              strokeWidth="2"
            />
            <text
              x={scaleX(bootstrapResult.ciLower) - 4}
              y={padTop + 24}
              textAnchor="end"
              fontSize="10"
              fontWeight="bold"
              fill="#74243a"
            >
              2.5%: {fmt(bootstrapResult.ciLower, 2)}
            </text>

            <line
              x1={scaleX(bootstrapResult.ciUpper)}
              y1={padTop}
              x2={scaleX(bootstrapResult.ciUpper)}
              y2={padTop + plotH}
              stroke="#74243a"
              strokeWidth="2"
            />
            <text
              x={scaleX(bootstrapResult.ciUpper) + 4}
              y={padTop + 24}
              textAnchor="start"
              fontSize="10"
              fontWeight="bold"
              fill="#74243a"
            >
              97.5%: {fmt(bootstrapResult.ciUpper, 2)}
            </text>
          </>
        )}

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
          {mode === "bootstrap" ? (
            <>
              <span><span className={styles.legendBox} style={{ background: "#74243a" }}></span> Bootstrap Resamples (T*)</span>
              <span><span className={styles.legendBox} style={{ background: "rgba(116, 36, 58, 0.2)" }}></span> 95% Percentile Confidence Interval</span>
              <span><span className={styles.legendLine} style={{ borderColor: "#e03131" }}></span> Observed Statistic ({fmt(observed, 2)})</span>
            </>
          ) : (
            <>
              <span><span className={styles.legendBox} style={{ background: "#74243a" }}></span> Shuffled Null Distribution</span>
              <span><span className={styles.legendBox} style={{ background: "#e03131" }}></span> Rejection Region (|T| ≥ |T_obs|)</span>
              <span>p = (b + 1) / (m + 1) = <strong>{fmt(permutationResult?.pValue ?? 0, 4)}</strong></span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


import { useRef } from "react";
import usePlotWidth from "./usePlotWidth";
import { type PopulationConfig } from "./types";
import { computeHistogram, computeSummaryStats, normalPdf, fmt } from "./cltMath";
import styles from "./classNames";

interface SamplingPlotProps {
  pop: PopulationConfig;
  sampleMeans: number[];
  sampleSize: number;
  showNormalOverlay: boolean;
}

export default function SamplingPlot({
  pop,
  sampleMeans,
  sampleSize,
  showNormalOverlay,
}: SamplingPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 270;

  const padLeft = 48;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 42;

  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const stats = computeSummaryStats(sampleMeans);
  const theoreticalMean = pop.mean;
  const theoreticalSE = pop.sd / Math.sqrt(sampleSize);
  const theoreticalSkew = pop.skewness / Math.sqrt(sampleSize);

  // Compute viewing window: centered on population mean, spanning ~ 4 * theoreticalSE
  const halfSpan = Math.max(0.5, theoreticalSE * 4.2);
  const xMin = Math.max(0, theoreticalMean - halfSpan);
  const xMax = theoreticalMean + halfSpan;
  const xSpan = Math.max(1e-6, xMax - xMin);

  // Histogram calculation
  const numBins = Math.min(40, Math.max(18, Math.floor(Math.sqrt(sampleMeans.length || 1) * 2.2)));
  const { bins, maxDensity: histMaxDensity } = computeHistogram(sampleMeans, numBins, xMin, xMax);

  // Normal curve height at peak
  const normalPeak = theoreticalSE > 1e-9 ? 1 / (theoreticalSE * Math.sqrt(2 * Math.PI)) : 1;
  const maxDensity = Math.max(histMaxDensity, normalPeak) * 1.15;

  const scaleX = (x: number) => padLeft + ((x - xMin) / xSpan) * plotW;
  const scaleY = (y: number) => padTop + plotH - (y / maxDensity) * plotH;

  // Build normal overlay path
  const curvePoints: { x: number; y: number }[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * xSpan;
    const y = normalPdf(x, theoreticalMean, theoreticalSE);
    curvePoints.push({ x, y });
  }

  let normalPathD = "";
  if (curvePoints.length > 0) {
    normalPathD = `M ${scaleX(curvePoints[0].x)} ${scaleY(curvePoints[0].y)}`;
    for (let i = 1; i < curvePoints.length; i++) {
      normalPathD += ` L ${scaleX(curvePoints[i].x)} ${scaleY(curvePoints[i].y)}`;
    }
  }

  // Ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => xMin + (i / tickCount) * xSpan);

  const meanX = scaleX(theoreticalMean);

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>2. Sampling Distribution of the Mean (X̄)</h4>
          <span className={styles.plotBadgeSuccess}>
            {sampleMeans.length.toLocaleString()} Samples drawn (n = {sampleSize})
          </span>
        </div>
        <div className={styles.plotMetrics}>
          <span>Empirical Mean: <strong>{fmt(stats.mean, 3)}</strong></span>
          <span>Empirical SE: <strong>{fmt(stats.sd, 4)}</strong></span>
          <span>Theoretical SE: <strong>{fmt(theoreticalSE, 4)}</strong></span>
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="Sampling Distribution Histogram"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#74243a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a24d64" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* 1 SE Shaded Band under normal */}
        {showNormalOverlay && (
          <rect
            x={scaleX(theoreticalMean - theoreticalSE)}
            y={padTop}
            width={Math.max(0, scaleX(theoreticalMean + theoreticalSE) - scaleX(theoreticalMean - theoreticalSE))}
            height={plotH}
            fill="#74243a"
            fillOpacity="0.06"
          />
        )}

        {/* Grid lines */}
        {ticks.map((t, idx) => {
          const x = scaleX(t);
          return (
            <g key={idx}>
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
          const barY = scaleY(bin.density);
          const bh = Math.max(0, padTop + plotH - barY);

          return (
            <rect
              key={idx}
              x={bx0}
              y={barY}
              width={bw}
              height={bh}
              fill="url(#barGrad)"
              stroke="#5a1827"
              strokeWidth="0.75"
              rx="1.5"
            >
              <title>{`Bin [${bin.x0.toFixed(2)}, ${bin.x1.toFixed(2)}]: count ${bin.count}, density ${bin.density.toFixed(3)}`}</title>
            </rect>
          );
        })}

        {/* Theoretical Normal Overlay Curve */}
        {showNormalOverlay && normalPathD && (
          <path
            d={normalPathD}
            fill="none"
            stroke="#1c7ed6"
            strokeWidth="2.5"
          />
        )}

        {/* Theoretical Mean Line (Red dashed) */}
        <line
          x1={meanX}
          y1={padTop}
          x2={meanX}
          y2={padTop + plotH}
          stroke="#74243a"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x={meanX + 4}
          y={padTop + 14}
          fontSize="11"
          fontWeight="bold"
          fill="#74243a"
        >
          μ = {fmt(theoreticalMean, 2)}
        </text>

        {/* Empirical Mean Marker (Green tick) */}
        {sampleMeans.length > 0 && (
          <line
            x1={scaleX(stats.mean)}
            y1={padTop + 20}
            x2={scaleX(stats.mean)}
            y2={padTop + plotH}
            stroke="#2b8a3e"
            strokeWidth="2"
          />
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
          <span><span className={styles.legendBox} style={{ background: "#74243a" }}></span> Simulated X̄ Histogram</span>
          {showNormalOverlay && (
            <span><span className={styles.legendLine} style={{ borderColor: "#1c7ed6" }}></span> Theoretical Normal: N(μ, σ/√n)</span>
          )}
          <span><span className={styles.legendLine} style={{ borderColor: "#2b8a3e" }}></span> Empirical Mean ({fmt(stats.mean, 2)})</span>
          <span>Sample Skewness: <strong>{fmt(stats.skewness, 2)}</strong> (Predicted: {fmt(theoreticalSkew, 2)})</span>
        </div>
      </div>
    </div>
  );
}


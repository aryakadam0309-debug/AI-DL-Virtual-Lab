import { useRef } from "react";
import usePlotWidth from "./usePlotWidth";
import { type PopulationConfig, type SampleRun } from "./types";
import { fmt } from "./cltMath";
import styles from "./classNames";

interface PopulationPlotProps {
  pop: PopulationConfig;
  lastSample: SampleRun | null;
}

export default function PopulationPlot({ pop, lastSample }: PopulationPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 210;

  const padLeft = 46;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 42;

  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  const [xMin, xMax] = pop.domain;
  const xSpan = Math.max(1e-6, xMax - xMin);

  // Sample the PDF across domain to find max density
  const steps = 120;
  const points: { x: number; y: number }[] = [];
  let maxPdf = 0.01;

  for (let i = 0; i <= steps; i++) {
    const xVal = xMin + (i / steps) * xSpan;
    const yVal = pop.pdf(xVal);
    points.push({ x: xVal, y: yVal });
    if (yVal > maxPdf) maxPdf = yVal;
  }
  maxPdf *= 1.15; // 15% headroom

  const scaleX = (x: number) => padLeft + ((x - xMin) / xSpan) * plotW;
  const scaleY = (y: number) => padTop + plotH - (y / maxPdf) * (plotH - 30);

  // Build SVG path
  let pathD = `M ${scaleX(points[0].x)} ${scaleY(0)}`;
  for (const pt of points) {
    pathD += ` L ${scaleX(pt.x)} ${scaleY(pt.y)}`;
  }
  pathD += ` L ${scaleX(points[points.length - 1].x)} ${scaleY(0)} Z`;

  // Mean position
  const meanX = scaleX(pop.mean);

  // Ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => xMin + (i / tickCount) * xSpan);

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>1. Underlying Population Distribution</h4>
          <span className={styles.plotBadge}>Shape: {pop.name.split("(")[0]}</span>
        </div>
        <div className={styles.plotMetrics}>
          <span>μ = <strong>{fmt(pop.mean, 2)}</strong></span>
          <span>σ = <strong>{fmt(pop.sd, 3)}</strong></span>
          <span>Skew = <strong>{fmt(pop.skewness, 2)}</strong></span>
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="Population Probability Density Function Plot"
      >
        <defs>
          <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a24d64" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#74243a" stopOpacity="0.05" />
          </linearGradient>
        </defs>

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
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Shaded Area & Outline */}
        <path d={pathD} fill="url(#popGrad)" stroke="#74243a" strokeWidth="2" />

        {/* Population Mean vertical line */}
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
          μ = {fmt(pop.mean, 2)}
        </text>

        {/* Baseline */}
        <line
          x1={padLeft}
          y1={padTop + plotH}
          x2={padLeft + plotW}
          y2={padTop + plotH}
          stroke="#4b1e2a"
          strokeWidth="1.5"
        />

        {/* Most Recent Sample Strip (Individual Observations) */}
        {lastSample && (
          <g>
            {/* Strip track */}
            <rect
              x={padLeft}
              y={padTop + plotH - 24}
              width={plotW}
              height="20"
              fill="#ffffff"
              fillOpacity="0.85"
              stroke="#e7d9dd"
              rx="4"
            />
            {/* Points */}
            {lastSample.points.map((pt, i) => {
              const cx = scaleX(Math.max(xMin, Math.min(xMax, pt)));
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={padTop + plotH - 14}
                  r="3.5"
                  fill="#74243a"
                  fillOpacity="0.6"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              );
            })}
            {/* Sample Mean Diamond */}
            {(() => {
              const smX = scaleX(Math.max(xMin, Math.min(xMax, lastSample.mean)));
              const smY = padTop + plotH - 14;
              return (
                <g>
                  <polygon
                    points={`${smX},${smY - 6} ${smX + 6},${smY} ${smX},${smY + 6} ${smX - 6},${smY}`}
                    fill="#e03131"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={smX}
                    y={smY - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#e03131"
                  >
                    x̄ = {fmt(lastSample.mean, 2)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
      <div className={styles.plotCaption}>
        <span>Solid curve: Probability density f(x)</span>
        {lastSample && (
          <span className={styles.sampleLegend}>
            Dots: latest sample (n = {lastSample.points.length}) • <span style={{ color: "#e03131" }}>♦</span> Sample mean x̄
          </span>
        )}
      </div>
    </div>
  );
}


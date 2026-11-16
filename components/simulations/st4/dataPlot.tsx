import { useRef } from "react";
import usePlotWidth from "./usePlotWidth";
import { type DatasetPreset, type ResampleMode } from "./types";
import { fmt } from "./resampleMath";
import styles from "./classNames";

interface DataPlotProps {
  dataset: DatasetPreset;
  mode: ResampleMode;
  resampledA: number[] | null;
  resampledB: number[] | null;
}

export default function DataPlot({ dataset, mode, resampledA, resampledB }: DataPlotProps) {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const width = usePlotWidth(containerRef, 560);
  const height = 180;

  const padLeft = 80;
  const padRight = 30;
  const padTop = 24;

  const plotW = Math.max(10, width - padLeft - padRight);

  const allVals = [...dataset.groupA, ...dataset.groupB];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = Math.max(1e-6, maxVal - minVal);
  const xSpanMin = minVal - range * 0.08;
  const xSpanMax = maxVal + range * 0.08;
  const xSpan = Math.max(1e-6, xSpanMax - xSpanMin);

  const scaleX = (x: number) => padLeft + ((x - xSpanMin) / xSpan) * plotW;

  const meanA = dataset.groupA.reduce((s, x) => s + x, 0) / dataset.groupA.length;
  const meanB = dataset.groupB.reduce((s, x) => s + x, 0) / dataset.groupB.length;

  const yA = padTop + 35;
  const yB = padTop + 95;

  // Ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => xSpanMin + (i / tickCount) * xSpan);

  return (
    <div className={styles.plotCard}>
      <div className={styles.plotHeader}>
        <div className={styles.plotTitleGroup}>
          <h4 className={styles.plotTitle}>1. Observed Sample Data & Resampling Mechanics</h4>
          <span className={styles.plotBadge}>
            {mode === "bootstrap" ? "Bootstrap (With Replacement)" : "Permutation (Label Shuffling)"}
          </span>
        </div>
        <div className={styles.plotMetrics}>
          <span>Group A Mean: <strong>{fmt(meanA, 2)}</strong></span>
          <span>Group B Mean: <strong>{fmt(meanB, 2)}</strong></span>
          <span>Observed Diff: <strong>{fmt(meanB - meanA, 2)}</strong></span>
        </div>
      </div>

      <svg
        ref={containerRef}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svgPlot}
        role="img"
        aria-label="Group Dot Plot and Resampling Visualizer"
      >
        {/* Ticks & Grid */}
        {ticks.map((t, i) => {
          const x = scaleX(t);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={padTop + 115}
                stroke="#e7d9dd"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padTop + 130}
                textAnchor="middle"
                fontSize="10"
                fill="#755f65"
              >
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Group A Track */}
        <line x1={padLeft} y1={yA} x2={padLeft + plotW} y2={yA} stroke="#e7d9dd" strokeWidth="2" />
        <text x={padLeft - 12} y={yA + 4} textAnchor="end" fontSize="11" fontWeight="bold" fill="#74243a">
          Group A
        </text>
        {dataset.groupA.map((val, i) => {
          const cx = scaleX(val);
          return (
            <g key={`a-${i}`}>
              <circle
                cx={cx}
                cy={yA}
                r="6"
                fill="#74243a"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text x={cx} y={yA - 9} textAnchor="middle" fontSize="9" fill="#755f65">
                {val}
              </text>
            </g>
          );
        })}
        {/* Mean A vertical bar */}
        <line
          x1={scaleX(meanA)}
          y1={yA - 12}
          x2={scaleX(meanA)}
          y2={yA + 12}
          stroke="#74243a"
          strokeWidth="2.5"
        />

        {/* Group B Track */}
        <line x1={padLeft} y1={yB} x2={padLeft + plotW} y2={yB} stroke="#e7d9dd" strokeWidth="2" />
        <text x={padLeft - 12} y={yB + 4} textAnchor="end" fontSize="11" fontWeight="bold" fill="#1c7ed6">
          Group B
        </text>
        {dataset.groupB.map((val, i) => {
          const cx = scaleX(val);
          return (
            <g key={`b-${i}`}>
              <circle
                cx={cx}
                cy={yB}
                r="6"
                fill="#1c7ed6"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text x={cx} y={yB - 9} textAnchor="middle" fontSize="9" fill="#755f65">
                {val}
              </text>
            </g>
          );
        })}
        {/* Mean B vertical bar */}
        <line
          x1={scaleX(meanB)}
          y1={yB - 12}
          x2={scaleX(meanB)}
          y2={yB + 12}
          stroke="#1c7ed6"
          strokeWidth="2.5"
        />

        {/* Dynamic Ghost Animation of latest resample / shuffle */}
        {resampledA && resampledB && (
          <g opacity="0.6">
            {resampledA.map((val, idx) => (
              <circle
                key={`ra-${idx}`}
                cx={scaleX(val)}
                cy={yA + 12}
                r="4"
                fill="#74243a"
                stroke="#4b1e2a"
              />
            ))}
            {resampledB.map((val, idx) => (
              <circle
                key={`rb-${idx}`}
                cx={scaleX(val)}
                cy={yB + 12}
                r="4"
                fill="#1c7ed6"
                stroke="#1864ab"
              />
            ))}
          </g>
        )}
      </svg>
      <div className={styles.plotCaption}>
        <span>Each large dot is an observed unit. Vertical ticks indicate group means.</span>
        {resampledA && (
          <span style={{ marginLeft: "0.8rem", color: "#a24d64" }}>
            Smaller dots below each track represent the latest drawn resample.
          </span>
        )}
      </div>
    </div>
  );
}

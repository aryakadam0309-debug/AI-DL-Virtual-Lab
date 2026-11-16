"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";
import "./st1sim.css";
import { CanvasVisualizer } from "./canvasVisualizer";
import { classNames } from "./classNames";
import { DISTRIBUTIONS, DISTRIBUTION_OPTION_LABELS, DISTRIBUTION_ORDER } from "./distributions";
import { clamp, decimalsOf, formatFixed, roundTo } from "./statsMath";
import type { Bound, DistributionId, Expr, SliderDef, Values } from "./types";

export interface St1SimProps {
  /** Link target for "← Back to theory". Defaults to "/". */
  backHref?: string;
  /** Which distribution opens first. Defaults to "normal". */
  initial?: DistributionId;
}

const resolve = (b: Bound, values: Values) => (typeof b === "function" ? b(values) : b);

function ExprView({ expr }: { expr: Expr }) {
  return (
    <>
      {expr.map((part, i) => (typeof part === "string" ? <span key={i}>{part}</span> : <sup key={i}>{part.sup}</sup>))}
    </>
  );
}

interface SliderProps {
  def: SliderDef;
  values: Values;
  onChange: (key: string, value: number) => void;
}

function Slider({ def, values, onChange }: SliderProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const min = resolve(def.min, values);
  const max = resolve(def.max, values);
  const value = values[def.key] ?? min;
  const decimals = decimalsOf(def.step);
  const fill = max > min ? (value - min) / (max - min) : 0;

  return (
    <div className="st1-slider">
      <div className="st1-slider-top">
        <label htmlFor={id} className="st1-slider-label">
          {def.label}
        </label>
        <output htmlFor={id} className="st1-pill" aria-live="off">
          {formatFixed(value, decimals)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="st1-range"
        min={min}
        max={max}
        step={def.step}
        value={value}
        aria-describedby={hintId}
        aria-valuetext={formatFixed(value, decimals)}
        style={{ "--st1-fill": String(fill) } as CSSProperties}
        onChange={(e) => onChange(def.key, roundTo(clamp(Number(e.target.value), min, max), decimals))}
      />
      <p id={hintId} className="st1-hint">
        {def.hint}
      </p>
    </div>
  );
}

export default function St1Sim({ backHref = "/", initial = "normal" }: St1SimProps) {
  const selectId = useId();
  const [distId, setDistId] = useState<DistributionId>(DISTRIBUTIONS[initial] ? initial : "normal");
  const [values, setValues] = useState<Values>(() => ({ ...DISTRIBUTIONS[distId].defaults }));

  const config = DISTRIBUTIONS[distId];
  const result = useMemo(() => config.build(values), [config, values]);

  const handleDistChange = (next: DistributionId) => {
    setDistId(next);
    setValues({ ...DISTRIBUTIONS[next].defaults });
  };

  const handleSlider = (key: string, value: number) => {
    setValues((prev) => config.normalize({ ...prev, [key]: value }, key));
  };

  return (
    <div className="st1-root">
      <div className="st1-container">
        <header className="st1-topbar">
          <a href={backHref} className="st1-back">
            ← Back to theory
          </a>
          <div className="st1-picker">
            <label htmlFor={selectId} className="st1-picker-label">
              Distribution
            </label>
            <span className="st1-select-wrap">
              <select
                id={selectId}
                className="st1-select"
                value={distId}
                onChange={(e) => handleDistChange(e.target.value as DistributionId)}
              >
                {DISTRIBUTION_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {DISTRIBUTION_OPTION_LABELS[id]}
                  </option>
                ))}
              </select>
              <svg className="st1-chevron" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </header>

        <div className="st1-header">
          <h1 className="st1-title">{config.name}</h1>
          <p className="st1-description">{config.description}</p>
        </div>

        <div className="st1-grid">
          <div className="st1-left">
            <section className="st1-panel" aria-labelledby={`${selectId}-params`}>
              <div className="st1-panel-body">
                <h2 id={`${selectId}-params`} className="st1-panel-heading">
                  Parameters
                </h2>
                {config.sliders.map((def) => (
                  <Slider key={`${distId}-${def.key}`} def={def} values={values} onChange={handleSlider} />
                ))}
              </div>
            </section>

            <section className="st1-panel" aria-labelledby={`${selectId}-calc`}>
              <div className="st1-panel-body">
                <h2 id={`${selectId}-calc`} className="st1-panel-heading">
                  Calculation
                </h2>
                <table className="st1-table">
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.label} className={classNames(row.highlight && "st1-result")}>
                        <th scope="row">{row.label}</th>
                        <td>
                          <ExprView expr={row.value} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="st1-right">
            <div className="st1-panel st1-plot-panel">
              <CanvasVisualizer spec={result.plot} ariaLabel={result.ariaLabel} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { St1Sim };

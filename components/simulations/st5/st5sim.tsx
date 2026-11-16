"use client";
import { useId, useMemo, useState, type CSSProperties } from "react";
import cssText from "./st5sim.css";
import { betaPdf, formatCount, formatFixed, incrementCount, posteriorSummary } from "./betaMath";
import { CanvasVisualizer } from "./canvasVisualizer";
import { classNames } from "./classNames";
import styles from "./styles";

export interface St5SimProps {
  /** Link target for "← Back to theory". Defaults to "/". */
  backHref?: string;
  /** Optional class added to the simulator root. */
  className?: string;
}

const DEFAULTS = { alpha: 1, beta: 1, heads: 7, tails: 3 };
const PRESETS = [
  { name: "Flat (1, 1)", alpha: 1, beta: 1 },
  { name: "Weak (2, 2)", alpha: 2, beta: 2 },
  { name: "Strong (20, 20)", alpha: 20, beta: 20 },
] as const;

function St5Slider({
  label,
  symbol,
  hint,
  value,
  min,
  max,
  step,
  id,
  onChange,
}: {
  label: string;
  symbol: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  id: string;
  onChange: (value: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={styles.slider}>
      <div className={styles.sliderTop}>
        <label htmlFor={id} className={styles.sliderLabel}>
          {label} ({symbol})
        </label>
        <output htmlFor={id} className={styles.valuePill} aria-live="off">
          {formatCount(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className={styles.range}
        style={{ "--st5-fill": `${fill}%` } as CSSProperties}
        aria-describedby={`${id}-hint`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <p id={`${id}-hint`} className={styles.hint}>
        {hint}
      </p>
    </div>
  );
}

export default function St5Sim({ backHref = "/", className }: St5SimProps) {
  const id = useId();
  const [values, setValues] = useState(DEFAULTS);
  const summary = useMemo(
    () => posteriorSummary(values.alpha, values.beta, values.heads, values.tails),
    [values],
  );
  const plot = useMemo(() => {
    const points = [];
    const sampleCount = 400;
    const maxLogLikelihood =
      summary.n === 0
        ? 0
        : (summary.heads === 0 ? 0 : summary.heads * Math.log(summary.heads / summary.n)) +
          (summary.tails === 0 ? 0 : summary.tails * Math.log(summary.tails / summary.n));
    let maxDensity = 0;

    for (let index = 0; index < sampleCount; index += 1) {
      const p = 0.0025 + (0.995 * index) / (sampleCount - 1);
      const prior = betaPdf(p, values.alpha, values.beta);
      const posterior = betaPdf(p, summary.posteriorAlpha, summary.posteriorBeta);
      const likelihood =
        summary.n === 0
          ? null
          : Math.exp(
              (summary.heads === 0 ? 0 : summary.heads * Math.log(p)) +
                (summary.tails === 0 ? 0 : summary.tails * Math.log1p(-p)) -
                maxLogLikelihood,
            ) * betaPdf(summary.heads / summary.n, summary.posteriorAlpha, summary.posteriorBeta);
      points.push({ p, prior, posterior, likelihood });
      maxDensity = Math.max(maxDensity, prior, posterior, likelihood ?? 0);
    }

    return {
      points,
      mean: summary.mean,
      lower: summary.lower,
      upper: summary.upper,
      yMax: maxDensity * 1.1,
    };
  }, [summary, values.alpha, values.beta]);

  const setValue = (key: keyof typeof DEFAULTS, value: number) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const percent = Math.round(summary.priorShare * 100);
  const message =
    summary.n === 0
      ? "No data yet, so the posterior is the same as the prior."
      : `Given the prior and the data, there is a 95% chance that p is between ${formatFixed(summary.lower, 2)} and ${formatFixed(summary.upper, 2)}.`;
  const ariaLabel =
    `Posterior Beta(${formatCount(summary.posteriorAlpha)}, ${formatCount(summary.posteriorBeta)}), ` +
    `mean ${formatFixed(summary.mean, 3)}, 95% credible interval ${formatFixed(summary.lower, 2)} to ${formatFixed(summary.upper, 2)}.`;
  const strength = summary.totalStrength;
  const denominator = strength + summary.n;

  return (
    <div className={classNames(styles.root, className)} data-st5-root>
      <style>{cssText}</style>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <a href={backHref} className={styles.backLink}>
            ← Back to theory
          </a>
        </header>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Bayesian inference simulator</h1>
          <p className={styles.subtitle}>Update a Beta prior with coin-flip data.</p>
        </div>

        <div className={styles.columns}>
          <div className={styles.leftColumn}>
            <section className={styles.panel} aria-labelledby={`${id}-prior-data`}>
              <h2 id={`${id}-prior-data`} className={styles.panelHeading}>
                Prior and data
              </h2>
              <div className={styles.sliderList}>
                <St5Slider
                  id={`${id}-alpha`}
                  label="Prior heads"
                  symbol="α"
                  hint="Earlier heads we assume before the data"
                  value={values.alpha}
                  min={0.5}
                  max={50}
                  step={0.5}
                  onChange={(value) => setValue("alpha", value)}
                />
                <St5Slider
                  id={`${id}-beta`}
                  label="Prior tails"
                  symbol="β"
                  hint="Earlier tails we assume before the data"
                  value={values.beta}
                  min={0.5}
                  max={50}
                  step={0.5}
                  onChange={(value) => setValue("beta", value)}
                />
                <St5Slider
                  id={`${id}-heads`}
                  label="Heads observed"
                  symbol="k"
                  hint="Heads in the new data"
                  value={values.heads}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(value) => setValue("heads", value)}
                />
                <St5Slider
                  id={`${id}-tails`}
                  label="Tails observed"
                  symbol="n − k"
                  hint="Tails in the new data"
                  value={values.tails}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(value) => setValue("tails", value)}
                />
              </div>

              <div className={styles.presetBlock}>
                <p className={styles.presetLabel}>Prior presets</p>
                <div className={styles.presetRow}>
                  {PRESETS.map((preset) => {
                    const selected = values.alpha === preset.alpha && values.beta === preset.beta;
                    return (
                      <button
                        type="button"
                        key={preset.name}
                        aria-pressed={selected}
                        className={classNames(styles.presetButton, selected && styles.presetSelected)}
                        onClick={() => setValues((current) => ({ ...current, alpha: preset.alpha, beta: preset.beta }))}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.actionButton}
                  disabled={values.heads >= 100}
                  onClick={() => setValue("heads", incrementCount(values.heads))}
                >
                  +1 head
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  disabled={values.tails >= 100}
                  onClick={() => setValue("tails", incrementCount(values.tails))}
                >
                  +1 tail
                </button>
                <button type="button" className={classNames(styles.actionButton, styles.resetButton)} onClick={() => setValues(DEFAULTS)}>
                  Reset
                </button>
              </div>
            </section>

            <section className={styles.panel} aria-labelledby={`${id}-calculation`}>
              <h2 id={`${id}-calculation`} className={styles.panelHeading}>
                Calculation
              </h2>
              <table className={styles.table}>
                <tbody>
                  <tr className={styles.tableRow}>
                    <th scope="row" className={styles.tableLabel}>Prior</th>
                    <td className={styles.tableValue}>
                      Beta({formatCount(values.alpha)}, {formatCount(values.beta)}), strength α + β = {formatCount(strength)}
                    </td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <th scope="row" className={styles.tableLabel}>Data</th>
                    <td className={styles.tableValue}>
                      {values.heads} heads, {values.tails} tails (n = {summary.n})
                    </td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <th scope="row" className={styles.tableLabel}>Posterior</th>
                    <td className={styles.tableValue}>
                      Beta({formatCount(values.alpha)} + {values.heads}, {formatCount(values.beta)} + {values.tails}) = Beta(
                      {formatCount(summary.posteriorAlpha)}, {formatCount(summary.posteriorBeta)})
                    </td>
                  </tr>
                  <tr className={classNames(styles.tableRow, styles.highlighted)}>
                    <th scope="row" className={styles.tableLabel}>Posterior mean</th>
                    <td className={styles.tableValue}>
                      (α + k) / (α + β + n) = {formatCount(summary.posteriorAlpha)} / {formatCount(denominator)} = {formatFixed(summary.mean, 3)}
                    </td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <th scope="row" className={styles.tableLabel}>95% credible interval</th>
                    <td className={styles.tableValue}>{formatFixed(summary.lower, 2)} to {formatFixed(summary.upper, 2)}</td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <th scope="row" className={styles.tableLabel}>Prior share of the estimate</th>
                    <td className={styles.tableValue}>
                      (α + β) / (α + β + n) = {formatCount(strength)} / {formatCount(denominator)} = {percent}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <section className={styles.plotPanel} aria-label="Prior, likelihood, and posterior plot">
            <div className={styles.legend} aria-label="Plot legend">
              <span className={styles.legendItem}><span className={classNames(styles.legendSample, styles.legendPrior)} aria-hidden="true" />Prior</span>
              <span className={styles.legendItem}><span className={classNames(styles.legendSample, styles.legendLikelihood)} aria-hidden="true" />Likelihood</span>
              <span className={styles.legendItem}><span className={classNames(styles.legendSample, styles.legendPosterior)} aria-hidden="true" />Posterior</span>
            </div>
            <CanvasVisualizer spec={plot} ariaLabel={ariaLabel} className={styles.plotCanvas} />
            <p className={styles.message} aria-live="polite">{message}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export { St5Sim };

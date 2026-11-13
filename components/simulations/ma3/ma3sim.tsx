"use client";

import { useEffect, useId, useMemo, useState } from "react";
import styles from "./classNames";
import PathPlot from "./pathplot";
import LossPlot from "./lossplot";
import {
  PRESETS,
  CRITICAL_POINTS,
  type Status,
  type GDStep,
} from "./types";
import {
  runGradientDescent,
  round,
  fmt,
  d2f,
} from "./gdMath";

const parseNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

const STATUS_LABELS: Record<Status, string> = {
  "converged-global": "Converged: Global Minimum Reached!",
  "converged-local": "Stalled: Trapped in Local Minimum",
  "stalled-peak": "Stalled: Stuck on Ridge / Peak (f′ ≈ 0)",
  diverged: "Failed: Diverged to Infinity (Unstable)",
  oscillating: "Warning: Oscillating / Overshooting",
  "max-iter": "Iteration Limit Reached",
};

function explainStatus(status: Status, step: GDStep | null, lr: number): string {
  if (!step) return "";
  switch (status) {
    case "converged-global":
      return `Successfully reached the global minimum at x ≈ −1.484, f(x) ≈ −1.435. Here the gradient |f′(x)| is virtually 0 and curvature f″(x) ≈ 4.61 > 0.`;
    case "converged-local":
      return `Trapped in the shallow local minimum at x ≈ 1.332, f(x) ≈ −0.588. Plain gradient descent cannot climb back out. Try adding Momentum (β > 0.7) to carry the iterate over the ridge into the deeper global valley!`;
    case "stalled-peak":
      return `Landed near the local maximum at x ≈ 0.152. Because the slope is flat (f′ ≈ 0), gradient descent stops, even though this is the highest point between the two valleys!`;
    case "diverged":
      return `The iterate blew up to ${fmt(step.x, 2)}. The learning rate η = ${lr} exceeds the theoretical stability limit 2/L, causing steps to grow uncontrollably.`;
    case "oscillating":
      return `The step size is near the edge of stability. The iterate bounces back and forth across the valley walls instead of settling smoothly.`;
    case "max-iter":
      return `Reached the maximum number of iterations before the gradient dropped below the convergence threshold. Try increasing steps or adjusting the learning rate.`;
  }
}

export default function Ma3Sim() {
  const uid = useId();

  // Preset
  const [pid, setPid] = useState<string>(PRESETS[0].id);
  const currentPreset = PRESETS.find((p) => p.id === pid) ?? PRESETS[0];

  // Parameters
  const [sx0, setSx0] = useState<string>(String(PRESETS[0].x0));
  const [slr, setSlr] = useState<string>(String(PRESETS[0].lr));
  const [sMomentum, setSMomentum] = useState<string>(String(PRESETS[0].momentum));
  const [maxIter, setMaxIter] = useState<number>(PRESETS[0].maxIter);

  // Playback & Animation
  const [cur, setCur] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.5);

  const x0 = parseNum(sx0);
  const lr = parseNum(slr);
  const momentum = parseNum(sMomentum);
  const valid = [x0, lr, momentum].every(Number.isFinite);

  // Run gradient descent
  const { steps, status } = useMemo(() => {
    if (!valid) return { steps: [], status: "max-iter" as Status };
    return runGradientDescent(x0, lr, momentum, maxIter);
  }, [valid, x0, lr, momentum, maxIter]);

  const maxK = steps.length > 0 ? steps.length - 1 : 0;
  const activeCur = Math.min(cur, maxK);
  const currentStep: GDStep | null = steps[activeCur] ?? null;

  // Animation ticker
  useEffect(() => {
    if (!playing) return;
    const intervalMs = Math.max(80, 1000 / (speed * 4));
    const timer = setInterval(() => {
      setCur((k) => {
        if (k >= maxK) {
          setPlaying(false);
          return maxK;
        }
        return k + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playing, speed, maxK]);

  // Stop playback when reaching end
  useEffect(() => {
    if (playing && activeCur >= maxK) {
      setPlaying(false);
    }
  }, [playing, activeCur, maxK]);

  // Preset changer
  const pickPreset = (presetId: string) => {
    const p = PRESETS.find((q) => q.id === presetId);
    if (!p) return;
    setPid(presetId);
    setSx0(String(p.x0));
    setSlr(String(p.lr));
    setSMomentum(String(p.momentum));
    setMaxIter(p.maxIter);
    setCur(0);
    setPlaying(false);
  };

  const handlePickStartOnPlot = (newX0: number) => {
    setSx0(String(newX0));
    setCur(0);
    setPlaying(false);
  };

  // Stability Limit check near current step
  const currentCurvature = currentStep ? currentStep.d2fx : d2f(x0);
  const localStabilityLimit = currentCurvature > 0 ? 2 / currentCurvature : Infinity;
  const isUnstable = lr > localStabilityLimit;

  return (
    <section className={styles.root} aria-label="Simulation: Calculus and Gradient Descent">
      {/* Header */}
      <div className={styles.head}>
        <p className={styles.eyebrow}>Calculus & Optimization / Experiment 03</p>
        <h2>Calculus and Gradient Descent Simulation</h2>
        <p>
          Gradient descent repeatedly steps downhill along the direction of steepest decrease (−f′).
          Explore how the learning rate controls stability, momentum carries inertia over hills,
          and the starting point determines which minimum you reach.
        </p>
      </div>

      {/* Guide Accordion */}
      <details className={styles.guide}>
        <summary>Short Summary & Update Rules</summary>
        <ol>
          <li>
            <strong>The Derivative is the Slope:</strong> For a single variable, f′(x) tells you how fast the curve is rising. A positive slope means moving left goes downhill; a negative slope means moving right goes downhill.
          </li>
          <li>
            <strong>Gradient Descent Update:</strong> Repeatedly step opposite the slope by amount proportional to the learning rate η:
            <span style={{ display: "block", margin: "0.2rem 0", fontWeight: 700, color: "#74243a" }}>
              x_{"k+1"} = x_k − η · f′(x_k)
            </span>
          </li>
          <li>
            <strong>Stability Limit (2/L):</strong> Near any minimum with curvature L = f″(x), gradient descent converges only if η &lt; 2/L. If η is too large, the updates overshoot and blow up to infinity!
          </li>
          <li>
            <strong>Polyak Momentum:</strong> Accumulates past velocity like a heavy ball rolling down a physical hill. Helps push through flat ridges and escape shallow local minima traps:
            <span style={{ display: "block", margin: "0.2rem 0", fontWeight: 700, color: "#a24d64" }}>
              v_{"k+1"} = β · v_k − η · f′(x_k), &nbsp; x_{"k+1"} = x_k + v_{"k+1"}
            </span>
          </li>
          <li>
            <strong>Local Minimum Traps:</strong> When the landscape has multiple valleys, plain gradient descent stops at whichever critical point (f′=0) it reaches first, even if a much better global minimum exists nearby!
          </li>
        </ol>
        <p className={styles.formula}>
          f(x) = x⁴/4 − x² + 0.3x, &nbsp; f′(x) = x³ − 2x + 0.3, &nbsp; f″(x) = 3x² − 2
        </p>
        <p className={styles.hint}>
          Try it: Click on the graph to choose any starting point x₀. Choose <strong>Worked Example: Local Min Trap</strong>, press <strong>Play</strong>, and watch the ball stall in the right valley. Then switch to <strong>Momentum Escapes the Trap</strong>!
        </p>
      </details>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Setup Panel */}
        <div className={`${styles.panel} ${styles.setup}`}>
          <div className={styles.field}>
            <label htmlFor={`${uid}preset`}>Experimental Scenario</label>
            <select
              id={`${uid}preset`}
              value={pid}
              onChange={(e) => pickPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className={styles.hint}>{currentPreset.hint}</p>
          </div>

          <div className={styles.row3}>
            <div className={styles.field}>
              <label htmlFor={`${uid}x0`}>Start point x₀</label>
              <input
                id={`${uid}x0`}
                type="number"
                step="0.05"
                value={sx0}
                onChange={(e) => {
                  setSx0(e.target.value);
                  setCur(0);
                  setPlaying(false);
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${uid}lr`}>Learning rate η</label>
              <input
                id={`${uid}lr`}
                type="number"
                step="0.01"
                min="0.001"
                max="1.5"
                value={slr}
                onChange={(e) => {
                  setSlr(e.target.value);
                  setCur(0);
                  setPlaying(false);
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${uid}mom`}>Momentum β</label>
              <input
                id={`${uid}mom`}
                type="number"
                step="0.05"
                min="0"
                max="0.99"
                value={sMomentum}
                onChange={(e) => {
                  setSMomentum(e.target.value);
                  setCur(0);
                  setPlaying(false);
                }}
              />
            </div>
          </div>

          {/* Quick Sliders */}
          <div className={styles.field}>
            <label htmlFor={`${uid}lr_slide`}>Learning Rate Slider: η = {lr}</label>
            <input
              id={`${uid}lr_slide`}
              type="range"
              min={0.01}
              max={0.9}
              step={0.01}
              value={lr}
              onChange={(e) => {
                setSlr(e.target.value);
                setCur(0);
                setPlaying(false);
              }}
            />
            {isUnstable && (
              <p className={styles.warn}>
                ⚠️ Warning: η = {lr} exceeds local curvature stability limit 2/L ≈ {round(localStabilityLimit, 2)}! Run may overshoot or diverge.
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}mom_slide`}>Momentum Slider: β = {momentum}</label>
            <input
              id={`${uid}mom_slide`}
              type="range"
              min={0}
              max={0.95}
              step={0.05}
              value={momentum}
              onChange={(e) => {
                setSMomentum(e.target.value);
                setCur(0);
                setPlaying(false);
              }}
            />
            <p className={styles.hint}>
              {momentum === 0
                ? "β = 0: Plain Gradient Descent (stops at nearest critical point)."
                : `β = ${momentum}: Keeps velocity from past gradients. Speeds up along flat stretches and overshoots shallow barriers.`}
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor={`${uid}iter`}>Max Iterations: {maxIter}</label>
            <input
              id={`${uid}iter`}
              type="range"
              min={10}
              max={150}
              step={5}
              value={maxIter}
              onChange={(e) => {
                setMaxIter(+e.target.value);
                setCur(0);
                setPlaying(false);
              }}
            />
          </div>

          {!valid && (
            <p role="alert" className={styles.warn}>
              Please enter valid numerical parameters.
            </p>
          )}
        </div>

        {/* Plots Area */}
        <div className={styles.plots}>
          <div className={styles.chartHeading}>
            <span className={styles.chartIndex}>01</span>
            <h3>Function Landscape & Trajectory Path</h3>
          </div>

          {/* Interactive Plot of f(x) */}
          <PathPlot
            steps={steps}
            currentStepIndex={activeCur}
            onPickStart={handlePickStartOnPlot}
          />

          <p className={styles.hint}>
            Click anywhere along the horizontal axis of the graph to place the initial guess <strong>x₀</strong> directly!
          </p>

          <div className={styles.legend}>
            <span>
              <span className={styles.dot} style={{ background: "#74243a" }} />
              <strong>Ball (x_k):</strong> Current guess
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#e11d48" }} />
              <strong>Red line:</strong> Slope / tangent f′(x_k)
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#16a34a" }} />
              <strong>Green point:</strong> Global Minimum (−1.484)
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#ea580c" }} />
              <strong>Orange point:</strong> Local Minimum Trap (1.332)
            </span>
          </div>

          {/* Stepper Controls Bar */}
          <div className={styles.bar}>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setCur(0);
                setPlaying(false);
              }}
              disabled={activeCur === 0}
            >
              Reset
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setPlaying(false);
                setCur((k) => Math.max(0, k - 1));
              }}
              disabled={activeCur === 0}
            >
              Back
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                } else {
                  if (activeCur >= maxK) setCur(0);
                  setPlaying(true);
                }
              }}
              disabled={maxK === 0}
            >
              {playing ? "Pause" : activeCur >= maxK && maxK > 0 ? "Replay" : "Play"}
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setPlaying(false);
                setCur((k) => Math.min(maxK, k + 1));
              }}
              disabled={activeCur >= maxK}
            >
              Step
            </button>

            <label className={styles.inline}>
              Speed
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.5}
                value={speed}
                onChange={(e) => setSpeed(+e.target.value)}
              />
            </label>
          </div>

          <div className={styles.bar}>
            <label htmlFor={`${uid}scrub`}>Iteration Step</label>
            <input
              id={`${uid}scrub`}
              className={styles.scrub}
              type="range"
              min={0}
              max={maxK}
              value={activeCur}
              disabled={maxK === 0}
              onChange={(e) => {
                setPlaying(false);
                setCur(+e.target.value);
              }}
            />
            <span>
              Step {activeCur} of {maxK}
            </span>
          </div>

          {/* Loss Plot */}
          <div className={styles.chartHeading} style={{ marginTop: "1rem" }}>
            <span className={styles.chartIndex}>02</span>
            <h3>Objective Loss Value f(x_k) vs Iteration</h3>
          </div>

          <LossPlot steps={steps} currentStepIndex={activeCur} maxK={maxK} />
          <p className={styles.hint}>
            Plots the function value (loss) at each iteration step. Notice how momentum can temporarily let the loss increase while rolling over the hill before finding the global minimum!
          </p>
        </div>

        {/* Readout Cards */}
        <div className={styles.read} aria-live="polite">
          {/* Card 1: State Readout */}
          <div className={`${styles.card} ${styles.cardB}`}>
            <h3>Current Iterate State (Step {activeCur})</h3>
            <dl className={styles.dl}>
              <dt>Position (x)</dt>
              <dd>{currentStep ? fmt(currentStep.x, 4) : "—"}</dd>
              <dt>Objective f(x)</dt>
              <dd>{currentStep ? fmt(currentStep.fx, 4) : "—"}</dd>
              <dt>Gradient f′(x)</dt>
              <dd>{currentStep ? fmt(currentStep.dfx, 4) : "—"}</dd>
              <dt>Curvature f″(x)</dt>
              <dd>{currentStep ? fmt(currentStep.d2fx, 4) : "—"}</dd>
              <dt>Velocity v</dt>
              <dd>{currentStep ? fmt(currentStep.v, 4) : "—"}</dd>
              <dt>Step Size Δx</dt>
              <dd>
                {currentStep && currentStep.nextX !== null
                  ? fmt(currentStep.nextX - currentStep.x, 4)
                  : "—"}
              </dd>
            </dl>
          </div>

          {/* Card 2: Diagnostic & Stability */}
          <div className={`${styles.card} ${styles.cardN}`}>
            <h3>Optimization Outcome</h3>
            <p className={styles.status} style={{ fontWeight: 700, color: "#74243a" }}>
              {STATUS_LABELS[status]}
            </p>
            <p className={styles.status}>
              {explainStatus(status, currentStep, lr)}
            </p>

            <dl className={styles.dl} style={{ marginTop: "0.6rem" }}>
              <dt>Distance to Global Min</dt>
              <dd>
                {currentStep
                  ? fmt(Math.abs(currentStep.x - CRITICAL_POINTS[0].x), 4)
                  : "—"}
              </dd>
              <dt>Local Curvature L = f″</dt>
              <dd>{currentStep ? fmt(currentStep.d2fx, 3) : "—"}</dd>
              <dt>Stability Limit 2/L</dt>
              <dd>
                {Number.isFinite(localStabilityLimit)
                  ? fmt(localStabilityLimit, 3)
                  : "N/A (Concave)"}
              </dd>
            </dl>
          </div>
        </div>

        {/* Step Table */}
        <div className={styles.tableWrap}>
          <h3>Iteration History Table</h3>
          <p className={styles.hint}>
            Detailed record of position, function value, gradient, velocity, and step change at each iteration.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>k</th>
                  <th>x_k</th>
                  <th>f(x_k)</th>
                  <th>f′(x_k)</th>
                  <th>f″(x_k)</th>
                  <th>v_k</th>
                  <th>Next x</th>
                </tr>
              </thead>
              <tbody>
                {steps.slice(0, activeCur + 1).map((s) => (
                  <tr key={s.k} className={s.k === activeCur ? styles.cur : undefined}>
                    <td>{s.k}</td>
                    <td>{fmt(s.x, 4)}</td>
                    <td>{fmt(s.fx, 4)}</td>
                    <td>{fmt(s.dfx, 4)}</td>
                    <td>{fmt(s.d2fx, 4)}</td>
                    <td>{fmt(s.v, 4)}</td>
                    <td>{s.nextX !== null ? fmt(s.nextX, 4) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className={styles.glossary}>
            <summary>What do the parameters mean?</summary>
            <ul>
              <li>
                <strong>Iteration (k):</strong> The current step number in the descent process.
              </li>
              <li>
                <strong>Learning Rate (η):</strong> Step size multiplier. Controls how far to step in the downhill direction. Must be less than 2/L to remain stable.
              </li>
              <li>
                <strong>Momentum (β):</strong> Retains a fraction of past velocity v. Helps overcome flat saddle regions and shallow basins of attraction.
              </li>
              <li>
                <strong>Gradient f′(x):</strong> The slope of the curve. At critical points, f′(x) = 0.
              </li>
              <li>
                <strong>Curvature f″(x):</strong> The second derivative. Positive means bowl-shaped (minimum); negative means hill-shaped (maximum).
              </li>
            </ul>
          </details>
        </div>
      </div>

      {/* Theory & Worked Examples matching PDF Page 9 & 10 */}
      <div className={styles.theoryBox}>
        <h3>Virtual Lab Theory Notes: Experiment MA-3</h3>
        <p style={{ margin: "0 0 0.6rem 0", color: "#5b6270", fontSize: "0.93em" }}>
          References: Cauchy (1847), Ruder (2016), Sutskever et al. (2013), Polyak (1964). Unlocks MA-5, ST-1, DL-1, DL-2.
        </p>

        {/* Critical Points Table */}
        <div style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e7d9dd", marginBottom: "0.85rem" }}>
          <h4 style={{ margin: "0 0 0.4rem 0", color: "#74243a", fontSize: "1rem" }}>
            The Experiment's Three Critical Points (f′(x) = 0)
          </h4>
          <table className={styles.table} style={{ marginTop: "0.4rem" }}>
            <thead>
              <tr>
                <th>Critical Point (x)</th>
                <th>f(x)</th>
                <th>f″(x) Curvature</th>
                <th>Type</th>
                <th>Stability Limit 2/L</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "#16a34a", fontWeight: 700 }}>−1.484</td>
                <td>−1.435</td>
                <td>4.61</td>
                <td>Global Minimum</td>
                <td>η &lt; 0.434</td>
              </tr>
              <tr>
                <td style={{ color: "#e11d48", fontWeight: 700 }}>0.152</td>
                <td>0.023</td>
                <td>−1.93</td>
                <td>Local Maximum (Ridge)</td>
                <td>Unstable (Hill)</td>
              </tr>
              <tr>
                <td style={{ color: "#ea580c", fontWeight: 700 }}>1.332</td>
                <td>−0.588</td>
                <td>3.32</td>
                <td>Local Minimum (Trap)</td>
                <td>η &lt; 0.602</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Worked Example */}
        <div style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e7d9dd" }}>
          <h4 style={{ margin: "0 0 0.4rem 0", color: "#74243a", fontSize: "1rem" }}>
            Worked Example: Local Minimum Stalling vs Global Minimum
          </h4>
          <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.92em" }}>
            Start at x₀ = 1.0 with η = 0.1 and no momentum:
          </p>
          <div className={styles.formula} style={{ fontSize: "0.95rem", margin: "0.3rem 0" }}>
            f′(1) = 1³ − 2(1) + 0.3 = −0.7  ⟹  x₁ = 1 − 0.1(−0.7) = 1.07
          </div>
          <p style={{ margin: "0.3rem 0", fontSize: "0.92em" }}>
            Next, f′(1.07) ≈ −0.615 ⟹ x₂ ≈ 1.1315. The path moves right towards the local minimum at 1.332, so this run stalls in the local minimum rather than reaching the deeper global one!
          </p>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.92em", color: "#16a34a", fontWeight: 600 }}>
            Conversely, starting at x₀ = −0.5 with the same η lands to the left of the hill, ending at −1.484 (the true global minimum).
          </p>
        </div>

        {/* Callouts */}
        <div className={styles.calloutsGrid}>
          <div className={`${styles.callout} ${styles.calloutMistake}`}>
            <strong>Common Mistake:</strong> Assuming that a gradient near zero means the global minimum has been found. It only means a critical point has been reached (it could be a local trap or a saddle/peak!).
          </div>
          <div className={`${styles.callout} ${styles.calloutTip}`}>
            <strong>Pro Tip:</strong> Run the same start point with small, moderate, and large learning rates to visualize the 2/L stability boundary.
          </div>
        </div>

        <div className={`${styles.callout} ${styles.calloutKey}`}>
          <strong>Key Takeaway:</strong> Gradient descent follows the slope downhill. The learning rate controls stability, momentum controls inertia, and the start point decides which minimum you reach.
        </div>
      </div>
    </section>
  );
}

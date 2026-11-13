"use client";

import { useEffect, useId, useMemo, useState } from "react";
import styles from "./ma5sim.module.css";
import { LANDSCAPES, clampStart, comparisonStarts, defaultStart, gradientNorm, type LandscapeId, type Point2 } from "./landscapes";
import { optimise, statusLabel, type OptimizerId, type Trajectory } from "./optimizers";
import ContourPlot from "./contourplot";
import LossPlot from "./lossplot";

const LEARNING_RATE_DEFAULTS: Record<LandscapeId, number> = { bowl: 0.08, saddle: 0.05, rosenbrock: 0.001, rastrigin: 0.02 };
const OPTIMIZERS: { id: OptimizerId; label: string; description: string }[] = [
  { id: "gd", label: "Gradient descent", description: "Move against the current gradient at each step." },
  { id: "momentum", label: "Momentum", description: "Accumulate a velocity to smooth updates and carry motion through consistent gradients." },
  { id: "adam", label: "Adam", description: "Adapt each coordinate's step using bias-corrected first and second gradient moments." },
];
const format = (n: number, d = 4) => Number.isFinite(n) ? (Math.abs(n) < 0.5 * 10 ** -d ? 0 : n).toLocaleString("en-US", { maximumFractionDigits: d }) : "—";
const parseFinite = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;

function OptimizerEquation({ optimizer }: { optimizer: OptimizerId }) {
  if (optimizer === "momentum") return <p className={styles.equation}>mₜ = βmₜ₋₁ + ∇f(θₜ) &nbsp; · &nbsp; θₜ₊₁ = θₜ − αmₜ</p>;
  if (optimizer === "adam") return <p className={styles.equation}>m̂ₜ = mₜ/(1−β₁ᵗ) &nbsp; · &nbsp; v̂ₜ = vₜ/(1−β₂ᵗ) &nbsp; · &nbsp; θₜ₊₁ = θₜ − αm̂ₜ/(√v̂ₜ+ε)</p>;
  return <p className={styles.equation}>θₜ₊₁ = θₜ − α∇f(θₜ)</p>;
}

export default function Ma5Sim() {
  const uid = useId().replace(/:/g, "");
  const [landscapeId, setLandscapeId] = useState<LandscapeId>("bowl");
  const [optimizer, setOptimizer] = useState<OptimizerId>("gd");
  const [start, setStart] = useState<Point2>(defaultStart("bowl"));
  const [startText, setStartText] = useState<{ x: string; y: string }>({ x: "3", y: "2" });
  const [learningRate, setLearningRate] = useState(LEARNING_RATE_DEFAULTS.bowl);
  const [learningRateText, setLearningRateText] = useState(String(LEARNING_RATE_DEFAULTS.bowl));
  const [momentum, setMomentum] = useState(0.9);
  const [beta1, setBeta1] = useState(0.9);
  const [beta1Text, setBeta1Text] = useState("0.9");
  const [beta2, setBeta2] = useState(0.999);
  const [beta2Text, setBeta2Text] = useState("0.999");
  const [maxIterations, setMaxIterations] = useState(250);
  const [speed, setSpeed] = useState(2);
  const [compareStarts, setCompareStarts] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const landscape = LANDSCAPES[landscapeId];
  const starts = useMemo(() => compareStarts ? comparisonStarts(landscapeId, start) : [start], [compareStarts, landscapeId, start]);
  const trajectories = useMemo(() => starts.map((p) => optimise(landscape, p, optimizer, {
    learningRate, maxIterations, momentum, beta1, beta2, tolerance: 1e-5,
  })), [starts, landscape, optimizer, learningRate, maxIterations, momentum, beta1, beta2]);
  const longest = Math.max(0, ...trajectories.map((t) => t.points.length - 1));
  const iteration = Math.min(currentIteration, longest);
  const primary: Trajectory | undefined = trajectories[0];
  const primaryStep = primary?.points[Math.min(iteration, Math.max(0, (primary?.points.length ?? 1) - 1))];
  const atEnd = iteration >= longest;
  const startInputsValid = parseFinite(startText.x) !== null && parseFinite(startText.y) !== null;
  const rateValue = parseFinite(learningRateText);
  const rateInputValid = rateValue !== null && rateValue >= 0.0005 && rateValue <= 0.5;
  const beta1Value = parseFinite(beta1Text);
  const beta2Value = parseFinite(beta2Text);
  const adamInputsValid = optimizer !== "adam" || (beta1Value !== null && beta1Value >= 0 && beta1Value < 1 && beta2Value !== null && beta2Value >= 0 && beta2Value < 1);
  const controlsValid = startInputsValid && rateInputValid && adamInputsValid;
  const optimizerInfo = OPTIMIZERS.find((o) => o.id === optimizer)!;
  const runSummary = trajectories.map((t) => ({
    ...t,
    point: t.points[Math.min(iteration, Math.max(0, t.points.length - 1))],
    complete: iteration >= t.points.length - 1,
  }));
  const minimumDistance = landscape.globalMinimum && primaryStep
    ? Math.hypot(primaryStep.x - landscape.globalMinimum.x, primaryStep.y - landscape.globalMinimum.y) : null;
  const nearGlobalMinimum = minimumDistance !== null && minimumDistance < 0.05;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setCurrentIteration((n) => Math.min(n + 1, longest)), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, longest]);
  useEffect(() => {
    if (playing && iteration >= longest) setPlaying(false);
  }, [playing, iteration, longest]);

  const resetProgress = () => { setPlaying(false); setCurrentIteration(0); };
  const chooseLandscape = (id: LandscapeId) => {
    const nextStart = defaultStart(id);
    setLandscapeId(id); setStart(nextStart); setStartText({ x: String(nextStart.x), y: String(nextStart.y) });
    setLearningRate(LEARNING_RATE_DEFAULTS[id]); setLearningRateText(String(LEARNING_RATE_DEFAULTS[id])); resetProgress();
  };
  const updateStart = (axis: keyof Point2, value: string) => {
    setStartText((old) => ({ ...old, [axis]: value }));
    const n = parseFinite(value);
    if (n !== null) {
      const bounded = clampStart(landscapeId, { ...start, [axis]: n });
      setStart(bounded);
      const landscapeBounds = axis === "x" ? landscape.xBounds : landscape.yBounds;
      if (n < landscapeBounds[0] || n > landscapeBounds[1]) setStartText((old) => ({ ...old, [axis]: String(bounded[axis]) }));
    }
    resetProgress();
  };
  const pickStart = (point: Point2) => {
    const bounded = clampStart(landscapeId, point);
    setStart(bounded); setStartText({ x: String(bounded.x), y: String(bounded.y) }); resetProgress();
  };
  const changeLearningRate = (value: string) => {
    setLearningRateText(value);
    const n = parseFinite(value);
    if (n !== null && n >= 0.0005 && n <= 0.5) setLearningRate(n);
    resetProgress();
  };
  const changeBeta = (which: "beta1" | "beta2", value: string) => {
    const n = parseFinite(value);
    if (which === "beta1") {
      setBeta1Text(value);
      if (n !== null && n >= 0 && n < 1) setBeta1(n);
    } else {
      setBeta2Text(value);
      if (n !== null && n >= 0 && n < 1) setBeta2(n);
    }
    resetProgress();
  };
  const statusText = atEnd && primary ? statusLabel(primary.status) : `At iteration ${iteration} of ${longest}`;
  const statusClass = atEnd && primary ? primary.status : "running";
  const bestKnown = landscape.globalMinimum;

  return <section className={styles.root} aria-label="Simulation: convex and non-convex optimization">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>MATHEMATICS · MA-5 · ADVANCED</p><h2>Convex &amp; Non-Convex Optimization</h2><p className={styles.intro}>Watch optimizers move across a loss landscape. Change the function, starting point and update rule to see why some runs converge easily while others struggle.</p></div>
      <span className={styles.liveBadge}><span /> Live browser simulation</span>
    </header>

    <details className={styles.guide} open>
      <summary>What to look for</summary>
      <div className={styles.guideGrid}>
        <p><b>Loss landscape</b><br />Contours connect locations with the same objective value. The background colour also represents objective value.</p>
        <p><b>Optimizer path</b><br />Each marker is an iterate. Paths depend on the current gradient, optimizer state and learning rate.</p>
        <p><b>Convergence</b><br />A small gradient indicates a stationary point—not automatically the global minimum on a non-convex surface.</p>
      </div>
      <OptimizerEquation optimizer={optimizer} />
    </details>

    <div className={styles.layout}>
      <aside className={`${styles.panel} ${styles.controls}`}>
        <div className={styles.sectionHead}><span>01</span><h3>Experiment setup</h3></div>
        <div className={styles.field}><label htmlFor={`${uid}-landscape`}>Objective function</label><select id={`${uid}-landscape`} value={landscapeId} onChange={(e) => chooseLandscape(e.target.value as LandscapeId)}>{Object.values(LANDSCAPES).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select><p className={styles.hint}>{landscape.description}</p></div>
        <div className={styles.field}><label htmlFor={`${uid}-optimizer`}>Optimizer</label><select id={`${uid}-optimizer`} value={optimizer} onChange={(e) => { setOptimizer(e.target.value as OptimizerId); resetProgress(); }}>{OPTIMIZERS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select><p className={styles.hint}>{optimizerInfo.description}</p></div>
        <div className={styles.twoFields}>
          <div className={styles.field}><label htmlFor={`${uid}-startx`}>Start x</label><input id={`${uid}-startx`} type="number" step="0.1" value={startText.x} onChange={(e) => updateStart("x", e.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`${uid}-starty`}>Start y</label><input id={`${uid}-starty`} type="number" step="0.1" value={startText.y} onChange={(e) => updateStart("y", e.target.value)} /></div>
        </div>
        <p className={styles.hint}>You can also click the contour plot to move the starting point.</p>
        <div className={styles.field}><label htmlFor={`${uid}-lr`}>Learning rate α</label><input id={`${uid}-lr`} type="number" min={0.0005} max={0.5} step={0.0005} value={learningRateText} onChange={(e) => changeLearningRate(e.target.value)} /><input aria-label="Learning rate slider" type="range" min={0.0005} max={0.5} step={0.0005} value={learningRate} onChange={(e) => changeLearningRate(e.target.value)} /><p className={styles.hint}>Smaller values take cautious steps; larger values may overshoot or diverge. Range: 0.0005 to 0.5.</p></div>
        {optimizer === "momentum" && <div className={styles.field}><label htmlFor={`${uid}-momentum`}>Momentum β: <strong>{momentum.toFixed(2)}</strong></label><input id={`${uid}-momentum`} type="range" min={0} max={0.99} step={0.01} value={momentum} onChange={(e) => { setMomentum(Number(e.target.value)); resetProgress(); }} /><p className={styles.hint}>Higher momentum carries more of the previous update forward.</p></div>}
        {optimizer === "adam" && <div className={styles.twoFields}>
          <div className={styles.field}><label htmlFor={`${uid}-beta1`}>β₁</label><input id={`${uid}-beta1`} type="number" min={0} max={0.999} step={0.01} value={beta1Text} onChange={(e) => changeBeta("beta1", e.target.value)} /></div>
          <div className={styles.field}><label htmlFor={`${uid}-beta2`}>β₂</label><input id={`${uid}-beta2`} type="number" min={0} max={0.9999} step={0.001} value={beta2Text} onChange={(e) => changeBeta("beta2", e.target.value)} /></div>
        </div>}
        <div className={styles.field}><label htmlFor={`${uid}-iterations`}>Maximum iterations: <strong>{maxIterations}</strong></label><input id={`${uid}-iterations`} type="range" min={50} max={500} step={25} value={maxIterations} onChange={(e) => { setMaxIterations(Number(e.target.value)); resetProgress(); }} /><div className={styles.rangeLabels}><span>50</span><span>500</span></div></div>
        <label className={styles.checkLine}><input type="checkbox" checked={compareStarts} onChange={(e) => { setCompareStarts(e.target.checked); resetProgress(); }} /> Compare five starting points</label>
        {!controlsValid && <p role="alert" className={styles.warning}>Complete the starting coordinates and keep the learning rate and active optimizer parameters within their allowed ranges before running. The plots use the last valid numeric settings while an input is incomplete.</p>}
        <div className={styles.buttonRow}><button type="button" className={styles.primary} disabled={!controlsValid} onClick={() => { setPlaying((p) => !p); if (atEnd) setCurrentIteration(0); }}>{playing ? "Pause" : atEnd ? "Run again" : "Run"}</button><button type="button" className={styles.secondary} onClick={() => { setPlaying(false); setCurrentIteration((n) => Math.min(n + 1, longest)); }} disabled={atEnd || !controlsValid}>Step</button><button type="button" className={styles.secondary} onClick={resetProgress}>Reset</button></div>
        <div className={styles.field}><label htmlFor={`${uid}-speed`}>Playback speed</label><select id={`${uid}-speed`} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.5}>0.5 updates/sec</option><option value={1}>1 update/sec</option><option value={2}>2 updates/sec</option><option value={4}>4 updates/sec</option><option value={8}>8 updates/sec</option></select></div>
      </aside>

      <div className={styles.mainColumn}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}><span>02</span><div><h3>Loss landscape &amp; optimizer paths</h3><p>Click the plot to change the initial point.</p></div></div>
          <div className={styles.plotWrap}><ContourPlot landscapeId={landscapeId} trajectories={trajectories} activeIteration={iteration} start={start} onPick={pickStart} /></div>
          <div className={styles.legend}><span><i className={styles.legendStart} /> Starting point</span><span><i className={styles.legendBlue} /> Current run</span>{compareStarts && <span><i className={styles.legendPurple} /> Additional starts</span>}{bestKnown && <span><i className={styles.legendGreen} /> Known global minimum</span>}</div>
          <div className={styles.iterationControl}><label htmlFor={`${uid}-scrub`}>Inspect iteration <strong>{iteration}</strong> / {longest}</label><input id={`${uid}-scrub`} type="range" min={0} max={Math.max(1, longest)} value={iteration} onChange={(e) => { setPlaying(false); setCurrentIteration(Number(e.target.value)); }} /></div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}><span>03</span><div><h3>Objective value against iteration</h3><p>A downward path means loss is decreasing; on a saddle surface it may decrease without reaching a minimum.</p></div></div>
          <div className={styles.plotWrap}><LossPlot trajectories={trajectories} activeIteration={iteration} /></div>
          <p className={styles.hint}>The chart uses a linear vertical scale because objective values may be negative on the saddle surface. Each line corresponds to a starting point.</p>
        </section>

        <section className={styles.panel} aria-live="polite">
          <div className={styles.sectionHead}><span>04</span><h3>Run results</h3></div>
          <div className={styles.statusRow}><span className={`${styles.statusBadge} ${styles[`status_${statusClass}`] ?? ""}`}>{statusText}</span><span className={styles.hint}>{playing ? "Animation is running" : atEnd ? "Run is at its endpoint" : "Use Run or Step to advance"}</span></div>
          <div className={styles.metrics}>
            <article className={styles.metric}><span>Current x</span><strong>{format(primaryStep?.x ?? NaN, 5)}</strong></article>
            <article className={styles.metric}><span>Current y</span><strong>{format(primaryStep?.y ?? NaN, 5)}</strong></article>
            <article className={styles.metric}><span>Objective f(x, y)</span><strong>{format(primaryStep?.loss ?? NaN, 6)}</strong></article>
            <article className={styles.metric}><span>Gradient norm</span><strong>{format(primaryStep?.gradNorm ?? NaN, 6)}</strong></article>
          </div>
          {atEnd && primary && <p className={styles.resultMessage}>{primary.message}{nearGlobalMinimum ? " The current point is close to the known global minimum." : bestKnown && primary.status === "converged" ? ` Distance to known global minimum: ${format(minimumDistance ?? NaN, 4)}.` : ""}</p>}
          {landscapeId === "saddle" && <p className={styles.saddleNote}><b>Important:</b> this saddle function is unbounded below, so gradient-based minimization can continue moving downhill instead of finding a minimum. The origin has zero gradient, but it is not a minimum.</p>}
          {compareStarts && <div className={styles.tableWrap}><table className={styles.resultsTable}><thead><tr><th>Start</th><th>Final / current point</th><th>Loss</th><th>Status</th></tr></thead><tbody>{runSummary.map((row, i) => <tr key={`${row.start.x}-${row.start.y}-${i}`}><td>({format(row.start.x, 2)}, {format(row.start.y, 2)})</td><td>({format(row.point?.x ?? NaN, 3)}, {format(row.point?.y ?? NaN, 3)})</td><td>{format(row.point?.loss ?? NaN, 4)}</td><td>{row.complete ? statusLabel(row.status) : `Iteration ${iteration}`}</td></tr>)}</tbody></table></div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.sectionHead}><span>05</span><h3>Guided challenges</h3></div>
          <ol className={styles.challengeList}>
            <li><b>Convex bowl:</b> compare gradient descent, momentum and Adam from the same starting point. Which reaches a small gradient in fewer updates?</li>
            <li><b>Learning rate:</b> increase α. Look for larger jumps, overshooting or a run that stops as unstable.</li>
            <li><b>Rosenbrock valley:</b> use a modest learning rate and follow the curved valley toward (1, 1). Why can the path zig-zag?</li>
            <li><b>Many minima:</b> turn on five starting points. Do all trajectories reach the same minimum? Explain why a local result can depend on the start.</li>
            <li><b>Saddle:</b> compare the loss and gradient norm. Explain why “gradient is zero” and “minimum found” are not equivalent statements.</li>
          </ol>
        </section>
      </div>
    </div>
    <footer className={styles.footer}>Simulation honesty: objective values, gradients, optimizer updates and trajectories are calculated live in the browser. The global minimum is marked only for functions with a known minimum defined in this simulation; numerical convergence does not certify a global optimum.</footer>
  </section>;
}

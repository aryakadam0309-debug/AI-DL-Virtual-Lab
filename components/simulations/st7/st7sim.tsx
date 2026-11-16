"use client";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import styles from "./st7sim.module.css";
import { aggregateInteraction, aggregateMainEffects, analyzeFactorial, factorialTerms, generateFactorialDesign, type DesignConfig, type DesignRun, type FactorSpec } from "./design";

const initialFactors: FactorSpec[] = [
  { name: "A", low: 20, high: 40 }, { name: "B", low: 1, high: 3 },
  { name: "C", low: 10, high: 30 }, { name: "D", low: 5, high: 15 },
];
const fmt = (v: number | null | undefined, digits = 3) => v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);

function PlotCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className={styles.plotCard}><div className={styles.plotHead}><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{children}</section>;
}

function MainEffectsPlot({ rows }: { rows: ReturnType<typeof aggregateMainEffects> }) {
  const width = 620, height = 280, left = 54, right = 20, top = 20, bottom = 46;
  const values = rows.flatMap(r => [r.low, r.high]);
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 1e-9);
  const yMin = min - span * 0.15, yMax = max + span * 0.15;
  const center = (i: number) => left + (i + 0.5) * (width - left - right) / rows.length;
  const y = (v: number) => top + (yMax - v) * (height - top - bottom) / (yMax - yMin);
  return <svg className={styles.plot} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Main effects plot showing mean response from each factor low level to high level">
    {[0, 1, 2, 3].map(i => { const val = yMin + (yMax - yMin) * i / 3; return <g key={i}><line x1={left} x2={width - right} y1={y(val)} y2={y(val)} className={styles.gridLine}/><text x={left - 8} y={y(val) + 4} textAnchor="end" className={styles.tick}>{fmt(val, 1)}</text></g>; })}
    <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} className={styles.axis}/>
    {rows.map((r, i) => <g key={r.factor}><line x1={center(i) - 17} y1={y(r.low)} x2={center(i) + 17} y2={y(r.high)} className={styles.mainLine}/><circle cx={center(i) - 17} cy={y(r.low)} r="5" className={styles.lowDot}/><circle cx={center(i) + 17} cy={y(r.high)} r="5" className={styles.highDot}/><text x={center(i)} y={height - bottom + 24} textAnchor="middle" className={styles.tick}>{r.factor}</text><text x={center(i) - 17} y={height - bottom + 37} textAnchor="middle" className={styles.tinyTick}>Low</text><text x={center(i) + 17} y={height - bottom + 37} textAnchor="middle" className={styles.tinyTick}>High</text></g>)}
    <text x={left} y={height - 5} className={styles.tick}>Mean response</text>
  </svg>;
}

function InteractionPlot({ rows, factorA, factorB }: { rows: DesignRun[]; factorA: string; factorB: string }) {
  const data = aggregateInteraction(rows, factorA, factorB);
  const vals = data.flatMap(d => [d.low, d.high]);
  const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(max - min, 1e-9);
  const yMin = min - span * 0.15, yMax = max + span * 0.15;
  const width = 620, height = 280, left = 54, right = 28, top = 20, bottom = 46;
  const x = (i: number) => left + i * (width - left - right);
  const y = (v: number) => top + (yMax - v) * (height - top - bottom) / (yMax - yMin);
  return <svg className={styles.plot} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${factorA} by ${factorB} interaction plot`}>
    {[0, 1, 2, 3].map(i => { const val = yMin + (yMax - yMin) * i / 3; return <g key={i}><line x1={left} x2={width - right} y1={y(val)} y2={y(val)} className={styles.gridLine}/><text x={left - 8} y={y(val) + 4} textAnchor="end" className={styles.tick}>{fmt(val, 1)}</text></g>; })}
    <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} className={styles.axis}/>
    {data.map((d, i) => <g key={d.levelB}><line x1={x(0)} y1={y(d.low)} x2={x(1)} y2={y(d.high)} className={i === 0 ? styles.interactionA : styles.interactionB}/><circle cx={x(0)} cy={y(d.low)} r="5" className={i === 0 ? styles.lowDot : styles.highDot}/><circle cx={x(1)} cy={y(d.high)} r="5" className={i === 0 ? styles.lowDot : styles.highDot}/></g>)}
    <text x={x(0)} y={height - bottom + 24} textAnchor="middle" className={styles.tick}>Low {factorA}</text><text x={x(1)} y={height - bottom + 24} textAnchor="middle" className={styles.tick}>High {factorA}</text>
    <text x={left} y={height - 8} className={styles.tick}>Separate lines: {factorB} low / high</text>
  </svg>;
}

function getInitialEffects(names: string[]): Record<string, number> {
  const terms = factorialTerms(names);
  const defaults: Record<string, number> = { A: 8, B: -4, AB: 6 };
  return Object.fromEntries(terms.map(term => [term, defaults[term] ?? 0]));
}

export default function St7Sim() {
  const [factorCount, setFactorCount] = useState<2 | 3 | 4>(2);
  const [factors, setFactors] = useState<FactorSpec[]>(initialFactors.slice(0, 2));
  const [replicates, setReplicates] = useState(3);
  const [noiseSd, setNoiseSd] = useState(1.5);
  const [intercept, setIntercept] = useState(50);
  const [seed, setSeed] = useState(2026);
  const [effects, setEffects] = useState<Record<string, number>>(getInitialEffects(["A", "B"]));
  const [pair, setPair] = useState<[string, string]>(["A", "B"]);
  const [expandedTerms, setExpandedTerms] = useState(false);
  const names = factors.map(f => f.name);
  const terms = useMemo(() => factorialTerms(names), [names.join("")]);
  const config: DesignConfig = { factors, replicates, noiseSd, intercept, seed, effects };
  const computed = useMemo(() => {
    try {
      const runs = generateFactorialDesign(config);
      const anova = analyzeFactorial(runs, names, replicates);
      return { runs, anova, error: "" };
    } catch (error) { return { runs: [] as DesignRun[], anova: null, error: error instanceof Error ? error.message : "Could not generate the design." }; }
  // Config is assembled from primitive state values; stringify gives a stable dependency for its arrays/maps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config), names.join(",")]);
  const mainEffects = useMemo(() => computed.runs.length ? aggregateMainEffects(computed.runs, names) : [], [computed.runs, names.join("")]);
  const pairA = names.includes(pair[0]) ? pair[0] : names[0];
  const pairB = names.includes(pair[1]) && pair[1] !== pairA ? pair[1] : names[1];
  const updateFactor = (name: string, key: "low" | "high", value: string) => setFactors(old => old.map(f => f.name === name ? { ...f, [key]: value === "" ? NaN : Number(value) } : f));
  const changeFactorCount = (value: string) => {
    const count = Number(value) as 2 | 3 | 4;
    const next = initialFactors.slice(0, count);
    setFactorCount(count); setFactors(next); setEffects(getInitialEffects(next.map(f => f.name))); setPair(["A", "B"]);
  };
  const displayedTerms = expandedTerms ? terms : terms.filter(t => t.length <= 2);

  return <section className={styles.root} aria-label="ST-7 Design of Experiments simulation">
    <header className={styles.header}>
      <p className={styles.eyebrow}>Stage 2 Statistics / Experiment ST-7</p>
      <h2>Design of Experiments</h2>
      <p>Design a factorial experiment, generate replicated observations and discover how main effects and interactions shape the response.</p>
      <div className={styles.meta}><span>Advanced</span><span>Prerequisite: ST-3</span><span>Unlocks: ML-4, DL-3</span></div>
    </header>

    <details className={styles.guide} open>
      <summary>How to use this simulation</summary>
      <ol><li>Choose 2, 3 or 4 factors and set their real low/high levels.</li><li>Set the true effects and noise, then generate the experiment.</li><li>Read the main-effect and interaction plots before examining ANOVA.</li><li>Increase replication to estimate experimental error and obtain valid F-tests.</li></ol>
      <p><strong>Key idea:</strong> factorial experiments vary factors together, so they reveal interactions that one-factor-at-a-time testing can miss.</p>
    </details>

    <div className={styles.layout}>
      <aside className={styles.panel}>
        <div className={styles.sectionTitle}><span>01</span><h3>Design setup</h3></div>
        <label className={styles.field}><span>Number of factors</span><select value={factorCount} onChange={e => changeFactorCount(e.target.value)}><option value={2}>2 factors (4 combinations)</option><option value={3}>3 factors (8 combinations)</option><option value={4}>4 factors (16 combinations)</option></select></label>
        <div className={styles.factorList}>
          {factors.map(f => <div className={styles.factorCard} key={f.name}><strong>Factor {f.name}</strong><div className={styles.twoCols}>
            <label className={styles.field}><span>Low level (−1)</span><input type="number" value={f.low} step="any" onChange={e => updateFactor(f.name, "low", e.target.value)} /></label>
            <label className={styles.field}><span>High level (+1)</span><input type="number" value={f.high} step="any" onChange={e => updateFactor(f.name, "high", e.target.value)} /></label>
          </div>{Number.isFinite(f.low) && Number.isFinite(f.high) && f.low >= f.high && <p className={styles.warning}>High level must exceed low level.</p>}</div>)}
        </div>
        <div className={styles.sectionTitle}><span>02</span><h3>True response model</h3></div>
        <label className={styles.field}><span>Baseline response (β₀)</span><input type="number" value={intercept} step="any" onChange={e => setIntercept(Number(e.target.value))}/></label>
        <p className={styles.muted}>Enter conventional factorial effects. Main effects are high-minus-low; interaction effects are half-differences of simple effects.</p>
        <div className={styles.effectGrid}>
          {displayedTerms.map(term => <label className={styles.field} key={term}><span>{term.length === 1 ? `Main effect ${term}` : `${term.length > 2 ? "Higher-order interaction" : "Interaction"} ${term}`}</span><input type="number" step="any" value={effects[term] ?? 0} onChange={e => setEffects(old => ({ ...old, [term]: Number(e.target.value) }))}/></label>)}
        </div>
        {terms.length > 6 && <button type="button" className={styles.textButton} onClick={() => setExpandedTerms(v => !v)}>{expandedTerms ? "Show fewer effect controls" : "Show higher-order interaction controls"}</button>}
        <div className={styles.sectionTitle}><span>03</span><h3>Experimental noise</h3></div>
        <label className={styles.field}><span>Replicates per combination: <b>{replicates}</b></span><input type="range" min="1" max="10" value={replicates} onChange={e => setReplicates(Number(e.target.value))}/></label>
        <label className={styles.field}><span>Noise standard deviation: <b>{fmt(noiseSd, 1)}</b></span><input type="range" min="0" max="10" step="0.1" value={noiseSd} onChange={e => setNoiseSd(Number(e.target.value))}/></label>
        <label className={styles.field}><span>Random seed</span><input type="number" value={seed} onChange={e => setSeed(Number(e.target.value))}/></label>
        <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => { setSeed(v => v + 1); }}>Regenerate with new seed</button><button type="button" className={styles.secondary} onClick={() => { setFactorCount(2); setFactors(initialFactors.slice(0, 2)); setReplicates(3); setNoiseSd(1.5); setIntercept(50); setSeed(2026); setEffects(getInitialEffects(["A", "B"])); setPair(["A", "B"]); }}>Reset</button></div>
        {computed.error && <p className={styles.warning} role="alert">{computed.error}</p>}
      </aside>

      <main className={styles.main}>
        <div className={styles.sectionTitle}><span>04</span><h3>Experimental results</h3></div>
        <div className={styles.kpis}><div><span>Treatment combinations</span><strong>{1 << factorCount}</strong></div><div><span>Total observations</span><strong>{computed.runs.length}</strong></div><div><span>Grand mean</span><strong>{fmt(computed.anova?.grandMean, 2)}</strong></div><div><span>Pure-error df</span><strong>{computed.anova?.errorDf ?? "—"}</strong></div></div>
        {computed.runs.length > 0 && <>
          <PlotCard title="Main-effects plot" subtitle="Mean response at each factor's low and high level, averaged over the other factors.">
            <MainEffectsPlot rows={mainEffects}/><div className={styles.legend}><span><i className={styles.lowKey}/> Low level</span><span><i className={styles.highKey}/> High level</span></div>
            <div className={styles.effectSummary}>{mainEffects.map(r => <span key={r.factor}><b>{r.factor}</b> effect = {fmt(r.effect, 2)}</span>)}</div>
          </PlotCard>
          <PlotCard title="Interaction plot" subtitle="Non-parallel lines indicate that one factor's effect depends on the other factor.">
            <div className={styles.pairControls}><label>Horizontal factor <select value={pairA} onChange={e => setPair([e.target.value, pairB])}>{names.filter(n => n !== pairB).map(n => <option key={n}>{n}</option>)}</select></label><label>Separate lines by <select value={pairB} onChange={e => setPair([pairA, e.target.value])}>{names.filter(n => n !== pairA).map(n => <option key={n}>{n}</option>)}</select></label></div>
            <InteractionPlot rows={computed.runs} factorA={pairA} factorB={pairB}/>
            <p className={styles.muted}>Parallel lines suggest little or no interaction for this pair; diverging or crossing lines indicate an interaction.</p>
          </PlotCard>
          <PlotCard title="ANOVA table" subtitle="The full factorial model partitions treatment variation into factorial effects and replicated pure error.">
            <div className={styles.tableWrap}><table><thead><tr><th>Source</th><th>SS</th><th>df</th><th>MS</th><th>F</th><th>p-value</th></tr></thead><tbody>
              {computed.anova?.rows.map(r => <tr key={r.term}><th>{r.term.length === 1 ? `Factor ${r.term}` : `Interaction ${r.term}`}</th><td>{fmt(r.sumSquares, 4)}</td><td>{r.df}</td><td>{fmt(r.meanSquare, 4)}</td><td>{fmt(r.fStatistic, 4)}</td><td>{r.pValue == null ? "—" : r.pValue < 0.001 ? "< 0.001" : fmt(r.pValue, 4)}</td></tr>)}
              <tr><th>Error</th><td>{fmt(computed.anova?.errorSS, 4)}</td><td>{computed.anova?.errorDf ?? "—"}</td><td>{fmt(computed.anova?.errorMS, 4)}</td><td>—</td><td>—</td></tr>
              <tr><th>Total</th><td>{fmt(computed.anova?.totalSS, 4)}</td><td>{computed.anova?.totalDf ?? "—"}</td><td>—</td><td>—</td><td>—</td></tr>
            </tbody></table></div>
            <p className={computed.anova?.canTest ? styles.success : styles.warning} role="status">{computed.anova?.message}</p>
            <p className={styles.muted}>Interpret p-values together with effect size, study context and the assumptions of independent, approximately normal, constant-variance errors. A p-value is not a measure of practical importance.</p>
          </PlotCard>
          <PlotCard title="Randomised run sheet" subtitle="Each row is one experimental observation. Run order is randomised; treatment combinations and replicate numbers are retained.">
            <div className={styles.tableWrap}><table><thead><tr><th>Run</th><th>Combination</th>{names.map(n => <th key={n}>{n} code / value</th>)}<th>Replicate</th><th>Response</th></tr></thead><tbody>
              {computed.runs.map(r => <tr key={r.run}><td>{r.run}</td><td>{r.combination}</td>{names.map(n => { const f = factors.find(v => v.name === n)!; return <td key={n}>{r.levels[n] > 0 ? "+1" : "−1"} ({fmt(r.levels[n] > 0 ? f.high : f.low, 3)})</td>; })}<td>{r.replicate}</td><td>{fmt(r.response, 3)}</td></tr>)}
            </tbody></table></div>
          </PlotCard>
          <PlotCard title="Why not one factor at a time?" subtitle="The factorial design reveals conditional effects by comparing a factor's low-to-high change at both levels of another factor.">
            <div className={styles.compareGrid}><div><strong>Effect of {pairA} when {pairB} is low</strong><b>{fmt(aggregateInteraction(computed.runs, pairA, pairB)[0].high - aggregateInteraction(computed.runs, pairA, pairB)[0].low, 3)}</b></div><div><strong>Effect of {pairA} when {pairB} is high</strong><b>{fmt(aggregateInteraction(computed.runs, pairA, pairB)[1].high - aggregateInteraction(computed.runs, pairA, pairB)[1].low, 3)}</b></div></div>
            <p className={styles.muted}>If these simple effects differ, the effect of {pairA} depends on {pairB}. An OFAT study at only one level of {pairB} could miss that difference.</p>
          </PlotCard>
        </>}
      </main>
    </div>
    <footer className={styles.footer}>Browser simulation · Synthetic responses are generated from the displayed factorial model and seeded random noise. Results are educational and depend on the stated ANOVA assumptions.</footer>
  </section>;
}

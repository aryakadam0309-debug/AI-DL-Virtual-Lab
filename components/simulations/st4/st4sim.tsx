"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./classNames";
import DataPlot from "./dataPlot";
import DistributionPlot from "./distributionPlot";
import {
  DATASET_PRESETS,
  STATISTIC_DEFINITIONS,
  type ResampleMode,
  type StatisticId,
  type BootstrapResult,
  type PermutationResult,
} from "./types";
import {
  runBootstrap,
  runPermutationTest,
  resampleWithReplacement,
  shuffleArray,
  fmt,
} from "./resampleMath";

export default function St4Sim() {
  const [mode, setMode] = useState<ResampleMode>("bootstrap");
  const [presetId, setPresetId] = useState<string>("worked_example");
  const [statId, setStatId] = useState<StatisticId>("diff-means");
  const [resampleCount, setResampleCount] = useState<number>(1000);

  // Single step animation state
  const [resampledA, setResampledA] = useState<number[] | null>(null);
  const [resampledB, setResampledB] = useState<number[] | null>(null);

  const dataset = useMemo(
    () => DATASET_PRESETS.find((d) => d.id === presetId) ?? DATASET_PRESETS[0],
    [presetId]
  );
  const statDef = STATISTIC_DEFINITIONS[statId];

  // Compute results
  const [bootstrapResult, setBootstrapResult] = useState<BootstrapResult | null>(null);
  const [permutationResult, setPermutationResult] = useState<PermutationResult | null>(null);

  // Re-run whenever dataset, stat, or resample count changes
  useEffect(() => {
    if (mode === "bootstrap") {
      const bRes = runBootstrap(dataset.groupA, dataset.groupB, statDef, resampleCount);
      setBootstrapResult(bRes);
    } else {
      const pRes = runPermutationTest(dataset.groupA, dataset.groupB, statDef, resampleCount);
      setPermutationResult(pRes);
    }
  }, [mode, dataset, statDef, resampleCount]);

  // Step-by-step single resample animation
  const handleStepOnce = () => {
    if (mode === "bootstrap") {
      const rA = resampleWithReplacement(dataset.groupA);
      const rB = resampleWithReplacement(dataset.groupB);
      setResampledA(rA);
      setResampledB(rB);
      const singleT = statDef.compute(rA, rB);
      setBootstrapResult((prev) => {
        if (!prev) return null;
        const nextVals = [...prev.resampleValues, singleT].sort((x, y) => x - y);
        const B = nextVals.length;
        const low = nextVals[Math.floor(0.025 * B)];
        const high = nextVals[Math.floor(0.975 * B)];
        return {
          ...prev,
          resampleValues: nextVals,
          ciLower: low,
          ciUpper: high,
        };
      });
    } else {
      const pooled = [...dataset.groupA, ...dataset.groupB];
      const shuffled = shuffleArray(pooled);
      const rA = shuffled.slice(0, dataset.groupA.length);
      const rB = shuffled.slice(dataset.groupA.length);
      setResampledA(rA);
      setResampledB(rB);
      const singleT = statDef.compute(rA, rB);
      setPermutationResult((prev) => {
        if (!prev) return null;
        const nextVals = [...prev.nullValues, singleT].sort((x, y) => x - y);
        const isExtreme = Math.abs(singleT) >= Math.abs(prev.observed) - 1e-9;
        const nextExt = prev.extremeCount + (isExtreme ? 1 : 0);
        const nextTotal = prev.totalShuffles + 1;
        return {
          ...prev,
          nullValues: nextVals,
          extremeCount: nextExt,
          totalShuffles: nextTotal,
          pValue: (nextExt + 1) / (nextTotal + 1),
        };
      });
    }
  };

  const handleRecalculate = (count: number) => {
    setResampleCount(count);
    if (mode === "bootstrap") {
      setBootstrapResult(runBootstrap(dataset.groupA, dataset.groupB, statDef, count));
    } else {
      setPermutationResult(runPermutationTest(dataset.groupA, dataset.groupB, statDef, count));
    }
  };

  const observedVal = statDef.compute(dataset.groupA, dataset.groupB);

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.head}>
        <p className={styles.eyebrow}>Experiment ST-4 • Statistical Models</p>
        <h2>Bootstrap and Permutation Testing</h2>
        <p>
          Master computation-powered nonparametric inference: estimate parameter uncertainty with the Bootstrap and test hypotheses with Permutation shuffles without assuming normal populations.
        </p>
      </header>

      {/* Mode Switcher Tabs */}
      <div className={styles.modeSwitcher}>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === "bootstrap" ? styles.modeTabActive : ""}`}
          onClick={() => setMode("bootstrap")}
        >
          1. The Bootstrap (Confidence Intervals & Uncertainty)
        </button>
        <button
          type="button"
          className={`${styles.modeTab} ${mode === "permutation" ? styles.modeTabActive : ""}`}
          onClick={() => setMode("permutation")}
        >
          2. The Permutation Test (Null Distribution & p-Value)
        </button>
      </div>

      {/* Guide Accordion */}
      <details className={styles.guide}>
        <summary>How to use this virtual laboratory</summary>
        <div className={styles.guideBody}>
          <ol>
            <li><strong>Select an Inference Mode:</strong> Choose <em>Bootstrap</em> to measure parameter confidence intervals, or <em>Permutation Test</em> to check if the observed difference is compatible with pure chance.</li>
            <li><strong>Pick a Dataset:</strong> Explore the Worked Example from the syllabus (Group A = [12, 15, 14, 10, 13] vs Group B = [16, 18, 15, 17, 19]), Clinical Recovery, or Skewed Web Latency.</li>
            <li><strong>Choose a Test Statistic:</strong> Test Difference in Means, Difference in Medians, or 20% Trimmed Means (robust to wild outliers).</li>
            <li><strong>Step or Batch Resample:</strong> Click <em>"Step Single Resample"</em> to see individual samples drawn, or run 1,000 to 10,000 resamples to watch the distribution smooth out.</li>
          </ol>
        </div>
      </details>

      {/* Controls Grid */}
      <div className={styles.controls}>
        <div className={styles.ctrlGroup}>
          <label>1. Dataset Scenario</label>
          <select
            className={styles.select}
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {DATASET_PRESETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <span style={{ fontSize: "0.8rem", color: "#755f65" }}>
            {dataset.description}
          </span>
        </div>

        <div className={styles.ctrlGroup}>
          <label>2. Statistic of Interest: <strong>{statDef.name}</strong></label>
          <div className={styles.pills}>
            {Object.values(STATISTIC_DEFINITIONS).map((st) => (
              <button
                key={st.id}
                type="button"
                className={`${styles.pill} ${statId === st.id ? styles.pillActive : ""}`}
                onClick={() => setStatId(st.id)}
              >
                {st.shortName}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.8rem", color: "#755f65" }}>
            Observed Value: <strong>T_obs = {fmt(observedVal, 2)}</strong> ({statDef.formula})
          </span>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleStepOnce}
        >
          {mode === "bootstrap" ? "Draw 1 Resample (With Replacement)" : "Draw 1 Permutation (Shuffle Labels)"}
        </button>

        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#74243a", marginLeft: "0.5rem" }}>
          Batch Runs:
        </span>
        {[100, 1000, 5000, 10000].map((cnt) => (
          <button
            key={cnt}
            type="button"
            className={`${styles.btnSecondary} ${resampleCount === cnt ? styles.pillActive : ""}`}
            onClick={() => handleRecalculate(cnt)}
          >
            {cnt.toLocaleString()} Resamples
          </button>
        ))}
      </div>

      {/* Metrics Readouts */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Observed Statistic (T_obs)</div>
          <div className={styles.metricValue}>{fmt(observedVal, 2)}</div>
          <div className={styles.metricSub}>{statDef.shortName} on original data</div>
        </div>

        {mode === "bootstrap" && bootstrapResult && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricTitle}>95% Percentile CI</div>
              <div className={styles.metricValue}>
                [{fmt(bootstrapResult.ciLower, 2)}, {fmt(bootstrapResult.ciUpper, 2)}]
              </div>
              <div className={styles.metricSub}>
                {bootstrapResult.ciLower > 0 || bootstrapResult.ciUpper < 0
                  ? "CI excludes 0 (Significant effect)"
                  : "CI includes 0 (Inconclusive)"}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricTitle}>Bootstrap SE</div>
              <div className={styles.metricValue}>{fmt(bootstrapResult.bootstrapSE, 3)}</div>
              <div className={styles.metricSub}>Standard deviation of T* resamples</div>
            </div>
          </>
        )}

        {mode === "permutation" && permutationResult && (
          <>
            <div className={styles.metricCard}>
              <div className={styles.metricTitle}>Two-Sided p-Value</div>
              <div className={styles.metricValue}>
                {fmt(permutationResult.pValue, 4)}
                {permutationResult.exactAvailable && " *"}
              </div>
              <div className={styles.metricSub}>
                {permutationResult.pValue < 0.05
                  ? "Reject H₀ at α = 0.05 (p < 0.05)"
                  : "Fail to reject H₀ (p ≥ 0.05)"}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricTitle}>Extreme Shuffles Count</div>
              <div className={styles.metricValue}>
                {permutationResult.extremeCount} / {permutationResult.totalShuffles}
              </div>
              <div className={styles.metricSub}>
                {permutationResult.exactAvailable
                  ? `Exact all C(${dataset.groupA.length + dataset.groupB.length}, ${dataset.groupA.length}) splits`
                  : "Formula: p = (b + 1) / (m + 1)"}
              </div>
            </div>
          </>
        )}

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Sample Sizes</div>
          <div className={styles.metricValue}>
            {dataset.groupA.length} vs {dataset.groupB.length}
          </div>
          <div className={styles.metricSub}>Total pooled observations: {dataset.groupA.length + dataset.groupB.length}</div>
        </div>
      </div>

      {/* Visualizations */}
      <div className={styles.plotSection}>
        <DataPlot
          dataset={dataset}
          mode={mode}
          resampledA={resampledA}
          resampledB={resampledB}
        />
        <DistributionPlot
          mode={mode}
          statDef={statDef}
          bootstrapResult={bootstrapResult}
          permutationResult={permutationResult}
        />
      </div>

      {/* Comparative Matrix from Syllabus */}
      <div className={styles.compTableWrapper}>
        <table className={styles.compTable}>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Bootstrap (Efron 1979)</th>
              <th>Permutation Test (Fisher 1935 / Ernst 2004)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Core Question</strong></td>
              <td><em>How uncertain is my estimate?</em></td>
              <td><em>Is the observed difference compatible with chance (no difference)?</em></td>
            </tr>
            <tr>
              <td><strong>Output</strong></td>
              <td>Confidence interval [2.5%, 97.5%], Standard error</td>
              <td>p-value: (b + 1) / (m + 1), Rejection decisions</td>
            </tr>
            <tr>
              <td><strong>Resampling Scheme</strong></td>
              <td><strong>With replacement</strong> from each group independently</td>
              <td><strong>Without replacement</strong> by shuffling group labels</td>
            </tr>
            <tr>
              <td><strong>Key Assumption</strong></td>
              <td>The sample is representative of the population</td>
              <td>Groups are exchangeable under H₀</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comprehensive Theory Notes & Worked Example */}
      <section className={styles.theory}>
        <h3>Theory & Mathematical Foundations</h3>

        <div className={styles.theorySection}>
          <h4>1. The Bootstrap Idea</h4>
          <p>
            The bootstrap (Efron 1979) estimates how a statistic varies across samples using only the single sample we have. We treat the observed sample data as a surrogate stand-in for the population, draw new samples of the same size <em>n</em> with replacement, compute the statistic on each, and examine the spread of those values. Efron also demonstrated that the jackknife is a linear approximation to the bootstrap.
          </p>
          <div className={styles.formulaBox}>
            for b = 1 … B:  draw x*₁ … x*ₙ with replacement from the data;  T*_b = statistic(x*)<br />
            95% Percentile Interval = [ 2.5th percentile of T* , 97.5th percentile of T* ]<br />
            Bootstrap Standard Error = Standard Deviation of T*
          </div>
        </div>

        <div className={styles.theorySection}>
          <h4>2. The Permutation Test</h4>
          <p>
            A permutation test evaluates whether an observed difference between groups could arise purely from random chance. If the null hypothesis H₀ asserts that group labels make no difference, the labels can be shuffled freely. We repeatedly shuffle the labels, recompute the test statistic, and see how often the shuffled result is as extreme as the observed one.
          </p>
          <div className={styles.formulaBox}>
            p = ( number of shuffles with |T| ≥ |T_obs| ) / ( total shuffles )<br />
            if m random shuffles are used:  p = ( b + 1 ) / ( m + 1 )<br />
            all possible splits:  C( n₁ + n₂ , n₁ )
          </div>
          <p>
            When random shuffles are drawn, counting the original observed arrangement (the <strong>"+1"</strong>) keeps the p-value strictly valid and avoids reporting an impossible p = 0 (Phipson & Smyth 2010).
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>3. Worked Example from Syllabus</h4>
          <p>
            Take Group A = [12, 15, 14, 10, 13] (mean 12.8) and Group B = [16, 18, 15, 17, 19] (mean 17.0). The observed difference is <strong>T_obs = 17.0 − 12.8 = 4.2</strong>.
          </p>
          <ul>
            <li>There are <strong>C(10, 5) = 252</strong> total ways to split the ten values into two groups of five.</li>
            <li>Exactly <strong>4</strong> of them produce a difference of at least 4.2 in magnitude, giving an exact two-sided p-value of <strong>4 / 252 = 0.0159 (≈ 0.016)</strong>!</li>
            <li>A bootstrap with 10,000 resamples gives a 95% percentile interval for the difference of about <strong>[2.4, 6.2]</strong>. Notice that this interval completely excludes 0, perfectly agreeing with the small p-value!</li>
          </ul>
        </div>

        {/* Callouts */}
        <div className={styles.callouts}>
          <div className={styles.calloutMistake}>
            <strong>Common Mistake:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Using the bootstrap to test whether groups differ without shuffling labels, or treating a permutation p-value as an interval. They answer two fundamentally different questions!
            </p>
          </div>

          <div className={styles.calloutTip}>
            <strong>Pro Tip:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Run 100, 1,000, and 10,000 resamples using the buttons above and observe how the percentile interval bounds and p-value stabilize.
            </p>
          </div>

          <div className={styles.calloutTakeaway}>
            <strong>Key Takeaway:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Resampling replaces rigid formulas with modern computing: the bootstrap measures uncertainty, and the permutation test measures compatibility with no difference.
            </p>
          </div>
        </div>

        <div className={styles.refs}>
          <strong>Primary References:</strong> [5] Efron (1979) • [6] Ernst (2004), <em>Permutation Methods</em> • [7] Phipson & Smyth (2010), <em>Permutation P-values Should Never Be Zero</em>
        </div>
      </section>
    </div>
  );
}

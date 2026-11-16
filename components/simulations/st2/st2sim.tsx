"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import styles from "./classNames";
import PopulationPlot from "./populationPlot";
import SamplingPlot from "./samplingPlot";
import {
  POPULATIONS,
  PRESET_SCENARIOS,
  type PopulationId,
  type SampleRun,
} from "./types";
import {
  drawSample,
  drawMultipleSampleMeans,
  computeSummaryStats,
  fmt,
} from "./cltMath";

export default function St2Sim() {
  const [popId, setPopId] = useState<PopulationId>("skewed");
  const [sampleSize, setSampleSize] = useState<number>(30);
  const [sampleMeans, setSampleMeans] = useState<number[]>([]);
  const [lastSample, setLastSample] = useState<SampleRun | null>(null);
  const [showNormalOverlay, setShowNormalOverlay] = useState<boolean>(true);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const pop = POPULATIONS[popId];
  const theoreticalSE = pop.sd / Math.sqrt(sampleSize);
  const theoreticalSkew = pop.skewness / Math.sqrt(sampleSize);
  const stats = useMemo(() => computeSummaryStats(sampleMeans), [sampleMeans]);

  // Initialize with initial batch on mount or preset switch
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      const initial = drawMultipleSampleMeans(pop, 30, 500);
      setSampleMeans(initial);
      setLastSample(drawSample(pop, 30));
    }
  }, [pop]);

  const handleApplyPreset = (presetId: string) => {
    const p = PRESET_SCENARIOS.find((item) => item.id === presetId);
    if (!p) return;
    setPopId(p.populationId);
    setSampleSize(p.sampleSize);
    const targetPop = POPULATIONS[p.populationId];
    const newMeans = drawMultipleSampleMeans(targetPop, p.sampleSize, p.samplesToAdd);
    setSampleMeans(newMeans);
    setLastSample(drawSample(targetPop, p.sampleSize));
  };

  const handleDrawOne = () => {
    const s = drawSample(pop, sampleSize);
    setLastSample(s);
    setSampleMeans((prev) => [...prev, s.mean]);
  };

  const handleAddBatch = (count: number) => {
    const batch = drawMultipleSampleMeans(pop, sampleSize, count);
    const lastOne = drawSample(pop, sampleSize);
    setLastSample(lastOne);
    setSampleMeans((prev) => [...prev, ...batch]);
  };

  const handleReset = () => {
    setSampleMeans([]);
    setLastSample(null);
  };

  const handleAutoRun = () => {
    if (isAnimating) {
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
  };

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      const s = drawSample(pop, sampleSize);
      setLastSample(s);
      setSampleMeans((prev) => (prev.length >= 2500 ? prev : [...prev, s.mean]));
    }, 120);
    return () => clearInterval(interval);
  }, [isAnimating, pop, sampleSize]);

  // When population or sample size changes, optionally re-seed
  const handlePopChange = (newPopId: PopulationId) => {
    setPopId(newPopId);
    const targetPop = POPULATIONS[newPopId];
    const newMeans = drawMultipleSampleMeans(targetPop, sampleSize, 500);
    setSampleMeans(newMeans);
    setLastSample(drawSample(targetPop, sampleSize));
  };

  const handleSizeChange = (newSize: number) => {
    setSampleSize(newSize);
    const newMeans = drawMultipleSampleMeans(pop, newSize, 500);
    setSampleMeans(newMeans);
    setLastSample(drawSample(pop, newSize));
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.head}>
        <p className={styles.eyebrow}>Experiment ST-2 • Statistical Models</p>
        <h2>Sampling Distribution and Central Limit Theorem</h2>
        <p>
          Explore how sample averages transform any wild population distribution into an elegant, predictable bell curve with spread σ / √n.
        </p>
      </header>

      {/* Interactive Guide Accordion */}
      <details className={styles.guide}>
        <summary>How to use this virtual laboratory</summary>
        <div className={styles.guideBody}>
          <ol>
            <li><strong>Select a Population:</strong> Pick a strongly skewed exponential, a uniform slab, or a bimodal distribution with an empty middle.</li>
            <li><strong>Adjust Sample Size (n):</strong> Compare small samples (n = 2 or 5) where skewness lingers, with large samples (n = 30 or 120) where symmetry emerges.</li>
            <li><strong>Draw Samples:</strong> Click <em>"Draw 1 Sample"</em> to see individual data points land and form their mean x̄. Or draw +1,000 samples to observe the continuous bell curve.</li>
            <li><strong>Inspect the Standard Error:</strong> Check how closely the empirical standard deviation of sample means matches the theoretical prediction σ / √n.</li>
          </ol>
        </div>
      </details>

      {/* Preset Scenarios */}
      <div style={{ marginTop: "1rem" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#74243a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Guided Scenarios:
        </label>
        <div className={styles.pills} style={{ marginTop: "0.4rem" }}>
          {PRESET_SCENARIOS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.pill}
              onClick={() => handleApplyPreset(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.ctrlGroup}>
          <label>1. Underlying Population Distribution</label>
          <select
            className={styles.select}
            value={popId}
            onChange={(e) => handlePopChange(e.target.value as PopulationId)}
          >
            {Object.values(POPULATIONS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span style={{ fontSize: "0.8rem", color: "#755f65" }}>
            {pop.description}
          </span>
        </div>

        <div className={styles.ctrlGroup}>
          <label>2. Sample Size (n per subgroup): <strong>{sampleSize}</strong></label>
          <div className={styles.pills}>
            {[2, 5, 10, 25, 30, 50, 100, 120].map((sz) => (
              <button
                key={sz}
                type="button"
                className={`${styles.pill} ${sampleSize === sz ? styles.pillActive : ""}`}
                onClick={() => handleSizeChange(sz)}
              >
                n = {sz}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.8rem", color: "#755f65" }}>
            Theoretical SE = σ / √n = {fmt(pop.sd, 3)} / √{sampleSize} = <strong>{fmt(theoreticalSE, 4)}</strong>
          </span>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleDrawOne}
        >
          Draw 1 Sample
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => handleAddBatch(100)}
        >
          +100 Samples
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => handleAddBatch(1000)}
        >
          +1,000 Samples
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleAutoRun}
        >
          {isAnimating ? "⏸ Pause Stream" : "▶ Stream Samples"}
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={handleReset}
        >
          Reset Data
        </button>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showNormalOverlay}
            onChange={(e) => setShowNormalOverlay(e.target.checked)}
          />
          Show Theoretical N(μ, σ/√n) Curve
        </label>
      </div>

      {/* Live Readouts / KPI Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Population Mean (μ)</div>
          <div className={styles.metricValue}>{fmt(pop.mean, 3)}</div>
          <div className={styles.metricSub}>True process mean</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Empirical Mean (X̄̄)</div>
          <div className={styles.metricValue}>{stats.count > 0 ? fmt(stats.mean, 3) : "—"}</div>
          <div className={styles.metricSub}>Average of {stats.count.toLocaleString()} sample means</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Theoretical SE (σ/√n)</div>
          <div className={styles.metricValue}>{fmt(theoreticalSE, 4)}</div>
          <div className={styles.metricSub}>Expected spread of averages</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Empirical SE (s_x̄)</div>
          <div className={styles.metricValue}>{stats.count > 1 ? fmt(stats.sd, 4) : "—"}</div>
          <div className={styles.metricSub}>Measured spread across draws</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Skewness Reduction</div>
          <div className={styles.metricValue}>{fmt(stats.skewness, 2)}</div>
          <div className={styles.metricSub}>
            Pop: {fmt(pop.skewness, 1)} → Predicted: {fmt(theoreticalSkew, 2)}
          </div>
        </div>
      </div>

      {/* Plots Layout */}
      <div className={styles.plotSection}>
        <PopulationPlot pop={pop} lastSample={lastSample} />
        <SamplingPlot
          pop={pop}
          sampleMeans={sampleMeans}
          sampleSize={sampleSize}
          showNormalOverlay={showNormalOverlay}
        />
      </div>

      {/* Comprehensive Theory Notes & Worked Example */}
      <section className={styles.theory}>
        <h3>Theory & Mathematical Foundations</h3>

        <div className={styles.theorySection}>
          <h4>1. Population, Sample, and Statistic</h4>
          <p>
            A population has a mean <strong>μ</strong> and standard deviation <strong>σ</strong>. A sample of size <em>n</em> gives a sample mean <strong>X̄</strong>. If we repeat the sampling many times, the values of X̄ form the <strong>sampling distribution of the mean</strong>. It describes how much a statistic varies from sample to sample, which forms the rock-solid foundation for all hypothesis testing (ST-3), bootstrap analysis (ST-4), and statistical quality control (ST-6).
          </p>

          <div className={styles.formulaBox}>
            E[ X̄ ] = μ<br />
            SE = SD( X̄ ) = σ / √n
          </div>
          <p>
            The sample mean is centered precisely on the population mean, and its spread shrinks with the square root of <em>n</em>. Notice the critical implication: <strong>to halve the standard error, you need four times as much data (4×)</strong>.
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>2. The Central Limit Theorem (CLT)</h4>
          <div className={styles.formulaBox}>
            Z = ( X̄ − μ ) / ( σ / √n )  →  Normal(0, 1)   as n → ∞
          </div>
          <p>
            For independent observations from any population with finite variance, the distribution of the sample mean becomes approximately normal as <em>n</em> grows, <em>whatever the shape of the population</em>. How fast the approximation improves depends on the population: the skewness of X̄ equals the population skewness divided by √n. Hence, a heavily skewed population needs larger samples (n ≥ 30) than a symmetric or uniform one.
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>3. Law of Large Numbers vs Central Limit Theorem</h4>
          <p>
            The <strong>Law of Large Numbers (LLN)</strong> states that the sample mean X̄ gets closer and closer to μ as <em>n</em> increases. The <strong>Central Limit Theorem (CLT)</strong> describes the exact bell-shaped geometry and spread of the remaining error around μ. They answer two completely different questions!
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>4. Worked Example from Syllabus</h4>
          <p>
            Take an exponential population with μ = 1 and σ = 1 (strongly skewed, skewness = 2.0).
          </p>
          <ul>
            <li>With <strong>n = 30</strong>: Theoretical SE = 1/√30 = <strong>0.1826</strong>, and skewness of X̄ is 2/√30 = <strong>0.365</strong> (much closer to symmetric normal).</li>
            <li>With <strong>n = 120</strong>: The sample size quadruples, so the SE halves to 1/√120 = <strong>0.0913</strong>! In our simulation above, the empirical standard error closely matches these values within random variation.</li>
          </ul>
        </div>

        {/* Callout Cards */}
        <div className={styles.callouts}>
          <div className={styles.calloutMistake}>
            <strong>Common Mistake:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Thinking that a larger sample size <em>n</em> changes the shape of the underlying population. The population stays identically shaped! Larger <em>n</em> only narrows the sampling distribution of the sample mean.
            </p>
          </div>

          <div className={styles.calloutTip}>
            <strong>Pro Tip:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Compare n = 2, 10, and 50 on the skewed exponential population. Watch the histogram of means transition from an asymmetric ramp into a smooth, centered Gaussian bell!
            </p>
          </div>

          <div className={styles.calloutTakeaway}>
            <strong>Key Takeaway:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Averages are always more predictable than individual values: they center on μ, spread by σ / √n, and look normal for sufficiently large <em>n</em>.
            </p>
          </div>
        </div>

        <div className={styles.refs}>
          <strong>Primary References:</strong> [1] Leemis & McQueston (2008) • [2] Fischer (2011), <em>A History of the Central Limit Theorem</em>
        </div>
      </section>
    </div>
  );
}


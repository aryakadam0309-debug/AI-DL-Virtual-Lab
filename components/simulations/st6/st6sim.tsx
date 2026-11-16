"use client";

import { useState, useMemo, useEffect } from "react";
import styles from "./classNames";
import XbarPlot from "./xbarPlot";
import RPlot from "./rPlot";
import {
  SQC_PRESETS,
  SPC_FACTORS,
  type SubgroupData,
} from "./types";
import {
  computeXbarLimits,
  computeRLimits,
  calculateTheoreticalARL,
  generateSubgroups,
  fmt,
} from "./sqcMath";

export default function St6Sim() {
  const [presetId, setPresetId] = useState<string>("worked_example");
  const [mu0, setMu0] = useState<number>(50);
  const [sigma0, setSigma0] = useState<number>(2);
  const [n, setN] = useState<number>(5);
  const [k, setK] = useState<number>(28);
  const [delta, setDelta] = useState<number>(1.0);
  const [shiftStart, setShiftStart] = useState<number>(12);

  // Subgroup data
  const [subgroups, setSubgroups] = useState<SubgroupData[]>([]);

  // Compute control limits
  const xbarLimits = useMemo(() => computeXbarLimits(mu0, sigma0, n), [mu0, sigma0, n]);

  // Expected range R_bar = d2 * sigma0
  const expectedRbar = (SPC_FACTORS[n] || SPC_FACTORS[5]).d2 * sigma0;
  const rLimits = useMemo(() => computeRLimits(expectedRbar, n), [expectedRbar, n]);

  // Theoretical ARL metrics
  const { arl1, detectionProb } = useMemo(
    () => calculateTheoreticalARL(delta, n),
    [delta, n]
  );

  // Helper to re-seed or regenerate
  const regenerate = () => {
    const generated = generateSubgroups(k, n, mu0, sigma0, delta, shiftStart, xbarLimits, rLimits);
    setSubgroups(generated);
  };

  // Preset applicator
  const applyPreset = (pid: string) => {
    const p = SQC_PRESETS.find((item) => item.id === pid);
    if (!p) return;
    setPresetId(p.id);
    setMu0(p.mu0);
    setSigma0(p.sigma0);
    setN(p.subgroupSize);
    setK(p.totalSubgroups);
    setDelta(p.shiftDelta);
    setShiftStart(p.shiftStart);

    const lims = computeXbarLimits(p.mu0, p.sigma0, p.subgroupSize);
    const expR = (SPC_FACTORS[p.subgroupSize] || SPC_FACTORS[5]).d2 * p.sigma0;
    const rLims = computeRLimits(expR, p.subgroupSize);
    const gen = generateSubgroups(p.totalSubgroups, p.subgroupSize, p.mu0, p.sigma0, p.shiftDelta, p.shiftStart, lims, rLims);
    setSubgroups(gen);
  };

  // Initial load
  useEffect(() => {
    applyPreset("worked_example");
  }, []);

  // Detection evaluation
  const firstSignalIndex = subgroups.findIndex((s) => s.outOfControlXbar || s.outOfControlR);
  const signalSubgroupId = firstSignalIndex >= 0 ? subgroups[firstSignalIndex].subgroupId : null;
  const empiricalDelay =
    signalSubgroupId !== null && delta !== 0 && signalSubgroupId >= shiftStart
      ? signalSubgroupId - shiftStart + 1
      : null;

  const totalViolations = subgroups.filter((s) => s.outOfControlXbar || s.outOfControlR).length;

  return (
    <div className={styles.root}>
      {/* Head */}
      <header className={styles.head}>
        <p className={styles.eyebrow}>Experiment ST-6 • Statistical Models</p>
        <h2>Statistical Quality Control & Shewhart Charts</h2>
        <p>
          Distinguish natural common-cause variation from assignable special-cause shifts using Shewhart X̄ and R control charts, 3σ limits, and Average Run Length (ARL) trade-offs.
        </p>
      </header>

      {/* Guide Accordion */}
      <details className={styles.guide}>
        <summary>How to use this virtual laboratory</summary>
        <div className={styles.guideBody}>
          <ol>
            <li><strong>Select a Scenario:</strong> Load the Worked Example from Montgomery / syllabus (μ₀ = 50, σ = 2, n = 5, 1.0σ shift) or test the In-Control baseline.</li>
            <li><strong>Inject a Process Shift (δ):</strong> Introduce a tool wear or machine calibration shift of 0.5σ, 1.0σ, or 2.0σ at a chosen subgroup.</li>
            <li><strong>Observe Run Length:</strong> Watch how quickly the points cross the 3σ control limits. Compare the empirical detection delay with the theoretical ARL₁.</li>
            <li><strong>Test Subgroup Size (n):</strong> Increase <em>n</em> from 2 to 9 to see how larger subgroups shrink the standard error and catch subtle shifts much faster!</li>
          </ol>
        </div>
      </details>

      {/* Preset Selector */}
      <div style={{ marginTop: "1rem" }}>
        <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#74243a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Guided Presets:
        </label>
        <div className={styles.pills} style={{ marginTop: "0.4rem" }}>
          {SQC_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.pill} ${presetId === p.id ? styles.pillActive : ""}`}
              onClick={() => applyPreset(p.id)}
            >
              {p.name.split("(")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Controls Grid */}
      <div className={styles.controls}>
        <div className={styles.ctrlGroup}>
          <label>Process Mean (μ₀) & Sigma (σ₀)</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="number"
              className={styles.input}
              value={mu0}
              onChange={(e) => setMu0(Number(e.target.value))}
              placeholder="μ₀ target"
            />
            <input
              type="number"
              className={styles.input}
              value={sigma0}
              onChange={(e) => setSigma0(Math.max(0.1, Number(e.target.value)))}
              placeholder="σ₀ standard dev"
            />
          </div>
          <span style={{ fontSize: "0.78rem", color: "#755f65" }}>
            In-control baseline parameters
          </span>
        </div>

        <div className={styles.ctrlGroup}>
          <label>Subgroup Size (n): <strong>{n}</strong></label>
          <div className={styles.pills}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((sz) => (
              <button
                key={sz}
                type="button"
                className={`${styles.pill} ${n === sz ? styles.pillActive : ""}`}
                onClick={() => setN(sz)}
              >
                n = {sz}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.78rem", color: "#755f65" }}>
            Standard error = σ / √n = <strong>{fmt(xbarLimits.se, 4)}</strong>
          </span>
        </div>

        <div className={styles.ctrlGroup}>
          <label>Process Shift (δ in σ units): <strong>{delta > 0 ? `+${delta}σ` : "None"}</strong></label>
          <div className={styles.pills}>
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.pill} ${delta === d ? styles.pillActive : ""}`}
                onClick={() => setDelta(d)}
              >
                {d === 0 ? "0 (In Control)" : `+${d}σ`}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "0.78rem", color: "#755f65" }}>
            Introduced at Subgroup #{shiftStart}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={regenerate}
        >
          Generate New Subgroups Run
        </button>

        <span style={{ fontSize: "0.85rem", color: "#755f65", marginLeft: "auto" }}>
          Total Subgroups plotted: <strong>{subgroups.length}</strong>
        </span>
      </div>

      {/* KPI Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Process Status</div>
          <div className={styles.metricValue} style={{ color: totalViolations > 0 ? "#e03131" : "#2b8a3e" }}>
            {totalViolations > 0 ? "OUT OF CONTROL" : "IN CONTROL"}
          </div>
          <div className={styles.metricSub}>
            {totalViolations > 0
              ? `${totalViolations} point(s) beyond 3σ limits`
              : "All points within 3σ limits"}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>First Signal Subgroup</div>
          <div className={styles.metricValue}>
            {signalSubgroupId ? `#${signalSubgroupId}` : "None"}
          </div>
          <div className={styles.metricSub}>
            {empiricalDelay !== null
              ? `Detected in ${empiricalDelay} subgroup(s) after shift`
              : delta === 0 ? "No false alarm occurred" : "Shift undetected yet"}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>Theoretical ARL₁</div>
          <div className={styles.metricValue}>
            {delta === 0 ? "370.4" : fmt(arl1, 1)}
          </div>
          <div className={styles.metricSub}>
            {delta === 0 ? "ARL₀: false alarm every ~370 runs" : `P(detection per sample) = ${fmt(detectionProb * 100, 1)}%`}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>X̄ Control Band</div>
          <div className={styles.metricValue}>
            [{fmt(xbarLimits.lcl, 1)}, {fmt(xbarLimits.ucl, 1)}]
          </div>
          <div className={styles.metricSub}>
            Target CL = {fmt(xbarLimits.center, 1)} (± 3σ / √n)
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTitle}>R (Range) Target</div>
          <div className={styles.metricValue}>
            {fmt(rLimits.center, 2)}
          </div>
          <div className={styles.metricSub}>
            UCL = {fmt(rLimits.ucl, 2)} (D₄ = {SPC_FACTORS[n]?.D4 ?? 2.114})
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className={styles.plotSection}>
        <XbarPlot
          subgroups={subgroups}
          limits={xbarLimits}
          shiftStart={shiftStart}
          delta={delta}
        />
        <RPlot
          subgroups={subgroups}
          rLimits={rLimits}
        />
      </div>

      {/* Subgroup Inspection Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Subgroup #</th>
              <th>Sample Values (x₁ … xₙ)</th>
              <th>Mean (X̄)</th>
              <th>Range (R)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subgroups.map((s) => {
              const isOut = s.outOfControlXbar || s.outOfControlR;
              return (
                <tr key={s.subgroupId} className={isOut ? styles.tableRowOut : ""}>
                  <td><strong>#{s.subgroupId}</strong> {s.isShifted && <span style={{ color: "#d9480f", fontSize: "0.75rem" }}>(Shifted)</span>}</td>
                  <td>[{s.values.map((v) => fmt(v, 1)).join(", ")}]</td>
                  <td><strong>{fmt(s.mean, 2)}</strong></td>
                  <td>{fmt(s.range, 2)}</td>
                  <td>
                    {s.outOfControlXbar && <span style={{ color: "#e03131", fontWeight: "bold" }}>X̄ Out of Limits!</span>}
                    {s.outOfControlR && <span style={{ color: "#e03131", fontWeight: "bold" }}> R Out of Limits!</span>}
                    {!isOut && <span style={{ color: "#2b8a3e" }}>In Control</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Theory & Syllabus Reference */}
      <section className={styles.theory}>
        <h3>Theory & Mathematical Foundations</h3>

        <div className={styles.theorySection}>
          <h4>1. Common vs Special Causes of Variation</h4>
          <p>
            Every physical or algorithmic process exhibits variability. Walter A. Shewhart (1931) introduced the control chart to cleanly separate routine background noise (<strong>common causes</strong>, which are predictable and inherent to the system) from assignable disruptions (<strong>special causes</strong>, which demand immediate investigation and corrective action).
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>2. X̄ and R Chart Control Limits</h4>
          <p>
            Regular subgroups of size <em>n</em> are gathered over time. The <strong>X̄ chart</strong> monitors process centering (means), while the <strong>R chart</strong> tracks process dispersion (spread).
          </p>
          <div className={styles.formulaBox}>
            X̄ chart:   Centre = μ₀ ,   Limits = μ₀ ± 3σ / √n<br />
            R chart:    UCL = D₄ · R̄ ,   LCL = D₃ · R̄ ,   σ̂ = R̄ / d₂<br />
            For n = 5:  d₂ = 2.326 ,   D₃ = 0 ,   D₄ = 2.114
          </div>
          <p>
            The limits at three standard errors (3σ) stem directly from the sampling distribution theory of ST-2: if only common-cause variation is present, approximately <strong>99.73%</strong> of subgroup means will fall within limits (false alarm rate α ≈ 0.0027). A point outside is an unambiguous signal.
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>3. Average Run Length (ARL)</h4>
          <p>
            The ARL represents the average number of subgroups inspected before an out-of-control alarm sounds.
          </p>
          <div className={styles.formulaBox}>
            In control:  ARL₀ = 1 / α = 1 / 0.0027 ≈ 370.4 subgroups<br />
            After a shift of δ (in σ units):  p = P( Z &gt; 3 − δ√n ) + P( Z &lt; −3 − δ√n )<br />
            Out-of-control:  ARL₁ = 1 / p
          </div>
          <p>
            Notice the classic statistical engineering trade-off: <strong>wider limits reduce false alarms but delay detection of real shifts; narrower limits detect shifts faster but inundate engineers with false alarms</strong>.
          </p>
        </div>

        <div className={styles.theorySection}>
          <h4>4. Worked Example from Syllabus</h4>
          <p>
            Let μ₀ = 50, σ = 2, and subgroup size n = 5.
          </p>
          <ul>
            <li>Standard error: SE = 2 / √5 = <strong>0.8944</strong>.</li>
            <li>Control limits: 50 ± 3(0.8944) = 50 ± 2.683, so <strong>LCL = 47.32</strong> and <strong>UCL = 52.68</strong>.</li>
            <li>If the mean shifts by one standard deviation (<strong>δ = 1.0σ</strong>): the shift in standard error units is δ√n = 1 × √5 = 2.236.</li>
            <li>Probability of detection on any single subgroup: <strong>p = P(Z &gt; 3 − 2.236 = 0.764) = 0.2224</strong>.</li>
            <li>Average Run Length: <strong>ARL₁ = 1 / 0.2224 ≈ 4.5 subgroups</strong>! In our simulation above, shifts of 1σ are caught in about 4–5 subgroups.</li>
          </ul>
        </div>

        {/* Callouts */}
        <div className={styles.callouts}>
          <div className={styles.calloutMistake}>
            <strong>Common Mistake:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Reacting or tweaking machine settings for every random point that fluctuates within the control limits, or assuming an alarm proves what the cause was. An alarm simply tells you that the process shifted, not why!
            </p>
          </div>

          <div className={styles.calloutTip}>
            <strong>Pro Tip:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              Try a shift of 0.5σ vs 2.0σ in the controls above. Observe how the detection delay drops from ~15 subgroups down to immediate 1-subgroup detection!
            </p>
          </div>

          <div className={styles.calloutTakeaway}>
            <strong>Key Takeaway:</strong>
            <p style={{ margin: "0.3rem 0 0" }}>
              A Shewhart control chart is a continuous sequential hypothesis test: limits are calibrated to make false alarms rare (ARL₀ ≈ 370) while catching real disruptions with rapid speed.
            </p>
          </div>
        </div>

        <div className={styles.refs}>
          <strong>Primary References:</strong> [10] Shewhart (1931), <em>Economic Control of Quality of Manufactured Product</em> • [11] Woodall (2000), <em>Controversies and Contradictions in SPC</em> • [18] Montgomery, <em>Introduction to Statistical Quality Control</em>
        </div>
      </section>
    </div>
  );
}


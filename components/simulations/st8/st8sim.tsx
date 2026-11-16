"use client";
import { useId, useMemo, useState } from "react";
import styles from "./st8sim.module.css";
import { fitArima, type ArimaFit } from "./arima";
import { augmentedDickeyFuller, calculateAcfPacf, type AdfDeterministic, type AcfPacfResult } from "./diagnostics";
import { decomposeSeries, firstDifference, generateSeries, parseTimeSeriesCsv, reapplySeasonality, seasonallyAdjust, type Decomposition, type SeriesConfig, type TimeSeriesData } from "./series";

const format = (n: number | null | undefined, d = 3) => n == null || !Number.isFinite(n) ? "—" : n.toFixed(d);
const initialSeriesConfig: SeriesConfig = { preset: "combined", length: 120, seed: 2026, intercept: 50, trend: 0.12, amplitude: 4, period: 12, noiseSd: 1.5, phi: 0.8 };

function LineChart({ values, labels, title, height = 220, secondary, zeroLine = false }: { values: (number | null)[]; labels?: string[]; title: string; height?: number; secondary?: (number | null)[]; zeroLine?: boolean }) {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const other = secondary?.filter((v): v is number => v !== null && Number.isFinite(v)) ?? [];
  const all = [...valid, ...other];
  const min = all.length ? Math.min(...all, zeroLine ? 0 : Infinity) : 0;
  const max = all.length ? Math.max(...all, zeroLine ? 0 : -Infinity) : 1;
  const span = Math.max(max - min, Math.abs(max) * 0.05, 1e-8), lo = min - span * 0.12, hi = max + span * 0.12;
  const w = 760, h = height, left = 58, right = 18, top = 18, bottom = 34;
  const x = (i: number) => left + (values.length <= 1 ? 0 : i * (w - left - right) / (values.length - 1));
  const y = (v: number) => top + (hi - v) * (h - top - bottom) / (hi - lo);
  const path = (arr: (number | null)[]) => arr.map((v, i) => v === null || !Number.isFinite(v) ? "" : `${i === 0 || arr.slice(0, i).every(p => p === null) ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).filter(Boolean).join(" ");
  return <div className={styles.chartWrap}><svg className={styles.chart} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title}>
    {[0, 1, 2, 3].map(i => { const v = lo + (hi - lo) * i / 3; return <g key={i}><line x1={left} x2={w - right} y1={y(v)} y2={y(v)} className={styles.grid}/><text x={left - 8} y={y(v) + 4} className={styles.tick} textAnchor="end">{format(v, 1)}</text></g>; })}
    {zeroLine && <line x1={left} x2={w - right} y1={y(0)} y2={y(0)} className={styles.zeroLine}/>}
    <path d={path(values)} className={styles.lineMain}/>{secondary && <path d={path(secondary)} className={styles.lineSecondary}/>}
    <line x1={left} x2={w - right} y1={h - bottom} y2={h - bottom} className={styles.axis}/>
    <text x={left} y={h - 8} className={styles.tick}>{labels?.[0] ?? "1"}</text><text x={w - right} y={h - 8} className={styles.tick} textAnchor="end">{labels?.[labels.length - 1] ?? String(values.length)}</text>
  </svg></div>;
}

function Correlogram({ title, points, confidence }: { title: string; points: AcfPacfResult["acf"]; confidence: number }) {
  const width = 760, height = 230, left = 48, right = 18, top = 18, bottom = 34;
  const maxLag = Math.max(points.length, 1), plotH = height - top - bottom, zeroY = top + plotH / 2;
  const x = (i: number) => left + (i + 0.5) * (width - left - right) / maxLag;
  const y = (v: number) => zeroY - v * plotH * 0.45;
  const band = confidence;
  return <div className={styles.chartWrap}><svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
    <rect x={left} y={y(band)} width={width - left - right} height={y(-band) - y(band)} className={styles.confBand}/>
    <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} className={styles.axis}/>
    <line x1={left} x2={width - right} y1={y(band)} y2={y(band)} className={styles.confLine}/><line x1={left} x2={width - right} y1={y(-band)} y2={y(-band)} className={styles.confLine}/>
    {points.map(p => <g key={p.lag}><line x1={x(p.lag - 1)} x2={x(p.lag - 1)} y1={zeroY} y2={y(p.value)} className={p.significant ? styles.barSignificant : styles.bar}/><circle cx={x(p.lag - 1)} cy={y(p.value)} r="2.8" className={styles.barPoint}/><text x={x(p.lag - 1)} y={height - 10} textAnchor="middle" className={styles.tick}>{p.lag}</text></g>)}
  </svg></div>;
}

function ForecastChart({ historical, forecast }: { historical: number[]; forecast: NonNullable<ArimaFit>["forecasts"] }) {
  const all = [...historical, ...forecast.flatMap(f => [f.lower, f.upper])];
  const min = Math.min(...all), max = Math.max(...all), span = Math.max(max - min, 1e-8);
  const width = 760, height = 280, left = 54, right = 18, top = 18, bottom = 34;
  const total = historical.length + forecast.length;
  const x = (i: number) => left + i * (width - left - right) / Math.max(total - 1, 1);
  const y = (v: number) => top + (max + span * .12 - v) * (height - top - bottom) / (span * 1.24);
  const hPath = historical.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const fPath = [`M${x(historical.length - 1)},${y(historical[historical.length - 1])}`, ...forecast.map((f, i) => `L${x(historical.length + i)},${y(f.value)}`)].join(" ");
  const upper = forecast.map((f, i) => `${i ? "L" : "M"}${x(historical.length + i)},${y(f.upper)}`).join(" ");
  const lower = forecast.slice().reverse().map((f, i) => `L${x(historical.length + forecast.length - 1 - i)},${y(f.lower)}`).join(" ");
  return <div className={styles.chartWrap}><svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ARIMA forecast with prediction interval">
    {[0, 1, 2, 3].map(i => { const val = min + span * i / 3; return <g key={i}><line x1={left} x2={width - right} y1={y(val)} y2={y(val)} className={styles.grid}/><text x={left - 8} y={y(val) + 4} className={styles.tick} textAnchor="end">{format(val, 1)}</text></g>; })}
    <path d={`${upper} ${lower} Z`} className={styles.interval}/><path d={hPath} className={styles.lineMain}/><path d={fPath} className={styles.lineForecast}/>
    <line x1={x(historical.length - 1)} x2={x(historical.length - 1)} y1={top} y2={height - bottom} className={styles.forecastCut}/>
    <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} className={styles.axis}/>
    <text x={left} y={height - 8} className={styles.tick}>Observed</text><text x={width - right} y={height - 8} textAnchor="end" className={styles.tick}>Forecast horizon</text>
  </svg><div className={styles.legend}><span><i className={styles.legendHistory}/> Observed</span><span><i className={styles.legendForecast}/> Forecast</span><span><i className={styles.legendBand}/> Prediction interval</span></div></div>;
}

export default function St8Sim() {
  const uid = useId();
  const [config, setConfig] = useState<SeriesConfig>(initialSeriesConfig);
  const [data, setData] = useState<TimeSeriesData>(() => generateSeries(initialSeriesConfig));
  const [period, setPeriod] = useState(12);
  const [decompositionMode, setDecompositionMode] = useState<"additive" | "multiplicative">("additive");
  const [seasonalAdjust, setSeasonalAdjust] = useState(true);
  const [adfTarget, setAdfTarget] = useState<"original" | "adjusted" | "differenced">("original");
  const [adfLags, setAdfLags] = useState(1);
  const [adfDeterministic, setAdfDeterministic] = useState<AdfDeterministic>("constant");
  const [maxLag, setMaxLag] = useState(18);
  const [p, setP] = useState(1), [d, setD] = useState(0), [q, setQ] = useState(0);
  const [horizon, setHorizon] = useState(12), [interval, setInterval] = useState<80 | 95>(95);
  const [includeConstant, setIncludeConstant] = useState(true);
  const [uploadError, setUploadError] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "forecast">("analysis");

  const decomposition = useMemo(() => {
    try { return { value: decomposeSeries(data.values, period, decompositionMode) as Decomposition, error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Could not decompose this series." }; }
  }, [data.values, period, decompositionMode]);
  const adjustedValues = useMemo(() => decomposition.value ? seasonallyAdjust(data.values, decomposition.value) : data.values, [data.values, decomposition.value]);
  const adfValues = adfTarget === "original" ? data.values : adfTarget === "adjusted" ? adjustedValues : firstDifference(data.values);
  const effectiveAdfLags = Math.min(adfLags, Math.min(12, Math.floor(adfValues.length / 4)));
  const acfResult = useMemo(() => {
    try { return { value: calculateAcfPacf(adfValues, maxLag) as AcfPacfResult, error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Could not calculate ACF/PACF." }; }
  }, [adfValues, maxLag]);
  const adfResult = useMemo(() => {
    try { return { value: augmentedDickeyFuller(adfValues, effectiveAdfLags, adfDeterministic), error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Could not run the ADF test." }; }
  }, [adfValues, effectiveAdfLags, adfDeterministic]);
  const modelInput = seasonalAdjust && decomposition.value ? adjustedValues : data.values;
  const arimaResult = useMemo(() => {
    try { return { value: fitArima(modelInput, { p, d, q, horizon, interval, includeConstant }), error: "" }; }
    catch (error) { return { value: null, error: error instanceof Error ? error.message : "Could not fit this ARIMA model." }; }
  }, [modelInput, p, d, q, horizon, interval, includeConstant]);
  const restoredForecast = useMemo(() => {
    if (!arimaResult.value) return [];
    return arimaResult.value.forecasts.map(f => {
      if (!seasonalAdjust || !decomposition.value) return f;
      const futureIndex = data.values.length + f.step - 1;
      const seasonalFactor = decomposition.value.seasonal[futureIndex % decomposition.value.period];
      return {
        ...f,
        value: reapplySeasonality(f.value, futureIndex, decomposition.value),
        lower: reapplySeasonality(f.lower, futureIndex, decomposition.value),
        upper: reapplySeasonality(f.upper, futureIndex, decomposition.value),
        standardError: decomposition.value.mode === "multiplicative" ? Math.abs(seasonalFactor) * f.standardError : f.standardError,
      };
    });
  }, [arimaResult.value, seasonalAdjust, decomposition.value, data.values.length]);

  const updateConfig = (key: keyof SeriesConfig, value: string | number) => {
    setConfig(old => ({ ...old, [key]: value } as SeriesConfig));
    if (key === "period") setPeriod(Number(value));
    if (key === "preset") setSeasonalAdjust(value === "combined" || value === "seasonal");
  };
  const regenerate = () => {
    try { const next = generateSeries(config); setData(next); setUploadError(""); }
    catch (error) { setUploadError(error instanceof Error ? error.message : "Could not generate the series."); }
  };
  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setUploadError("Please upload a .csv file."); return; }
    if (file.size > 2 * 1024 * 1024) { setUploadError("CSV files must be 2 MB or smaller."); return; }
    try { const parsed = parseTimeSeriesCsv(await file.text()); setData(parsed); setSeasonalAdjust(false); setPeriod(Math.min(period, Math.max(2, Math.floor(parsed.values.length / 2)))); setUploadError(""); }
    catch (error) { setUploadError(error instanceof Error ? error.message : "Could not read the CSV file."); }
  };
  const downloadCsv = () => {
    const lines = ["time,value", ...data.values.map((v, i) => `"${(data.labels[i] ?? String(i + 1)).replace(/"/g, '""')}",${v}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "st8-time-series-data.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <section className={styles.root} aria-label="ST-8 Time Series Analysis and Forecasting simulation">
    <header className={styles.header}>
      <p className={styles.eyebrow}>Stage 2 Statistics / Experiment ST-8</p>
      <h2>Time Series Analysis and Forecasting</h2>
      <p>Generate or upload an ordered dataset, inspect its structure and stationarity, then fit an ARIMA model and forecast future values.</p>
      <div className={styles.meta}><span>Advanced</span><span>Prerequisites: ST-2, MA-3</span><span>Unlocks: DL-6</span><span>Browser-based</span></div>
    </header>
    <details className={styles.guide} open><summary>How to use this simulation</summary><ol><li>Choose a built-in series or upload a CSV with a numeric value column and optional time/date column.</li><li>Inspect trend, seasonality and the remainder; choose additive or multiplicative decomposition.</li><li>Use differencing and ADF to investigate stationarity, then inspect the ACF and PACF.</li><li>Choose ARIMA orders and forecast horizon. Review the forecast interval and residual diagnostics.</li></ol><p><strong>Important:</strong> time-series observations are ordered and usually dependent; do not treat them as independent samples.</p></details>

    <div className={styles.tabs} role="tablist" aria-label="Time series sections">
      <button type="button" role="tab" aria-selected={activeTab === "analysis"} className={activeTab === "analysis" ? styles.activeTab : ""} onClick={() => setActiveTab("analysis")}>Series & diagnostics</button>
      <button type="button" role="tab" aria-selected={activeTab === "forecast"} className={activeTab === "forecast" ? styles.activeTab : ""} onClick={() => setActiveTab("forecast")}>ARIMA forecasting</button>
    </div>

    <div className={styles.layout}>
      <aside className={styles.panel}>
        <div className={styles.sectionTitle}><span>01</span><h3>Data source</h3></div>
        <label className={styles.field}><span>Generated series preset</span><select value={config.preset} onChange={e => updateConfig("preset", e.target.value)}><option value="combined">Trend + seasonality + noise</option><option value="ar1">Stationary AR(1)</option><option value="randomWalk">Random walk</option><option value="trend">Trend + noise</option><option value="seasonal">Seasonality + noise</option></select></label>
        <div className={styles.twoCols}>
          <label className={styles.field}><span>Observations</span><input type="number" min="24" max="1000" value={config.length} onChange={e => updateConfig("length", Number(e.target.value))}/></label>
          <label className={styles.field}><span>Random seed</span><input type="number" value={config.seed} onChange={e => updateConfig("seed", Number(e.target.value))}/></label>
        </div>
        <div className={styles.twoCols}>
          <label className={styles.field}><span>Baseline</span><input type="number" step="any" value={config.intercept} onChange={e => updateConfig("intercept", Number(e.target.value))}/></label>
          <label className={styles.field}><span>Trend slope</span><input type="number" step="any" value={config.trend} onChange={e => updateConfig("trend", Number(e.target.value))}/></label>
        </div>
        <div className={styles.twoCols}>
          <label className={styles.field}><span>Seasonal amplitude</span><input type="number" step="any" value={config.amplitude} onChange={e => updateConfig("amplitude", Number(e.target.value))}/></label>
          <label className={styles.field}><span>Seasonal period</span><input type="number" min="2" max={Math.floor(config.length / 2)} value={config.period} disabled={config.preset !== "seasonal" && config.preset !== "combined"} onChange={e => updateConfig("period", Number(e.target.value))}/></label>
        </div>
        <div className={styles.twoCols}>
          <label className={styles.field}><span>Noise SD</span><input type="number" min="0" step="any" value={config.noiseSd} onChange={e => updateConfig("noiseSd", Number(e.target.value))}/></label>
          <label className={styles.field}><span>AR(1) coefficient φ</span><input type="number" min="-0.97" max="0.97" step="0.01" value={config.phi} onChange={e => updateConfig("phi", Number(e.target.value))}/></label>
        </div>
        <div className={styles.actions}><button type="button" className={styles.primary} onClick={regenerate}>Generate series</button><button type="button" className={styles.secondary} onClick={downloadCsv}>Export CSV</button></div>
        <div className={styles.uploadBox}><strong>Or upload your own CSV</strong><p>Use one numeric value column, optionally with a time/date column. Minimum 12 observations; maximum 2 MB.</p><input id={`${uid}-csv`} type="file" accept=".csv,text/csv" onChange={e => { void handleUpload(e.target.files?.[0]); e.target.value = ""; }}/>{uploadError && <p className={styles.error} role="alert">{uploadError}</p>}</div>
        <div className={styles.sectionTitle}><span>02</span><h3>Decomposition</h3></div>
        <label className={styles.field}><span>Model</span><select value={decompositionMode} onChange={e => setDecompositionMode(e.target.value as "additive" | "multiplicative")}><option value="additive">Additive: Y = T + S + R</option><option value="multiplicative">Multiplicative: Y = T × S × R</option></select></label>
        <label className={styles.field}><span>Seasonal period</span><input type="number" min="2" max={Math.floor(data.values.length / 2)} value={period} onChange={e => setPeriod(Number(e.target.value))}/></label>
        {decomposition.error && <p className={styles.error} role="alert">{decomposition.error}</p>}
        <label className={styles.check}><input type="checkbox" checked={seasonalAdjust} onChange={e => setSeasonalAdjust(e.target.checked)} disabled={!decomposition.value}/><span>Remove estimated seasonality before ARIMA, then restore it to forecasts</span></label>
      </aside>

      <main className={styles.main}>
        {activeTab === "analysis" ? <>
          <div className={styles.kpis}><div><span>Observations</span><strong>{data.values.length}</strong></div><div><span>Source</span><strong>{data.source === "csv" ? "CSV" : "Preset"}</strong></div><div><span>Mean</span><strong>{format(data.values.reduce((s, v) => s + v, 0) / data.values.length, 2)}</strong></div><div><span>Std. deviation</span><strong>{format(Math.sqrt(data.values.reduce((s, v) => s + (v - data.values.reduce((a, b) => a + b, 0) / data.values.length) ** 2, 0) / Math.max(1, data.values.length - 1)), 2)}</strong></div></div>
          <section className={styles.plotCard}><h3>Observed time series</h3><p>Original values in chronological order. This is the series used for the decomposition below.</p><LineChart values={data.values} labels={data.labels} title="Observed time series"/></section>
          <section className={styles.plotCard}><h3>Time-series decomposition</h3><p>Centered moving-average trend and seasonal averages by phase. Edge trend estimates are unavailable by construction.</p><LineChart values={data.values} labels={data.labels} title="Observed values"/><div className={styles.subPlot}><span>Trend</span><LineChart values={decomposition.value?.trend ?? data.values.map(() => null)} title="Trend component" height={160}/></div><div className={styles.subPlot}><span>Seasonal component</span><LineChart values={decomposition.value ? data.values.map((_, i) => decomposition.value!.seasonal[i % period]) : data.values.map(() => null)} title="Seasonal component" height={160}/></div><div className={styles.subPlot}><span>Remainder</span><LineChart values={decomposition.value?.remainder ?? data.values.map(() => null)} title="Remainder component" height={160}/></div></section>
          <section className={styles.plotCard}><h3>Stationarity and differencing</h3><p>First differencing is Δyₜ = yₜ − yₜ₋₁. The Augmented Dickey-Fuller test evaluates a unit-root null; failure to reject does not prove non-stationarity.</p>
            <div className={styles.twoCols}><label className={styles.field}><span>ADF input</span><select value={adfTarget} onChange={e => setAdfTarget(e.target.value as typeof adfTarget)}><option value="original">Original series</option><option value="adjusted">Seasonally adjusted</option><option value="differenced">First-differenced series</option></select></label><label className={styles.field}><span>Deterministic terms</span><select value={adfDeterministic} onChange={e => setAdfDeterministic(e.target.value as AdfDeterministic)}><option value="none">None</option><option value="constant">Constant</option><option value="trend">Constant + linear trend</option></select></label></div>
            <label className={styles.field}><span>Lagged difference terms: {adfLags}</span><input type="range" min="0" max={Math.min(12, Math.floor(adfValues.length / 4))} value={effectiveAdfLags} onChange={e => setAdfLags(Number(e.target.value))}/></label>
            {adfResult.error ? <p className={styles.error} role="alert">{adfResult.error}</p> : adfResult.value && <div className={styles.adfResult}><div><span>ADF statistic</span><strong>{format(adfResult.value.statistic, 4)}</strong></div><div><span>Approx. p-value band</span><strong>{adfResult.value.pValueBand}</strong></div><div><span>Observations used</span><strong>{adfResult.value.observations}</strong></div><p>{adfResult.value.decision}</p><small>{adfResult.value.warning}</small></div>}
            <LineChart values={adfTarget === "differenced" ? adfValues : firstDifference(adfValues)} title={adfTarget === "differenced" ? "Differenced series used for ADF" : "First difference of selected ADF input"} zeroLine/>
          </section>
          <section className={styles.plotCard}><h3>Autocorrelation diagnostics</h3><p>ACF measures correlation with lagged values. PACF measures the additional correlation at a lag after removing shorter lags.</p><label className={styles.field}><span>Maximum lag: {maxLag}</span><input type="range" min="1" max={Math.min(36, data.values.length - 2)} value={Math.min(maxLag, Math.min(36, data.values.length - 2))} onChange={e => setMaxLag(Number(e.target.value))}/></label>
            {acfResult.error ? <p className={styles.error} role="alert">{acfResult.error}</p> : acfResult.value && <><h4>ACF</h4><Correlogram title="Autocorrelation function" points={acfResult.value.acf} confidence={acfResult.value.confidence}/><h4>PACF</h4><Correlogram title="Partial autocorrelation function" points={acfResult.value.pacf} confidence={acfResult.value.confidence}/><p className={styles.muted}>Dashed bounds are approximate ±1.96/√n reference limits. ACF/PACF patterns guide, but do not uniquely determine, model orders.</p></>}
          </section>
        </> : <>
          <section className={styles.plotCard}><h3>ARIMA model configuration</h3><p>Fit an ARIMA(p,d,q) model to the selected series. If seasonality is removed, it will be added back to the forecast after modelling.</p><div className={styles.threeCols}>
            <label className={styles.field}><span>AR order (p)</span><input type="number" min="0" max="3" value={p} onChange={e => setP(Number(e.target.value))}/></label><label className={styles.field}><span>Differencing (d)</span><input type="number" min="0" max="2" value={d} onChange={e => setD(Number(e.target.value))}/></label><label className={styles.field}><span>MA order (q)</span><input type="number" min="0" max="3" value={q} onChange={e => setQ(Number(e.target.value))}/></label>
          </div><div className={styles.twoCols}><label className={styles.field}><span>Forecast horizon</span><input type="number" min="1" max="36" value={horizon} onChange={e => setHorizon(Number(e.target.value))}/></label><label className={styles.field}><span>Prediction interval</span><select value={interval} onChange={e => setInterval(Number(e.target.value) as 80 | 95)}><option value={80}>80%</option><option value={95}>95%</option></select></label></div><label className={styles.check}><input type="checkbox" checked={includeConstant} onChange={e => setIncludeConstant(e.target.checked)}/><span>Include constant (drift when d &gt; 0)</span></label></section>
          {arimaResult.error ? <p className={styles.error} role="alert">{arimaResult.error}</p> : arimaResult.value && <>
            <div className={styles.kpis}><div><span>ARIMA order</span><strong>({p},{d},{q})</strong></div><div><span>AIC (CSS)</span><strong>{format(arimaResult.value.aic, 2)}</strong></div><div><span>Residual SD</span><strong>{format(Math.sqrt(arimaResult.value.sigma2), 3)}</strong></div><div><span>Optimizer</span><strong>{arimaResult.value.converged ? "Converged" : "Limit reached"}</strong></div></div>
            <section className={styles.plotCard}><h3>Forecast and prediction interval</h3><p>Observed history, fitted-model forecast and conditional Gaussian prediction interval.</p><ForecastChart historical={data.values} forecast={restoredForecast}/><div className={styles.tableWrap}><table><thead><tr><th>Horizon</th><th>Forecast</th><th>Lower ({interval}%)</th><th>Upper ({interval}%)</th><th>SE</th></tr></thead><tbody>{restoredForecast.map(f => <tr key={f.step}><th>T+{f.step}</th><td>{format(f.value, 3)}</td><td>{format(f.lower, 3)}</td><td>{format(f.upper, 3)}</td><td>{format(f.standardError, 3)}</td></tr>)}</tbody></table></div></section>
            <section className={styles.plotCard}><h3>Fitted model and diagnostics</h3><div className={styles.modelGrid}><div><span>Constant / drift</span><strong>{format(arimaResult.value.constant, 4)}</strong></div><div><span>AR coefficients</span><strong>{arimaResult.value.ar.map(v => format(v, 3)).join(", ") || "None"}</strong></div><div><span>MA coefficients</span><strong>{arimaResult.value.ma.map(v => format(v, 3)).join(", ") || "None"}</strong></div><div><span>Residual SSE</span><strong>{format(arimaResult.value.sse, 4)}</strong></div></div>
              <h4>Model residuals</h4><LineChart values={arimaResult.value.residuals} title="ARIMA residuals" zeroLine height={180}/><h4>Residual ACF</h4>{(() => { try { const r = calculateAcfPacf(arimaResult.value!.residuals, Math.min(18, Math.floor(arimaResult.value!.residuals.length / 3))); return <Correlogram title="Residual autocorrelation" points={r.acf} confidence={r.confidence}/>; } catch { return <p className={styles.muted}>Residual ACF is unavailable for this fit.</p>; } })()}
              {arimaResult.value.warnings.map((w, i) => <p className={styles.warning} key={i}>{w}</p>)}
            </section>
          </>}
          <section className={styles.lstm}><strong>LSTM comparison — reserved for Stage 4</strong><p>The catalogue specifies this as a labelled backend comparison after Stage 4. No LSTM forecast or metric is generated in this browser-only implementation.</p><span>Not active</span></section>
        </>}
      </main>
    </div>
    <footer className={styles.footer}>Browser simulation · Generated data are synthetic. CSV data are processed locally in the browser and are not uploaded to a server. Forecasts depend on model assumptions and should be checked using residual diagnostics.</footer>
  </section>;
}

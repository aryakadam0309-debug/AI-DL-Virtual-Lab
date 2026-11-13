"use client";

import { useEffect, useId, useMemo, useState } from "react";
import styles from "./classNames";
import CanvasVisualizer from "./canvasVisualizer";
import {
  PRESETS,
  type Matrix2x2,
  type Vector2D,
} from "./types";
import {
  calculateDeterminant,
  getMatrixProperties,
  interpolateMatrix,
  multiplyMatrices,
  round,
  transformVector,
} from "./matrixMath";

type Mode = "single" | "composition";

const parseNum = (s: string) => (s.trim() === "" ? NaN : Number(s));

export default function Ma1Sim() {
  const uid = useId();

  // Mode: single matrix A or composition AB vs BA
  const [mode, setMode] = useState<Mode>("single");

  // Preset selection
  const [pid, setPid] = useState<string>(PRESETS[0].id);
  const currentPreset = PRESETS.find((p) => p.id === pid) ?? PRESETS[0];

  // Matrix A entries (strings for smooth typing)
  const [sa, setSa] = useState<string>(String(PRESETS[0].matrix[0][0]));
  const [sb, setSb] = useState<string>(String(PRESETS[0].matrix[0][1]));
  const [sc, setSc] = useState<string>(String(PRESETS[0].matrix[1][0]));
  const [sd, setSd] = useState<string>(String(PRESETS[0].matrix[1][1]));

  // Matrix B entries for composition (default to 90° rotation from PDF)
  const [sb11, setSb11] = useState<string>("0");
  const [sb12, setSb12] = useState<string>("-1");
  const [sb21, setSb21] = useState<string>("1");
  const [sb22, setSb22] = useState<string>("0");

  // Selected composite preview in composition mode: 'AB' | 'BA'
  const [compPreview, setCompPreview] = useState<"AB" | "BA">("AB");

  // Animation / Interpolation state (0 = Identity, 1 = Target Matrix)
  const [progress, setProgress] = useState<number>(1);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.5);

  // Plane display toggles
  const [showOriginalGrid, setShowOriginalGrid] = useState<boolean>(true);
  const [showTransformedGrid, setShowTransformedGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [showTestVector, setShowTestVector] = useState<boolean>(false);
  const [svx, setSvx] = useState<string>("1");
  const [svy, setSvy] = useState<string>("1");

  // Parameter sliders for specific presets
  const [rotAngle, setRotAngle] = useState<number>(45);
  const [shearK, setShearK] = useState<number>(1);
  const [scaleX, setScaleX] = useState<number>(1.5);
  const [scaleY, setScaleY] = useState<number>(0.8);

  // Parse Matrix A
  const a = parseNum(sa);
  const b = parseNum(sb);
  const c = parseNum(sc);
  const d = parseNum(sd);
  const validA = [a, b, c, d].every(Number.isFinite);

  // Parse Matrix B
  const b11 = parseNum(sb11);
  const b12 = parseNum(sb12);
  const b21 = parseNum(sb21);
  const b22 = parseNum(sb22);
  const validB = [b11, b12, b21, b22].every(Number.isFinite);

  // Parse Test Vector
  const vx = parseNum(svx);
  const vy = parseNum(svy);
  const testVec: Vector2D | null =
    showTestVector && Number.isFinite(vx) && Number.isFinite(vy) ? [vx, vy] : null;

  const targetMatrixA: Matrix2x2 = useMemo(
    () => (validA ? [[a, b], [c, d]] : [[1, 0], [0, 1]]),
    [validA, a, b, c, d]
  );

  const matrixB: Matrix2x2 = useMemo(
    () => (validB ? [[b11, b12], [b21, b22]] : [[0, -1], [1, 0]]),
    [validB, b11, b12, b21, b22]
  );

  // Animated matrix A for display
  const displayMatrixA: Matrix2x2 = useMemo(() => {
    if (!validA) return [[1, 0], [0, 1]];
    return interpolateMatrix(targetMatrixA, progress);
  }, [validA, targetMatrixA, progress]);

  // Matrix properties
  const propsA = useMemo(() => getMatrixProperties(targetMatrixA), [targetMatrixA]);
  const detA = propsA.det;
  const trA = propsA.trace;

  // Composition computations
  const matrixAB = useMemo(() => multiplyMatrices(targetMatrixA, matrixB), [targetMatrixA, matrixB]);
  const matrixBA = useMemo(() => multiplyMatrices(matrixB, targetMatrixA), [matrixB, targetMatrixA]);
  const detB = useMemo(() => calculateDeterminant(matrixB), [matrixB]);
  const detAB = useMemo(() => calculateDeterminant(matrixAB), [matrixAB]);
  const detBA = useMemo(() => calculateDeterminant(matrixBA), [matrixBA]);

  const isCommutative = useMemo(() => {
    return (
      Math.abs(matrixAB[0][0] - matrixBA[0][0]) < 1e-4 &&
      Math.abs(matrixAB[0][1] - matrixBA[0][1]) < 1e-4 &&
      Math.abs(matrixAB[1][0] - matrixBA[1][0]) < 1e-4 &&
      Math.abs(matrixAB[1][1] - matrixBA[1][1]) < 1e-4
    );
  }, [matrixAB, matrixBA]);

  // Matrix sent to the visualizer depending on mode and selection
  const visualizerMatrix: Matrix2x2 = useMemo(() => {
    if (mode === "single") return displayMatrixA;
    return compPreview === "AB" ? matrixAB : matrixBA;
  }, [mode, compPreview, displayMatrixA, matrixAB, matrixBA]);

  const visualizerDet: number = useMemo(() => {
    if (mode === "single") return calculateDeterminant(displayMatrixA);
    return compPreview === "AB" ? detAB : detBA;
  }, [mode, compPreview, displayMatrixA, detAB, detBA]);

  // Animation Loop
  useEffect(() => {
    if (!playing) return;
    const intervalMs = 25;
    const stepDelta = (intervalMs / 1000) * (speed / 1.5);
    const id = setInterval(() => {
      setProgress((p: number) => {
        const next = p + stepDelta;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, speed]);

  // Update matrix A from direct dragging on canvas
  const handleCanvasMatrixChange = (newM: Matrix2x2) => {
    const [[na, nb], [nc, nd]] = newM;
    setSa(String(round(na, 2)));
    setSb(String(round(nb, 2)));
    setSc(String(round(nc, 2)));
    setSd(String(round(nd, 2)));
    setProgress(1);
    setPlaying(false);
  };

  // Pick Preset
  const pickPreset = (presetId: string) => {
    const p = PRESETS.find((q) => q.id === presetId);
    if (!p) return;
    setPid(presetId);
    setSa(String(p.matrix[0][0]));
    setSb(String(p.matrix[0][1]));
    setSc(String(p.matrix[1][0]));
    setSd(String(p.matrix[1][1]));
    setProgress(1);
    setPlaying(false);
  };

  // Preset parameter changes
  const handleRotationSlider = (deg: number) => {
    setRotAngle(deg);
    const rad = (deg * Math.PI) / 180;
    setSa(String(round(Math.cos(rad), 4)));
    setSb(String(round(-Math.sin(rad), 4)));
    setSc(String(round(Math.sin(rad), 4)));
    setSd(String(round(Math.cos(rad), 4)));
    setProgress(1);
  };

  const handleShearSlider = (k: number) => {
    setShearK(k);
    setSa("1");
    setSb(String(k));
    setSc("0");
    setSd("1");
    setProgress(1);
  };

  const handleScaleSlider = (sx: number, sy: number) => {
    setScaleX(sx);
    setScaleY(sy);
    setSa(String(sx));
    setSb("0");
    setSc("0");
    setSd(String(sy));
    setProgress(1);
  };

  // Stepping controls
  const handlePlayToggle = () => {
    if (playing) {
      setPlaying(false);
    } else {
      if (progress >= 1) setProgress(0);
      setPlaying(true);
    }
  };

  const handleStepForward = () => {
    setPlaying(false);
    setProgress((p: number) => Math.min(1, round(p + 0.1, 2)));
  };

  const handleStepBack = () => {
    setPlaying(false);
    setProgress((p: number) => Math.max(0, round(p - 0.1, 2)));
  };

  // Table transformed points calculations
  const te1 = transformVector(targetMatrixA, [1, 0]);
  const te2 = transformVector(targetMatrixA, [0, 1]);
  const tdiag = transformVector(targetMatrixA, [1, 1]);
  const tVec = testVec ? transformVector(targetMatrixA, testVec) : null;

  return (
    <section className={styles.root} aria-label="Simulation: Linear Algebra Visualizer">
      {/* Header matching MA-2 format */}
      <div className={styles.head}>
        <p className={styles.eyebrow}>Linear Algebra / Experiment 01</p>
        <h2>Linear Algebra Visualizer Simulation</h2>
        <p>
          2×2 matrices act as geometric transformations of the plane. Drag the basis vectors or enter
          entries to observe how space deforms, areas scale (determinant), and matrix multiplication composes.
        </p>
      </div>

      {/* Guide Accordion matching MA-2 format */}
      <details className={styles.guide}>
        <summary>Short Summary & Geometric Rules</summary>
        <ol>
          <li>
            <strong>A vector is an arrow or point</strong> \(v = (x, y)\). In machine learning, a data point with \(n\) features is a vector in \(n\) dimensions.
          </li>
          <li>
            <strong>A matrix is a transformation recipe:</strong> The columns of A = [ a  b ; c  d ] are literally where the basis vectors land:
            e₁ = (1, 0) → (a, c) and e₂ = (0, 1) → (b, d).
          </li>
          <li>
            <strong>Linearity:</strong> The entire grid is carried along with the basis vectors: straight lines stay straight, parallel lines stay parallel, and the origin \((0,0)\) remains fixed.
          </li>
          <li>
            <strong>Determinant \(\det(A) = ad - bc\):</strong> The signed factor by which areas change. \(|\det(A)| = 2\) means the unit square becomes a parallelogram of area 2. If \(\det(A) = 0\), space collapses onto a line (singular matrix, no inverse). If negative, orientation is flipped.
          </li>
          <li>
            <strong>Trace tr(A) = a + d:</strong> Sum of the diagonal entries; equals the sum of eigenvalues (λ₁ + λ₂).
          </li>
          <li>
            <strong>Composition \(AB \neq BA\):</strong> Applying \(B\) first and then \(A\) gives \(AB\). Matrix multiplication is not commutative, so the order of operations fundamentally changes the geometric result!
          </li>
        </ol>
        <p className={styles.formula}>
          Av = [ a  b ; c  d ] · [ x, y ]ᵀ = x · [ a, c ]ᵀ + y · [ b, d ]ᵀ
        </p>
        <p className={styles.hint}>
          Try it: Choose <strong>Start here - Strang Worked Example</strong> below, then press <strong>Play</strong> to watch space stretch into a parallelogram of area 2. You can also directly drag the vector arrows on the graph!
        </p>
      </details>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Setup Panel */}
        <div className={`${styles.panel} ${styles.setup}`}>
          <div className={styles.field}>
            <label htmlFor={`${uid}preset`}>Transformation Preset</label>
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

          {/* Mode Switcher */}
          <fieldset className={styles.radios}>
            <legend>Mode</legend>
            <label>
              <input
                type="radio"
                name={`${uid}mode`}
                checked={mode === "single"}
                onChange={() => setMode("single")}
              />
              Single Matrix (A)
            </label>
            <label>
              <input
                type="radio"
                name={`${uid}mode`}
                checked={mode === "composition"}
                onChange={() => setMode("composition")}
              />
              Composition Explorer (AB vs BA)
            </label>
          </fieldset>

          {/* Matrix A Input Box */}
          <div className={styles.field}>
            <label>Matrix A Entries</label>
            <div className={styles.colHeader}>
              <span className={styles.colE1}>Col 1: e₁' (a, c)</span>
              <span className={styles.colE2}>Col 2: e₂' (b, d)</span>
            </div>
            <div className={styles.matrixBox}>
              <span className={styles.matrixLabel}>A =</span>
              <span className={styles.matrixBracket}>[</span>
              <div className={styles.matrixGrid}>
                <input
                  aria-label="Matrix entry a (row 1, col 1)"
                  className={styles.matrixInput}
                  type="number"
                  step="0.1"
                  value={sa}
                  onChange={(e) => {
                    setSa(e.target.value);
                    setProgress(1);
                  }}
                />
                <input
                  aria-label="Matrix entry b (row 1, col 2)"
                  className={styles.matrixInput}
                  type="number"
                  step="0.1"
                  value={sb}
                  onChange={(e) => {
                    setSb(e.target.value);
                    setProgress(1);
                  }}
                />
                <input
                  aria-label="Matrix entry c (row 2, col 1)"
                  className={styles.matrixInput}
                  type="number"
                  step="0.1"
                  value={sc}
                  onChange={(e) => {
                    setSc(e.target.value);
                    setProgress(1);
                  }}
                />
                <input
                  aria-label="Matrix entry d (row 2, col 2)"
                  className={styles.matrixInput}
                  type="number"
                  step="0.1"
                  value={sd}
                  onChange={(e) => {
                    setSd(e.target.value);
                    setProgress(1);
                  }}
                />
              </div>
              <span className={styles.matrixBracket}>]</span>
            </div>
          </div>

          {/* Parameter Sliders for Presets */}
          {pid === "rotation90" && (
            <div className={styles.field}>
              <label htmlFor={`${uid}rot`}>Rotation Angle: {rotAngle}°</label>
              <input
                id={`${uid}rot`}
                type="range"
                min={0}
                max={360}
                step={5}
                value={rotAngle}
                onChange={(e) => handleRotationSlider(+e.target.value)}
              />
            </div>
          )}

          {pid === "shear" && (
            <div className={styles.field}>
              <label htmlFor={`${uid}shear`}>Shear Factor (k): {shearK}</label>
              <input
                id={`${uid}shear`}
                type="range"
                min={-3}
                max={3}
                step={0.25}
                value={shearK}
                onChange={(e) => handleShearSlider(+e.target.value)}
              />
            </div>
          )}

          {pid === "scaling" && (
            <div className={styles.row2}>
              <div className={styles.field}>
                <label htmlFor={`${uid}sx`}>Scale X (s_x): {scaleX}</label>
                <input
                  id={`${uid}sx`}
                  type="range"
                  min={-2}
                  max={3}
                  step={0.1}
                  value={scaleX}
                  onChange={(e) => handleScaleSlider(+e.target.value, scaleY)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`${uid}sy`}>Scale Y (s_y): {scaleY}</label>
                <input
                  id={`${uid}sy`}
                  type="range"
                  min={-2}
                  max={3}
                  step={0.1}
                  value={scaleY}
                  onChange={(e) => handleScaleSlider(scaleX, +e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Matrix B Input Box (when in Composition mode) */}
          {mode === "composition" && (
            <div className={styles.field}>
              <label>Matrix B Entries (Composed with A)</label>
              <div className={styles.matrixBox}>
                <span className={styles.matrixLabel}>B =</span>
                <span className={styles.matrixBracket}>[</span>
                <div className={styles.matrixGrid}>
                  <input
                    aria-label="Matrix B entry 1,1"
                    className={styles.matrixInput}
                    type="number"
                    step="0.1"
                    value={sb11}
                    onChange={(e) => setSb11(e.target.value)}
                  />
                  <input
                    aria-label="Matrix B entry 1,2"
                    className={styles.matrixInput}
                    type="number"
                    step="0.1"
                    value={sb12}
                    onChange={(e) => setSb12(e.target.value)}
                  />
                  <input
                    aria-label="Matrix B entry 2,1"
                    className={styles.matrixInput}
                    type="number"
                    step="0.1"
                    value={sb21}
                    onChange={(e) => setSb21(e.target.value)}
                  />
                  <input
                    aria-label="Matrix B entry 2,2"
                    className={styles.matrixInput}
                    type="number"
                    step="0.1"
                    value={sb22}
                    onChange={(e) => setSb22(e.target.value)}
                  />
                </div>
                <span className={styles.matrixBracket}>]</span>
              </div>
            </div>
          )}

          {/* Plane View Display Options */}
          <div className={styles.field}>
            <label>Display & Grid Options</label>
            <div className={styles.radios} style={{ flexDirection: "column", gap: "0.4rem" }}>
              <label>
                <input
                  type="checkbox"
                  checked={showOriginalGrid}
                  onChange={(e) => setShowOriginalGrid(e.target.checked)}
                />
                Show Reference Grid (Grey)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showTransformedGrid}
                  onChange={(e) => setShowTransformedGrid(e.target.checked)}
                />
                Show Transformed Grid (Indigo)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                />
                Snap vector tips to 0.5 grid on drag
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showTestVector}
                  onChange={(e) => setShowTestVector(e.target.checked)}
                />
                Track custom test vector v
              </label>
            </div>
          </div>

          {/* Custom vector inputs */}
          {showTestVector && (
            <div className={styles.row2}>
              <div className={styles.field}>
                <label htmlFor={`${uid}vx`}>Vector x</label>
                <input
                  id={`${uid}vx`}
                  type="number"
                  step="0.5"
                  value={svx}
                  onChange={(e) => setSvx(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`${uid}vy`}>Vector y</label>
                <input
                  id={`${uid}vy`}
                  type="number"
                  step="0.5"
                  value={svy}
                  onChange={(e) => setSvy(e.target.value)}
                />
              </div>
            </div>
          )}

          {!validA && (
            <p role="alert" className={styles.warn}>
              Please enter valid numerical entries for Matrix A.
            </p>
          )}
        </div>

        {/* Plots / Canvas Visualizer Area */}
        <div className={styles.plots}>
          <div className={styles.chartHeading}>
            <span className={styles.chartIndex}>01</span>
            <h3>
              {mode === "single"
                ? "Geometric Transformation Plane"
                : `Composite Visualization: ${compPreview} (${compPreview === "AB" ? "B then A" : "A then B"})`}
            </h3>
          </div>

          {/* Canvas Component */}
          <div style={{ height: "390px", width: "100%" }}>
            <CanvasVisualizer
              matrix={visualizerMatrix}
              det={visualizerDet}
              onMatrixChange={mode === "single" ? handleCanvasMatrixChange : undefined}
              interactive={mode === "single"}
              testVector={testVec}
              showOriginalGrid={showOriginalGrid}
              showTransformedGrid={showTransformedGrid}
              snapToGrid={snapToGrid}
              label={
                mode === "single"
                  ? progress < 0.99
                    ? `Deforming space (${Math.round(progress * 100)}%)`
                    : "Transformed Plane (A)"
                  : `Composite Matrix ${compPreview}`
              }
            />
          </div>

          {mode === "single" && (
            <p className={styles.hint}>
              Tip: Drag the <strong>blue (e₁)</strong> or <strong>purple (e₂)</strong> vector arrowheads to reshape the matrix in real-time. Scroll to zoom, drag empty space to pan.
            </p>
          )}

          {/* Visual Legend */}
          <div className={styles.legend}>
            <span>
              <span className={styles.dot} style={{ background: "#0284c7" }} />
              <strong>e₁' (Col 1):</strong> Image of (1, 0)
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#a855f7" }} />
              <strong>e₂' (Col 2):</strong> Image of (0, 1)
            </span>
            <span>
              <span className={styles.dot} style={{ background: detA >= 0 ? "#22c55e" : "#f43f5e" }} />
              <strong>Parallelogram:</strong> Area scale |det A|
            </span>
            {showTestVector && (
              <span>
                <span className={styles.dot} style={{ background: "#f59e0b" }} />
                <strong>Av:</strong> Transformed test vector
              </span>
            )}
          </div>

          {/* Animation & Playback Bar */}
          {mode === "single" && (
            <>
              <div className={styles.bar}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => {
                    setProgress(0);
                    setPlaying(false);
                  }}
                  disabled={progress === 0}
                >
                  Identity (I)
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={handleStepBack}
                  disabled={progress <= 0}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.primary}`}
                  onClick={handlePlayToggle}
                >
                  {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={handleStepForward}
                  disabled={progress >= 1}
                >
                  Step
                </button>
                <label className={styles.inline}>
                  Speed
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.5}
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.bar}>
                <label htmlFor={`${uid}scrub`}>Deformation Progress</label>
                <input
                  id={`${uid}scrub`}
                  className={styles.scrub}
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progress * 100)}
                  onChange={(e) => {
                    setPlaying(false);
                    setProgress(+e.target.value / 100);
                  }}
                />
                <span>{Math.round(progress * 100)}% (I → A)</span>
              </div>
            </>
          )}

          {/* Composition Controls Bar (when in composition mode) */}
          {mode === "composition" && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.chartHeading}>
                <span className={styles.chartIndex}>02</span>
                <h3>Composition Comparison: Order Matters (AB vs BA)</h3>
              </div>
              <p className={styles.hint}>
                Applying B then A produces AB. Applying A then B produces BA. In general, <strong>matrix multiplication does not commute (AB ≠ BA)</strong>!
              </p>

              <div className={styles.compGrid}>
                {/* Product AB */}
                <div className={`${styles.compCard} ${compPreview === "AB" ? styles.activeComp : ""}`}>
                  <h4>AB = A · B (B applied first, then A)</h4>
                  <div className={styles.formula} style={{ fontSize: "0.95rem", padding: "0.3rem" }}>
                    {`[ ${round(matrixAB[0][0], 2)}   ${round(matrixAB[0][1], 2)} ;  ${round(matrixAB[1][0], 2)}   ${round(matrixAB[1][1], 2)} ]`}
                  </div>
                  <p className={styles.hint} style={{ margin: "0.3rem 0" }}>
                    det(AB) = {round(detAB, 2)} = det(A)·det(B) ({round(detA, 2)} × {round(detB, 2)})
                  </p>
                  <button
                    type="button"
                    className={`${styles.btn} ${compPreview === "AB" ? styles.primary : ""}`}
                    onClick={() => setCompPreview("AB")}
                    style={{ width: "100%", marginTop: "0.4rem" }}
                  >
                    {compPreview === "AB" ? "Currently Viewing AB" : "View AB on Canvas"}
                  </button>
                </div>

                {/* Product BA */}
                <div className={`${styles.compCard} ${compPreview === "BA" ? styles.activeComp : ""}`}>
                  <h4>BA = B · A (A applied first, then B)</h4>
                  <div className={styles.formula} style={{ fontSize: "0.95rem", padding: "0.3rem" }}>
                    {`[ ${round(matrixBA[0][0], 2)}   ${round(matrixBA[0][1], 2)} ;  ${round(matrixBA[1][0], 2)}   ${round(matrixBA[1][1], 2)} ]`}
                  </div>
                  <p className={styles.hint} style={{ margin: "0.3rem 0" }}>
                    det(BA) = {round(detBA, 2)} = det(B)·det(A) ({round(detB, 2)} × {round(detA, 2)})
                  </p>
                  <button
                    type="button"
                    className={`${styles.btn} ${compPreview === "BA" ? styles.primary : ""}`}
                    onClick={() => setCompPreview("BA")}
                    style={{ width: "100%", marginTop: "0.4rem" }}
                  >
                    {compPreview === "BA" ? "Currently Viewing BA" : "View BA on Canvas"}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "0.6rem" }}>
                <span
                  className={`${styles.badgeAlert} ${
                    isCommutative ? styles.badgeAlertOk : styles.badgeAlertWarn
                  }`}
                >
                  {isCommutative
                    ? "✓ Commutative: AB = BA for these specific matrices."
                    : "⚠️ Non-Commutative: AB ≠ BA. Notice how different the two transformations look!"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Readout Cards */}
        <div className={styles.read} aria-live="polite">
          {/* Card 1: Determinant & Orientation */}
          <div className={`${styles.card} ${styles.cardB}`}>
            <h3>Determinant & Area Scaling</h3>
            <dl className={styles.dl}>
              <dt>Formula</dt>
              <dd>ad − bc</dd>
              <dt>det(A)</dt>
              <dd>{round(detA, 4)}</dd>
              <dt>Area factor |det A|</dt>
              <dd>{round(propsA.absDet, 4)}×</dd>
              <dt>Orientation</dt>
              <dd>
                {propsA.orientation === "preserved"
                  ? "Preserved (det > 0)"
                  : propsA.orientation === "reversed"
                  ? "Reversed / Flipped (det < 0)"
                  : "Collapsed to Line (det = 0)"}
              </dd>
              <dt>Invertible</dt>
              <dd>{propsA.isInvertible ? "Yes (A⁻¹ exists)" : "No (Singular / det = 0)"}</dd>
            </dl>

            <p className={styles.status}>
              <strong>
                {detA === 0
                  ? "Space has collapsed!"
                  : detA < 0
                  ? "Orientation is flipped."
                  : "Orientation preserved."}
              </strong>{" "}
              {detA === 0
                ? "Because the determinant is zero, the 2D area collapses to 0. A singular matrix has no inverse."
                : `The unit square of area 1.00 becomes a parallelogram of area ${round(
                    propsA.absDet,
                    2
                  )}.`}
            </p>
          </div>

          {/* Card 2: Trace & Eigenvalues Link */}
          <div className={`${styles.card} ${styles.cardN}`}>
            <h3>Trace & Eigenvalues Link</h3>
            <dl className={styles.dl}>
              <dt>Formula</dt>
              <dd>a + d</dd>
              <dt>tr(A)</dt>
              <dd>{round(trA, 4)}</dd>
              <dt>Eigenvalue Sum (λ₁+λ₂)</dt>
              <dd>{round(trA, 4)}</dd>
              <dt>Eigenvalue Product (λ₁·λ₂)</dt>
              <dd>{round(detA, 4)}</dd>
              <dt>Real Eigenvalues</dt>
              <dd>
                {propsA.eigenvaluesPreview?.hasRealEigenvalues
                  ? `λ₁ = ${round(propsA.eigenvaluesPreview.lambda1 ?? 0, 2)}, λ₂ = ${round(
                      propsA.eigenvaluesPreview.lambda2 ?? 0,
                      2
                    )}`
                  : "Complex (no real fixed axes)"}
              </dd>
            </dl>

            <p className={styles.hint}>
              Together, <strong>det(A)</strong> and <strong>tr(A)</strong> summarize the matrix. They equal the product and sum of its eigenvalues, which directly connects to <strong>MA-4</strong>.
            </p>
          </div>
        </div>

        {/* Transformation Mapping Table */}
        <div className={styles.tableWrap}>
          <h3>Transformation Mapping Table</h3>
          <p className={styles.hint}>
            Where standard unit vectors and points land before and after transformation by \(A\).
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vector / Feature</th>
                  <th>Original Point (v)</th>
                  <th>Transformed Point (Av)</th>
                  <th>Formula / Significance</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.cur}>
                  <td>Basis vector e₁</td>
                  <td>(1, 0)</td>
                  <td>({round(te1[0], 2)}, {round(te1[1], 2)})</td>
                  <td>Column 1 of A: [a, c]ᵀ</td>
                </tr>
                <tr className={styles.cur}>
                  <td>Basis vector e₂</td>
                  <td>(0, 1)</td>
                  <td>({round(te2[0], 2)}, {round(te2[1], 2)})</td>
                  <td>Column 2 of A: [b, d]ᵀ</td>
                </tr>
                <tr>
                  <td>Unit Diagonal</td>
                  <td>(1, 1)</td>
                  <td>({round(tdiag[0], 2)}, {round(tdiag[1], 2)})</td>
                  <td>Linearity: A(e₁ + e₂) = Ae₁ + Ae₂</td>
                </tr>
                {tVec && (
                  <tr>
                    <td>Custom Test Vector v</td>
                    <td>({round(vx, 2)}, {round(vy, 2)})</td>
                    <td>({round(tVec[0], 2)}, {round(tVec[1], 2)})</td>
                    <td>Av = x·(Col 1) + y·(Col 2)</td>
                  </tr>
                )}
                <tr>
                  <td>Unit Square Area</td>
                  <td>1.000</td>
                  <td>{round(propsA.absDet, 3)}</td>
                  <td>Scales exactly by |det A| = |ad − bc|</td>
                </tr>
              </tbody>
            </table>
          </div>

          <details className={styles.glossary}>
            <summary>What do the columns of a matrix mean?</summary>
            <ul>
              <li>
                <strong>Column 1 [ a, c ]ᵀ:</strong> Where the horizontal basis vector e₁ = (1, 0) lands after transformation.
              </li>
              <li>
                <strong>Column 2 [ b, d ]ᵀ:</strong> Where the vertical basis vector e₂ = (0, 1) lands after transformation.
              </li>
              <li>
                <strong>Linearity Property:</strong> Once you know where e₁ and e₂ land, every other vector (x, y) in the entire plane is determined by x · (Col 1) + y · (Col 2).
              </li>
            </ul>
          </details>
        </div>
      </div>

      {/* Theory & Worked Example Box matching PDF Page 3 */}
      <div className={styles.theoryBox}>
        <h3>Theory & Worked Examples (from Virtual Lab Notes)</h3>
        <p style={{ margin: "0 0 0.6rem 0", color: "#5b6270", fontSize: "0.93em" }}>
          Reference: Strang (1993, <em>Introduction to Linear Algebra</em>). Unlocks MA-4, ML-3, DL-5.
        </p>

        <div style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e7d9dd", marginBottom: "0.85rem" }}>
          <h4 style={{ margin: "0 0 0.4rem 0", color: "#74243a", fontSize: "1rem" }}>
            Worked Example 1: Matrix Transformation
          </h4>
          <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.92em" }}>
            Let A = [ 2  1 ; 0  1 ].
            Then Ae₁ = (2, 0) and Ae₂ = (1, 1). The unit square becomes a parallelogram with area 2.
            This agrees with det(A) = 2 · 1 − 1 · 0 = 2, and tr(A) = 2 + 1 = 3.
          </p>
        </div>

        <div style={{ background: "#ffffff", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e7d9dd" }}>
          <h4 style={{ margin: "0 0 0.4rem 0", color: "#74243a", fontSize: "1rem" }}>
            Worked Example 2: Order Matters (Composition)
          </h4>
          <p style={{ margin: "0 0 0.4rem 0", fontSize: "0.92em" }}>
            Take the shear A = [ 1  1 ; 0  1 ] and 90° rotation B = [ 0  −1 ; 1  0 ].
          </p>
          <div className={styles.formula} style={{ fontSize: "1rem", margin: "0.4rem 0" }}>
            AB = [ 1  −1 ; 1  0 ]  ≠  BA = [ 0  −1 ; 1  1 ]
          </div>
          <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.9em", color: "#755f65" }}>
            The two products differ, so <em>"shear then rotate"</em> is not the same as <em>"rotate then shear"</em>!
          </p>
        </div>

        {/* Callouts */}
        <div className={styles.calloutsGrid}>
          <div className={`${styles.callout} ${styles.calloutMistake}`}>
            <strong>Common Mistake:</strong> Assuming \(AB = BA\). Use the Composition mode above to test it with a shear and a rotation.
          </div>
          <div className={`${styles.callout} ${styles.calloutTip}`}>
            <strong>Key Intuition / Tip:</strong> Read a matrix column by column. Each column directly answers the question: <em>"Where does this basis vector land?"</em>
          </div>
        </div>

        <div className={`${styles.callout} ${styles.calloutKey}`}>
          <strong>Key Takeaway:</strong> A matrix is a recipe for deforming space. The determinant measures the area change, and composition is multiplication in a fixed order.
        </div>
      </div>
    </section>
  );
}

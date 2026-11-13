"use client";

import { useId, useMemo, useState, type MouseEvent } from "react";
import styles from "./ma4sim.module.css";
import { analyseMatrix, determinantLabel, formatNumber, multiplyVector, normalise, testEigenvector, type Matrix2, type Vec2 } from "./eigenmath";

type Preset = { id: string; label: string; A: Matrix2; note: string };
const PRESETS: Preset[] = [
  { id: "symmetric", label: "Symmetric matrix (PCA-style axes)", A: { a: 2, b: 1, c: 1, d: 3 }, note: "A symmetric matrix has real eigenvalues and orthogonal eigenvector directions (for distinct eigenvalues)." },
  { id: "diagonal", label: "Diagonal scaling", A: { a: 2, b: 0, c: 0, d: 0.5 }, note: "The coordinate axes are eigenvector directions, scaled by 2 and 0.5." },
  { id: "shear", label: "Shear", A: { a: 1, b: 1.5, c: 0, d: 1 }, note: "This shear has a repeated eigenvalue and one independent eigenvector direction." },
  { id: "rotation", label: "Rotation by 90°", A: { a: 0, b: -1, c: 1, d: 0 }, note: "A 90° rotation has no real eigenvector directions: every nonzero real vector changes direction." },
  { id: "reflection", label: "Reflection across x-axis", A: { a: 1, b: 0, c: 0, d: -1 }, note: "Vectors on the axes are eigenvectors; the y-axis direction reverses sign." },
  { id: "collapse", label: "Singular / projection-style", A: { a: 1, b: 1, c: 0, d: 0 }, note: "This transformation maps the plane onto a line and has determinant zero." },
];
const INITIAL: Matrix2 = PRESETS[0].A;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const angleOf = (v: Vec2) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

function VectorArrow({ start, end, color, dashed = false, width = 2.5, label }: { start: Vec2; end: Vec2; color: string; dashed?: boolean; width?: number; label?: string }) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (!Number.isFinite(len) || len < 0.0001) return null;
  const ux = dx / len, uy = dy / len, head = Math.min(11, Math.max(6, len * 0.12));
  const bx = end.x - ux * head, by = end.y - uy * head;
  return <g>
    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? "6 5" : undefined} />
    <polygon points={`${end.x},${end.y} ${bx - uy * head * 0.48},${by + ux * head * 0.48} ${bx + uy * head * 0.48},${by - ux * head * 0.48}`} fill={color} />
    {label && <text x={end.x + 8} y={end.y - 8} className={styles.vectorLabel} fill={color}>{label}</text>}
  </g>;
}

function Plane({ A, v, Av, eigenvectors, matched, showEigen, symmetricMode, onAnglePick }: {
  A: Matrix2; v: Vec2; Av: Vec2; eigenvectors: { value: number; vector: Vec2 }[]; matched: boolean; showEigen: boolean; symmetricMode: boolean; onAnglePick: (angle: number) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const W = 600, H = 430, M = { l: 42, r: 20, t: 20, b: 38 };
  const span = Math.max(5, Math.ceil(Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(Av.x), Math.abs(Av.y)) * 1.12));
  const tickStep = Math.max(1, Math.ceil(span / 5));
  const tickRadius = Math.floor(span / tickStep);
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const sx = (x: number) => M.l + ((x + span) / (2 * span)) * pw;
  const sy = (y: number) => M.t + ((span - y) / (2 * span)) * ph;
  const clip = `${uid}-clip`;
  const eigLines = eigenvectors.map((p, i) => {
    const u = normalise(p.vector), reach = span * 1.45;
    return <g key={`${p.value}-${i}`}>
      <line x1={sx(-u.x * reach)} y1={sy(-u.y * reach)} x2={sx(u.x * reach)} y2={sy(u.y * reach)} className={styles.eigenLine} />
      <text x={sx(u.x * 3.65) + 4} y={sy(u.y * 3.65) - 5} className={styles.eigenLabel}>λ = {formatNumber(p.value, 2)}</text>
    </g>;
  });
  const grid = Array.from({ length: 2 * tickRadius + 1 }, (_, i) => (i - tickRadius) * tickStep);
  const vEnd = { x: v.x, y: v.y };
  const AvEnd = { x: Av.x, y: Av.y };
  const inPlane = (p: Vec2) => Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= span && Math.abs(p.y) <= span;
  const click = (e: MouseEvent<SVGSVGElement>) => {
    if (!onAnglePick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPixel = ((e.clientX - rect.left) / rect.width) * W;
    const yPixel = ((e.clientY - rect.top) / rect.height) * H;
    const x = ((xPixel - M.l) / pw) * 2 * span - span;
    const y = span - ((yPixel - M.t) / ph) * 2 * span;
    if (Math.abs(x) + Math.abs(y) > 0.01 && xPixel > M.l && xPixel < W - M.r && yPixel > M.t && yPixel < H - M.b) onAnglePick(angleOf({ x, y }));
  };
  void A;
  return <svg viewBox={`0 0 ${W} ${H}`} className={styles.plot} role="img" aria-label="Interactive coordinate plane showing a test vector, its matrix-transformed image, and real eigenvector directions. Click the plane to choose a vector direction." onClick={click}>
    <defs><clipPath id={clip}><rect x={M.l} y={M.t} width={pw} height={ph} /></clipPath></defs>
    <rect x={M.l} y={M.t} width={pw} height={ph} fill="var(--ma4-plot-bg)" rx="10" />
    {grid.map((t) => <g key={`grid${t}`}>
      <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} className={t === 0 ? styles.axis : styles.gridLine} />
      <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} className={t === 0 ? styles.axis : styles.gridLine} />
      {t !== 0 && <><text x={sx(t)} y={H - M.b + 18} className={styles.tick} textAnchor="middle">{t}</text><text x={M.l - 8} y={sy(t) + 4} className={styles.tick} textAnchor="end">{t}</text></>}
    </g>)}
    <g clipPath={`url(#${clip})`}>
      {showEigen && eigLines}
      {symmetricMode && <text x={W - M.r - 5} y={M.t + 18} textAnchor="end" className={styles.noteOnPlot}>SYMMETRIC MODE</text>}
      {inPlane(vEnd) && <VectorArrow start={{ x: sx(0), y: sy(0) }} end={{ x: sx(vEnd.x), y: sy(vEnd.y) }} color={matched ? "#15803d" : "#2563eb"} label="v" />}
      {inPlane(AvEnd) && <VectorArrow start={{ x: sx(0), y: sy(0) }} end={{ x: sx(AvEnd.x), y: sy(AvEnd.y) }} color="#ea580c" label="Av" width={3} />}
      {matched && inPlane(vEnd) && <circle cx={sx(v.x)} cy={sy(v.y)} r="7" fill="none" stroke="#15803d" strokeWidth="2" />}
    </g>
    <text x={W / 2} y={H - 5} className={styles.axisLabel} textAnchor="middle">x</text>
    <text x={12} y={H / 2} className={styles.axisLabel} textAnchor="middle" transform={`rotate(-90 12 ${H / 2})`}>y</text>
  </svg>;
}

export default function Ma4Sim() {
  const uid = useId().replace(/:/g, "");
  const [matrix, setMatrix] = useState<Matrix2>(INITIAL);
  const [matrixText, setMatrixText] = useState<Record<keyof Matrix2, string>>({ a: String(INITIAL.a), b: String(INITIAL.b), c: String(INITIAL.c), d: String(INITIAL.d) });
  const [angle, setAngle] = useState(-45);
  const [length, setLength] = useState(2.5);
  const [symmetricMode, setSymmetricMode] = useState(true);
  const [showEigen, setShowEigen] = useState(true);
  const [presetId, setPresetId] = useState("symmetric");
  const analysis = useMemo(() => analyseMatrix(matrix), [matrix]);
  const radians = (angle * Math.PI) / 180;
  const v = useMemo(() => ({ x: length * Math.cos(radians), y: length * Math.sin(radians) }), [length, radians]);
  const check = useMemo(() => testEigenvector(matrix, v), [matrix, v]);
  const eigenvectors = analysis.pairs.filter((p): p is { value: number; vector: Vec2; multiplicity: number } => p.vector !== null);
  const setEntry = (key: keyof Matrix2, raw: string) => {
    const n = raw.trim() === "" ? NaN : Number(raw);
    const paired = symmetricMode && (key === "b" || key === "c");
    setPresetId("custom");
    setMatrixText((old) => ({ ...old, [key]: raw, ...(paired ? { b: raw, c: raw } : {}) }));
    // Keep partially typed values such as "-" or "1." editable. Calculations update only
    // when the entry is a finite number inside the control's documented range.
    if (!Number.isFinite(n) || n < -5 || n > 5) return;
    setMatrix((old) => ({ ...old, [key]: n, ...(paired ? { b: n, c: n } : {}) }));
  };
  const choosePreset = (id: string) => {
    const p = PRESETS.find((q) => q.id === id);
    if (!p) return;
    setPresetId(id);
    const symmetric = Math.abs(p.A.b - p.A.c) < 1e-10;
    setSymmetricMode(symmetric);
    setMatrix({ ...p.A });
    setMatrixText({ a: String(p.A.a), b: String(p.A.b), c: String(p.A.c), d: String(p.A.d) });
    setAngle(-45);
    setLength(2.5);
  };
  const reset = () => choosePreset("symmetric");
  const preset = PRESETS.find((p) => p.id === presetId);
  const vectorMagnitude = Math.hypot(v.x, v.y);
  const projection = check.scalar;
  const av = multiplyVector(matrix, v);
  const eigenLines = eigenvectors;
  const matrixInputsValid = (Object.keys(matrixText) as Array<keyof Matrix2>).every((key) => {
    const n = matrixText[key].trim() === "" ? NaN : Number(matrixText[key]);
    return Number.isFinite(n) && n >= -5 && n <= 5;
  });
  const valid = matrixInputsValid && Object.values(matrix).every(Number.isFinite) && vectorMagnitude > 0;

  return <section className={styles.root} aria-label="Simulation: eigenvalues and eigenvectors">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>MATHEMATICS · MA-4 · INTERMEDIATE</p><h2>Eigenvalues &amp; Eigenvectors</h2><p className={styles.intro}>Find the directions a matrix preserves. Rotate a vector, watch its image, and discover the special scale factor.</p></div>
      <span className={styles.liveBadge}><span /> Live browser simulation</span>
    </header>

    <details className={styles.guide} open>
      <summary>How to explore this experiment</summary>
      <div className={styles.guideGrid}>
        <p><b>1 · Transform</b><br />The matrix sends your vector <i>v</i> to <i>Av</i>.</p>
        <p><b>2 · Rotate</b><br />Change the angle, or click the coordinate plane, to try a new direction.</p>
        <p><b>3 · Discover</b><br />An eigenvector keeps its line direction; its eigenvalue tells the signed scale.</p>
      </div>
      <p className={styles.formula}>Av = λv &nbsp; · &nbsp; det(A − λI) = 0</p>
    </details>

    <div className={styles.layout}>
      <aside className={`${styles.panel} ${styles.controls}`}>
        <div className={styles.sectionHead}><span>01</span><h3>Matrix &amp; vector</h3></div>
        <div className={styles.field}><label htmlFor={`${uid}-preset`}>Start from an example</label><select id={`${uid}-preset`} value={presetId} onChange={(e) => choosePreset(e.target.value)}>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}{presetId === "custom" && <option value="custom">Custom matrix</option>}</select>{preset && <p className={styles.hint}>{preset.note}</p>}</div>
        <div className={styles.matrixBlock} aria-label="Matrix A entries">
          <span className={styles.matrixLetter}>A =</span><div className={styles.matrixGrid}>
            {(["a", "b", "c", "d"] as const).map((key) => <label key={key} className={styles.matrixCell}><span>{key}</span><input aria-label={`Matrix entry ${key}`} type="number" min={-5} max={5} step="0.1" value={matrixText[key]} onChange={(e) => setEntry(key, e.target.value)} /></label>)}
          </div>
        </div>
        <label className={styles.checkLine}><input type="checkbox" checked={symmetricMode} onChange={(e) => { const on = e.target.checked; setSymmetricMode(on); setPresetId("custom"); if (on) { setMatrix((old) => ({ ...old, c: old.b })); setMatrixText((old) => ({ ...old, c: old.b })); } }} /> Symmetric matrix mode (b = c)</label>
        <div className={styles.field}><label htmlFor={`${uid}-angle`}>Test-vector angle: <strong>{formatNumber(angle, 0)}°</strong></label><input id={`${uid}-angle`} type="range" min={-180} max={180} step={1} value={angle} onChange={(e) => setAngle(Number(e.target.value))} /><div className={styles.rangeLabels}><span>−180°</span><span>0°</span><span>180°</span></div></div>
        <div className={styles.field}><label htmlFor={`${uid}-length`}>Vector length: <strong>{formatNumber(length, 1)}</strong></label><input id={`${uid}-length`} type="range" min={0.5} max={4} step={0.1} value={length} onChange={(e) => setLength(Number(e.target.value))} /></div>
        <label className={styles.checkLine}><input type="checkbox" checked={showEigen} onChange={(e) => setShowEigen(e.target.checked)} /> Show real eigenvector directions</label>
        <div className={styles.buttonRow}><button type="button" className={styles.primary} onClick={() => setAngle((a) => ((a + 15 + 180) % 360) - 180)}>Rotate +15°</button><button type="button" className={styles.secondary} onClick={reset}>Reset</button></div>
        {!valid && <p role="alert" className={styles.warning}>Finish entering every matrix value in the range −5 to 5, and keep the test vector non-zero. The plot uses the last valid matrix until entries are complete.</p>}
      </aside>

      <div className={styles.mainColumn}>
        <section className={styles.panel}>
          <div className={styles.sectionHead}><span>02</span><div><h3>Watch the transformation</h3><p>Click anywhere in the plane to choose a direction.</p></div></div>
          <div className={styles.plotWrap}><Plane A={matrix} v={v} Av={av} eigenvectors={eigenLines} matched={check.isEigenvector} showEigen={showEigen} symmetricMode={symmetricMode} onAnglePick={(a) => setAngle(clamp(Math.round(a), -180, 180))} /></div>
          <div className={styles.legend}><span><i className={styles.dotBlue} /> Test vector v</span><span><i className={styles.dotOrange} /> Image Av</span><span><i className={styles.linePurple} /> Eigenvector direction(s)</span></div>
        </section>
        <div className={styles.metrics}>
          <article className={styles.metric}><span>Test vector v</span><strong>({formatNumber(v.x)}, {formatNumber(v.y)})</strong></article>
          <article className={styles.metric}><span>Transformed vector Av</span><strong>({formatNumber(av.x)}, {formatNumber(av.y)})</strong></article>
          <article className={styles.metric}><span>det(A)</span><strong>{formatNumber(analysis.determinant)}</strong><small>{determinantLabel(analysis.determinant)}</small></article>
          <article className={styles.metric}><span>tr(A)</span><strong>{formatNumber(analysis.trace)}</strong><small>Sum of diagonal entries</small></article>
        </div>
        <section className={`${styles.panel} ${check.isEigenvector ? styles.resultSuccess : styles.resultNeutral}`} aria-live="polite">
          <div className={styles.sectionHead}><span>03</span><h3>What does this vector tell us?</h3></div>
          {check.isEigenvector && projection !== null ? <>
            <p className={styles.resultTitle}>Eigenvector direction found</p>
            <p>The transformed vector is parallel to the input vector (within numerical tolerance). For this vector, <b>Av ≈ {formatNumber(projection)}v</b>.</p>
            <p className={styles.formula}>λ ≈ {formatNumber(projection)} · {Math.abs(projection) < 1e-8 ? "the vector is mapped to the zero vector" : projection < 0 ? "the direction is reversed" : "the direction is preserved"}</p>
          </> : <>
            <p className={styles.resultTitle}>Not an eigenvector direction yet</p>
            <p>Here, <b>v</b> and <b>Av</b> are not parallel. Rotate the test vector and watch for their directions to line up (the image may point the opposite way).</p>
          </>}
          <div className={styles.pairGrid}>
            <div><h4>Real eigenvalues</h4>{analysis.real && analysis.pairs.length ? <div className={styles.pairChips}>{analysis.pairs.map((p, i) => <span key={`${p.value}-${i}`}>λ{i + 1} = {formatNumber(p.value, 4)}</span>)}</div> : <p>No real eigenvalues for this matrix, so no real eigenvector line can be shown.</p>}</div>
            <div><h4>Matrix facts</h4><p>Characteristic discriminant: <b>{formatNumber(analysis.discriminant, 4)}</b></p><p>{Math.abs(analysis.determinant) < 1e-8 ? "The matrix is singular: at least one eigenvalue is zero." : `The product of the eigenvalues equals det(A) = ${formatNumber(analysis.determinant)}.`}</p></div>
          </div>
          {analysis.scalarMatrix && <p className={styles.hint}>Special case: this is a scalar multiple of the identity matrix. Every non-zero vector is an eigenvector direction with the same eigenvalue.</p>}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHead}><span>04</span><h3>Try these guided challenges</h3></div>
          <ol className={styles.challengeList}>
            <li><b>Diagonal scaling:</b> choose “Diagonal scaling”. Which directions remain unchanged? Read the two eigenvalues.</li>
            <li><b>Negative eigenvalue:</b> choose “Reflection across x-axis”. Try a vector on the y-axis. What does λ = −1 mean?</li>
            <li><b>No real eigenvectors:</b> choose “Rotation by 90°”. Why do no real directions line up with their images?</li>
            <li><b>PCA connection:</b> enable symmetric mode and compare the two highlighted axes. Why is orthogonality useful?</li>
          </ol>
        </section>
      </div>
    </div>
    <footer className={styles.footer}>Simulation honesty: matrix products and eigen-analysis are computed live in your browser. Numerical alignment uses a small tolerance, so displayed values are rounded.</footer>
  </section>;
}

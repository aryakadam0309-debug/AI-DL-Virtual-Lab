"use client";

import { useEffect, useId, useMemo, useState } from "react";
import styles from "./classNames";
import ErrorPlot from "./errorplot";
import FunctionPlot from "./functionplot";
import { PRESETS, bisection, digits, fmt, fmtErr, newton, sub, type NewtonStep, type Status } from "./numeric";

type Method = "both" | "bisection" | "newton";
const parse = (s: string) => (s.trim() === "" ? NaN : Number(s));

const LABEL: Record<Status, string> = {
  converged: "Converged", "max-iter": "Iteration limit reached", "zero-derivative": "Failed: zero derivative",
  cycle: "Failed: cycling", diverged: "Failed: diverged", "no-bracket": "Cannot start: no sign change",
};

function explain(kind: "bis" | "newt", status: Status, count: number, lastX: number | null, id: string) {
  switch (status) {
    case "no-bracket": return "f(a) and f(b) have the same sign, so a root is not guaranteed between them. Choose a and b where f changes sign.";
    case "zero-derivative": return `f′(x) = 0 at x = ${fmt(lastX, 3)}. The tangent is horizontal and never crosses the axis, so the update would divide by zero.`;
    case "cycle": return "The iterates return to a value already visited, so Newton-Raphson repeats the same loop forever. Bisection does not have this problem.";
    case "diverged": return `The iterate flew off to ${fmt(lastX, 3)}. A nearly flat tangent throws the next guess far away.`;
    case "max-iter": return "Reached the iteration limit before the step fell below the tolerance.";
    default: {
      let t = kind === "bis" ? `Interval narrower than the tolerance after ${count} steps.` : `Last step smaller than the tolerance after ${count} steps.`;
      if (kind === "newt" && id === "repeated") t += " Because f′(r) = 0 at a repeated root, convergence is only linear: the error roughly halves each step instead of squaring.";
      return t;
    }
  }
}

function newtonStory(s: NewtonStep, n: number, done: boolean, status: Status) {
  if (s.next === null) {
    if (!done) return "";
    return status === "converged"
      ? `Finished! x${sub(n)} = ${fmt(s.x, 8)}. The curve's height here is f = ${fmt(s.fx, 6)}, essentially zero, so this x is (almost exactly) a root.`
      : "The method had to stop at this point. The explanation is just below.";
  }
  const first = n === 0 ? `This is just your starting guess, x${sub(0)} = ${fmt(s.x, 6)}. ` : `Current guess: x${sub(n)} = ${fmt(s.x, 6)}. `;
  return (
    first +
    `Height of the curve there: f = ${fmt(s.fx, 6)}. Slope of the curve there: f′ = ${fmt(s.dfx, 6)}. ` +
    `Draw the tangent line (the orange line) and slide along it down to the axis. It lands at ` +
    `x${sub(n + 1)} = ${fmt(s.x, 6)} − (${fmt(s.fx, 6)}) / (${fmt(s.dfx, 6)}) = ${fmt(s.next, 6)}. ` +
    `That is the next guess (the orange triangle). Press Step to jump there.`
  );
}

export default function Ma2Sim() {
  const uid = useId();
  const [pid, setPid] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === pid)!;
  const [sa, setSa] = useState(String(PRESETS[0].a));
  const [sb, setSb] = useState(String(PRESETS[0].b));
  const [sx0, setSx0] = useState(String(PRESETS[0].x0));
  const [k, setK] = useState(6);
  const [method, setMethod] = useState<Method>("both");
  const [n, setN] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.5);

  const a = parse(sa), b = parse(sb), x0 = parse(sx0), tol = 10 ** -k;
  const valid = [a, b, x0].every(Number.isFinite);
  const bis = useMemo(() => (valid ? bisection(preset, a, b, tol) : null), [valid, preset, a, b, tol]);
  const newt = useMemo(() => (valid ? newton(preset, x0, tol) : null), [valid, preset, x0, tol]);

  const showB = method !== "newton", showN = method !== "bisection";
  const lastB = bis ? bis.steps.length : 0, lastN = newt ? newt.steps.length - 1 : 0;
  const maxN = Math.max(showB ? lastB : 0, showN ? lastN : 0);
  const cur = Math.min(n, maxN);
  const nB = Math.min(cur, lastB), nN = Math.min(cur, lastN);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setN((v) => Math.min(v + 1, maxN)), 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed, maxN]);
  useEffect(() => { if (playing && cur >= maxN) setPlaying(false); }, [playing, cur, maxN]);

  const edit = (fn: () => void) => { fn(); setN(0); setPlaying(false); };
  const pick = (id: string) => {
    const p = PRESETS.find((q) => q.id === id)!;
    edit(() => { setPid(id); setSa(String(p.a)); setSb(String(p.b)); setSx0(String(p.x0)); });
  };

  const bSteps = bis?.steps ?? [], nSteps = newt?.steps ?? [];
  const sB = nB > 0 ? bSteps[nB - 1] : null, sN = nSteps[nN];
  const lo = sB ? sB.na : Math.min(a, b), hi = sB ? sB.nb : Math.max(a, b);
  const doneB = bis && cur >= lastB, doneN = newt && cur >= lastN;
  const dig = (e: number | undefined) => (e === undefined ? "—" : `≈ ${digits(e).toFixed(1)}`);

  const rows = Array.from({ length: cur + 1 }, (_, i) => ({
    i, bs: i === 0 ? null : bSteps[i - 1] ?? null, ns: nSteps[i] ?? null,
  }));
  const cols = (showB ? 4 : 0) + (showN ? 3 : 0);

  return (
    <section className={styles.root} aria-label="Simulation: bisection and Newton-Raphson">
      <div className={styles.head}>
        <p className={styles.eyebrow}>Numerical methods / Experiment 02</p>
        <h2>Bisection and Newton-Raphson Simulation</h2>
        <p>Both methods hunt for the point where f(x) = 0. Step through them and compare how fast the error shrinks.</p>
      </div>

      <details className={styles.guide}>
        <summary>Short Summary</summary>
        <ol>
          <li><strong>The goal:</strong> find the <em>root</em>, the x where f(x) = 0. On the graph, that is where the curve crosses the horizontal axis.</li>
          <li><strong>Make a guess</strong> x₀. It does not need to be good.</li>
          <li>Go straight up or down to the curve, and draw the <strong>tangent line</strong>: the straight line that touches the curve there with the same slope.</li>
          <li>Follow that line to where it hits the axis. That x is your <strong>new, usually better, guess</strong> x₁.</li>
          <li><strong>Repeat.</strong> Each round the guess lands closer to the root.</li>
        </ol>
        <p className={styles.formula}>xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)</p>
        <p className={styles.hint}>
          f(xₙ) is the curve's height at your guess and f′(xₙ) is its slope. Try it: choose <strong>Newton-Raphson</strong> under “Show”, then press <strong>Step</strong> repeatedly and watch the orange line.
          The other equations in the dropdown show when the method fails.
        </p>
      </details>

      <div className={styles.grid}>
        <div className={`${styles.panel} ${styles.setup}`}>
          <div className={styles.field}>
            <label htmlFor={`${uid}p`}>Equation</label>
            <select id={`${uid}p`} value={pid} onChange={(e) => pick(e.target.value)}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <p className={styles.hint}>{preset.hint}</p>
          </div>
          <div className={styles.row3}>
            <div className={styles.field}><label htmlFor={`${uid}a`}>Bisection a</label>
              <input id={`${uid}a`} type="number" step="any" value={sa} onChange={(e) => edit(() => setSa(e.target.value))} /></div>
            <div className={styles.field}><label htmlFor={`${uid}b`}>Bisection b</label>
              <input id={`${uid}b`} type="number" step="any" value={sb} onChange={(e) => edit(() => setSb(e.target.value))} /></div>
            <div className={styles.field}><label htmlFor={`${uid}x`}>Newton start x₀</label>
              <input id={`${uid}x`} type="number" step="any" value={sx0} onChange={(e) => edit(() => setSx0(e.target.value))} /></div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${uid}t`}>Tolerance: 1e-{k}</label>
            <input id={`${uid}t`} type="range" min={1} max={16} value={k} onChange={(e) => edit(() => setK(+e.target.value))} />
            <p className={styles.hint}>
              {k >= 16 ? "Below double-precision resolution (about 2×10⁻¹⁶): the error curve flattens and the method may stop at that limit." : "Stops when the step is smaller than the tolerance."}
            </p>
          </div>
          <fieldset className={styles.radios}>
            <legend>Show</legend>
            {([["both", "Both"], ["bisection", "Bisection"], ["newton", "Newton-Raphson"]] as const).map(([v, l]) => (
              <label key={v}><input type="radio" name={`${uid}m`} checked={method === v} onChange={() => { setMethod(v); setPlaying(false); }} /> {l}</label>
            ))}
          </fieldset>
          {!valid && <p role="alert" className={styles.warn}>Enter a number in every field.</p>}
        </div>

        <div className={styles.plots}>
          <div className={styles.chartHeading}><span className={styles.chartIndex}>01</span><h3>Function and iterates</h3></div>
          <FunctionPlot preset={preset} a={a} b={b} showB={showB && valid} showN={showN && valid}
            bis={bSteps.slice(0, nB)} newt={nSteps.slice(0, nN + 1)} onPick={(x) => edit(() => setSx0(String(x)))} />
          {showN && <p className={styles.hint}>Click the graph to set the Newton start point x₀.</p>}
          <div className={styles.legend}>
            <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.curve} /></svg> The function f(x)</span>
            <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.rootLine} /></svg> True root (the answer)</span>
            {showN && <>
              <span><svg width="30" height="10" aria-hidden="true"><circle cx="15" cy="5" r="4.5" className={styles.newDot} /></svg> Current guess, on the curve</span>
              <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.tangent} /></svg> Tangent line</span>
              <span><svg width="30" height="10" aria-hidden="true"><polygon points="15,0 9,10 21,10" className={styles.nextMark} /></svg> Next guess, on the axis</span>
              <span><svg width="30" height="10" aria-hidden="true"><circle cx="15" cy="5" r="3" className={styles.hist} /></svg> Earlier guesses</span>
            </>}
            {showB && <>
              <span><svg width="30" height="10" aria-hidden="true"><rect x="0" y="0" width="30" height="10" className={styles.band} /></svg> Bisection interval (root is inside)</span>
              <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.mid} /></svg> Bisection midpoint</span>
            </>}
          </div>
          <div className={styles.bar}>
            <button type="button" className={styles.btn} onClick={() => { setN(0); setPlaying(false); }} disabled={cur === 0}>Reset</button>
            <button type="button" className={styles.btn} onClick={() => { setPlaying(false); setN(Math.max(cur - 1, 0)); }} disabled={cur === 0}>Back</button>
            <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={maxN === 0}
              onClick={() => { if (playing) setPlaying(false); else { if (cur >= maxN) setN(0); setPlaying(true); } }}>
              {playing ? "Pause" : cur >= maxN && maxN > 0 ? "Replay" : "Play"}
            </button>
            <button type="button" className={styles.btn} onClick={() => { setPlaying(false); setN(Math.min(cur + 1, maxN)); }} disabled={cur >= maxN}>Step</button>
            <label className={styles.inline}>Speed
              <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
          </div>
          <div className={styles.bar}>
            <label htmlFor={`${uid}s`}>Iteration</label>
            <input id={`${uid}s`} className={styles.scrub} type="range" min={0} max={maxN} value={cur} disabled={maxN === 0}
              onChange={(e) => { setPlaying(false); setN(+e.target.value); }} />
            <span>{cur} / {maxN}</span>
          </div>
          <div className={styles.chartHeading}><span className={styles.chartIndex}>02</span><h3>Error convergence</h3></div>
          <ErrorPlot bis={bSteps} newt={nSteps} nB={nB} nN={nN} showB={showB} showN={showN} cur={cur} maxN={maxN} />
          <div className={styles.legend}>
            {showB && <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.serB} /><rect x="11" y="1" width="8" height="8" className={styles.mkB} /></svg> Bisection (dashed, squares)</span>}
            {showN && <span><svg width="30" height="10" aria-hidden="true"><line x1="0" y1="5" x2="30" y2="5" className={styles.serN} /><circle cx="15" cy="5" r="4.5" className={styles.mkN} /></svg> Newton-Raphson (solid, circles)</span>}
          </div>
          <p className={styles.hint}>
            <strong>What is plotted:</strong> the <em>error</em> = how far the current guess is from the true root, |xₙ − root|, at each iteration. <strong>Lower is better.</strong> A straight line means the error shrinks by a constant factor each step (linear). A curve that drops faster and faster means the number of correct digits roughly <strong>doubles</strong> each step (quadratic), which is Newton-Raphson's superpower.
          </p>
        </div>

        <div className={styles.read} aria-live="polite">
          {showB && (
            <div className={`${styles.card} ${styles.cardB}`}>
              <h3>Bisection</h3>
              <dl className={styles.dl}>
                <dt>Midpoint c</dt><dd>{sB ? fmt(sB.c, 8) : "—"}</dd>
                <dt>Interval</dt><dd>[{fmt(lo, 5)}, {fmt(hi, 5)}]</dd>
                <dt>Width = (b−a)/2ⁿ</dt><dd>{bis && bis.status !== "no-bracket" ? fmtErr(hi - lo) : "—"}</dd>
                <dt>Error</dt><dd>{fmtErr(sB?.err)}</dd>
                <dt>Correct digits</dt><dd>{dig(sB?.err)}</dd>
              </dl>
              <p className={styles.status}><strong>{doneB && bis ? LABEL[bis.status] : `Step ${nB} of ${lastB}`}.</strong>{" "}
                {doneB && bis ? explain("bis", bis.status, lastB, null, pid) : ""}</p>
            </div>
          )}
          {showN && sN && (
            <div className={`${styles.card} ${styles.cardN}`}>
              <h3>Newton-Raphson</h3>
              <p className={styles.story}>{newtonStory(sN, nN, !!doneN, newt?.status ?? "max-iter")}</p>
              <dl className={styles.dl}>
                <dt>x{sub(nN)}</dt><dd>{fmt(sN.x, 8)}</dd>
                <dt>f(x{sub(nN)})</dt><dd>{fmt(sN.fx, 6)}</dd>
                <dt>f′(x{sub(nN)})</dt><dd>{fmt(sN.dfx, 6)}</dd>
                <dt>Error</dt><dd>{fmtErr(sN.err)}</dd>
                <dt>Correct digits</dt><dd>{dig(sN.err)}</dd>
              </dl>
              <p className={styles.hint}>Correct digits ≈ −log₁₀(error). An error of 1e-6 means about 6 correct digits.</p>
              <p className={styles.status}><strong>{doneN && newt ? LABEL[newt.status] : `Step ${nN} of ${lastN}`}.</strong>{" "}
                {doneN && newt ? explain("newt", newt.status, lastN, sN.x, pid) : ""}</p>
            </div>
          )}
        </div>

        <div className={styles.tableWrap}>
          <h3>Step table</h3>
          <p className={styles.hint}>One row per iteration. Each row is one round of “guess, draw tangent, slide to the axis”. The highlighted row is the step you are on.</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr><th rowSpan={2}>n</th>
                  {showB && <th colSpan={4}>Bisection</th>}
                  {showN && <th colSpan={3}>Newton-Raphson</th>}</tr>
                <tr>{showB && <><th>a</th><th>b</th><th>c</th><th>error</th></>}
                  {showN && <><th>xₙ</th><th>f(xₙ)</th><th>error</th></>}</tr>
              </thead>
              <tbody>
                {rows.map(({ i, bs, ns }) => (
                  <tr key={i} className={i === cur ? styles.cur : undefined}>
                    <td>{i}</td>
                    {showB && (i === 0
                      ? <><td>{fmt(Math.min(a, b), 5)}</td><td>{fmt(Math.max(a, b), 5)}</td><td>—</td><td>—</td></>
                      : <><td>{fmt(bs?.a, 5)}</td><td>{fmt(bs?.b, 5)}</td><td>{fmt(bs?.c, 6)}</td><td>{fmtErr(bs?.err)}</td></>)}
                    {showN && <><td>{fmt(ns?.x, 6)}</td><td>{fmt(ns?.fx, 5)}</td><td>{fmtErr(ns?.err)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className={styles.glossary}>
            <summary>What do the columns mean?</summary>
            <ul>
              <li><strong>n</strong>: the step number (0 is your starting guess).</li>
              {showN && <>
                <li><strong>xₙ</strong> (Newton): the guess at step n. The next one is xₙ − f(xₙ)/f′(xₙ).</li>
                <li><strong>f(xₙ)</strong> (Newton): the curve's height at that guess. Getting close to 0 means getting close to the root.</li>
                <li><strong>error</strong> (Newton): distance from the guess to the true root.</li>
              </>}
              {showB && <>
                <li><strong>a, b</strong> (Bisection): the ends of the interval that surely contains the root.</li>
                <li><strong>c</strong> (Bisection): the midpoint (a+b)/2. Its sign of f decides which half to keep.</li>
                <li><strong>error</strong> (Bisection): distance from c to the true root.</li>
              </>}
            </ul>
          </details>
          <span hidden>{cols}</span>
        </div>
      </div>
    </section>
  );
}

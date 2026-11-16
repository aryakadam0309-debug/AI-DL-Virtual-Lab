"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./st3sim.module.css";
import { classNames } from "./classNames";
import {
  POPULATION_SIZE,
  STUDY_COUNT,
  TOWN_TEA_COUNT,
  countTea,
  formatFixed,
  makeTown,
  proportionZTest,
  runStudies,
  sampleIndices,
} from "./hypothesisMath";
import { PopulationGrid } from "./populationGrid";
import { RichText, Term } from "./richText";
import { SampleTray, SurpriseMeter } from "./sampleTray";
import {
  COPY,
  DEFAULT_SAMPLE_SIZE,
  DEFAULT_STRICTNESS,
  DEFAULT_TOWN,
  NOTES,
  SAMPLE_SIZES,
  STEPS,
  STRICTNESS,
  TOWNS,
  alphaOf,
  callComparison,
  outcomeCopy,
  outcomeOf,
  strictnessLabel,
  studiesCaption,
  truthLine,
  verdictCopy,
} from "./steps";
import { Call, HistoryEntry, Preference, SampleSize, StepNumber, StrictnessId, TownKind } from "./types";

export interface St3SimProps {
  /** Link target for "← Back to theory". Defaults to "/". */
  backHref?: string;
  /** Extra class name for the root element. */
  className?: string;
}

/** Counts from 1 to `total`, one step every `msPer` ms, driven by animation frames so slow frames catch up. */
function animateCount(total: number, msPer: number, onTick: (count: number) => void, onDone: () => void): () => void {
  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const count = Math.min(total, Math.floor((now - start) / msPer) + 1);
    if (count >= total) {
      onDone();
      return;
    }
    onTick(count);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------- small building blocks ----------

interface ChoiceOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface ChoiceGroupProps<T extends string | number> {
  legend: ReactNode;
  hint?: ReactNode;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** "segmented" = one row of equal buttons, "stacked" = one option per line. */
  variant?: "segmented" | "stacked";
}

function ChoiceGroup<T extends string | number>({
  legend,
  hint,
  options,
  value,
  onChange,
  disabled,
  variant = "segmented",
}: ChoiceGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.field} disabled={disabled}>
      <legend className={styles.fieldLabel}>{legend}</legend>
      <div className={variant === "segmented" ? styles.segmented : styles.stacked}>
        {options.map((opt) => (
          <label key={String(opt.value)} className={styles.choice}>
            <input
              type="radio"
              className={styles.srOnly}
              name={name}
              value={String(opt.value)}
              checked={opt.value === value}
              onChange={() => onChange(opt.value)}
            />
            <span className={styles.choiceFace}>{opt.label}</span>
          </label>
        ))}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </fieldset>
  );
}

function Panel({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section className={classNames(styles.panel, className)} aria-labelledby={id}>
      <h2 id={id} className={styles.panelHeading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const sizeOptions: ChoiceOption<SampleSize>[] = SAMPLE_SIZES.map((n) => ({ value: n, label: String(n) }));
const strictOptions: ChoiceOption<StrictnessId>[] = STRICTNESS.map((s) => ({
  value: s.id,
  label: (
    <>
      {s.label} <span className={styles.choiceSub}>{Math.round(s.alpha * 100)}%</span>
    </>
  ),
}));
const townOptions: ChoiceOption<TownKind>[] = TOWNS.map((t) => ({ value: t.id, label: t.label }));

// ---------- main component ----------

export default function St3Sim({ backHref = "/", className }: St3SimProps) {
  const [step, setStep] = useState<StepNumber>(1);
  const [townKind, setTownKind] = useState<TownKind>(DEFAULT_TOWN);
  const [town, setTown] = useState<Preference[]>(() => makeTown(DEFAULT_TOWN, () => 0.5));
  const [sampleSize, setSampleSize] = useState<SampleSize>(DEFAULT_SAMPLE_SIZE);
  const [strictness, setStrictness] = useState<StrictnessId>(DEFAULT_STRICTNESS);
  const [sample, setSample] = useState<number[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [asking, setAsking] = useState(false);
  const [call, setCall] = useState<Call | null>(null);
  const [checked, setChecked] = useState(false);
  const [truthShown, setTruthShown] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [note, setNote] = useState<string>(NOTES.start);
  const [gridKey, setGridKey] = useState(0);

  const [studyTown, setStudyTown] = useState<TownKind>(DEFAULT_TOWN);
  const [studySize, setStudySize] = useState<SampleSize>(DEFAULT_SAMPLE_SIZE);
  const [studyStrictness, setStudyStrictness] = useState<StrictnessId>(DEFAULT_STRICTNESS);
  const [studies, setStudies] = useState<boolean[] | null>(null);
  const [studiesFilled, setStudiesFilled] = useState(0);

  const askTimer = useRef<(() => void) | null>(null);
  const studyTimer = useRef<(() => void) | null>(null);
  const historyId = useRef(0);

  // Random values can't be read while prerendering, so the real town is shuffled once after mount.
  useEffect(() => {
    setTown(makeTown(DEFAULT_TOWN, Math.random));
  }, []);

  const stopAsk = () => {
    askTimer.current?.();
    askTimer.current = null;
  };
  const stopStudies = () => {
    studyTimer.current?.();
    studyTimer.current = null;
  };
  useEffect(
    () => () => {
      stopAsk();
      stopStudies();
    },
    [],
  );

  const alpha = alphaOf(strictness);
  const sampleDone = sample !== null && !asking && revealed >= sample.length;
  const answers = useMemo(() => (sample ? sample.map((i) => town[i] ?? "coffee") : null), [sample, town]);
  const samplePosition = useMemo(() => new Map((sample ?? []).map((idx, pos) => [idx, pos])), [sample]);
  const result = useMemo(
    () => (sample && sampleDone ? proportionZTest(countTea(town, sample), sample.length, alpha) : null),
    [sample, sampleDone, town, alpha],
  );
  const claimTrue = townKind === "right";

  // ---------- actions ----------

  const clearSample = () => {
    stopAsk();
    setSample(null);
    setRevealed(0);
    setAsking(false);
    setCall(null);
    setChecked(false);
    setTruthShown(false);
  };

  const startOver = () => {
    clearSample();
    stopStudies();
    setStep(1);
    setTownKind(DEFAULT_TOWN);
    setTown(makeTown(DEFAULT_TOWN, Math.random));
    setSampleSize(DEFAULT_SAMPLE_SIZE);
    setStrictness(DEFAULT_STRICTNESS);
    setHistory([]);
    setStudies(null);
    setStudiesFilled(0);
    setGridKey((k) => k + 1);
    setNote(NOTES.startOver);
  };

  const chooseTown = (kind: TownKind) => {
    setTownKind(kind);
    setTown(makeTown(kind, Math.random));
    setHistory([]);
    setNote(NOTES.town(kind));
  };

  const changeSampleSize = (n: SampleSize) => {
    setSampleSize(n);
    if (step === 2 && !sample) {
      setNote(NOTES.size(n));
      return;
    }
    clearSample();
    setStep(2);
    setNote(NOTES.sizeReset(n));
  };

  const changeStrictness = (id: StrictnessId) => {
    setStrictness(id);
    setNote(NOTES.strictness(id));
  };

  const ask = () => {
    stopAsk();
    const idx = sampleIndices(POPULATION_SIZE, sampleSize, Math.random);
    const n = idx.length;
    const tea = countTea(town, idx);
    setSample(idx);
    setCall(null);
    setChecked(false);
    setTruthShown(false);

    const finish = () => {
      stopAsk();
      setRevealed(n);
      setAsking(false);
      historyId.current += 1;
      const entry = { id: historyId.current, tea, n };
      setHistory((h) => [entry, ...h].slice(0, 8));
      setNote(NOTES.asked(n, tea));
    };

    if (prefersReducedMotion()) {
      finish();
      return;
    }
    setAsking(true);
    setRevealed(0);
    setNote(NOTES.asking(n));
    askTimer.current = animateCount(n, Math.min(25, 1500 / n), setRevealed, () => {
      askTimer.current = null;
      finish();
    });
  };

  const chooseCall = (c: Call) => {
    setCall(c);
    setNote(NOTES.call(c));
  };

  const check = () => {
    setChecked(true);
    setNote(NOTES.check);
  };

  const reveal = () => {
    setTruthShown(true);
    setNote(NOTES.reveal);
  };

  const goTo = (next: StepNumber) => {
    setStep(next);
    if (next === 2) setNote(NOTES.letsTest);
    if (next === 5) {
      setStudyTown(townKind);
      setStudySize(sampleSize);
      setStudyStrictness(strictness);
      setStudies(null);
      setStudiesFilled(0);
      setNote(NOTES.toStep5);
    }
  };

  const clearStudies = () => {
    stopStudies();
    setStudies(null);
    setStudiesFilled(0);
    setNote(NOTES.studySettings);
  };

  const runAll = () => {
    stopStudies();
    const res = runStudies(studyTown, studySize, alphaOf(studyStrictness), Math.random, STUDY_COUNT);
    setStudies(res);
    setNote(NOTES.running(studySize, studyStrictness));
    setStudiesFilled(res.length);
  };

  // ---------- derived copy ----------

  const studiesDone = studies !== null && studiesFilled >= studies.length;
  const studiesRunning = studies !== null && !studiesDone;
  const decideAtCurrent = (tea: number, n: number) => proportionZTest(tea, n, alpha).doubt;
  const verdict = result ? verdictCopy(result.doubt, result.pValue, alpha) : null;
  const outcome = result ? outcomeCopy(outcomeOf(claimTrue, result.doubt), alpha) : null;
  const townTea = TOWN_TEA_COUNT[townKind];
  const current = STEPS[step - 1] ?? STEPS[0]!;
  const stepTitleId = useId();

  // ---------- render pieces ----------

  const nextButton = (to: StepNumber) => (
    <button type="button" className={styles.primary} onClick={() => goTo(to)}>
      {COPY.next(STEPS[to - 1]?.title ?? "")} →
    </button>
  );

  const stepBody = () => {
    switch (step) {
      case 1:
        return (
          <>
            <details className={styles.setup}>
              <summary>{COPY.setup}</summary>
              <ChoiceGroup
                legend={COPY.townQuestion}
                variant="stacked"
                options={townOptions}
                value={townKind}
                onChange={chooseTown}
              />
            </details>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => goTo(2)}>
                {COPY.letsTest}
              </button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <ChoiceGroup
              legend={COPY.sizeQuestion}
              options={sizeOptions}
              value={sampleSize}
              onChange={changeSampleSize}
              disabled={asking}
            />
            <div className={styles.actions}>
              {sampleDone ? (
                <>
                  {nextButton(3)}
                  <button type="button" className={styles.secondary} onClick={ask}>
                    {COPY.askAgain}
                  </button>
                </>
              ) : (
                <button type="button" className={styles.primary} onClick={ask} disabled={asking}>
                  {asking ? COPY.asking : COPY.ask}
                </button>
              )}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className={styles.callRow} role="group" aria-label="Your gut feeling">
              {(["doubt", "keep"] as Call[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={classNames(styles.callButton, call === c && styles.callChosen)}
                  aria-pressed={call === c}
                  disabled={checked}
                  onClick={() => chooseCall(c)}
                >
                  {c === "doubt" ? COPY.callDoubt : COPY.callKeep}
                </button>
              ))}
            </div>
            <ChoiceGroup
              legend={COPY.strictQuestion}
              hint={COPY.strictTech}
              options={strictOptions}
              value={strictness}
              onChange={changeStrictness}
            />
            {!checked && (
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={check} disabled={!call}>
                  {COPY.check}
                </button>
              </div>
            )}
            <div aria-live="polite">
              {checked && result && verdict && call && (
                <>
                  <SurpriseMeter pValue={result.pValue} alpha={alpha} />
                  <div className={classNames(styles.verdict, result.doubt && styles.verdictDoubt)}>
                    <p className={styles.verdictHeading}>
                      <RichText parts={verdict.heading} />
                    </p>
                    <p className={styles.verdictBody}>{verdict.body}</p>
                  </div>
                  <p className={styles.compare}>{callComparison(call, result.doubt)}</p>
                </>
              )}
            </div>
            {checked && <div className={styles.actions}>{nextButton(4)}</div>}
          </>
        );
      case 4:
        return (
          <>
            {!truthShown && (
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={reveal}>
                  {COPY.reveal}
                </button>
              </div>
            )}
            <div aria-live="polite">
              {truthShown && outcome && (
                <div className={classNames(styles.stamp, outcome.good ? styles.stampGood : styles.stampBad)}>
                  <p className={styles.stampHeading}>
                    <RichText parts={outcome.heading} />
                  </p>
                  <p className={styles.verdictBody}>{outcome.body}</p>
                  <p className={styles.stampTruth}>{truthLine(townTea, POPULATION_SIZE)}</p>
                </div>
              )}
            </div>
            {truthShown && <div className={styles.actions}>{nextButton(5)}</div>}
          </>
        );
      case 5:
        return (
          <>
            <ChoiceGroup
              legend={COPY.townQuestion}
              variant="stacked"
              options={townOptions}
              value={studyTown}
              disabled={studiesRunning}
              onChange={(v) => {
                setStudyTown(v);
                clearStudies();
              }}
            />
            <ChoiceGroup
              legend={COPY.sizeQuestion}
              options={sizeOptions}
              value={studySize}
              disabled={studiesRunning}
              onChange={(v) => {
                setStudySize(v);
                clearStudies();
              }}
            />
            <ChoiceGroup
              legend={COPY.strictQuestion}
              hint={COPY.strictTech}
              options={strictOptions}
              value={studyStrictness}
              disabled={studiesRunning}
              onChange={(v) => {
                setStudyStrictness(v);
                clearStudies();
              }}
            />
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={runAll} disabled={studiesRunning}>
                {studiesRunning ? COPY.running : studies ? COPY.runAgain : COPY.run}
              </button>
            </div>
          </>
        );
    }
  };

  const settingRow = (label: ReactNode, value: ReactNode) => (
    <div className={styles.settingRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.settingValue}>{value}</span>
    </div>
  );

  const townValue = truthShown || step === 5 ? truthLine(townTea, POPULATION_SIZE) : COPY.hiddenTown;
  const sizeEditable = step === 3 || step === 4;
  const strictEditable = step === 4;

  const doubtedCount = studies ? studies.filter(Boolean).length : 0;

  return (
    <div className={classNames(styles.root, className)}>
      <div className={styles.container}>
        <header className={styles.topbar}>
          <a href={backHref} className={styles.back}>
            {COPY.back}
          </a>
          <button type="button" className={styles.secondary} onClick={startOver}>
            {COPY.startOver}
          </button>
        </header>

        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{COPY.title}</h1>
          <p className={styles.subtitle}>{COPY.subtitle}</p>
        </div>

        <nav aria-label="Steps">
          <ol className={styles.stepBar}>
            {STEPS.map((s) => {
              const state = s.n < step ? "done" : s.n === step ? "current" : "future";
              return (
                <li
                  key={s.n}
                  className={classNames(
                    styles.stepItem,
                    state === "done" && styles.stepDone,
                    state === "current" && styles.stepCurrent,
                  )}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className={styles.stepNum} aria-hidden="true">
                    {state === "done" ? "✓" : s.n}
                  </span>
                  <span className={styles.stepName}>
                    <span className={styles.srOnly}>
                      Step {s.n}
                      {state === "done" ? ", done" : ""}:{" "}
                    </span>
                    {s.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className={styles.layout}>
          <div className={styles.left}>
            <section className={classNames(styles.panel, styles.stepCard, styles.orderStep)} aria-labelledby={stepTitleId}>
              <p className={styles.stepKicker}>Step {step} of 5</p>
              <h2 id={stepTitleId} className={styles.stepTitle}>
                {current.title}
              </h2>
              <p className={styles.stepText}>{current.text}</p>
              {stepBody()}
              <p className={styles.note} aria-live="polite">
                {note}
              </p>
            </section>

            <Panel title={COPY.settingsPanel} className={styles.orderSettings}>
              {settingRow("Town", townValue)}
              {sizeEditable ? (
                <ChoiceGroup
                  legend="Sample size"
                  hint={COPY.sizeResets}
                  options={sizeOptions}
                  value={sampleSize}
                  onChange={changeSampleSize}
                />
              ) : (
                settingRow("Sample size", `${sampleSize} people`)
              )}
              {strictEditable ? (
                <ChoiceGroup
                  legend={<Term plain="Strictness" tech="α" />}
                  hint={COPY.strictLive}
                  options={strictOptions}
                  value={strictness}
                  onChange={changeStrictness}
                />
              ) : (
                settingRow(<Term plain="Strictness" tech="α" />, strictnessLabel(strictness))
              )}
              {step === 5 && <p className={styles.hint}>{COPY.stepFiveSettings}</p>}
            </Panel>

            {step >= 3 && result && (
              <section className={classNames(styles.panel, styles.orderMaths)}>
                <details className={styles.maths}>
                  <summary className={styles.panelHeading}>{COPY.mathsSummary}</summary>
                  <table className={styles.table}>
                    <tbody>
                      <tr>
                        <th scope="row">Sample</th>
                        <td>
                          {result.tea} of {result.n} prefer tea
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Sample share (p̂)</th>
                        <td>{formatFixed(result.pHat, 4)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Claimed share (p₀)</th>
                        <td>{formatFixed(result.p0, 4)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Expected tea drinkers if the claim is true</th>
                        <td>{result.expected}</td>
                      </tr>
                      <tr>
                        <th scope="row">Standard error</th>
                        <td>√(p₀(1−p₀)/n) = {formatFixed(result.se, 4)}</td>
                      </tr>
                      <tr>
                        <th scope="row">z score</th>
                        <td>(p̂ − p₀) / standard error = {formatFixed(result.z, 4)}</td>
                      </tr>
                      <tr>
                        <th scope="row">p-value (two-sided)</th>
                        <td>{formatFixed(result.pValue, 4)}</td>
                      </tr>
                      <tr>
                        <th scope="row">Strictness (α)</th>
                        <td>{formatFixed(alpha, 2)}</td>
                      </tr>
                      <tr className={styles.decisionRow}>
                        <th scope="row">Decision</th>
                        <td>
                          {result.doubt
                            ? "p is below α, so we doubt the claim"
                            : "p is not below α, so not enough evidence to doubt the claim"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </details>
              </section>
            )}
          </div>

          <div className={styles.right}>
            <Panel title={COPY.townPanel} className={styles.orderTown}>
              <PopulationGrid
                key={gridKey}
                town={town}
                samplePosition={samplePosition}
                revealedCount={revealed}
                truthShown={truthShown}
              />
            </Panel>

            <Panel title={COPY.samplePanel} className={styles.orderSample}>
              <SampleTray
                answers={answers}
                revealedCount={revealed}
                expectedTea={Math.round(sampleSize * 0.5)}
                history={history}
                decide={decideAtCurrent}
              />
            </Panel>

            {step === 5 && (
              <Panel title={COPY.studiesPanel} className={styles.orderStudies}>
                <div aria-live="polite" className={styles.studyCaption}>
                  {studiesDone && studies && (
                    <>
                      <p className={styles.verdictBody}>
                        <RichText parts={studiesCaption(studyTown, doubtedCount, studies.length, alphaOf(studyStrictness))} />{" "}
                        {COPY.wobble}
                      </p>
                      <p className={styles.hint}>{COPY.biggerSamples}</p>
                    </>
                  )}
                  {!studies && <p className={styles.muted}>Press &quot;{COPY.run}&quot; to see how many studies catch the mistake.</p>}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { St3Sim };

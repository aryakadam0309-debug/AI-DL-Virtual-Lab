import { classNames } from "./classNames";
import { formatFixed, strictnessMark, surpriseFill, surpriseWord } from "./hypothesisMath";
import { RichText } from "./richText";
import { COPY } from "./steps";
import type { HistoryEntry, Preference } from "./types";
import { styles } from "./styles";

export interface SampleTrayProps {
  /** Answers of the sampled people, in the order they were asked. Null before any sample. */
  answers: readonly Preference[] | null;
  revealedCount: number;
  expectedTea: number;
  history: readonly HistoryEntry[];
  /** Decides "doubt" or "keep" for a history chip at the current strictness. */
  decide: (tea: number, n: number) => boolean;
}

/** Tea fills from the left and coffee from the right, so the strip ends up tea first, then coffee. */
function buildSlots(answers: readonly Preference[], revealed: number): (Preference | null)[] {
  const slots: (Preference | null)[] = new Array(answers.length).fill(null);
  let left = 0;
  let right = answers.length - 1;
  for (let i = 0; i < Math.min(revealed, answers.length); i++) {
    if (answers[i] === "tea") slots[left++] = "tea";
    else slots[right--] = "coffee";
  }
  return slots;
}

export function SampleTray({ answers, revealedCount, expectedTea, history, decide }: SampleTrayProps) {
  if (!answers) {
    return <p className={styles.muted}>{COPY.emptySample}</p>;
  }
  const n = answers.length;
  const done = revealedCount >= n;
  const tea = answers.filter((a) => a === "tea").length;
  const slots = buildSlots(answers, revealedCount);

  return (
    <div className={styles.tray}>
      <div aria-live="polite">
        {done ? (
          <>
            <p className={styles.trayResult}>
              {tea} of {n} prefer tea ({Math.round((tea / n) * 100)}%)
            </p>
            <p className={styles.trayExpect}>
              If the claim were true we&apos;d expect about {expectedTea} of {n}.
            </p>
          </>
        ) : (
          <p className={styles.trayExpect}>
            Asking… {Math.min(revealedCount, n)} of {n}
          </p>
        )}
      </div>

      <div className={styles.strip}>
        <p className={styles.stripLabel}>{COPY.expectedStrip}</p>
        <div className={styles.circles} role="img" aria-label={`Expected: ${expectedTea} tea and ${n - expectedTea} coffee`}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className={classNames(styles.circle, i < expectedTea ? styles.ghostTea : styles.ghostCoffee)} />
          ))}
        </div>
      </div>

      <div className={styles.strip}>
        <p className={styles.stripLabel}>{COPY.gotStrip}</p>
        <div
          className={styles.circles}
          role="img"
          aria-label={done ? `Got: ${tea} tea and ${n - tea} coffee` : "Still asking"}
        >
          {slots.map((s, i) => (
            <span
              key={i}
              className={classNames(
                styles.circle,
                s === "tea" && styles.dotTea,
                s === "coffee" && styles.dotCoffee,
                !s && styles.dotUnknown,
              )}
            />
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className={styles.history}>
          <p className={styles.stripLabel}>{COPY.historyLabel}</p>
          <ul className={styles.chips}>
            {history.map((h) => (
              <li key={h.id} className={styles.chip}>
                {h.tea}/{h.n} · {decide(h.tea, h.n) ? "doubt" : "keep"}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>{COPY.historyNote}</p>
        </div>
      )}
    </div>
  );
}

export interface SurpriseMeterProps {
  pValue: number;
  alpha: number;
}

export function SurpriseMeter({ pValue, alpha }: SurpriseMeterProps) {
  const fill = surpriseFill(pValue);
  const mark = strictnessMark(alpha);
  const word = surpriseWord(fill);
  return (
    <div className={styles.meter}>
      <div className={styles.meterTop}>
        <span className={styles.fieldLabel}>
          <RichText parts={COPY.meterLabel} />
        </span>
        <span className={styles.meterWord}>{word}</span>
      </div>
      <div
        className={styles.meterBar}
        role="meter"
        aria-label="Surprise level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        aria-valuetext={`${word}, p-value ${formatFixed(pValue, 4)}`}
      >
        <span className={styles.meterFill} style={{ width: `${fill * 100}%` }} />
        <span className={styles.meterTick} style={{ left: `${mark * 100}%` }} title={COPY.meterLine} />
      </div>
      <div className={styles.meterEnds}>
        <span>{COPY.meterLow}</span>
        <span>{COPY.meterHigh}</span>
      </div>
      <p className={styles.meterP}>
        p-value = {formatFixed(pValue, 4)}
        <span className={styles.meterLineNote}> · tick = strictness line</span>
      </p>
    </div>
  );
}

export default SampleTray;

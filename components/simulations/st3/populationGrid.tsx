"use client";

import { memo, useCallback, useRef, useState, type KeyboardEvent } from "react";
import { classNames } from "./classNames";
import { RichText } from "./richText";
import { COPY, personCaption } from "./steps";
import { Preference } from "./types";
import { styles } from "./styles";

const COLUMNS = 20;

export interface PopulationGridProps {
  town: readonly Preference[];
  /** Index in the town → position in the sample (in the order people were asked). */
  samplePosition: ReadonlyMap<number, number>;
  /** How many sampled people have had their answer revealed so far. */
  revealedCount: number;
  /** Step 4: show everyone's real preference. */
  truthShown: boolean;
  /** Called with a short caption when a person is clicked. */
  onPersonClick?: (caption: string) => void;
}

interface DotProps {
  index: number;
  pref: Preference | null;
  sampled: boolean;
  truthShown: boolean;
  focusable: boolean;
  setRef: (index: number, el: HTMLButtonElement | null) => void;
  onClick: (index: number) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

const Dot = memo(function Dot({ index, pref, sampled, truthShown, focusable, setRef, onClick, onKeyDown }: DotProps) {
  const label = `Person ${index + 1}: ${pref ? `prefers ${pref}` : "not asked yet"}${sampled ? ", in our sample" : ""}`;
  return (
    <button
      type="button"
      ref={(el) => setRef(index, el)}
      className={styles.dotButton}
      aria-label={label}
      tabIndex={focusable ? 0 : -1}
      onClick={() => onClick(index)}
      onKeyDown={(e) => onKeyDown(e, index)}
    >
      <span
        className={classNames(
          styles.dot,
          pref === "tea" && styles.dotTea,
          pref === "coffee" && styles.dotCoffee,
          !pref && styles.dotUnknown,
          sampled && !truthShown && styles.dotLifted,
          sampled && truthShown && styles.dotRinged,
        )}
        aria-hidden="true"
      />
    </button>
  );
});

function PopulationGridImpl({ town, samplePosition, revealedCount, truthShown, onPersonClick }: PopulationGridProps) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [caption, setCaption] = useState<string>(COPY.gridHint);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const knownPref = useCallback(
    (i: number): Preference | null => {
      if (truthShown) return town[i] ?? null;
      const pos = samplePosition.get(i);
      return pos !== undefined && pos < revealedCount ? (town[i] ?? null) : null;
    },
    [revealedCount, samplePosition, town, truthShown],
  );

  const setRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    refs.current[index] = el;
  }, []);

  const handleClick = useCallback(
    (index: number) => {
      setFocusIndex(index);
      const text = personCaption(knownPref(index));
      setCaption(text);
      onPersonClick?.(text);
    },
    [knownPref, onPersonClick],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const total = town.length;
      let next = index;
      if (e.key === "ArrowRight") next = Math.min(total - 1, index + 1);
      else if (e.key === "ArrowLeft") next = Math.max(0, index - 1);
      else if (e.key === "ArrowDown") next = Math.min(total - 1, index + COLUMNS);
      else if (e.key === "ArrowUp") next = Math.max(0, index - COLUMNS);
      else if (e.key === "Home") next = index - (index % COLUMNS);
      else if (e.key === "End") next = index - (index % COLUMNS) + COLUMNS - 1;
      else return;
      e.preventDefault();
      setFocusIndex(next);
      refs.current[next]?.focus();
    },
    [town.length],
  );

  return (
    <div className={styles.town}>
      <p className={styles.banner}>
        <RichText parts={COPY.banner} />
      </p>
      <div
        className={styles.townGrid}
        role="group"
        aria-label={`Town of ${town.length} people. ${COPY.gridKeys}`}
      >
        {town.map((_, i) => (
          <Dot
            key={i}
            index={i}
            pref={knownPref(i)}
            sampled={samplePosition.has(i)}
            truthShown={truthShown}
            focusable={i === focusIndex}
            setRef={setRef}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>
      <p className={styles.caption} aria-live="polite">
        {caption}
      </p>
      <ul className={styles.legend} aria-label="Legend">
        <li>
          <span className={classNames(styles.legendDot, styles.dotTea)} aria-hidden="true" />
          {COPY.legendTea}
        </li>
        <li>
          <span className={classNames(styles.legendDot, styles.dotCoffee)} aria-hidden="true" />
          {COPY.legendCoffee}
        </li>
        <li>
          <span className={classNames(styles.legendDot, styles.dotUnknown)} aria-hidden="true" />
          {COPY.legendUnknown}
        </li>
        {truthShown && samplePosition.size > 0 && (
          <li>
            <span className={classNames(styles.legendDot, styles.dotTea, styles.dotRinged)} aria-hidden="true" />
            {COPY.legendAsked}
          </li>
        )}
      </ul>
    </div>
  );
}

/** Memoised so the 400 dots only re-render when the town or sample changes. */
export const PopulationGrid = memo(PopulationGridImpl);

export default PopulationGrid;

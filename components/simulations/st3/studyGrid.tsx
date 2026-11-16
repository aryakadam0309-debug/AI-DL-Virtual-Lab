import { classNames } from "./classNames";
import { COPY } from "./steps";
import styles from "./st3sim.module.css";

export interface StudyGridProps {
  /** One entry per study: true = that study doubted the claim. Null before any run. */
  results: readonly boolean[] | null;
  /** How many squares have filled in so far. */
  filled: number;
  total?: number;
}

export function StudyGrid({ results, filled, total = 100 }: StudyGridProps) {
  const shown = results ? Math.min(filled, results.length) : 0;
  const doubted = results ? results.slice(0, shown).filter(Boolean).length : 0;
  return (
    <div>
      <div
        className={styles.studyGrid}
        role="img"
        aria-label={results ? `${doubted} of ${shown} studies so far doubted the claim` : "No studies run yet"}
      >
        {Array.from({ length: total }, (_, i) => {
          const r = results && i < shown ? results[i] : null;
          return (
            <span
              key={i}
              className={classNames(styles.square, r === true && styles.squareDoubt, r === false && styles.squareKeep)}
            />
          );
        })}
      </div>
      <ul className={styles.legend} aria-label="Legend">
        <li>
          <span className={classNames(styles.legendSquare, styles.squareDoubt)} aria-hidden="true" />
          {COPY.studyLegendDoubt}
        </li>
        <li>
          <span className={classNames(styles.legendSquare, styles.squareKeep)} aria-hidden="true" />
          {COPY.studyLegendKeep}
        </li>
      </ul>
    </div>
  );
}

export default StudyGrid;

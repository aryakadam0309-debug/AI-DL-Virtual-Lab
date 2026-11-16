import type { Rich } from "./types";
import { styles } from "./styles";

/** Renders plain words with technical terms shown small and muted in brackets. */
export function RichText({ parts }: { parts: Rich }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <span key={i} className={styles.tech}>
            {" "}({part.tech})
          </span>
        ),
      )}
    </>
  );
}

export function Term({ plain, tech }: { plain: string; tech: string }) {
  return <RichText parts={[plain, { tech }]} />;
}

export default RichText;

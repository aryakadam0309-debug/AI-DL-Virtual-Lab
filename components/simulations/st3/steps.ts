// All copy for "The café claim": step titles, button labels and explanations.
import { formatPercent } from "./hypothesisMath";
import { Call, Outcome, Preference, Rich, SampleSize, StepNumber, StrictnessId, TownKind } from "./types";

export interface StepCopy {
  n: StepNumber;
  title: string;
  text: string;
}

export const STEPS: StepCopy[] = [
  {
    n: 1,
    title: "The claim",
    text: "A café owner says half of all people in town prefer tea. Let's check that claim without asking everyone.",
  },
  { n: 2, title: "Take a sample", text: "Pick how many people to ask, then ask them." },
  { n: 3, title: "Make your call", text: "Before we check, what's your gut feeling?" },
  { n: 4, title: "Reveal the truth", text: "Now let's look at the whole town." },
  {
    n: 5,
    title: "Repeat it 100 times",
    text: "One sample can be lucky or unlucky. Let's run 100 separate studies.",
  },
];

export const COPY = {
  title: "The café claim",
  subtitle: "Hypothesis testing with a sample and a population",
  back: "← Back to theory",
  startOver: "Start over",
  banner: ["Claim: half prefer tea", { tech: "null hypothesis" }] as Rich,
  setup: "Setup",
  townQuestion: "Which town are we in?",
  sizeQuestion: "How many people to ask?",
  strictQuestion: "How strict should we be?",
  strictTech: "Strictness (α)",
  letsTest: "Let's test it",
  ask: "Ask them",
  askAgain: "Ask a new group",
  asking: "Asking…",
  callDoubt: "I doubt the claim",
  callKeep: "I still believe it",
  check: "Check my call",
  reveal: "Show the real town",
  run: "Run 100 studies",
  runAgain: "Run again",
  running: "Running…",
  next: (title: string) => `Next: ${title.toLowerCase()}`,
  townPanel: "Town",
  samplePanel: "Sample",
  studiesPanel: "Studies",
  settingsPanel: "Settings",
  mathsSummary: "Show the maths",
  gridHint: "Tap a person to see what we know about them.",
  gridKeys: "Use the arrow keys to move between people.",
  emptySample: "Nobody has been asked yet. In step 2 you'll pick people at random.",
  expectedStrip: "What we'd expect",
  gotStrip: "What we got",
  historyNote: "Same town, different samples.",
  historyLabel: "Recent samples",
  hiddenTown: "Hidden until step 4",
  stepFiveSettings: "Step 5 uses its own settings in the step card.",
  sizeResets: "Changing this starts a fresh sample.",
  strictLive: "Changing this updates the verdict straight away.",
  wobble: "Results wobble a little from run to run.",
  biggerSamples: "Bigger samples catch mistakes more often. Try a larger sample size and run it again.",
  meterLabel: ["Surprise level", { tech: "p-value" }] as Rich,
  meterLow: "Not surprising",
  meterHigh: "Very surprising",
  meterLine: "Strictness line",
  legendTea: "Prefers tea",
  legendCoffee: "Prefers coffee",
  legendUnknown: "Not asked yet",
  legendAsked: "In our sample",
  studyLegendDoubt: "Doubted the claim",
  studyLegendKeep: "Didn't doubt it",
};

export const SAMPLE_SIZES: SampleSize[] = [10, 20, 50, 100];
export const DEFAULT_SAMPLE_SIZE: SampleSize = 50;

export const STRICTNESS: { id: StrictnessId; label: string; alpha: number }[] = [
  { id: "easygoing", label: "Easygoing", alpha: 0.1 },
  { id: "normal", label: "Normal", alpha: 0.05 },
  { id: "strict", label: "Strict", alpha: 0.01 },
];
export const DEFAULT_STRICTNESS: StrictnessId = "normal";

export const alphaOf = (id: StrictnessId) => STRICTNESS.find((s) => s.id === id)!.alpha;
export const strictnessLabel = (id: StrictnessId) => {
  const s = STRICTNESS.find((x) => x.id === id)!;
  return `${s.label} (${Math.round(s.alpha * 100)}%)`;
};

export const TOWNS: { id: TownKind; label: string }[] = [
  { id: "wrong", label: "The café is wrong (65% prefer tea)" },
  { id: "right", label: "The café is right (50% prefer tea)" },
];
export const DEFAULT_TOWN: TownKind = "wrong";

const pct = (alpha: number) => String(Math.round(alpha * 100));

// ---------- one-line explanations for every click ----------

export const NOTES = {
  start: "Nothing has been asked yet. Every dot is one person in town.",
  letsTest: "Good. We'll ask a small random group instead of all 400 people.",
  town: (kind: TownKind) =>
    kind === "wrong"
      ? "This town is set so the café is wrong: 260 of 400 secretly prefer tea."
      : "This town is set so the café is right: 200 of 400 secretly prefer tea.",
  size: (n: SampleSize) => `We'll ask ${n} random people. Bigger samples give steadier answers.`,
  sizeReset: (n: SampleSize) => `New sample size, so we start fresh. Ask ${n} people again.`,
  asking: (n: number) => `Asking ${n} people picked at random…`,
  asked: (n: number, tea: number) => `We asked ${n} people picked at random. ${tea} of them said tea.`,
  call: (call: Call) =>
    call === "doubt"
      ? "You doubt the claim. Now let's see what the numbers say."
      : "You still believe the claim. Now let's see what the numbers say.",
  strictness: (id: StrictnessId) => {
    const s = STRICTNESS.find((x) => x.id === id)!;
    return `${s.label}: we doubt the claim only if a sample like ours would turn up less than ${pct(s.alpha)}% of the time.`;
  },
  check: "We worked out how surprising this sample would be if half really preferred tea.",
  reveal: "Here is everyone's real answer. Ringed dots are the people we asked.",
  toStep5: "Same test, but now we repeat it on 100 fresh samples.",
  studySettings: "Settings changed, so the old studies were cleared.",
  running: (n: number, id: StrictnessId) =>
    `Each study is a new random sample of ${n} people, tested at ${pct(alphaOf(id))}% strictness.`,
  startOver: "Fresh start: a new town has been shuffled.",
};

export function personCaption(pref: Preference | null): string {
  if (pref === "tea") return "This person prefers tea.";
  if (pref === "coffee") return "This person prefers coffee.";
  return "We haven't asked this person yet.";
}

// ---------- step 3 verdict ----------

export function verdictCopy(doubt: boolean, pValue: number, alpha: number): { heading: Rich; body: string } {
  const p = formatPercent(pValue);
  if (doubt) {
    return {
      heading: ["Evidence is strong enough to doubt the claim.", { tech: "reject the null" }],
      body: `A sample this far from half would show up in only about ${p}% of samples if the claim were true. That is rarer than your strictness line (${pct(alpha)}%), so we doubt the claim.`,
    };
  }
  return {
    heading: ["Not enough evidence to doubt the claim.", { tech: "fail to reject the null" }],
    body: `A sample like this would show up in about ${p}% of samples even if the claim were true. That's not rare enough to doubt it. This doesn't prove the claim is true.`,
  };
}

export function callComparison(call: Call, doubt: boolean): string {
  if (call === "doubt") {
    return doubt ? "You said you doubt it, and the test agrees." : "You said you doubt it, but the test says there isn't enough evidence yet.";
  }
  return doubt ? "You said you'd still believe it, but the test says the sample is unusual." : "You said you'd still believe it, and the test agrees.";
}

// ---------- step 4 result stamp ----------

export function outcomeOf(claimTrue: boolean, doubt: boolean): Outcome {
  if (claimTrue) return doubt ? "falseAlarm" : "correctKeep";
  return doubt ? "correctCatch" : "missedMistake";
}

export function outcomeCopy(outcome: Outcome, alpha: number): { heading: Rich; body: string; good: boolean } {
  switch (outcome) {
    case "falseAlarm":
      return {
        heading: ["False alarm", { tech: "Type I error" }],
        body: `The café was right, but this sample made us doubt it. This happens by design about ${pct(alpha)}% of the time.`,
        good: false,
      };
    case "correctKeep":
      return { heading: ["Correct"], body: "The café was right and we didn't doubt it.", good: true };
    case "correctCatch":
      return { heading: ["Correct catch"], body: "The claim was wrong and the sample showed it.", good: true };
    case "missedMistake":
      return {
        heading: ["Missed mistake", { tech: "Type II error" }],
        body: "The claim was wrong, but this sample wasn't enough to show it. Bigger samples miss less often.",
        good: false,
      };
  }
}

export function truthLine(tea: number, total: number): string {
  return `${tea} of ${total} prefer tea, ${Math.round((tea / total) * 100)}%`;
}

// ---------- step 5 caption ----------

export function studiesCaption(kind: TownKind, k: number, total: number, alpha: number): Rich {
  if (kind === "right") {
    return [
      `${k} of ${total} studies doubted the claim, even though it was true. These are false alarms`,
      { tech: "Type I errors" },
      `. We expect about ${Math.round(alpha * total)}.`,
    ];
  }
  return [`${k} of ${total} studies caught the mistake. That's the test's catch rate`, { tech: "power" }, "."];
}

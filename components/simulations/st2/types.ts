export type PopulationId = "skewed" | "uniform" | "bimodal" | "normal";

export interface PopulationConfig {
  id: PopulationId;
  name: string;
  description: string;
  mean: number;
  sd: number;
  skewness: number;
  domain: [number, number]; // [min, max] for visualization
  sample: () => number;
  pdf: (x: number) => number;
}

export interface SampleRun {
  points: number[];
  mean: number;
}

export interface SimulationState {
  sampleSize: number;
  sampleMeans: number[];
  lastSample: SampleRun | null;
}

export interface PresetScenario {
  id: string;
  title: string;
  populationId: PopulationId;
  sampleSize: number;
  samplesToAdd: number;
  description: string;
}

export const POPULATIONS: Record<PopulationId, PopulationConfig> = {
  skewed: {
    id: "skewed",
    name: "Skewed (Exponential, μ = 1, σ = 1)",
    description: "Heavily right-skewed with long positive tail (skewness = 2.0). Ideal for seeing CLT rapidly symmetrize averages.",
    mean: 1.0,
    sd: 1.0,
    skewness: 2.0,
    domain: [0, 6],
    sample: () => -Math.log(1 - Math.random()),
    pdf: (x: number) => (x < 0 ? 0 : Math.exp(-x)),
  },
  uniform: {
    id: "uniform",
    name: "Uniform (Flat [0, 10], μ = 5)",
    description: "Equal probability everywhere on [0, 10]. Symmetric but flat-topped (skewness = 0). Becomes bell-shaped even for n = 3.",
    mean: 5.0,
    sd: 10 / Math.sqrt(12), // ~2.8867
    skewness: 0.0,
    domain: [0, 10],
    sample: () => Math.random() * 10,
    pdf: (x: number) => (x >= 0 && x <= 10 ? 0.1 : 0),
  },
  bimodal: {
    id: "bimodal",
    name: "Bimodal (Two Peaks at 2 and 8, μ = 5)",
    description: "Mixture of two distinct groups (e.g. day vs night shifts). The middle has few observations, yet sample means cluster right at μ = 5!",
    mean: 5.0,
    sd: Math.sqrt(0.7 ** 2 + 3 ** 2), // ~3.0805
    skewness: 0.0,
    domain: [0, 10],
    sample: () => {
      const mode = Math.random() < 0.5 ? 2.0 : 8.0;
      // Box-Muller normal with sd = 0.7
      const u1 = Math.max(1e-10, Math.random());
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mode + z * 0.7;
    },
    pdf: (x: number) => {
      const g1 = Math.exp(-0.5 * ((x - 2) / 0.7) ** 2) / (0.7 * Math.sqrt(2 * Math.PI));
      const g2 = Math.exp(-0.5 * ((x - 8) / 0.7) ** 2) / (0.7 * Math.sqrt(2 * Math.PI));
      return 0.5 * (g1 + g2);
    },
  },
  normal: {
    id: "normal",
    name: "Normal (Bell curve, μ = 5, σ = 1.5)",
    description: "Standard Gaussian population. Averages are perfectly normal for any sample size n ≥ 1.",
    mean: 5.0,
    sd: 1.5,
    skewness: 0.0,
    domain: [0, 10],
    sample: () => {
      const u1 = Math.max(1e-10, Math.random());
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return 5.0 + z * 1.5;
    },
    pdf: (x: number) => {
      return Math.exp(-0.5 * ((x - 5.0) / 1.5) ** 2) / (1.5 * Math.sqrt(2 * Math.PI));
    },
  },
};

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "worked_example_n30",
    title: "Worked Example: Skewed Population (n = 30)",
    populationId: "skewed",
    sampleSize: 30,
    samplesToAdd: 1000,
    description: "From Theory Section: μ = 1, σ = 1. Theoretical SE = 1/√30 = 0.1826. Skewness drops from 2.0 to 2/√30 = 0.365.",
  },
  {
    id: "worked_example_n120",
    title: "Quadruple Sample Size (n = 120)",
    populationId: "skewed",
    sampleSize: 120,
    samplesToAdd: 1000,
    description: "To halve SE (from 0.1826 to 0.0913), sample size must be quadrupled from 30 to 120! Notice the razor-thin spread.",
  },
  {
    id: "small_n_skewed",
    title: "Small Sample Trap (n = 2 on Skewed)",
    populationId: "skewed",
    sampleSize: 2,
    samplesToAdd: 500,
    description: "With n = 2, the sampling distribution remains clearly skewed. CLT requires larger n when population is asymmetric.",
  },
  {
    id: "bimodal_averages",
    title: "Bimodal Paradox: Empty Middle Becomes the Peak!",
    populationId: "bimodal",
    sampleSize: 25,
    samplesToAdd: 1000,
    description: "The population has almost no data around x = 5. Yet the sampling distribution peaks right at 5.0!",
  },
];


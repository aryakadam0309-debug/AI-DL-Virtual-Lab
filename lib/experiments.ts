export const domains = ['Mathematics', 'Statistics', 'Machine Learning', 'Deep Learning', 'Artificial Intelligence'] as const
export type Domain = (typeof domains)[number]
export const levels = ['Beginner', 'Intermediate', 'Advanced'] as const
export type Level = (typeof levels)[number]
export type ImplementationStatus = 'Coming Soon' | 'Available' | 'Interactive'
export type StudentProgress = 'Not Started' | 'In Progress' | 'Completed'

export interface Experiment {
  code: string
  slug: string
  title: string
  domain: Domain
  level: Level
  status: ImplementationStatus
  prerequisites: string[]
  description: string
  objectives: string[]
  learningOutcomes: string[]
  theorySections: { title: string; content: string }[]
  procedure: string[]
  simulationDescription: string
  implementationStatus: ImplementationStatus
  studentProgress: StudentProgress
  simulationComponentKey?: string
}

const raw = ( [
  ['MA-1','Linear Algebra Visualizer','Mathematics','Beginner',[]], ['MA-2','Numerical Methods: Bisection and Newton-Raphson','Mathematics','Beginner',[]], ['MA-3','Calculus and Gradient Descent','Mathematics','Beginner',['MA-2']], ['MA-4','Eigenvalues and Eigenvectors','Mathematics','Intermediate',['MA-1']], ['MA-5','Convex and Non-Convex Optimization','Mathematics','Advanced',['MA-3']],
  ['ST-1','Probability Distributions Simulator','Statistics','Beginner',['MA-3']], ['ST-2','Sampling Distribution and Central Limit Theorem','Statistics','Beginner',['ST-1']], ['ST-3','Hypothesis Testing and Statistical Power','Statistics','Intermediate',['ST-2']], ['ST-4','Bootstrap and Permutation Testing','Statistics','Intermediate',['ST-2','ST-3']], ['ST-5','Bayesian Inference Simulator','Statistics','Intermediate',['ST-1']], ['ST-6','Statistical Quality Control','Statistics','Intermediate',['ST-2','ST-3']], ['ST-7','Design of Experiments','Statistics','Advanced',['ST-3']], ['ST-8','Time Series Analysis and Forecasting','Statistics','Advanced',['ST-2','MA-3']],
  ['ML-1','Decision Tree Visualization and Overfitting','Machine Learning','Beginner',['ST-2']], ['ML-2','Model Evaluation and Cross-Validation','Machine Learning','Intermediate',['ST-3','ML-1']], ['ML-3','Principal Component Analysis','Machine Learning','Intermediate',['MA-1','MA-4','ST-2']], ['ML-4','Missing Data Imputation','Machine Learning','Intermediate',['ST-4','ML-2']], ['ML-5','Anomaly Detection','Machine Learning','Intermediate',['ST-5','ST-6','ML-3']], ['ML-6','Ensemble Learning','Machine Learning','Advanced',['ML-1','ML-2','ML-4']],
  ['DL-1','Activation Function Explorer','Deep Learning','Beginner',['MA-3']], ['DL-2','Neural Network Training and Backpropagation','Deep Learning','Intermediate',['DL-1','MA-3','ML-2']], ['DL-3','Optimizers and Learning Rate Comparison','Deep Learning','Intermediate',['DL-2','MA-5']], ['DL-4','Overfitting and Regularization','Deep Learning','Intermediate',['DL-2','ML-2']], ['DL-5','CNN Feature Map Visualization','Deep Learning','Advanced',['DL-2','DL-3','DL-4','MA-1']], ['DL-6','Attention Mechanism Visualizer','Deep Learning','Advanced',['DL-2','DL-5','MA-1']],
  ['AI-1','Search Algorithms Visualizer: BFS, DFS and A*','Artificial Intelligence','Beginner',[]], ['AI-2','Constraint Satisfaction Problems','Artificial Intelligence','Intermediate',['AI-1']], ['AI-3','Fuzzy Logic Simulator','Artificial Intelligence','Intermediate',['ST-1']], ['AI-4','Genetic Algorithm and Traveling Salesperson Problem','Artificial Intelligence','Intermediate',['MA-5','ST-1','AI-2']], ['AI-5','Reinforcement Learning: Q-learning Gridworld','Artificial Intelligence','Advanced',['ST-5','MA-3','DL-2','AI-1']],
] as [string, string, Domain, Level, string[]][]).map(([code, title, domain, level, prerequisites]) => ({ code, title, domain, level, status: 'Coming Soon' as const, prerequisites }))

const slugify = (value: string) => value.toLowerCase().replace(/\*/g, 'star').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const experiments: Experiment[] = raw.map((item) => ({
  ...item,
  slug: `${item.code.toLowerCase()}-${slugify(item.title)}`,
  description: `Build a practical understanding of ${item.title.toLowerCase()} through guided concepts, visual reasoning, and structured lab work.`,
  objectives: [`Understand the core ideas behind ${item.title}.`, 'Connect mathematical or conceptual assumptions to observable behavior.', 'Interpret findings using precise technical vocabulary.'],
  learningOutcomes: [`Explain the main principles of ${item.title}.`, 'Identify important parameters, assumptions, and trade-offs.', 'Communicate observations from the proposed lab activity.'],
  theorySections: [{ title: 'Concept preview', content: `This planned experiment introduces the foundations of ${item.title}, placing the topic in the broader AI and data-learning workflow.` }, { title: 'What to look for', content: 'Pay attention to how inputs, parameters, and assumptions influence the behavior of the method. The interactive simulation will be added when this experiment moves beyond Planned status.' }],
  procedure: ['Review the prerequisite concepts.', 'Read the theory preview and define the key terms.', 'Record predictions before using the future simulation.', 'Compare observations with the expected behavior and reflect on limitations.'],
  simulationDescription: `A subject-specific interactive simulation for ${item.title} is planned for a future implementation phase. No results are shown until the simulation is built and tested.`,
  implementationStatus: item.code === 'DL-1' || item.code === 'DL-2' ? 'Interactive' : 'Coming Soon',
  studentProgress: 'Not Started',
}))

export const experimentByCode = new Map(experiments.map((experiment) => [experiment.code, experiment]))
export const experimentBySlug = new Map(experiments.map((experiment) => [experiment.slug, experiment]))

export function validateExperiments() {
  if (experiments.length !== 30) throw new Error('Experiment registry must contain exactly 30 experiments')
  if (new Set(experiments.map((e) => e.code)).size !== 30) throw new Error('Experiment codes must be unique')
  if (new Set(experiments.map((e) => e.slug)).size !== 30) throw new Error('Experiment slugs must be unique')
  const expected = { Mathematics: 5, Statistics: 8, 'Machine Learning': 6, 'Deep Learning': 6, 'Artificial Intelligence': 5 }
  for (const domain of domains) if (experiments.filter((e) => e.domain === domain).length !== expected[domain]) throw new Error(`Invalid ${domain} count`)
  for (const experiment of experiments) for (const code of experiment.prerequisites) if (!experimentByCode.has(code)) throw new Error(`Invalid prerequisite ${code}`)
  if (experiments.some((e) => !['Coming Soon', 'Available', 'Interactive'].includes(e.implementationStatus))) throw new Error('Invalid implementation status')
}
validateExperiments()

export const domainDescriptions: Record<Domain, string> = {
  Mathematics: 'Vectors, matrices, calculus, and optimization foundations.',
  Statistics: 'Probability, inference, experimentation, and forecasting.',
  'Machine Learning': 'Models, evaluation, representation, and robust predictions.',
  'Deep Learning': 'Neural networks, optimization, regularization, and vision.',
  'Artificial Intelligence': 'Search, reasoning, fuzzy systems, evolution, and agents.',
}
export const domainShortCodes: Record<Domain, string> = { Mathematics: 'MA', Statistics: 'ST', 'Machine Learning': 'ML', 'Deep Learning': 'DL', 'Artificial Intelligence': 'AI' }

export function getExperiment(slug?: string) { return slug ? experimentBySlug.get(slug) : undefined }
export function getPrerequisites(experiment: Experiment) { return experiment.prerequisites.map((code) => experimentByCode.get(code)).filter(Boolean) as Experiment[] }
export function getRelatedExperiments(experiment: Experiment) { return experiments.filter((item) => item.domain === experiment.domain && item.code !== experiment.code).slice(0, 3) }
export function getStaticExperimentParams() { return experiments.map(({ slug }) => ({ slug })) }

export type TaskType = "coding" | "summarization" | "reasoning" | "support";

export type ModelProfile = {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  medianLatencyMs: number;
  qualityScore: number;
  taskScores: Record<TaskType, number>;
  strengths: string[];
};

export type PromptCase = {
  id: string;
  dataset: string;
  title: string;
  taskType: TaskType;
  difficulty: number;
  inputTokens: number;
  expectedOutput: string;
  prompt: string;
  rubric: RubricCriterion[];
};

export type RubricCriterion = {
  name: string;
  weight: number;
  description: string;
};

export type EvalResult = {
  id: string;
  modelId: string;
  promptId: string;
  output: string;
  score: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  rubricScores: Record<string, number>;
  createdAt: string;
};

export type RouterWeights = {
  quality: number;
  cost: number;
  latency: number;
  context: number;
};

export type RouterDecision = {
  modelId: string;
  routerScore: number;
  reasons: string[];
};

export type BootstrapPayload = {
  models: ModelProfile[];
  promptCases: PromptCase[];
  recentResults: EvalResult[];
};

export type EvalRunPayload = {
  results: EvalResult[];
  decision: RouterDecision;
};

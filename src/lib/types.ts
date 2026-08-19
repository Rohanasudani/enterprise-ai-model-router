export type TaskType = "coding" | "summarization" | "reasoning" | "support";

export type EvalMode = "mock" | "live_openai";

export type ScoreSource = "heuristic" | "llm_judge";

export type PolicyAction = "allow" | "block" | "downgrade" | "escalate";

export type RequestCategory =
  | "work_coding"
  | "work_support"
  | "work_summary"
  | "business_reasoning"
  | "personal"
  | "sensitive"
  | "unknown";

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
  scoreSource: ScoreSource;
  judgeModelId: string | null;
  judgeExplanation: string | null;
  judgedAt: string | null;
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

export type Team = {
  id: string;
  name: string;
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
};

export type PolicyDecision = {
  id: string;
  promptId: string;
  userId: string;
  teamId: string;
  requestedModelId: string;
  selectedModelId: string | null;
  action: PolicyAction;
  category: RequestCategory;
  complexityScore: number;
  workRelated: boolean;
  estimatedRequestedCostUsd: number;
  estimatedRoutedCostUsd: number;
  savingsUsd: number;
  budgetRemainingUsd: number;
  reasons: string[];
  createdAt: string;
};

export type BootstrapPayload = {
  models: ModelProfile[];
  promptCases: PromptCase[];
  recentResults: EvalResult[];
  teams: Team[];
  users: AppUser[];
  recentPolicyDecisions: PolicyDecision[];
};

export type EvalRunPayload = {
  results: EvalResult[];
  decision: RouterDecision;
  mode: EvalMode;
};

export type PolicyDecisionPayload = {
  decision: PolicyDecision;
};

export type JudgeResultsPayload = {
  results: EvalResult[];
};

export type ActionCounts = Record<PolicyAction, number>;

export type TeamSavingsSummary = {
  teamId: string;
  teamName: string;
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
  requestedCostUsd: number;
  routedCostUsd: number;
  savingsUsd: number;
  budgetUsedPercent: number;
  decisionCount: number;
};

export type SavingsReport = {
  generatedAt: string;
  decisionCount: number;
  totalRequestedCostUsd: number;
  totalRoutedCostUsd: number;
  totalSavingsUsd: number;
  savingsPercent: number;
  actionCounts: ActionCounts;
  teamSummaries: TeamSavingsSummary[];
  recentDecisions: PolicyDecision[];
};

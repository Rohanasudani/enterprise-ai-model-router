import type { Prisma } from "@prisma/client";
import type {
  AppUser,
  EvalResult,
  ModelProfile,
  PolicyDecision,
  PromptCase,
  RubricCriterion,
  TaskType,
  Team,
} from "./types";

type DbModelProfile = {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  inputCostPerMTok: number;
  outputCostPerMTok: number;
  medianLatencyMs: number;
  qualityScore: number;
  taskScores: Prisma.JsonValue;
  strengths: string[];
};

type DbPromptCase = {
  id: string;
  dataset: string;
  title: string;
  taskType: TaskType;
  difficulty: number;
  inputTokens: number;
  expectedOutput: string;
  prompt: string;
  rubric: Prisma.JsonValue;
};

type DbEvalResult = {
  id: string;
  modelId: string;
  promptId: string;
  output: string;
  score: number;
  scoreSource: EvalResult["scoreSource"];
  judgeModelId: string | null;
  judgeExplanation: string | null;
  judgedAt: Date | null;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  rubricScores: Prisma.JsonValue;
  createdAt: Date;
};

type DbTeam = {
  id: string;
  name: string;
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
};

type DbAppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
};

type DbPolicyDecision = {
  id: string;
  promptId: string;
  userId: string;
  teamId: string;
  requestedModelId: string;
  selectedModelId: string | null;
  action: PolicyDecision["action"];
  category: PolicyDecision["category"];
  complexityScore: number;
  workRelated: boolean;
  estimatedRequestedCostUsd: number;
  estimatedRoutedCostUsd: number;
  savingsUsd: number;
  budgetRemainingUsd: number;
  reasons: string[];
  createdAt: Date;
};

export function toModelProfile(model: DbModelProfile): ModelProfile {
  return {
    ...model,
    taskScores: model.taskScores as Record<TaskType, number>,
  };
}

export function toPromptCase(prompt: DbPromptCase): PromptCase {
  return {
    ...prompt,
    rubric: prompt.rubric as RubricCriterion[],
  };
}

export function toEvalResult(result: DbEvalResult): EvalResult {
  return {
    id: result.id,
    modelId: result.modelId,
    promptId: result.promptId,
    output: result.output,
    score: result.score,
    scoreSource: result.scoreSource,
    judgeModelId: result.judgeModelId,
    judgeExplanation: result.judgeExplanation,
    judgedAt: result.judgedAt?.toISOString() ?? null,
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalCostUsd: result.totalCostUsd,
    rubricScores: result.rubricScores as Record<string, number>,
    createdAt: result.createdAt.toISOString(),
  };
}

export function toTeam(team: DbTeam): Team {
  return {
    id: team.id,
    name: team.name,
    monthlyBudgetUsd: team.monthlyBudgetUsd,
    currentSpendUsd: team.currentSpendUsd,
  };
}

export function toAppUser(user: DbAppUser): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
  };
}

export function toPolicyDecision(decision: DbPolicyDecision): PolicyDecision {
  return {
    id: decision.id,
    promptId: decision.promptId,
    userId: decision.userId,
    teamId: decision.teamId,
    requestedModelId: decision.requestedModelId,
    selectedModelId: decision.selectedModelId,
    action: decision.action,
    category: decision.category,
    complexityScore: decision.complexityScore,
    workRelated: decision.workRelated,
    estimatedRequestedCostUsd: decision.estimatedRequestedCostUsd,
    estimatedRoutedCostUsd: decision.estimatedRoutedCostUsd,
    savingsUsd: decision.savingsUsd,
    budgetRemainingUsd: decision.budgetRemainingUsd,
    reasons: decision.reasons,
    createdAt: decision.createdAt.toISOString(),
  };
}

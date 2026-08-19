import type { Prisma } from "@prisma/client";
import type { EvalResult, ModelProfile, PromptCase, RubricCriterion, TaskType } from "./types";

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
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalCostUsd: number;
  rubricScores: Prisma.JsonValue;
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
    latencyMs: result.latencyMs,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalCostUsd: result.totalCostUsd,
    rubricScores: result.rubricScores as Record<string, number>,
    createdAt: result.createdAt.toISOString(),
  };
}

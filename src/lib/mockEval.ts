import { models } from "./data";
import type { EvalResult, ModelProfile, PromptCase } from "./types";

const outputTemplates = [
  "The strongest answer identifies the key failure mode, proposes a focused fix, and calls out the regression tests needed before release.",
  "The response should preserve the user's constraints, make one clear recommendation, and explain the cost, latency, and quality tradeoffs.",
  "A reliable completion avoids unsupported claims, follows the rubric, and makes the next action easy for a reviewer to verify.",
  "The model should separate evidence from assumptions, keep the answer concise, and include the decision criteria that affected the outcome.",
];

function hash(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 9973;
  }
  return total;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimateCost(model: ModelProfile, inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPerMTok;
  return inputCost + outputCost;
}

export function runMockEval(prompt: PromptCase, modelProfiles: ModelProfile[] = models): EvalResult[] {
  return modelProfiles.map((model) => {
    const randomish = hash(`${model.id}:${prompt.id}`);
    const taskFit = model.taskScores[prompt.taskType];
    const difficultyPenalty = (prompt.difficulty - 50) * 0.16;
    const variance = (randomish % 13) - 6;
    const score = clamp(Math.round(taskFit - difficultyPenalty + variance), 45, 98);
    const outputTokens = 180 + (randomish % 360) + Math.round(prompt.difficulty * 1.4);
    const latencyMs = Math.round(
      model.medianLatencyMs + prompt.inputTokens * 0.06 + (randomish % 420) - 140,
    );
    const rubricScores = Object.fromEntries(
      prompt.rubric.map((criterion, index) => {
        const criterionVariance = ((randomish + index * 17) % 11) - 5;
        return [criterion.name, clamp(score + criterionVariance, 40, 99)];
      }),
    );

    return {
      id: `run-${Date.now()}-${model.id}`,
      modelId: model.id,
      promptId: prompt.id,
      output: `${outputTemplates[randomish % outputTemplates.length]}\n\nMock result for "${prompt.title}" using ${model.name}. Expected behavior: ${prompt.expectedOutput}`,
      score,
      latencyMs,
      inputTokens: prompt.inputTokens,
      outputTokens,
      totalCostUsd: estimateCost(model, prompt.inputTokens, outputTokens),
      rubricScores,
      createdAt: new Date().toISOString(),
    };
  });
}

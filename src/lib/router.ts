import { models } from "./data";
import type { EvalResult, ModelProfile, PromptCase, RouterDecision, RouterWeights } from "./types";

export const defaultRouterWeights: RouterWeights = {
  quality: 45,
  cost: 20,
  latency: 25,
  context: 10,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCost(cost: number, maxCost: number) {
  if (maxCost <= 0) {
    return 100;
  }
  return clamp(100 - (cost / maxCost) * 100, 0, 100);
}

function normalizeLatency(latencyMs: number) {
  return clamp(100 - latencyMs / 35, 0, 100);
}

function contextFit(model: ModelProfile, prompt: PromptCase) {
  const required = prompt.inputTokens * 2;
  if (model.contextWindow < required) {
    return 0;
  }
  if (model.contextWindow > required * 20) {
    return 100;
  }
  return clamp((model.contextWindow / (required * 20)) * 100, 50, 100);
}

export function recommendModel(
  prompt: PromptCase,
  results: EvalResult[],
  weights: RouterWeights,
  modelProfiles: ModelProfile[] = models,
): RouterDecision {
  const maxCost = Math.max(...results.map((result) => result.totalCostUsd));
  const weightedTotal = weights.quality + weights.cost + weights.latency + weights.context;
  const decisions = results.map((result) => {
    const model = modelProfiles.find((candidate) => candidate.id === result.modelId);
    if (!model) {
      throw new Error(`Missing model profile for ${result.modelId}`);
    }

    const scoreParts = {
      quality: result.score,
      cost: normalizeCost(result.totalCostUsd, maxCost),
      latency: normalizeLatency(result.latencyMs),
      context: contextFit(model, prompt),
    };

    const routerScore =
      (scoreParts.quality * weights.quality +
        scoreParts.cost * weights.cost +
        scoreParts.latency * weights.latency +
        scoreParts.context * weights.context) /
      weightedTotal;

    return {
      model,
      result,
      routerScore: Math.round(routerScore),
      scoreParts,
    };
  });

  const winner = decisions.sort((a, b) => b.routerScore - a.routerScore)[0];

  return {
    modelId: winner.model.id,
    routerScore: winner.routerScore,
    reasons: [
      `${winner.model.name} scored ${winner.result.score}/100 on this ${prompt.taskType} eval.`,
      `Estimated cost is $${winner.result.totalCostUsd.toFixed(5)} for ${winner.result.inputTokens + winner.result.outputTokens} tokens.`,
      `Latency came in at ${winner.result.latencyMs.toLocaleString()} ms against your current latency weight.`,
      `${winner.model.contextWindow.toLocaleString()} token context window comfortably fits this prompt.`,
    ],
  };
}

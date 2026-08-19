import OpenAI from "openai";
import type { EvalResult, ModelProfile, PromptCase } from "@/lib/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function estimateFallbackTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateCost(model: ModelProfile, inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPerMTok;
  return inputCost + outputCost;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function heuristicLiveScore(prompt: PromptCase, model: ModelProfile, output: string) {
  const taskFit = model.taskScores[prompt.taskType];
  const difficultyPenalty = (prompt.difficulty - 50) * 0.12;
  const outputSignal = output.length > 500 ? 4 : output.length > 220 ? 2 : -3;
  return clamp(Math.round(taskFit - difficultyPenalty + outputSignal), 45, 98);
}

function rubricBreakdown(prompt: PromptCase, score: number) {
  return Object.fromEntries(
    prompt.rubric.map((criterion, index) => {
      const variance = index % 2 === 0 ? 2 : -2;
      return [criterion.name, clamp(score + variance, 40, 99)];
    }),
  );
}

export function isLiveOpenAIModel(model: ModelProfile) {
  return model.provider === "OpenAI" && model.id.startsWith("gpt-");
}

export async function runOpenAIEval(prompt: PromptCase, modelProfiles: ModelProfile[]): Promise<EvalResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const liveModels = modelProfiles.filter(isLiveOpenAIModel);

  if (liveModels.length === 0) {
    throw new Error("No live OpenAI model profiles are configured");
  }

  const results = await Promise.all(
    liveModels.map(async (model) => {
      const startedAt = performance.now();
      const response = await client.responses.create({
        model: model.id,
        instructions:
          "You are participating in an LLM evaluation. Answer the user prompt directly, follow the expected behavior, and keep the response concise enough for comparison.",
        input: `Task type: ${prompt.taskType}
Dataset: ${prompt.dataset}
Difficulty: ${prompt.difficulty}/100
Expected behavior: ${prompt.expectedOutput}

Prompt:
${prompt.prompt}`,
        max_output_tokens: 500,
      });
      const latencyMs = Math.round(performance.now() - startedAt);
      const output = response.output_text.trim() || "The model returned an empty response.";
      const inputTokens = response.usage?.input_tokens ?? estimateFallbackTokens(prompt.prompt);
      const outputTokens = response.usage?.output_tokens ?? estimateFallbackTokens(output);
      const score = heuristicLiveScore(prompt, model, output);

      return {
        id: `live-${Date.now()}-${model.id}`,
        modelId: model.id,
        promptId: prompt.id,
        output,
        score,
        latencyMs,
        inputTokens,
        outputTokens,
        totalCostUsd: estimateCost(model, inputTokens, outputTokens),
        rubricScores: rubricBreakdown(prompt, score),
        createdAt: new Date().toISOString(),
      };
    }),
  );

  return results;
}

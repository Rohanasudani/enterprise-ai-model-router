import OpenAI from "openai";
import type { EvalResult, PromptCase, RubricCriterion } from "@/lib/types";

type JudgeOutput = {
  overallScore: number;
  criterionScores: {
    name: string;
    score: number;
  }[];
  explanation: string;
};

type NormalizedJudgeOutput = {
  overallScore: number;
  rubricScores: Record<string, number>;
  explanation: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeJudgeOutput(raw: JudgeOutput, rubric: RubricCriterion[]): NormalizedJudgeOutput {
  const rawScores = new Map(raw.criterionScores.map((criterion) => [criterion.name, criterion.score]));
  const rubricScores = Object.fromEntries(
    rubric.map((criterion) => [criterion.name, clamp(Math.round(rawScores.get(criterion.name) ?? raw.overallScore), 0, 100)]),
  );

  return {
    overallScore: clamp(Math.round(raw.overallScore), 0, 100),
    rubricScores,
    explanation: raw.explanation.slice(0, 900),
  };
}

function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function judgeEvalResult({
  prompt,
  result,
  modelName,
  judgeModelId,
}: {
  prompt: PromptCase;
  result: Pick<EvalResult, "output" | "modelId">;
  modelName: string;
  judgeModelId: string;
}): Promise<NormalizedJudgeOutput> {
  const client = createOpenAIClient();
  const response = await client.responses.create({
    model: judgeModelId,
    instructions:
      "You are an impartial LLM eval judge. Grade only the candidate answer against the prompt, expected behavior, and rubric. Return strict JSON only.",
    input: `Original prompt:
${prompt.prompt}

Expected behavior:
${prompt.expectedOutput}

Candidate model:
${modelName} (${result.modelId})

Candidate answer:
${result.output}

Rubric:
${prompt.rubric.map((criterion) => `- ${criterion.name} (${criterion.weight}): ${criterion.description}`).join("\n")}

Return:
- overallScore: integer 0-100
- criterionScores: array containing one item for each rubric criterion name and its integer 0-100 score
- explanation: concise reason for the score`,
    max_output_tokens: 450,
    text: {
      format: {
        type: "json_schema",
        name: "llm_judge_score",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            overallScore: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
            criterionScores: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: {
                    type: "string",
                  },
                  score: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100,
                  },
                },
                required: ["name", "score"],
              },
            },
            explanation: {
              type: "string",
            },
          },
          required: ["overallScore", "criterionScores", "explanation"],
        },
      },
    },
  });

  return normalizeJudgeOutput(JSON.parse(response.output_text) as JudgeOutput, prompt.rubric);
}

import { NextResponse } from "next/server";
import { runMockEval } from "@/lib/mockEval";
import { toEvalResult, toModelProfile, toPromptCase } from "@/lib/persistence";
import { runOpenAIEval } from "@/lib/providers/openai";
import { prisma } from "@/lib/prisma";
import { defaultRouterWeights, recommendModel } from "@/lib/router";
import type { EvalMode, RouterWeights } from "@/lib/types";

type EvalRunRequest = {
  promptId?: string;
  mode?: EvalMode;
  weights?: Partial<RouterWeights>;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as EvalRunRequest;
  const promptId = body.promptId;

  if (!promptId) {
    return NextResponse.json({ error: "promptId is required" }, { status: 400 });
  }

  const [promptRecord, modelRecords] = await Promise.all([
    prisma.promptCase.findUnique({ where: { id: promptId } }),
    prisma.modelProfile.findMany({ orderBy: { qualityScore: "desc" } }),
  ]);

  if (!promptRecord) {
    return NextResponse.json({ error: "Prompt case not found" }, { status: 404 });
  }

  const prompt = toPromptCase(promptRecord);
  const modelProfiles = modelRecords.map(toModelProfile);
  const weights: RouterWeights = {
    ...defaultRouterWeights,
    ...body.weights,
  };
  const mode: EvalMode = body.mode === "live_openai" ? "live_openai" : "mock";

  if (mode === "live_openai" && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  let transientResults;
  try {
    transientResults = mode === "live_openai" ? await runOpenAIEval(prompt, modelProfiles) : runMockEval(prompt, modelProfiles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live provider request failed";
    const status = message.includes("quota") ? 402 : 502;
    return NextResponse.json({ error: message }, { status });
  }
  const decision = recommendModel(prompt, transientResults, weights, modelProfiles);

  const evalRun = await prisma.evalRun.create({
    data: {
      promptId,
      mode,
      weights,
      results: {
        create: transientResults.map((result) => ({
          modelId: result.modelId,
          promptId: result.promptId,
          output: result.output,
          score: result.score,
          scoreSource: result.scoreSource,
          judgeModelId: result.judgeModelId,
          judgeExplanation: result.judgeExplanation,
          judgedAt: result.judgedAt,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalCostUsd: result.totalCostUsd,
          rubricScores: result.rubricScores,
        })),
      },
      routerDecision: {
        create: {
          modelId: decision.modelId,
          routerScore: decision.routerScore,
          reasons: decision.reasons,
        },
      },
    },
    include: {
      results: {
        orderBy: {
          score: "desc",
        },
      },
      routerDecision: true,
    },
  });

  return NextResponse.json({
    results: evalRun.results.map(toEvalResult),
    decision: evalRun.routerDecision
      ? {
          modelId: evalRun.routerDecision.modelId,
          routerScore: evalRun.routerDecision.routerScore,
          reasons: evalRun.routerDecision.reasons,
        }
      : decision,
    mode,
  });
}

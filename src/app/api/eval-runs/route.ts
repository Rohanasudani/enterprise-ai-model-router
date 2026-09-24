import { NextResponse } from "next/server";
import {
  checkRateLimit,
  parseJsonBody,
  requireJsonRequest,
  requireLiveModeAccess,
  requireProductionAdminKey,
  safeErrorMessage,
} from "@/lib/deploymentGuards";
import { models as seedModels, promptCases as seedPromptCases } from "@/lib/data";
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

function normalizeWeight(value: unknown, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, numberValue));
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    route: "eval-runs",
    limit: 12,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  const jsonRequest = requireJsonRequest(request);
  if (!jsonRequest.ok) {
    return NextResponse.json({ error: jsonRequest.error }, { status: jsonRequest.status });
  }

  const parsedBody = await parseJsonBody<EvalRunRequest>(request);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }

  const body = parsedBody.data;
  const promptId = body.promptId;

  if (!promptId) {
    return NextResponse.json({ error: "promptId is required" }, { status: 400 });
  }

  const weights: RouterWeights = {
    quality: normalizeWeight(body.weights?.quality, defaultRouterWeights.quality),
    cost: normalizeWeight(body.weights?.cost, defaultRouterWeights.cost),
    latency: normalizeWeight(body.weights?.latency, defaultRouterWeights.latency),
    context: normalizeWeight(body.weights?.context, defaultRouterWeights.context),
  };
  const mode: EvalMode = body.mode === "live_openai" ? "live_openai" : "mock";

  if (mode === "live_openai") {
    const liveModeAccess = requireLiveModeAccess(request);
    if (!liveModeAccess.ok) {
      return NextResponse.json({ error: liveModeAccess.error }, { status: liveModeAccess.status });
    }
  }

  if (mode === "live_openai" && !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  let prompt = seedPromptCases.find((candidate) => candidate.id === promptId);
  let modelProfiles = seedModels;
  let databaseAvailable = false;

  if (process.env.DATABASE_URL) {
    try {
      const [promptRecord, modelRecords] = await Promise.all([
        prisma.promptCase.findUnique({ where: { id: promptId } }),
        prisma.modelProfile.findMany({ orderBy: { qualityScore: "desc" } }),
      ]);
      if (promptRecord && modelRecords.length > 0) {
        prompt = toPromptCase(promptRecord);
        modelProfiles = modelRecords.map(toModelProfile);
        databaseAvailable = true;
      }
    } catch {
      databaseAvailable = false;
    }
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt case not found" }, { status: 404 });
  }

  let transientResults;
  try {
    transientResults = mode === "live_openai" ? await runOpenAIEval(prompt, modelProfiles) : runMockEval(prompt, modelProfiles);
  } catch (error) {
    const message = safeErrorMessage(error, "Live provider request failed.");
    const status = message.includes("quota") ? 402 : 502;
    return NextResponse.json({ error: message }, { status });
  }
  const decision = recommendModel(prompt, transientResults, weights, modelProfiles);

  const persistenceAccess = requireProductionAdminKey(request, "Eval result persistence");
  if (!databaseAvailable || !persistenceAccess.ok) {
    return NextResponse.json({
      results: transientResults,
      decision,
      mode,
      persisted: false,
    });
  }

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
    persisted: true,
  });
}

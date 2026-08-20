import { NextResponse } from "next/server";
import { checkRateLimit, MAX_JUDGE_RESULT_IDS, requireLiveModeAccess } from "@/lib/deploymentGuards";
import { judgeEvalResult } from "@/lib/providers/judge";
import { toEvalResult, toModelProfile, toPromptCase } from "@/lib/persistence";
import { prisma } from "@/lib/prisma";

type JudgeResultsRequest = {
  resultIds?: string[];
  judgeModelId?: string;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const rateLimit = checkRateLimit(request, {
    route: "judge-results",
    limit: 6,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  const liveModeAccess = requireLiveModeAccess(request);
  if (!liveModeAccess.ok) {
    return NextResponse.json({ error: liveModeAccess.error }, { status: liveModeAccess.status });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const body = (await request.json()) as JudgeResultsRequest;
  const resultIds = body.resultIds?.filter(Boolean) ?? [];
  const judgeModelId = body.judgeModelId || process.env.OPENAI_JUDGE_MODEL || "gpt-4.1-mini";

  if (resultIds.length === 0) {
    return NextResponse.json({ error: "At least one eval result ID is required" }, { status: 400 });
  }

  if (resultIds.length > MAX_JUDGE_RESULT_IDS) {
    return NextResponse.json(
      { error: `Judge requests are limited to ${MAX_JUDGE_RESULT_IDS} results at a time.` },
      { status: 400 },
    );
  }

  const resultRecords = await prisma.evalResult.findMany({
    where: {
      id: {
        in: resultIds,
      },
    },
    include: {
      prompt: true,
      model: true,
    },
  });

  if (resultRecords.length === 0) {
    return NextResponse.json({ error: "No eval results found" }, { status: 404 });
  }

  const judgedResults = [];

  try {
    for (const record of resultRecords) {
      const prompt = toPromptCase(record.prompt);
      const model = toModelProfile(record.model);
      const judge = await judgeEvalResult({
        prompt,
        result: toEvalResult(record),
        modelName: model.name,
        judgeModelId,
      });

      const updated = await prisma.evalResult.update({
        where: {
          id: record.id,
        },
        data: {
          score: judge.overallScore,
          scoreSource: "llm_judge",
          rubricScores: judge.rubricScores,
          judgeModelId,
          judgeExplanation: judge.explanation,
          judgedAt: new Date(),
        },
      });

      judgedResults.push(toEvalResult(updated));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Judge request failed";
    const status = message.includes("quota") ? 402 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({
    results: judgedResults,
  });
}

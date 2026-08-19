import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toEvalResult, toModelProfile, toPromptCase } from "@/lib/persistence";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const [models, promptCases, recentResults] = await Promise.all([
    prisma.modelProfile.findMany({ orderBy: { qualityScore: "desc" } }),
    prisma.promptCase.findMany({ orderBy: { title: "asc" } }),
    prisma.evalResult.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    models: models.map(toModelProfile),
    promptCases: promptCases.map(toPromptCase),
    recentResults: recentResults.map(toEvalResult),
  });
}

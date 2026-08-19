import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAppUser, toEvalResult, toModelProfile, toPolicyDecision, toPromptCase, toTeam } from "@/lib/persistence";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const [models, promptCases, recentResults, teams, users, recentPolicyDecisions] = await Promise.all([
    prisma.modelProfile.findMany({ orderBy: { qualityScore: "desc" } }),
    prisma.promptCase.findMany({ orderBy: { title: "asc" } }),
    prisma.evalResult.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.appUser.findMany({ orderBy: { name: "asc" } }),
    prisma.policyDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    models: models.map(toModelProfile),
    promptCases: promptCases.map(toPromptCase),
    recentResults: recentResults.map(toEvalResult),
    teams: teams.map(toTeam),
    users: users.map(toAppUser),
    recentPolicyDecisions: recentPolicyDecisions.map(toPolicyDecision),
  });
}

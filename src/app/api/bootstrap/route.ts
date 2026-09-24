import { NextResponse } from "next/server";
import { models as seedModels, promptCases as seedPromptCases, seedRunHistory, teams as seedTeams, users as seedUsers } from "@/lib/data";
import { requireProductionAdminKey } from "@/lib/deploymentGuards";
import { prisma } from "@/lib/prisma";
import { toAppUser, toEvalResult, toModelProfile, toPolicyDecision, toPromptCase, toTeam } from "@/lib/persistence";

export async function GET(request: Request) {
  const productionAccess = requireProductionAdminKey(request, "Bootstrap data access");
  if (!productionAccess.ok) {
    return NextResponse.json({ error: productionAccess.error }, { status: productionAccess.status });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      source: "seed",
      models: seedModels,
      promptCases: seedPromptCases,
      recentResults: seedRunHistory,
      teams: seedTeams,
      users: seedUsers,
      recentPolicyDecisions: [],
    });
  }

  try {
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
      source: "database",
      models: models.map(toModelProfile),
      promptCases: promptCases.map(toPromptCase),
      recentResults: recentResults.map(toEvalResult),
      teams: teams.map(toTeam),
      users: users.map(toAppUser),
      recentPolicyDecisions: recentPolicyDecisions.map(toPolicyDecision),
    });
  } catch {
    return NextResponse.json({
      source: "seed",
      models: seedModels,
      promptCases: seedPromptCases,
      recentResults: seedRunHistory,
      teams: seedTeams,
      users: seedUsers,
      recentPolicyDecisions: [],
    });
  }
}

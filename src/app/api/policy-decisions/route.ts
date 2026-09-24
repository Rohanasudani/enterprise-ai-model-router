import { NextResponse } from "next/server";
import { models as seedModels, promptCases as seedPromptCases, teams as seedTeams, users as seedUsers } from "@/lib/data";
import { checkRateLimit, parseJsonBody, requireJsonRequest, requireProductionAdminKey } from "@/lib/deploymentGuards";
import { makePolicyDecision } from "@/lib/policyEngine";
import { toAppUser, toModelProfile, toPolicyDecision, toPromptCase, toTeam } from "@/lib/persistence";
import { prisma } from "@/lib/prisma";

type PolicyDecisionRequest = {
  promptId?: string;
  userId?: string;
  requestedModelId?: string;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, {
    route: "policy-decisions",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  const jsonRequest = requireJsonRequest(request);
  if (!jsonRequest.ok) {
    return NextResponse.json({ error: jsonRequest.error }, { status: jsonRequest.status });
  }

  const parsedBody = await parseJsonBody<PolicyDecisionRequest>(request);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: parsedBody.status });
  }

  const body = parsedBody.data;

  if (!body.promptId || !body.userId || !body.requestedModelId) {
    return NextResponse.json({ error: "promptId, userId, and requestedModelId are required" }, { status: 400 });
  }

  let prompt = seedPromptCases.find((candidate) => candidate.id === body.promptId);
  let user = seedUsers.find((candidate) => candidate.id === body.userId);
  let team = seedTeams.find((candidate) => candidate.id === user?.teamId);
  let models = seedModels;
  let databaseAvailable = false;

  if (process.env.DATABASE_URL) {
    try {
      const [promptRecord, userRecord, modelRecords] = await Promise.all([
        prisma.promptCase.findUnique({ where: { id: body.promptId } }),
        prisma.appUser.findUnique({
          where: { id: body.userId },
          include: {
            team: true,
          },
        }),
        prisma.modelProfile.findMany({ orderBy: { qualityScore: "desc" } }),
      ]);
      if (promptRecord && userRecord && modelRecords.length > 0) {
        prompt = toPromptCase(promptRecord);
        user = toAppUser(userRecord);
        team = toTeam(userRecord.team);
        models = modelRecords.map(toModelProfile);
        databaseAvailable = true;
      }
    } catch {
      databaseAvailable = false;
    }
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt case not found" }, { status: 404 });
  }

  if (!user || !team) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const draft = makePolicyDecision({
    prompt,
    user,
    team,
    models,
    requestedModelId: body.requestedModelId,
  });

  const persistenceAccess = requireProductionAdminKey(request, "Policy decision persistence");
  if (!databaseAvailable || !persistenceAccess.ok) {
    return NextResponse.json({
      decision: {
        ...draft,
        id: `preview-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      persisted: false,
    });
  }

  const [decision] = await prisma.$transaction([
    prisma.policyDecision.create({
      data: draft,
    }),
    prisma.team.update({
      where: { id: team.id },
      data: {
        currentSpendUsd: {
          increment: draft.estimatedRoutedCostUsd,
        },
      },
    }),
  ]);

  return NextResponse.json({
    decision: toPolicyDecision(decision),
    persisted: true,
  });
}

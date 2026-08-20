import { NextResponse } from "next/server";
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
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

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

  if (!promptRecord) {
    return NextResponse.json({ error: "Prompt case not found" }, { status: 404 });
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const prompt = toPromptCase(promptRecord);
  const user = toAppUser(userRecord);
  const team = toTeam(userRecord.team);
  const models = modelRecords.map(toModelProfile);
  const draft = makePolicyDecision({
    prompt,
    user,
    team,
    models,
    requestedModelId: body.requestedModelId,
  });

  const persistenceAccess = requireProductionAdminKey(request, "Policy decision persistence");
  if (!persistenceAccess.ok) {
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

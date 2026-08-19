import { PrismaClient } from "@prisma/client";
import { models, promptCases, seedRunHistory, teams, users } from "../src/lib/data";
import { defaultRouterWeights } from "../src/lib/router";

const prisma = new PrismaClient();

async function main() {
  for (const model of models) {
    await prisma.modelProfile.upsert({
      where: { id: model.id },
      update: {
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        inputCostPerMTok: model.inputCostPerMTok,
        outputCostPerMTok: model.outputCostPerMTok,
        medianLatencyMs: model.medianLatencyMs,
        qualityScore: model.qualityScore,
        taskScores: model.taskScores,
        strengths: model.strengths,
      },
      create: {
        id: model.id,
        name: model.name,
        provider: model.provider,
        contextWindow: model.contextWindow,
        inputCostPerMTok: model.inputCostPerMTok,
        outputCostPerMTok: model.outputCostPerMTok,
        medianLatencyMs: model.medianLatencyMs,
        qualityScore: model.qualityScore,
        taskScores: model.taskScores,
        strengths: model.strengths,
      },
    });
  }

  for (const prompt of promptCases) {
    await prisma.promptCase.upsert({
      where: { id: prompt.id },
      update: {
        dataset: prompt.dataset,
        title: prompt.title,
        taskType: prompt.taskType,
        difficulty: prompt.difficulty,
        inputTokens: prompt.inputTokens,
        expectedOutput: prompt.expectedOutput,
        prompt: prompt.prompt,
        rubric: prompt.rubric,
      },
      create: {
        id: prompt.id,
        dataset: prompt.dataset,
        title: prompt.title,
        taskType: prompt.taskType,
        difficulty: prompt.difficulty,
        inputTokens: prompt.inputTokens,
        expectedOutput: prompt.expectedOutput,
        prompt: prompt.prompt,
        rubric: prompt.rubric,
      },
    });
  }

  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {
        name: team.name,
        monthlyBudgetUsd: team.monthlyBudgetUsd,
        currentSpendUsd: team.currentSpendUsd,
      },
      create: {
        id: team.id,
        name: team.name,
        monthlyBudgetUsd: team.monthlyBudgetUsd,
        currentSpendUsd: team.currentSpendUsd,
      },
    });
  }

  for (const user of users) {
    await prisma.appUser.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
      },
    });
  }

  const existingRuns = await prisma.evalRun.count();
  if (existingRuns === 0) {
    for (const result of seedRunHistory) {
      await prisma.evalRun.create({
        data: {
          promptId: result.promptId,
          weights: defaultRouterWeights,
          results: {
            create: {
              modelId: result.modelId,
              promptId: result.promptId,
              output: result.output,
              score: result.score,
              latencyMs: result.latencyMs,
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              totalCostUsd: result.totalCostUsd,
              rubricScores: result.rubricScores,
              createdAt: result.createdAt,
            },
          },
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { NextResponse } from "next/server";
import {
  checkRateLimit,
  MAX_EXPECTED_OUTPUT_CHARS,
  MAX_PROMPT_CHARS,
  MAX_RUBRIC_CRITERIA,
  requireProductionAdminKey,
  validatePromptText,
} from "@/lib/deploymentGuards";
import { toPromptCase } from "@/lib/persistence";
import { prisma } from "@/lib/prisma";
import type { PromptCase, RubricCriterion, TaskType } from "@/lib/types";

const taskTypes: TaskType[] = ["coding", "summarization", "reasoning", "support"];

type PromptCaseRequest = Partial<PromptCase>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function normalizeRubric(rubric: unknown): RubricCriterion[] {
  if (!Array.isArray(rubric)) {
    return [];
  }

  return rubric
    .map((criterion) => {
      if (!criterion || typeof criterion !== "object") {
        return null;
      }

      const draft = criterion as Partial<RubricCriterion>;
      return {
        name: String(draft.name ?? "").trim(),
        weight: Number(draft.weight ?? 0),
        description: String(draft.description ?? "").trim(),
      };
    })
    .filter((criterion): criterion is RubricCriterion => criterion !== null && Boolean(criterion.name) && criterion.weight > 0);
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const rateLimit = checkRateLimit(request, {
    route: "prompt-cases",
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.error }, { status: rateLimit.status });
  }

  const productionAccess = requireProductionAdminKey(request, "Prompt dataset writes");
  if (!productionAccess.ok) {
    return NextResponse.json({ error: productionAccess.error }, { status: productionAccess.status });
  }

  const body = (await request.json()) as PromptCaseRequest;
  const title = String(body.title ?? "").trim();
  const dataset = String(body.dataset ?? "").trim();
  const prompt = String(body.prompt ?? "").trim();
  const expectedOutput = String(body.expectedOutput ?? "").trim();
  const taskType = body.taskType;
  const difficulty = Number(body.difficulty);
  const inputTokens = Number(body.inputTokens);
  const rubric = normalizeRubric(body.rubric);

  if (!title || !dataset || !prompt || !expectedOutput) {
    return NextResponse.json({ error: "Dataset, title, prompt, and expected output are required" }, { status: 400 });
  }

  const promptLength = validatePromptText(prompt, "Prompt", MAX_PROMPT_CHARS);
  if (!promptLength.ok) {
    return NextResponse.json({ error: promptLength.error }, { status: promptLength.status });
  }

  const expectedOutputLength = validatePromptText(expectedOutput, "Expected output", MAX_EXPECTED_OUTPUT_CHARS);
  if (!expectedOutputLength.ok) {
    return NextResponse.json({ error: expectedOutputLength.error }, { status: expectedOutputLength.status });
  }

  if (!taskType || !taskTypes.includes(taskType)) {
    return NextResponse.json({ error: "A valid task type is required" }, { status: 400 });
  }

  if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 100) {
    return NextResponse.json({ error: "Difficulty must be between 1 and 100" }, { status: 400 });
  }

  if (!Number.isFinite(inputTokens) || inputTokens < 1) {
    return NextResponse.json({ error: "Input tokens must be greater than 0" }, { status: 400 });
  }

  if (rubric.length === 0) {
    return NextResponse.json({ error: "At least one rubric criterion is required" }, { status: 400 });
  }

  if (rubric.length > MAX_RUBRIC_CRITERIA) {
    return NextResponse.json(
      { error: `Rubrics are limited to ${MAX_RUBRIC_CRITERIA} criteria.` },
      { status: 400 },
    );
  }

  const id = body.id?.trim() || `${slugify(title) || "prompt"}-${Date.now()}`;
  const promptCase = await prisma.promptCase.upsert({
    where: {
      id,
    },
    update: {
      dataset,
      title,
      taskType,
      difficulty,
      inputTokens,
      expectedOutput,
      prompt,
      rubric,
    },
    create: {
      id,
      dataset,
      title,
      taskType,
      difficulty,
      inputTokens,
      expectedOutput,
      prompt,
      rubric,
    },
  });

  return NextResponse.json({
    promptCase: toPromptCase(promptCase),
  });
}

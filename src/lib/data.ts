import type { EvalResult, ModelProfile, PromptCase } from "./types";

export const models: ModelProfile[] = [
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "OpenAI",
    contextWindow: 1050000,
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    medianLatencyMs: 1800,
    qualityScore: 93,
    taskScores: {
      coding: 94,
      summarization: 91,
      reasoning: 93,
      support: 90,
    },
    strengths: ["live evals", "balanced intelligence", "large context"],
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "OpenAI",
    contextWindow: 1050000,
    inputCostPerMTok: 0.2,
    outputCostPerMTok: 1.2,
    medianLatencyMs: 950,
    qualityScore: 86,
    taskScores: {
      coding: 84,
      summarization: 88,
      reasoning: 84,
      support: 87,
    },
    strengths: ["low cost", "fast live evals", "large context"],
  },
  {
    id: "frontier-pro",
    name: "Frontier Pro",
    provider: "OpenAI",
    contextWindow: 128000,
    inputCostPerMTok: 5,
    outputCostPerMTok: 15,
    medianLatencyMs: 2100,
    qualityScore: 94,
    taskScores: {
      coding: 96,
      summarization: 90,
      reasoning: 95,
      support: 88,
    },
    strengths: ["complex reasoning", "code generation", "long context"],
  },
  {
    id: "balanced-sonnet",
    name: "Balanced Sonnet",
    provider: "Anthropic",
    contextWindow: 200000,
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    medianLatencyMs: 1800,
    qualityScore: 91,
    taskScores: {
      coding: 93,
      summarization: 92,
      reasoning: 90,
      support: 91,
    },
    strengths: ["agent workflows", "instruction following", "code review"],
  },
  {
    id: "flash-lite",
    name: "Flash Lite",
    provider: "Google",
    contextWindow: 1000000,
    inputCostPerMTok: 0.35,
    outputCostPerMTok: 1.05,
    medianLatencyMs: 780,
    qualityScore: 82,
    taskScores: {
      coding: 76,
      summarization: 88,
      reasoning: 78,
      support: 84,
    },
    strengths: ["low latency", "large context", "batch summarization"],
  },
  {
    id: "open-fast",
    name: "Open Fast",
    provider: "Together",
    contextWindow: 32000,
    inputCostPerMTok: 0.18,
    outputCostPerMTok: 0.24,
    medianLatencyMs: 520,
    qualityScore: 74,
    taskScores: {
      coding: 70,
      summarization: 80,
      reasoning: 68,
      support: 76,
    },
    strengths: ["budget workloads", "classification", "simple support"],
  },
];

export const promptCases: PromptCase[] = [
  {
    id: "code-review-001",
    dataset: "Agentic coding tasks",
    title: "Review a failing auth helper",
    taskType: "coding",
    difficulty: 84,
    inputTokens: 1850,
    expectedOutput: "Identify the bug, propose a narrow patch, and explain the regression risk.",
    prompt:
      "A TypeScript auth helper incorrectly treats expired refresh tokens as valid when clock skew is negative. Review the bug and propose a minimal fix with tests.",
    rubric: [
      {
        name: "Bug accuracy",
        weight: 0.4,
        description: "Correctly identifies the failing condition.",
      },
      {
        name: "Patch quality",
        weight: 0.35,
        description: "Suggests a targeted, maintainable fix.",
      },
      {
        name: "Test coverage",
        weight: 0.25,
        description: "Covers the regression and edge cases.",
      },
    ],
  },
  {
    id: "support-002",
    dataset: "Customer support",
    title: "Refund policy response",
    taskType: "support",
    difficulty: 58,
    inputTokens: 620,
    expectedOutput: "Answer politely, cite the policy, and avoid promising an unsupported refund.",
    prompt:
      "A customer asks for a refund 42 days after purchase. Company policy allows refunds within 30 days unless the product was defective.",
    rubric: [
      {
        name: "Policy fidelity",
        weight: 0.45,
        description: "Does not invent refund exceptions.",
      },
      {
        name: "Tone",
        weight: 0.3,
        description: "Maintains a helpful, calm tone.",
      },
      {
        name: "Next step",
        weight: 0.25,
        description: "Gives a clear support escalation path.",
      },
    ],
  },
  {
    id: "summarize-003",
    dataset: "Executive summaries",
    title: "Compress incident notes",
    taskType: "summarization",
    difficulty: 64,
    inputTokens: 4200,
    expectedOutput: "Summarize customer impact, root cause, timeline, and follow-up actions.",
    prompt:
      "Summarize a long incident report for executives. Preserve timeline, impact, root cause, mitigation, and owners.",
    rubric: [
      {
        name: "Coverage",
        weight: 0.4,
        description: "Captures all critical facts.",
      },
      {
        name: "Compression",
        weight: 0.3,
        description: "Removes noise without losing meaning.",
      },
      {
        name: "Actionability",
        weight: 0.3,
        description: "Makes owners and next actions obvious.",
      },
    ],
  },
  {
    id: "reasoning-004",
    dataset: "Business reasoning",
    title: "Route support tiers",
    taskType: "reasoning",
    difficulty: 78,
    inputTokens: 980,
    expectedOutput: "Choose the correct tier and explain the decision against constraints.",
    prompt:
      "Given four support plans with different SLAs, usage limits, and compliance requirements, pick the right plan for a healthcare startup.",
    rubric: [
      {
        name: "Constraint handling",
        weight: 0.45,
        description: "Uses all hard constraints correctly.",
      },
      {
        name: "Tradeoff clarity",
        weight: 0.3,
        description: "Explains cost, SLA, and compliance tradeoffs.",
      },
      {
        name: "Recommendation",
        weight: 0.25,
        description: "Provides one defensible final choice.",
      },
    ],
  },
];

export const seedRunHistory: EvalResult[] = [
  {
    id: "run-17870401",
    modelId: "balanced-sonnet",
    promptId: "code-review-001",
    output:
      "The likely bug is a skew calculation that allows refresh tokens past exp when skew is negative. Clamp skew to a non-negative tolerance and add tests for expired, valid, and boundary tokens.",
    score: 91,
    latencyMs: 1910,
    inputTokens: 1850,
    outputTokens: 420,
    totalCostUsd: 0.01185,
    rubricScores: {
      "Bug accuracy": 93,
      "Patch quality": 90,
      "Test coverage": 88,
    },
    createdAt: "2026-08-16T13:05:00.000Z",
  },
  {
    id: "run-17870402",
    modelId: "flash-lite",
    promptId: "summarize-003",
    output:
      "Customer impact was limited to delayed report generation. Root cause was a queue worker deployment mismatch. Mitigation was rollback and replay. Follow-up actions include deploy checks and queue depth alerts.",
    score: 86,
    latencyMs: 810,
    inputTokens: 4200,
    outputTokens: 240,
    totalCostUsd: 0.00172,
    rubricScores: {
      Coverage: 85,
      Compression: 89,
      Actionability: 82,
    },
    createdAt: "2026-08-16T16:22:00.000Z",
  },
];

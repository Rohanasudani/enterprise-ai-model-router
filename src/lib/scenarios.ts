import type { AppUser, DeploymentScenario, EvalResult, ModelProfile, PromptCase, Team } from "./types";

export type ScenarioProfile = {
  id: DeploymentScenario;
  label: string;
  eyebrow: string;
  description: string;
  audience: string;
  policyLabel: string;
  models: ModelProfile[];
  promptCases: PromptCase[];
  teams: Team[];
  users: AppUser[];
  history: EvalResult[];
};

export const higherEducationModels: ModelProfile[] = [
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    contextWindow: 200000,
    inputCostPerMTok: 1,
    outputCostPerMTok: 5,
    medianLatencyMs: 720,
    qualityScore: 87,
    taskScores: { coding: 84, summarization: 91, reasoning: 84, support: 92 },
    strengths: ["everyday campus use", "fast answers", "document analysis"],
    resourceTier: 2,
    bestFor: "Everyday student, faculty, and administrative work",
  },
  {
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "Anthropic",
    contextWindow: 1000000,
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    medianLatencyMs: 1480,
    qualityScore: 94,
    taskScores: { coding: 96, summarization: 94, reasoning: 95, support: 91 },
    strengths: ["deep analysis", "coding", "research workflows"],
    resourceTier: 3,
    bestFor: "Complex analysis, coding, and research support",
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    provider: "Anthropic",
    contextWindow: 1000000,
    inputCostPerMTok: 8,
    outputCostPerMTok: 40,
    medianLatencyMs: 2350,
    qualityScore: 97,
    taskScores: { coding: 97, summarization: 95, reasoning: 98, support: 92 },
    strengths: ["long-horizon reasoning", "high-stakes analysis", "complex research"],
    resourceTier: 5,
    bestFor: "The most complex, high-value research and reasoning tasks",
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    provider: "OpenAI",
    contextWindow: 1050000,
    inputCostPerMTok: 0.2,
    outputCostPerMTok: 1.2,
    medianLatencyMs: 820,
    qualityScore: 86,
    taskScores: { coding: 84, summarization: 89, reasoning: 84, support: 88 },
    strengths: ["efficient", "high-volume tasks", "large context"],
    resourceTier: 2,
    bestFor: "Frequent, well-scoped tasks where efficiency matters",
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    provider: "OpenAI",
    contextWindow: 1050000,
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    medianLatencyMs: 1350,
    qualityScore: 93,
    taskScores: { coding: 94, summarization: 92, reasoning: 94, support: 90 },
    strengths: ["balanced intelligence", "large context", "multistep work"],
    resourceTier: 3,
    bestFor: "Balanced academic and professional work",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    provider: "OpenAI",
    contextWindow: 1050000,
    inputCostPerMTok: 4,
    outputCostPerMTok: 20,
    medianLatencyMs: 1900,
    qualityScore: 96,
    taskScores: { coding: 97, summarization: 94, reasoning: 97, support: 91 },
    strengths: ["frontier reasoning", "agentic coding", "complex knowledge work"],
    resourceTier: 4,
    bestFor: "Demanding reasoning and advanced coding",
  },
  {
    id: "gemma-4-31b",
    name: "Gemma 4 31B",
    provider: "Google",
    contextWindow: 128000,
    inputCostPerMTok: 0.1,
    outputCostPerMTok: 0.3,
    medianLatencyMs: 560,
    qualityScore: 79,
    taskScores: { coding: 75, summarization: 84, reasoning: 76, support: 83 },
    strengths: ["lowest resource tier", "classification", "simple questions"],
    resourceTier: 1,
    bestFor: "Simple, low-risk, high-volume requests",
  },
];

export const higherEducationPromptCases: PromptCase[] = [
  {
    id: "student-concept-001",
    dataset: "Student learning support",
    title: "Explain a difficult concept",
    taskType: "support",
    difficulty: 48,
    inputTokens: 620,
    expectedOutput: "Teach the concept with an analogy and checks for understanding without completing graded work.",
    prompt:
      "Explain gradient descent to a first-year student using one intuitive analogy, a small numerical example, and two questions that check understanding.",
    rubric: [
      { name: "Accuracy", weight: 0.4, description: "Explains the concept without technical errors." },
      { name: "Learning support", weight: 0.35, description: "Teaches rather than simply supplying an answer." },
      { name: "Accessibility", weight: 0.25, description: "Uses language appropriate for a first-year student." },
    ],
  },
  {
    id: "research-summary-002",
    dataset: "Research support",
    title: "Summarize a research paper",
    taskType: "summarization",
    difficulty: 68,
    inputTokens: 6800,
    expectedOutput: "Preserve the research question, methods, findings, limitations, and open questions.",
    prompt:
      "Create a structured research brief from a long journal article for an interdisciplinary faculty team. Separate reported findings from your own inferences.",
    rubric: [
      { name: "Evidence fidelity", weight: 0.45, description: "Preserves findings and clearly labels inference." },
      { name: "Coverage", weight: 0.3, description: "Includes methods, results, and limitations." },
      { name: "Clarity", weight: 0.25, description: "Makes the paper legible across disciplines." },
    ],
  },
  {
    id: "course-code-003",
    dataset: "Teaching and coding support",
    title: "Coach through a Python bug",
    taskType: "coding",
    difficulty: 74,
    inputTokens: 1700,
    expectedOutput: "Diagnose the bug, provide progressive hints, and preserve student ownership of the final solution.",
    prompt:
      "A student has a Python breadth-first search that revisits nodes indefinitely. Explain the likely cause, give two progressive hints, and suggest tests without writing the full assignment solution.",
    rubric: [
      { name: "Diagnosis", weight: 0.4, description: "Correctly identifies likely visited-set errors." },
      { name: "Scaffolding", weight: 0.35, description: "Uses hints that support learning." },
      { name: "Integrity", weight: 0.25, description: "Avoids completing the graded assignment." },
    ],
  },
  {
    id: "admin-policy-004",
    dataset: "University operations",
    title: "Draft an advising response",
    taskType: "reasoning",
    difficulty: 82,
    inputTokens: 2400,
    expectedOutput: "Apply the supplied policy, identify uncertainty, and route final eligibility decisions to a human advisor.",
    prompt:
      "Using a fictional degree-progress policy, draft an advising response that explains two possible graduation paths. Do not infer missing student facts or make the final eligibility determination.",
    rubric: [
      { name: "Policy fidelity", weight: 0.45, description: "Uses only the supplied policy and facts." },
      { name: "Human oversight", weight: 0.3, description: "Keeps consequential decisions with an advisor." },
      { name: "Actionability", weight: 0.25, description: "Gives clear, practical next steps." },
    ],
  },
];

export const higherEducationTeams: Team[] = [
  { id: "student-success", name: "Student Success", monthlyBudgetUsd: 260, currentSpendUsd: 118.4 },
  { id: "teaching", name: "Teaching & Learning", monthlyBudgetUsd: 340, currentSpendUsd: 149.2 },
  { id: "research", name: "Research Support", monthlyBudgetUsd: 620, currentSpendUsd: 281.8 },
];

export const higherEducationUsers: AppUser[] = [
  {
    id: "jordan-student",
    name: "Jordan Lee",
    email: "jordan@example.edu",
    role: "Student",
    teamId: "student-success",
  },
  {
    id: "elena-faculty",
    name: "Dr. Elena Cruz",
    email: "elena@example.edu",
    role: "Faculty",
    teamId: "teaching",
  },
  {
    id: "sam-research",
    name: "Sam Okafor",
    email: "sam@example.edu",
    role: "Research Analyst",
    teamId: "research",
  },
];

export const scenarioCopy: Record<DeploymentScenario, Omit<ScenarioProfile, "models" | "promptCases" | "teams" | "users" | "history">> = {
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    eyebrow: "Organization policy pack",
    description: "Govern model use across product, engineering, support, and operations.",
    audience: "Employees, contractors, and platform teams",
    policyLabel: "Organization policy",
  },
  higher_education: {
    id: "higher_education",
    label: "Higher Education",
    eyebrow: "Illustrative university pilot",
    description: "Help students, faculty, researchers, and staff choose an appropriate model for each task.",
    audience: "Students, faculty, researchers, and university staff",
    policyLabel: "Campus guidance",
  },
};

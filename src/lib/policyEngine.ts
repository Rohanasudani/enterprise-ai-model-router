import type { AppUser, ModelProfile, PolicyAction, PolicyDecision, PromptCase, RequestCategory, Team } from "./types";

type DraftPolicyDecision = Omit<PolicyDecision, "id" | "createdAt">;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function estimateOutputTokens(prompt: PromptCase) {
  return Math.round(220 + prompt.difficulty * 2.4);
}

function estimateCost(model: ModelProfile, prompt: PromptCase) {
  const outputTokens = estimateOutputTokens(prompt);
  const inputCost = (prompt.inputTokens / 1_000_000) * model.inputCostPerMTok;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPerMTok;
  return inputCost + outputCost;
}

function modelTaskScore(model: ModelProfile, prompt: PromptCase) {
  return model.taskScores[prompt.taskType];
}

function classifyRequest(prompt: PromptCase): RequestCategory {
  const text = `${prompt.title} ${prompt.prompt} ${prompt.expectedOutput}`.toLowerCase();

  if (/(personal|side project|startup landing|dating|resume for another job)/.test(text)) {
    return "personal";
  }

  if (/(password|secret|api key|private key|ssn|social security|credential)/.test(text)) {
    return "sensitive";
  }

  if (prompt.taskType === "coding") {
    return "work_coding";
  }

  if (prompt.taskType === "support") {
    return "work_support";
  }

  if (prompt.taskType === "summarization") {
    return "work_summary";
  }

  if (prompt.taskType === "reasoning") {
    return "business_reasoning";
  }

  return "unknown";
}

function complexityScore(prompt: PromptCase) {
  const tokenPressure = clamp(Math.round(prompt.inputTokens / 250), 0, 18);
  const taskBonus = prompt.taskType === "coding" || prompt.taskType === "reasoning" ? 8 : 0;
  return clamp(prompt.difficulty + tokenPressure + taskBonus, 1, 100);
}

function cheapestAcceptableModel(models: ModelProfile[], prompt: PromptCase, minimumScore: number) {
  return [...models]
    .filter((model) => modelTaskScore(model, prompt) >= minimumScore)
    .sort((left, right) => estimateCost(left, prompt) - estimateCost(right, prompt) || left.medianLatencyMs - right.medianLatencyMs)[0];
}

function bestQualityModel(models: ModelProfile[], prompt: PromptCase) {
  return [...models].sort(
    (left, right) =>
      modelTaskScore(right, prompt) - modelTaskScore(left, prompt) ||
      right.qualityScore - left.qualityScore ||
      estimateCost(left, prompt) - estimateCost(right, prompt),
  )[0];
}

function balancedModel(models: ModelProfile[], prompt: PromptCase) {
  const acceptable = cheapestAcceptableModel(models, prompt, 84);
  return acceptable ?? bestQualityModel(models, prompt);
}

export function makePolicyDecision({
  prompt,
  user,
  team,
  models,
  requestedModelId,
}: {
  prompt: PromptCase;
  user: AppUser;
  team: Team;
  models: ModelProfile[];
  requestedModelId: string;
}): DraftPolicyDecision {
  const requestedModel = models.find((model) => model.id === requestedModelId) ?? bestQualityModel(models, prompt);
  const category = classifyRequest(prompt);
  const complexity = complexityScore(prompt);
  const budgetRemaining = Math.max(0, team.monthlyBudgetUsd - team.currentSpendUsd);
  const budgetRemainingRatio = budgetRemaining / team.monthlyBudgetUsd;
  const requestedCost = estimateCost(requestedModel, prompt);
  let selectedModel: ModelProfile | undefined = balancedModel(models, prompt);
  let action: PolicyAction = "allow";
  const reasons: string[] = [];

  if (category === "personal") {
    action = "block";
    selectedModel = undefined;
    reasons.push("Request appears unrelated to authorized organizational use, so policy blocks funded AI usage.");
  } else if (category === "sensitive") {
    action = "block";
    selectedModel = undefined;
    reasons.push("Request appears to contain secrets or credentials, so policy blocks model routing.");
  } else if (budgetRemaining <= 0) {
    action = "block";
    selectedModel = undefined;
    reasons.push("Team budget is exhausted for the current month.");
  } else if (budgetRemainingRatio < 0.1) {
    action = "downgrade";
    selectedModel = cheapestAcceptableModel(models, prompt, 70) ?? selectedModel;
    reasons.push("Team has less than 10% budget remaining, so the gateway chooses the cheapest acceptable model.");
  } else if (complexity >= 88) {
    action = "escalate";
    selectedModel = bestQualityModel(models, prompt);
    reasons.push("Complexity is high enough to justify a premium model for quality and risk reduction.");
  } else if (complexity <= 70) {
    action = "downgrade";
    selectedModel = cheapestAcceptableModel(models, prompt, 76) ?? selectedModel;
    reasons.push("Complexity is low to moderate, so a cheaper model should be good enough.");
  } else {
    reasons.push("Request is work-related and within budget, so the gateway allows a balanced model.");
  }

  if (user.role.toLowerCase().includes("contractor") && action !== "block" && complexity >= 85) {
    action = "downgrade";
    selectedModel = cheapestAcceptableModel(models, prompt, 78) ?? selectedModel;
    reasons.push("Contractor policy avoids premium models unless a manager escalates the request.");
  }

  const routedCost = selectedModel ? estimateCost(selectedModel, prompt) : 0;
  const savings = requestedCost - routedCost;

  if (selectedModel) {
    reasons.push(`Selected ${selectedModel.name} for ${prompt.taskType} with task score ${modelTaskScore(selectedModel, prompt)}/100.`);
  }

  reasons.push(`Estimated request cost changed from $${requestedCost.toFixed(5)} to $${routedCost.toFixed(5)}.`);

  return {
    promptId: prompt.id,
    userId: user.id,
    teamId: team.id,
    requestedModelId: requestedModel.id,
    selectedModelId: selectedModel?.id ?? null,
    action,
    category,
    complexityScore: complexity,
    workRelated: category !== "personal" && category !== "sensitive",
    estimatedRequestedCostUsd: requestedCost,
    estimatedRoutedCostUsd: routedCost,
    savingsUsd: savings,
    budgetRemainingUsd: budgetRemaining,
    reasons,
  };
}

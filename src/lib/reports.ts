import type { AppUser, PolicyDecision, SavingsReport, Team } from "./types";

function emptyActionCounts() {
  return {
    allow: 0,
    block: 0,
    downgrade: 0,
    escalate: 0,
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100000) / 100000;
}

function percent(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildSavingsReport({
  teams,
  users,
  decisions,
}: {
  teams: Team[];
  users: AppUser[];
  decisions: PolicyDecision[];
}): SavingsReport {
  const totalRequestedCostUsd = decisions.reduce((sum, decision) => sum + decision.estimatedRequestedCostUsd, 0);
  const totalRoutedCostUsd = decisions.reduce((sum, decision) => sum + decision.estimatedRoutedCostUsd, 0);
  const totalSavingsUsd = decisions.reduce((sum, decision) => sum + decision.savingsUsd, 0);
  const actionCounts = decisions.reduce((counts, decision) => {
    counts[decision.action] += 1;
    return counts;
  }, emptyActionCounts());

  const teamSummaries = teams.map((team) => {
    const teamUserIds = new Set(users.filter((user) => user.teamId === team.id).map((user) => user.id));
    const teamDecisions = decisions.filter((decision) => teamUserIds.has(decision.userId));
    const requestedCostUsd = teamDecisions.reduce((sum, decision) => sum + decision.estimatedRequestedCostUsd, 0);
    const routedCostUsd = teamDecisions.reduce((sum, decision) => sum + decision.estimatedRoutedCostUsd, 0);
    const savingsUsd = teamDecisions.reduce((sum, decision) => sum + decision.savingsUsd, 0);

    return {
      teamId: team.id,
      teamName: team.name,
      monthlyBudgetUsd: team.monthlyBudgetUsd,
      currentSpendUsd: team.currentSpendUsd,
      requestedCostUsd: roundCurrency(requestedCostUsd),
      routedCostUsd: roundCurrency(routedCostUsd),
      savingsUsd: roundCurrency(savingsUsd),
      budgetUsedPercent: percent((team.currentSpendUsd / team.monthlyBudgetUsd) * 100),
      decisionCount: teamDecisions.length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    decisionCount: decisions.length,
    totalRequestedCostUsd: roundCurrency(totalRequestedCostUsd),
    totalRoutedCostUsd: roundCurrency(totalRoutedCostUsd),
    totalSavingsUsd: roundCurrency(totalSavingsUsd),
    savingsPercent: totalRequestedCostUsd > 0 ? percent((totalSavingsUsd / totalRequestedCostUsd) * 100) : 0,
    actionCounts,
    teamSummaries,
    recentDecisions: decisions.slice(0, 10),
  };
}

export function savingsReportToCsv(report: SavingsReport) {
  const lines = [
    ["section", "metric", "value"],
    ["summary", "generated_at", report.generatedAt],
    ["summary", "decision_count", String(report.decisionCount)],
    ["summary", "total_requested_cost_usd", String(report.totalRequestedCostUsd)],
    ["summary", "total_routed_cost_usd", String(report.totalRoutedCostUsd)],
    ["summary", "total_savings_usd", String(report.totalSavingsUsd)],
    ["summary", "savings_percent", String(report.savingsPercent)],
    ["actions", "allow", String(report.actionCounts.allow)],
    ["actions", "block", String(report.actionCounts.block)],
    ["actions", "downgrade", String(report.actionCounts.downgrade)],
    ["actions", "escalate", String(report.actionCounts.escalate)],
    [],
    [
      "team",
      "monthly_budget_usd",
      "current_spend_usd",
      "requested_cost_usd",
      "routed_cost_usd",
      "savings_usd",
      "budget_used_percent",
      "decision_count",
    ],
    ...report.teamSummaries.map((team) => [
      team.teamName,
      String(team.monthlyBudgetUsd),
      String(team.currentSpendUsd),
      String(team.requestedCostUsd),
      String(team.routedCostUsd),
      String(team.savingsUsd),
      String(team.budgetUsedPercent),
      String(team.decisionCount),
    ]),
  ];

  return lines
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(","),
    )
    .join("\n");
}

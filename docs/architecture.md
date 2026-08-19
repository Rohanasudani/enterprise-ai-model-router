# Architecture

## System Goal

The router answers a practical enterprise AI question:

> Given a developer request, which model should the company use, and should the request be allowed at all?

The platform combines eval quality, cost controls, latency preferences, context requirements, task type, team budget, and company policy.

## Request Lifecycle

1. A prompt case or enterprise request enters the dashboard.
2. The policy engine classifies the request as business, personal, sensitive, or unsafe.
3. The router scores candidate models using task fit, quality, latency, cost, and context window.
4. The provider layer runs the eval in mock mode or live OpenAI mode.
5. Results are persisted in PostgreSQL through Prisma.
6. Optional LLM-as-judge scoring updates results with rubric scores and explanations.
7. Reports aggregate run history, spend, savings, and routing decisions.

## Core Modules

`src/lib/router.ts`

Scores model profiles and produces explainable routing decisions. The scoring function balances quality, latency, cost, context fit, and task-specific model strengths.

`src/lib/policyEngine.ts`

Classifies requests, applies enterprise usage rules, checks budget constraints, and decides whether to allow, block, downgrade, or escalate a request.

`src/lib/providers/openai.ts`

Calls OpenAI models in live mode, measures latency, captures token usage, and normalizes provider output for persistence.

`src/lib/providers/judge.ts`

Uses an LLM judge to score candidate outputs against rubrics, expected behavior, and prompt metadata.

`src/lib/reports.ts`

Builds savings summaries from policy decisions, spend estimates, and team budget state.

`src/lib/persistence.ts`

Converts between Prisma records and app-level TypeScript objects so the UI and APIs stay typed.

## Persistence

PostgreSQL stores the product history, not just the latest UI state. This makes the project more realistic because eval platforms need reproducibility, auditability, and historical comparison.

Main persisted entities:

- model registry
- prompt cases and rubrics
- eval runs
- eval results
- router decisions
- teams and users
- policy decisions

## Routing Philosophy

The router is intentionally explainable. A company should not only know which model was selected; it should know why that model was selected, what tradeoffs were made, and how much money was saved by choosing a cheaper model or blocking an invalid request.

This makes the project useful for AI platform teams, developer productivity teams, and infrastructure groups managing LLM usage at scale.

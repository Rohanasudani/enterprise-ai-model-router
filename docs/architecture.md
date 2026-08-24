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

Production deployments add a guard layer before expensive or mutating actions. Live provider calls require `LIVE_MODE_ENABLED=true` and a valid demo admin key. Public mock evals can return preview results without writing to PostgreSQL.

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

`src/lib/deploymentGuards.ts`

Centralizes deployment safety controls: live-mode gating, admin-key checks, rate limits, and request size caps.

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

## Router Scoring

The router computes a weighted score for each candidate model using four normalized dimensions:

- `quality`: eval score for the model output on the selected prompt case
- `cost`: inverse normalized cost, so cheaper completions score higher
- `latency`: inverse latency score, so faster responses score higher
- `context`: context-window fit relative to the prompt size

The dashboard exposes these as sliders. Changing weights updates the router preview immediately, while `Run Eval` refreshes outputs and persists a reproducible run when the caller has production write access.

At a high level:

```text
routerScore =
  qualityScore * qualityWeight +
  costScore * costWeight +
  latencyScore * latencyWeight +
  contextFit * contextWeight
```

The result is normalized by the total weight and rounded for display. Each recommendation includes the reasons used to select the winning model so the decision can be reviewed later.

## Policy Engine

The policy engine answers a separate question from the router: should the company allow this request at all?

It classifies the request into categories such as business work, personal use, sensitive content, or unsafe usage. It then combines that classification with requester metadata, team budget, requested model, and model alternatives.

Possible policy actions:

- `allow`: requested model is acceptable
- `downgrade`: route to a cheaper model that still fits the task
- `escalate`: require review or a stronger model for complex/high-risk work
- `block`: deny personal, unsafe, or credential-like requests

This separation keeps the system realistic: quality routing and enterprise governance are related, but they are not the same decision.

## Mock vs Live Mode

Mock mode is the public demo path. It produces deterministic, provider-free eval results so the dashboard can be used safely without spending API credits.

Live OpenAI mode is opt-in and guarded by:

- `LIVE_MODE_ENABLED=true`
- a configured `OPENAI_API_KEY`
- a valid `x-demo-admin-key` header

The public Vercel deployment intentionally keeps live mode disabled. This demonstrates the production safety posture while still making the project interactive for recruiters.

## Production Safety Tradeoffs

This project is designed as a portfolio-grade simulation of an enterprise control plane, not a drop-in enterprise product.

Implemented safeguards:

- live provider calls are disabled by default
- expensive and mutating actions require an admin key in production
- public mock runs can return preview data without writing to the database
- JSON content-type checks and payload size caps protect API routes
- deployment guards avoid leaking provider stack details in production
- security headers are configured in `next.config.ts`
- automated unit and E2E tests run in CI

Known next steps for a real company deployment:

- replace the demo admin key with OAuth/RBAC
- move rate limiting to Redis, Vercel KV, or another shared store
- add tenant/workspace isolation
- add provider-level spend caps and billing alerts
- add scheduled regression evals for prompt/model drift

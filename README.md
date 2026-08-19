# Enterprise AI Model Router

A full-stack AI infrastructure project that routes LLM requests by task complexity, quality, latency, cost, context window, team budget, and company policy.

This is not an OpenRouter clone. It is a company-side governance and evaluation layer for deciding when a request should use a premium model, a cheaper model, a live evaluation flow, or be blocked as policy-violating usage.

## Highlights

- Policy-aware model routing with `allow`, `block`, `downgrade`, and `escalate` decisions
- Eval runner with mock mode and live OpenAI mode
- LLM-as-judge rubric scoring with persisted judge explanations
- Prompt dataset and rubric management from the dashboard
- PostgreSQL persistence with Prisma migrations
- Team budget tracking, estimated savings, and CSV/JSON reports
- Explainable router decisions with cost, latency, quality, context, and policy reasoning
- Dashboard for run history, model comparison, policy audits, and savings reporting

## Product Demo

The main workflow:

1. Pick or create a prompt case with task type, difficulty, expected behavior, and rubric.
2. Run an eval in mock mode or live OpenAI mode.
3. Compare model quality, cost, token usage, and latency.
4. Judge the latest run with an LLM-as-judge scorer.
5. Route a simulated enterprise request through budget and policy controls.
6. Export a savings report for leadership or platform teams.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- PostgreSQL
- Prisma ORM
- OpenAI API
- Docker Compose
- ESLint

## Architecture

```mermaid
flowchart LR
  Dashboard[Next.js Dashboard] --> EvalAPI[Eval Run API]
  Dashboard --> PolicyAPI[Policy Decision API]
  Dashboard --> PromptAPI[Prompt Case API]
  Dashboard --> ReportAPI[Savings Report API]

  EvalAPI --> Router[Model Router]
  EvalAPI --> Provider[Mock or Live Provider]
  EvalAPI --> Prisma[Prisma Client]
  PolicyAPI --> Policy[Policy Engine]
  Policy --> Router
  ReportAPI --> Reports[Report Builder]

  Prisma --> Postgres[(PostgreSQL)]
  Provider --> OpenAI[OpenAI Responses API]
```

More detail: [docs/architecture.md](docs/architecture.md)

## Data Model

- `ModelProfile`: provider, model name, context window, pricing, latency, task strengths, and quality scores
- `PromptCase`: dataset, task type, difficulty, prompt, expected behavior, and rubric
- `EvalRun`: eval configuration, router weights, selected prompt, and timestamp
- `EvalResult`: candidate output, score, latency, tokens, cost, rubric scores, and judge metadata
- `RouterDecision`: selected model, weighted score, cost/latency/quality reasoning, and alternatives
- `Team`: monthly AI budget and current spend
- `AppUser`: requester identity, role, team, and access tier
- `PolicyDecision`: request classification, policy action, routed model, savings, and audit reasons

## Run Locally

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

If Docker is not available, create a PostgreSQL database locally or in Neon/Supabase and set `DATABASE_URL` in `.env`.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_model_router?schema=public"
OPENAI_API_KEY="optional_for_live_mode"
OPENAI_JUDGE_MODEL="gpt-4.1-mini"
```

The app works without OpenAI credits in mock mode. Live mode requires a funded OpenAI API project.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:migrate
npm run db:seed
npm run db:studio
```

## API Routes

- `POST /api/eval-runs`: run a model eval in mock or live mode
- `POST /api/judge-results`: score the latest eval result with an LLM judge
- `GET /api/prompt-cases`: list prompt cases
- `POST /api/prompt-cases`: create prompt cases and rubrics
- `POST /api/policy-decisions`: classify and route enterprise requests
- `GET /api/reports/savings`: return savings report JSON
- `GET /api/reports/savings?format=csv`: export savings report CSV
- `POST /api/bootstrap`: seed demo data from the app

## Reports

The savings report summarizes:

- total policy decisions
- allowed, blocked, downgraded, and escalated requests
- estimated spend before and after routing
- estimated savings from downgrades and blocks
- team budget utilization
- per-model routing distribution

## Current Status

Implemented:

- Prisma/PostgreSQL persistence
- mock eval runner
- live OpenAI eval adapter
- policy-aware enterprise routing
- LLM-as-judge scoring
- dataset/rubric management
- savings dashboard and exports
- GitHub-ready documentation

Planned:

- Anthropic, Gemini, Groq, and Together adapters
- auth and team workspaces
- scheduled regression evals
- PDF report generation
- prompt/version diffing

## Project Summary

Built an enterprise LLM routing and evaluation platform in Next.js, TypeScript, PostgreSQL, and Prisma that selects models by quality, cost, latency, context needs, task type, user budget, and policy constraints. Added mock/live provider modes, OpenAI integration, LLM-as-judge rubric scoring, prompt dataset management, policy audit history, and reproducible savings reports.

# AI Model Router

[![CI](https://github.com/Rohanasudani/enterprise-ai-model-router/actions/workflows/ci.yml/badge.svg)](https://github.com/Rohanasudani/enterprise-ai-model-router/actions/workflows/ci.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://enterprise-ai-model-router.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791)](https://www.prisma.io/)

An explainable LLM recommendation, evaluation, and governance prototype. It helps an organization choose a model for a real task using quality, latency, context, resource needs, budget, and policy—not only the model name or a row of dollar signs.

The product has two scenario packs built on the same routing engine:

- **Enterprise:** product, engineering, support, and platform-team workloads with persisted evaluations, policy decisions, budgets, and savings reports.
- **Higher Education:** a synthetic shadow-mode pilot for student learning, teaching, research, and university operations. It makes no live provider calls and stores no campus prompts.

Live demo: [enterprise-ai-model-router.vercel.app](https://enterprise-ai-model-router.vercel.app)

## What It Demonstrates

- recommendations that update immediately as task and routing priorities change
- clear reasons, fit score, relative resource tier, and lower-resource/highest-quality alternatives
- auto-recommendation with a visible manual override
- model comparison across quality, latency, context, task fit, and estimated cost
- policy-aware routing with `allow`, `block`, `downgrade`, and `escalate` decisions
- mock and guarded live evaluation paths
- prompt/rubric management, audit history, budgets, and CSV/JSON reporting
- one reusable core that can support a company, university, public agency, or other governed organization

## Screenshots

### Enterprise scenario

![Enterprise AI Model Router](public/screenshots/dashboard.png)

### Higher-education scenario

![Higher-education model recommendation](public/screenshots/higher-education.png)

## Why This Matters

Giving users a list of model names and `$` symbols leaves the hard decision to people who may not know which model fits their task. The router turns that selector into an explainable recommendation:

1. identify the workload and its constraints;
2. compare models using evaluation evidence and resource needs;
3. recommend a fit and show the tradeoffs;
4. apply organization policy or budget guidance;
5. keep the user in control with a manual override and audit trail.

It is not an OpenRouter clone and it is not a production proxy. It is a portfolio-grade control-plane prototype that demonstrates the product logic and the integration boundary around an existing chat interface or model gateway.

## Higher-Education Pilot

The Higher Education scenario is intentionally a **synthetic, local shadow-mode demo**. It contains representative tasks and illustrative model metadata modeled after a multi-model campus AI experience, but it is not connected to the University of Arizona, its Office of Responsible AI, GenAI platform, identity system, model gateway, or production data.

The proposed pilot is small: observe a limited set of de-identified workload categories, compare the router recommendation with the model a user would otherwise select, and measure whether the recommendation improves task fit and resource use. See [docs/higher-education-pilot.md](docs/higher-education-pilot.md).

## Product Demo

1. Pick **Enterprise** or **Higher Education**.
2. Select a representative task.
3. Adjust the quality, cost, latency, and context priorities.
4. Review the recommended model, evidence, alternatives, and relative resource tier.
5. Run a simulated evaluation to refresh the comparison.
6. Preview an organization policy decision.
7. In Enterprise mode, review persistence, audit history, budgets, and exports.

A meeting-friendly walkthrough is in [docs/demo-script.md](docs/demo-script.md).

## Architecture

```mermaid
flowchart LR
  UI[Recommendation UI] --> Scenario[Scenario Pack]
  Scenario --> Router[Explainable Router]
  UI --> EvalAPI[Eval API]
  UI --> PolicyAPI[Policy API]
  EvalAPI --> Provider[Mock or Guarded Live Provider]
  PolicyAPI --> Policy[Policy Engine]
  Router --> Evidence[Quality / Cost / Latency / Context]
  Policy --> Router
  EvalAPI --> Prisma[Prisma]
  PolicyAPI --> Prisma
  Prisma --> Postgres[(PostgreSQL)]
```

The scenario pack supplies audience-specific tasks, labels, users, and model metadata. The router, evaluation engine, policy engine, and reporting logic remain reusable. More detail: [docs/architecture.md](docs/architecture.md).

## Mock, Synthetic, and Live Modes

- **Enterprise / Simulated:** deterministic provider-free outputs; the API can persist them when deployment guards permit.
- **Enterprise / Live OpenAI:** opt-in only and requires `LIVE_MODE_ENABLED=true`, an API key, and a valid admin key.
- **Higher Education / Synthetic shadow mode:** client-side illustrative estimates only. Live mode, judge calls, production prompt writes, and exports are disabled.

This separation keeps the public demo usable without implying that synthetic scores are validated production evidence.

## Tech Stack

- Next.js App Router, React, and strict TypeScript
- PostgreSQL and Prisma ORM
- OpenAI API adapter plus deterministic mock provider
- Playwright E2E tests and Node unit tests
- Docker Compose, Vercel, and Neon Postgres

## Run Locally

Prerequisites: Node.js 24+, Docker Desktop, and npm.

```bash
git clone https://github.com/Rohanasudani/enterprise-ai-model-router.git
cd enterprise-ai-model-router
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Without PostgreSQL, the interface falls back to seed data. The simulated and higher-education flows do not require provider credits.

## Environment Variables

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_model_router?schema=public"
OPENAI_API_KEY="optional_for_live_mode"
OPENAI_JUDGE_MODEL="gpt-4.1-mini"
LIVE_MODE_ENABLED="false"
DEMO_ADMIN_KEY="set-a-private-admin-key"
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Production Safety

- live provider calls are disabled by default;
- production writes and live actions require an admin key;
- public mock requests can return previews without persistence;
- API routes use payload caps, JSON checks, rate limits, and safe errors;
- the higher-education scenario cannot call live providers or save university data.

See [docs/security.md](docs/security.md).

## Documentation

- [Design](DESIGN.md)
- [Architecture](docs/architecture.md)
- [Evaluation methodology](docs/evaluation.md)
- [Higher-education pilot](docs/higher-education-pilot.md)
- [Deployment](docs/deployment.md)
- [Security model](docs/security.md)
- [Meeting demo script](docs/demo-script.md)

## Current Scope

Implemented:

- explainable model recommendation and manual override
- Enterprise and Higher Education scenario packs
- mock evaluation and guarded live OpenAI evaluation
- policy engine, dataset/rubric management, persistence, budgets, audit history, and reports
- production-safety controls plus unit and browser tests

Before a real institutional deployment:

- validate model metadata and routing thresholds with approved evaluations;
- integrate through an authorized gateway such as LiteLLM rather than calling around it;
- add institutional authentication, RBAC, tenant isolation, and shared rate limiting;
- complete privacy, security, accessibility, procurement, and AI-governance reviews;
- run a limited shadow-mode pilot before allowing automatic routing.

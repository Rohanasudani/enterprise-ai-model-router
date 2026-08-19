# AI Model Router

A Next.js and TypeScript MVP for comparing LLMs by task quality, latency, context fit, and token cost.

## Current Features

- Model registry with provider metadata and pricing
- Prompt dataset with rubrics and difficulty
- PostgreSQL persistence through Prisma
- API-backed mock eval runner, no LLM API keys required
- Live OpenAI eval mode through the Responses API
- LLM-as-judge rubric scoring with persisted judge explanations
- Cost, latency, token, and quality scoring
- Router recommendation with explanation
- Run history and model comparison dashboard
- Enterprise policy decisions for allow/block/downgrade/escalate routing
- Savings dashboard with team budget utilization
- JSON and CSV report exports

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

If you do not have Docker installed, create a PostgreSQL database locally or in Neon/Supabase and set `DATABASE_URL` in `.env`.

## Live OpenAI Mode

Add an API key to `.env`:

```bash
OPENAI_API_KEY="your_project_key_here"
OPENAI_JUDGE_MODEL="gpt-4.1-mini"
```

Then use the dashboard's provider mode switch:

```text
Mock | Live OpenAI
```

Live mode calls OpenAI models, records latency, reads token usage from the API response, estimates cost from the model registry, and stores the eval run in PostgreSQL.

## LLM-as-Judge Scoring

After running an eval, use **Judge Latest** in the dashboard. The judge reads the prompt, expected behavior, rubric, candidate model name, and candidate output, then returns:

- overall score
- per-rubric scores
- concise explanation
- judge model ID
- judged timestamp

The app stores those fields on `EvalResult` so reports and run history can distinguish heuristic scores from LLM-judged scores.

## Database Scripts

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Data Model

- `ModelProfile`: provider, context window, pricing, task scores, and strengths
- `PromptCase`: prompt, dataset, task type, difficulty, expected behavior, and rubric
- `EvalRun`: selected prompt, router weights, timestamp, and related results
- `EvalResult`: model output, quality score, latency, token counts, cost, and rubric scores
- `EvalResult.scoreSource`: `heuristic` or `llm_judge`
- `RouterDecision`: winning model, weighted router score, and explanation bullets
- `Team`: monthly AI budget and current spend
- `AppUser`: requester identity, role, and team
- `PolicyDecision`: action, classification, complexity, routed model, savings, and audit reasons

## Reports

Savings reports are available from the app and API:

```text
GET /api/reports/savings
GET /api/reports/savings?format=csv
```

## Next Build Step

Add dataset management so users can create prompt sets and rubrics from the dashboard.

# AI Model Router

A Next.js and TypeScript MVP for comparing LLMs by task quality, latency, context fit, and token cost.

## Current Features

- Model registry with provider metadata and pricing
- Prompt dataset with rubrics and difficulty
- PostgreSQL persistence through Prisma
- API-backed mock eval runner, no LLM API keys required
- Cost, latency, token, and quality scoring
- Router recommendation with explanation
- Run history and model comparison dashboard

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
- `RouterDecision`: winning model, weighted router score, and explanation bullets

## Next Build Step

Add real provider adapters for OpenAI and Anthropic, then keep mocked providers as a safe demo mode.

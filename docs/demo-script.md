# Demo Script

Use this walkthrough for a recruiter, interviewer, or GitHub video demo.

## Setup

```bash
cd /Users/apple/.codex/workspaces/default/ai-model-router
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Walkthrough

1. Start with the dashboard and explain the problem: companies need to control LLM spend without killing developer productivity.
2. Show the model registry and point out quality, latency, context, task strengths, and cost metadata.
3. Run a mock eval to demonstrate the product without requiring API credits.
4. Switch to live OpenAI mode if `OPENAI_API_KEY` has quota enabled.
5. Show the run history and compare quality, cost, latency, and token usage.
6. Click the judge action to show LLM-as-judge scoring and rubric explanations.
7. Create a new prompt case to show dataset/rubric management.
8. Run an enterprise policy decision and explain `allow`, `block`, `downgrade`, and `escalate`.
9. Open the savings report and export CSV.
10. Close with the architecture: Next.js, TypeScript, Prisma, PostgreSQL, OpenAI API, and Docker.

## Strong Talking Points

- The app has mock mode so the core product is demoable without spending API credits.
- The app has live mode so it can run real provider calls when credits are available.
- The router is explainable, not a black box.
- The policy layer makes it enterprise-oriented instead of just a benchmark toy.
- Historical persistence makes reports reproducible.

# AI Model Router and Eval Framework

## Goal

Build a resume-quality platform that compares LLMs on quality, latency, token cost, context fit, and task suitability, then recommends the best model for a given workload.

## MVP Scope

- Model registry with provider, context window, task strengths, quality score, latency estimate, and token pricing.
- Prompt dataset with task type, difficulty, expected behavior, and scoring rubric.
- PostgreSQL persistence through Prisma for models, prompts, eval runs, eval results, and router decisions.
- API-backed mock eval runner that produces deterministic outputs, latency, token usage, cost, and rubric scores without API keys.
- Live OpenAI eval runner that calls real models through the Responses API and persists latency, usage, output, and estimated cost.
- Router recommendation engine that balances quality, cost, latency, context needs, and task-specific fit.
- Dashboard with run history, model comparison, score breakdowns, and a readable "why this model" explanation.

## Future Milestones

- Provider adapters for Anthropic, Gemini, Groq, and Together.
- LLM-as-judge scoring with reusable rubric templates.
- CSV/PDF export for reproducible quality/cost reports.
- Auth, teams, shared datasets, and scheduled regression evals.

## Resume Story

This project demonstrates production-oriented AI engineering: model selection, eval discipline, cost and latency tradeoffs, reproducibility, and explainable routing.

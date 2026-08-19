# Enterprise AI Model Router and Eval Framework

## Goal

Build a production-oriented AI infrastructure platform that routes LLM requests by quality, latency, token cost, context fit, task type, company policy, and team budget.

The product is designed as an enterprise control plane for AI usage: a company can decide whether a developer request should use a premium model, a cheaper model, a live eval flow, or be blocked because it violates usage policy.

## MVP Scope

- Model registry with provider, context window, task strengths, quality score, latency estimate, and token pricing.
- Prompt dataset with task type, difficulty, expected behavior, and scoring rubric.
- PostgreSQL persistence through Prisma for models, prompts, eval runs, eval results, and router decisions.
- API-backed mock eval runner that produces deterministic outputs, latency, token usage, cost, and rubric scores without API keys.
- Live OpenAI eval runner that calls real models through the Responses API and persists latency, usage, output, and estimated cost.
- Router recommendation engine that balances quality, cost, latency, context needs, and task-specific fit.
- Enterprise policy engine that classifies requests and decides whether to allow, block, downgrade, or escalate model access.
- Savings report API with JSON and CSV exports.
- LLM-as-judge scoring that updates eval results with rubric scores, judge explanation, judge model, and score source.
- Dashboard with run history, model comparison, score breakdowns, dataset management, policy audits, savings reports, and a readable "why this model" explanation.

## Future Milestones

- Provider adapters for Anthropic, Gemini, Groq, and Together.
- Reusable judge rubric templates and calibration sets.
- PDF export for reproducible quality/cost reports.
- Auth, teams, shared datasets, and scheduled regression evals.
- Prompt and rubric versioning.
- Deployment with managed PostgreSQL.

## Technical Positioning

This project demonstrates production-oriented AI engineering: model selection, eval discipline, cost and latency tradeoffs, enterprise policy enforcement, reproducibility, and explainable routing.

The strongest interview angle is that the project sits between full-stack engineering and applied AI infrastructure. It is not just a chatbot UI; it models the governance layer companies need as developer AI usage becomes expensive and hard to control.

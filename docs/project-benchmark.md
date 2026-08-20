# Project Benchmark

This project is intentionally scoped as a focused enterprise model-routing and eval control plane. It overlaps with several real AI infrastructure categories without trying to clone a mature platform.

## Comparable Open-Source Tools

LiteLLM focuses on provider abstraction, proxying, budgets, rate limits, fallbacks, and spend tracking.

Helicone focuses on an AI gateway, observability, routing, cost/latency tracking, prompt management, and production monitoring.

Langfuse focuses on LLM observability, traces, prompt management, datasets, evals, and production debugging.

promptfoo focuses on reproducible prompt/model evals, test cases, automated scoring, CI usage, and LLM-as-judge workflows.

## Where This Project Fits

This project combines a narrow slice of those ideas into one resume-sized system:

- model registry and router scoring
- prompt datasets and rubrics
- mock/live provider modes
- LLM-as-judge scoring
- policy-aware enterprise routing
- budget-aware savings reports
- deployment safety controls

## What Makes It Different

The strongest angle is company-side governance for AI coding/developer-tool usage. The app is not only comparing model outputs; it also answers:

- Is this request work-related?
- Is the requested model justified by task complexity?
- Should the request be downgraded to save budget?
- Should a policy issue block the request?
- What did the router save compared with the requested model?

## Next Production-Level Upgrades

- shared-store rate limiting
- auth and role-based access
- provider adapters for Anthropic, Gemini, Groq, and Together
- prompt and rubric versioning
- scheduled regression evals
- deployment with managed PostgreSQL
- trace-level observability for individual model calls

# Production Safety

This app is safest to deploy publicly as a mock-mode demo. Live model calls can be enabled for private/admin demos, but they should not be available to anonymous visitors.

## Environment Gates

```bash
LIVE_MODE_ENABLED="false"
DEMO_ADMIN_KEY="long_random_value"
```

`LIVE_MODE_ENABLED=false` keeps OpenAI-backed evals and judge calls disabled even if `OPENAI_API_KEY` is configured.

`DEMO_ADMIN_KEY` is checked through the `x-demo-admin-key` request header. The dashboard includes a local password field that sends this header for admin-only actions.

## Protected Actions

The app protects:

- live OpenAI evals
- LLM-as-judge scoring
- production dataset writes
- production bootstrap access
- production eval and policy persistence

Unauthenticated production mock evals can still return preview results, but they do not write rows to PostgreSQL.

## Abuse Controls

The API layer includes:

- per-IP rate limits for POST routes
- prompt length caps
- expected-output length caps
- rubric criterion caps
- judge batch-size caps
- JSON content-type checks
- invalid JSON handling with `400` responses
- safer production provider error messages
- HTTP security headers for framing, MIME sniffing, referrer policy, permissions, and baseline CSP

The in-memory limiter is enough for a portfolio deployment. A real multi-instance production deployment should move rate limiting to Redis, Upstash, Vercel KV, Cloudflare, or another shared store.

The CSP is intentionally practical for a Next.js app. It blocks framing and object embedding while still allowing the inline scripts/styles Next needs to render correctly.

## Recommended Public Deployment

For a recruiter-facing deployment:

```bash
LIVE_MODE_ENABLED="false"
OPENAI_API_KEY=""
DEMO_ADMIN_KEY="long_random_value"
```

Current public demo:

```text
https://enterprise-ai-model-router.vercel.app
```

For a private demo with live model calls:

```bash
LIVE_MODE_ENABLED="true"
OPENAI_API_KEY="real_project_key"
DEMO_ADMIN_KEY="long_random_value"
```

Do not expose the admin key in frontend environment variables or commit it to GitHub.

# Security Model

The public deployment is designed for an interactive mock-mode demonstration. It
reduces the risk of anonymous provider spending and database mutation, but it is not a
complete authentication or tenant-isolation system.

## Assets

- OpenAI API credentials and provider budget
- PostgreSQL data and connection credentials
- administrative write capability
- prompt, output, and audit-log content
- integrity of routing and savings reports

## Trust Boundaries

### Browser to API

The browser is untrusted. API routes validate content type, parse errors, payload
lengths, referenced identifiers, and action-specific authorization. The admin key is
sent in `x-demo-admin-key` and compared server-side with a timing-safe comparison.

### API to provider

Provider calls occur only on the server. Live mode requires all of:

- `LIVE_MODE_ENABLED=true`
- a configured `OPENAI_API_KEY`
- a valid `DEMO_ADMIN_KEY` supplied to the protected route

The public deployment keeps live mode disabled. Provider errors are reduced to safer
messages in production rather than returning raw stack or quota details.

### API to database

Prisma performs parameterized database access. Production writes, bootstrap actions,
judge updates, and persisted policy/eval actions are protected by the admin boundary.
Anonymous mock runs can produce preview responses without inserting rows.

## Implemented Controls

- server-only provider and database credentials
- explicit live-mode opt-in
- admin checks for expensive or mutating production actions
- timing-safe admin-key comparison
- JSON content-type enforcement and malformed-body handling
- prompt, expected-output, rubric, and judge-batch limits
- per-route, per-IP in-memory rate limits
- production error redaction
- strict JSON schema for judge responses
- security headers for framing, MIME sniffing, referrers, permissions, and transport
- Content Security Policy limited to same-origin application resources
- ignored `.env`, `.env.local`, `.next`, Vercel, and test-report artifacts
- CI migrations, tests, build, and browser workflow

## Known Limitations

- `DEMO_ADMIN_KEY` is a shared secret, not identity or role-based authorization.
- The database schema has no tenant identifier or row-level isolation.
- The rate-limit map is process-local, resets on cold starts, and is not shared across
  serverless instances.
- Forwarded IP headers are trusted as supplied by the hosting path.
- There is no CSRF token. The custom admin header and same-origin UI reduce normal form
  submission risk, but a production authenticated app needs an explicit CSRF strategy.
- There is no provider-level hard spending cap in this application.
- Prompt and output retention has no configurable deletion policy.
- The keyword policy classifier is not a security control for secrets or unsafe data.
- Savings and quality reports depend on administratively supplied model metadata.

For organizational use, replace the shared key with an identity provider and RBAC, add
tenant-scoped queries or row-level security, move rate limiting to a durable shared
store, configure provider budget alerts, establish retention rules, and audit every
administrative action.

## Deployment Defaults

Recommended public-demo values:

```bash
LIVE_MODE_ENABLED="false"
OPENAI_API_KEY=""
DEMO_ADMIN_KEY="long-random-server-side-value"
```

For a private live demonstration, enable live mode only after setting provider budget
limits and a strong admin key. Never expose either secret through a `NEXT_PUBLIC_`
variable or commit it to Git.

## Security Headers

`next.config.ts` applies CSP, HSTS, frame denial, MIME sniffing protection, a restrictive
permissions policy, and same-origin opener/resource policies. The CSP permits inline
scripts and styles required by the current Next.js rendering path, so it is a practical
baseline rather than a strict nonce-based policy.

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

These checks reduce regression risk but do not prove the absence of vulnerabilities.
Review dependency advisories, route authorization, environment configuration, database
permissions, and provider billing limits before each production release.

## Reporting

Use a private GitHub security advisory when available. Do not include API keys,
database credentials, production prompts, or full provider outputs in a public issue.

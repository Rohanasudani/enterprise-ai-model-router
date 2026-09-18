# Contributing

Enterprise AI Model Router is an explainable LLM evaluation, policy, and routing
control plane. Changes should preserve the distinction between synthetic demo data,
provider-backed measurements, and estimated savings.

Read [DESIGN.md](DESIGN.md), [docs/evaluation.md](docs/evaluation.md), and
[docs/security.md](docs/security.md) before changing routing or production behavior.

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Verification

Run these before opening a pull request:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

`npm run test:e2e` expects PostgreSQL to be available through the local Docker Compose service.

## Development Guidelines

- Keep routing logic explainable. A model recommendation should include reasons a platform team can audit.
- Keep public demo behavior safe. Mock mode should work without provider credits, and live mode must remain opt-in.
- Add or update tests when changing deployment guards, policy decisions, eval behavior, or API persistence.
- Avoid committing real API keys, database URLs, screenshots with secrets, or generated local reports.

## Good First Areas

- Add another provider adapter behind the same eval result interface.
- Add scheduled regression evals.
- Add auth/RBAC to replace the demo admin key.
- Improve report exports with richer cost and quality summaries.

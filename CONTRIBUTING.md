# Contributing

Thanks for taking a look at Enterprise AI Model Router. This project is structured as a portfolio-grade simulation of an enterprise LLM routing and eval control plane.

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

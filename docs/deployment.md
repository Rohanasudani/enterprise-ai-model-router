# Deployment

The public demo is deployed with Vercel and Neon Postgres.

```text
https://enterprise-ai-model-router.vercel.app
```

## Production Settings

The production deployment is configured for public mock mode:

- `DATABASE_URL`: Neon Postgres connection string
- `LIVE_MODE_ENABLED`: `false`
- `DEMO_ADMIN_KEY`: sensitive admin key for protected actions
- `OPENAI_API_KEY`: not configured for the public demo

## Database

The Neon database is migrated with Prisma:

```bash
npx prisma migrate deploy
```

Demo data is seeded with:

```bash
npm run db:seed
```

## Safety Posture

Anonymous visitors can load the dashboard, view seeded report data, and run mock eval previews. Public mock evals do not persist new rows in production. Live OpenAI mode, LLM judge scoring, dataset writes, and production persistence require the demo admin key.

## Vercel Notes

The first deployment was created from the CLI. GitHub auto-deploys require connecting the Vercel account to GitHub from Vercel account settings.

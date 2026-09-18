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

The GitHub repository is connected to Vercel for production deployments. Apply Prisma
migrations before promoting application changes that depend on a new schema.

Do not run `prisma migrate dev` against production. Use reviewed migration files and:

```bash
npx prisma migrate deploy
```

Database migrations should remain backward-compatible during rollout because the old
and new application versions may overlap briefly. Keep a database backup or Neon branch
before destructive schema changes.

## Verification

After deployment, verify:

- the dashboard and report exports load without an admin key
- mock evals return previews without persistence
- live mode returns the disabled response
- protected writes reject a missing or invalid admin key
- expected security headers are present
- migrations match the deployed commit

See [security.md](security.md) for the complete production boundary.

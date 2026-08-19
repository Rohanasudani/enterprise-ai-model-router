# GitHub Publish Guide

## Suggested Repository

Name:

```text
enterprise-ai-model-router
```

Description:

```text
Enterprise LLM routing and eval platform with policy-aware model selection, budgets, and savings reports.
```

Topics:

```text
nextjs, typescript, postgresql, prisma, openai, llm, evals, ai-infrastructure, model-routing, developer-tools
```

## Before Pushing

Confirm `.env` is ignored:

```bash
git check-ignore .env
```

Run checks:

```bash
npm run lint
npm run build
```

Commit the docs polish:

```bash
git add .
git commit -m "Polish GitHub documentation and portfolio materials"
```

## Push

Create an empty GitHub repo, then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/enterprise-ai-model-router.git
git branch -M main
git push -u origin main
```

Do not commit `.env`, OpenAI keys, database dumps, or local `.next` build output.

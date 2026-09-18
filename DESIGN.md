# Design

## Problem

Model choice becomes an infrastructure problem when many developers share company
funded LLM access. Sending every request to the most capable model wastes budget, while
always choosing the cheapest model can reduce quality. Usage policy, sensitive data,
task complexity, context requirements, and team budget also affect whether a request
should run at all.

This project models the control plane between an internal AI client and model
providers. It keeps model ranking, policy enforcement, evaluation, persistence, and
reporting separate enough to inspect each decision.

## Goals

- rank candidate models with an explainable weighted score
- evaluate outputs against reusable prompt cases and rubrics
- keep a reproducible history of runs, results, and decisions
- apply budget and usage policy independently from quality routing
- support a no-credit public demo without disguising synthetic data as provider results
- protect live and mutating production actions from anonymous use
- expose assumptions and limitations in reports

## Non-Goals

- acting as a transparent multi-provider proxy
- providing production identity, tenant isolation, or billing reconciliation
- treating keyword classification as content moderation or DLP
- claiming model quality from synthetic mock results
- replacing provider-side quotas and spend alerts
- making routing autonomous without auditable reasons

## Design Principles

### Separate routing from policy

The router compares candidate results using quality, cost, latency, and context weights.
The policy engine evaluates whether the requested use is work-related, affordable, and
appropriate for the requester. A high-scoring model can still be blocked or downgraded.

### Keep decisions explainable

Router and policy results include human-readable reasons and the component values used
to reach the decision. The dashboard shows previews immediately but labels controls as
unsaved when they no longer match the persisted decision.

### Preserve evaluation provenance

Each persisted result stores its score source. Mock and live runs begin with heuristic
scores; judge-backed results identify the judge model, explanation, rubric breakdown,
and judging timestamp. This avoids presenting every number as equivalent evidence.

### Make the public path inexpensive

Mock evaluation is deterministic for a prompt/model pair. It exercises the full user
flow without provider credentials or billable calls. In production, anonymous mock
actions return previews rather than mutating the database.

### Deny expensive actions by default

Live mode requires an explicit environment gate, a server-side provider key, and the
admin request header. Judge calls and production writes use the same administrative
boundary.

## Request Lifecycles

### Evaluation

1. Load prompt cases and model profiles from PostgreSQL.
2. Validate the request mode and payload.
3. Apply live-mode and admin guards where required.
4. Run the deterministic mock provider or live OpenAI provider.
5. Rank the resulting candidates with the selected weights.
6. Persist the run, results, and recommendation when writes are authorized.
7. Optionally judge stored outputs against the prompt rubric.

### Policy routing

1. Load the requester, team, prompt, requested model, and alternatives.
2. Classify the request with the current rule set.
3. Estimate complexity, per-model cost, and remaining team budget.
4. Choose `allow`, `block`, `downgrade`, or `escalate`.
5. Record the selected model, cost counterfactual, savings estimate, and reasons.

## Data Ownership

PostgreSQL is the system of record for model metadata, prompt datasets, eval history,
teams, users, and policy decisions. The frontend receives typed application objects
through API routes; Prisma records are converted at the persistence boundary.

The model price and latency values are configuration inputs, not live provider facts.
Historical result and policy rows store their calculated costs so later profile changes
do not rewrite previous reports.

## Evaluation Policy

- Mock results are product fixtures, not benchmark evidence.
- Live latency and token usage come from the actual request when available.
- Initial live quality is heuristic and must be labeled as such.
- Judge scores are model-generated assessments, not ground truth.
- Comparisons should freeze prompt data, rubric, model identifiers, and prices.
- Savings are estimated counterfactuals and should not be compared directly with an
  invoice without reconciliation.
- Failed provider calls must remain visible as failures rather than falling back to a
  successful result silently.

## Current Tradeoffs

- Rate limiting is process-local and does not coordinate across serverless instances.
- The admin key is suitable for a controlled demo, not user authentication or RBAC.
- Request classification is a compact deterministic rule set.
- Latency normalization uses a fixed heuristic rather than observed percentiles.
- Provider support is limited to OpenAI even though the internal types are provider
  neutral.
- Prompt and rubric records are mutable rather than versioned.
- The UI is a single operational dashboard rather than separate tenant workspaces.

These constraints are explicit so future work can be evaluated against real gaps rather
than a generic feature list.

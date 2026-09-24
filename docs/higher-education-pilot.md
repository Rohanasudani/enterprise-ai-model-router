# Higher-Education Model Recommendation Pilot

## Status

This is an independent prototype and pilot proposal. It is **not affiliated with, endorsed by, integrated with, or deployed by the University of Arizona or any other university**. All current model scores, latency figures, resource tiers, users, teams, prompts, and savings are synthetic or illustrative.

## Problem Hypothesis

A multi-model AI interface can expose several model names and relative resource symbols while still leaving users unsure which model fits a specific task. That can create two avoidable patterns:

- users choose an expensive model for routine work because it appears strongest;
- users choose a lightweight model for complex work without understanding the quality tradeoff.

The router tests whether task-aware guidance can make that choice clearer without removing user control.

## Proposed First Milestone

Run a limited **shadow-mode** evaluation for two or three approved workload categories. The router would produce a recommendation and explanation alongside the existing selection flow, but it would not change the selected model or send live user prompts to a new system.

Candidate workload categories:

- explanation and tutoring support that preserves academic integrity;
- research-paper summarization with evidence/assumption separation;
- low-risk administrative drafting with required human review.

## What the Prototype Shows Today

- a higher-education scenario with representative tasks;
- auto-recommendation and manual override;
- task-fit, latency, context, and relative resource evidence;
- lower-resource and highest-quality alternatives;
- synthetic comparisons and campus-guidance previews;
- clear labels that the data is illustrative and no university system is connected.

## What It Does Not Claim

- validated performance for any named production model;
- access to a university model gateway, identity system, logs, prompts, or budgets;
- compliance approval, production security, or accessibility certification;
- authority to make academic, advising, research, employment, or other consequential decisions;
- readiness to automatically route institutional traffic.

## Suggested Integration Boundary

If an institution chooses to evaluate the idea, the router should integrate through its approved gateway and controls—not around them.

```text
Existing chat interface
        ↓
Recommendation UI / API
        ↓
Approved identity + policy checks
        ↓
Institutional model gateway
        ↓
Approved model providers
```

The institution would remain the source of truth for authentication, model availability, rate limits, logging, retention, provider contracts, and policy.

## Pilot Success Measures

- recommendation acceptance and override rate;
- task success or rubric quality compared with the user’s original selection;
- change in relative resource tier per successful task;
- user understanding of why a model was recommended;
- latency and failure rate;
- false-confidence, academic-integrity, privacy, and accessibility findings.

No single “savings” number should be treated as validated until the institution supplies approved pricing/resource metadata and evaluation results.

## Safety and Governance Requirements

Before any real pilot:

- use de-identified or institution-approved evaluation prompts;
- complete privacy, security, accessibility, procurement, and responsible-AI review;
- define prohibited data and consequential-use boundaries;
- keep human review for high-impact decisions;
- add institutional authentication and role-based access;
- document retention, telemetry, incident response, and model/version changes;
- validate each routing rule against an approved benchmark and record overrides.

## Meeting Ask

Ask for a short discovery conversation, not adoption:

> I built an independent prototype that turns model/resource labels into an explainable task-based recommendation. Would your team be open to a 20-minute review to tell me whether the problem is real and whether a small, de-identified shadow-mode evaluation would be useful?

The desired outcome is feedback, an identified technical/product owner, and—only if there is interest—a narrowly scoped pilot definition.

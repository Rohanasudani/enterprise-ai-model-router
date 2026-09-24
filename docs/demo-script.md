# Meeting Demo Script

Use this walkthrough for a university conversation, recruiter demo, or technical interview. The full version takes 4–6 minutes; the short version takes about 90 seconds.

## Before the Meeting

```bash
git clone https://github.com/Rohanasudani/enterprise-ai-model-router.git
cd enterprise-ai-model-router
npm install
npm run dev
```

Open `http://localhost:3000`. Database access is optional for the synthetic scenario.

## 90-Second Higher-Education Demo

1. Start in **Enterprise** and say: “The core router is organization-neutral; this scenario shows the company use case.”
2. Switch to **Higher Education**. Point out the synthetic shadow-mode badge and the explicit non-affiliation notice.
3. Choose **Explain a difficult concept** or **Summarize a research paper**.
4. Explain that a row of `$` symbols communicates resource level but not task fit. The router combines task-specific quality, speed, context, and resource tier.
5. Move the Cost or Quality slider and show that the recommendation and fit score update immediately.
6. Point out the recommendation reasons, lower-resource alternative, highest-quality alternative, and manual override.
7. Click **Run Eval**. Explain that the estimates are synthetic until an authorized sandbox validates them.
8. Click **Preview Campus Guidance**. Explain that shadow mode does not change live traffic or store campus prompt content.

Close with: “I’m proposing a small evaluation pilot, not asking you to replace the current interface or trust an unvalidated router.”

## Enterprise Follow-Up

1. Switch back to **Enterprise**.
2. Show simulated versus guarded live mode.
3. Run an evaluation and route a request.
4. Review the saved policy decision, audit reasons, team budget, and savings report.
5. Explain that the same recommendation core remains useful to companies; only the scenario pack and integration policy change.

## Strong Talking Points

- The router is explainable and overridable, not a black box.
- The higher-education mode is a scenario pack, not a fork of the product.
- The first institutional milestone is shadow-mode validation, not automatic routing.
- The interface never claims a synthetic score is production evidence.
- A real integration should sit behind the institution’s approved identity, model gateway, logging, and privacy controls.

## Questions to Ask

- Do users struggle to understand which model fits which workload?
- Is there already routing logic behind the model selector, or are the resource symbols the primary guidance?
- Which two or three workloads are safe and valuable enough for a shadow-mode pilot?
- What evaluation evidence, privacy review, and accessibility requirements would be needed?
- Who owns the model gateway, product UX, and responsible-AI review?
